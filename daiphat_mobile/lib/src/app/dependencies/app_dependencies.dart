import 'dart:io';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';

import 'package:daiphat_mobile/src/app/routing/app_router.dart';
import 'package:daiphat_mobile/src/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:daiphat_mobile/src/features/auth/data/services/auth_api_service.dart';
import 'package:daiphat_mobile/src/features/auth/data/services/google_auth_service.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/forgot_password_viewmodel.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/login_viewmodel.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/register_viewmodel.dart';
import 'package:daiphat_mobile/src/features/notifications/data/repositories/notification_repository_impl.dart';
import 'package:daiphat_mobile/src/features/notifications/data/services/notification_api_service.dart';
import 'package:daiphat_mobile/src/features/notifications/domain/usecases/notification_usecases.dart';
import 'package:daiphat_mobile/src/features/notifications/presentation/viewmodels/notification_viewmodel.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/viewmodels/profile_viewmodel.dart';
import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/storage/auth_token_storage.dart';
import 'package:daiphat_mobile/src/shared/storage/secure_cookie_storage.dart';

class AppDependencies {
  final ApiClient apiClient;
  final AuthRepositoryImpl authRepository;
  final GoRouter router;
  final NotificationViewModel notificationViewModel;
  final LoginViewModel loginViewModel;

  const AppDependencies({
    required this.apiClient,
    required this.authRepository,
    required this.router,
    required this.notificationViewModel,
    required this.loginViewModel,
  });

  static Future<AppDependencies> create() async {
    await _deleteLegacyCookieStorage();
    const secureStorage = FlutterSecureStorage();
    final cookieJar = PersistCookieJar(
      ignoreExpires: true,
      storage: SecureCookieStorage(secureStorage),
    );
    final tokenStorage = await AuthTokenStorage.create();
    final apiClient = ApiClient(cookieJar: cookieJar);

    final authRepository = AuthRepositoryImpl(
      AuthApiService(apiClient),
      apiClient,
      tokenStorage,
      GoogleAuthService(),
    );
    apiClient.resolveAccessToken = tokenStorage.getAccessToken;
    apiClient.onAccessTokenRefreshed = tokenStorage.saveAccessToken;
    await authRepository.restoreSession();

    if (authRepository.isAuthenticated) {
      try {
        final token = await FirebaseMessaging.instance.getToken();
        if (token != null) {
          await authRepository.updateFcmToken(token);
        }
      } catch (_) {
        // Keep app startup resilient if token sync fails.
      }
    }

    final loginViewModel = LoginViewModel(authRepository);
    apiClient.onSessionExpired = () async {
      await authRepository.logout();
      loginViewModel.onLoggedOut();
    };
    final registerViewModel = RegisterViewModel(authRepository);
    final forgotPasswordViewModel = ForgotPasswordViewModel(authRepository);
    final profileViewModel = ProfileViewModel(authRepository, loginViewModel);
    final notificationsRepository = NotificationRepositoryImpl(
      NotificationApiService(apiClient),
    );
    final notificationViewModel = NotificationViewModel(
      GetMyNotifications(notificationsRepository),
      MarkNotificationAsRead(notificationsRepository),
      MarkAllNotificationsAsRead(notificationsRepository),
      CheckNotificationReferenceAvailable(notificationsRepository),
      DeleteReadNotification(notificationsRepository),
      DeleteAllReadNotifications(notificationsRepository),
      autoFetch: authRepository.isAuthenticated,
    );

    return AppDependencies(
      apiClient: apiClient,
      authRepository: authRepository,
      router: createAppRouter(
        loginViewModel: loginViewModel,
        registerViewModel: registerViewModel,
        forgotPasswordViewModel: forgotPasswordViewModel,
        profileViewModel: profileViewModel,
        notificationViewModel: notificationViewModel,
      ),
      notificationViewModel: notificationViewModel,
      loginViewModel: loginViewModel,
    );
  }

  static Future<void> _deleteLegacyCookieStorage() async {
    try {
      final documentsDirectory = await getApplicationDocumentsDirectory();
      final legacyDirectory = Directory('${documentsDirectory.path}/.cookies');
      if (await legacyDirectory.exists()) {
        await legacyDirectory.delete(recursive: true);
      }
    } catch (_) {
      // A failed legacy cleanup must not prevent the app from starting.
    }
  }
}
