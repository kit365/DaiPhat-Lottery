import 'package:cookie_jar/cookie_jar.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';

import 'package:daiphat_mobile/src/app/routing/app_router.dart';
import 'package:daiphat_mobile/src/features/auth/data/repositories/auth_repository.dart';
import 'package:daiphat_mobile/src/features/auth/data/services/auth_api_service.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/forgot_password_viewmodel.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/login_viewmodel.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/register_viewmodel.dart';
import 'package:daiphat_mobile/src/features/notifications/data/repositories/notification_repository.dart';
import 'package:daiphat_mobile/src/features/notifications/data/services/notification_api_service.dart';
import 'package:daiphat_mobile/src/features/notifications/presentation/viewmodels/notification_viewmodel.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/viewmodels/profile_viewmodel.dart';
import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/storage/auth_token_storage.dart';

class AppDependencies {
  final ApiClient apiClient;
  final GoRouter router;

  const AppDependencies({
    required this.apiClient,
    required this.router,
  });

  static Future<AppDependencies> create() async {
    final documentsDirectory = await getApplicationDocumentsDirectory();
    final cookieJar = PersistCookieJar(
      storage: FileStorage('${documentsDirectory.path}/.cookies'),
    );
    final tokenStorage = await AuthTokenStorage.create();
    final apiClient = ApiClient(cookieJar: cookieJar);

    final authRepository = AuthRepository(
      AuthApiService(apiClient),
      apiClient,
      tokenStorage,
    );
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
    final registerViewModel = RegisterViewModel(authRepository);
    final forgotPasswordViewModel = ForgotPasswordViewModel(authRepository);
    final profileViewModel = ProfileViewModel(authRepository);
    final notificationViewModel = NotificationViewModel(
      NotificationRepository(NotificationApiService(apiClient)),
    );

    return AppDependencies(
      apiClient: apiClient,
      router: createAppRouter(
        loginViewModel: loginViewModel,
        registerViewModel: registerViewModel,
        forgotPasswordViewModel: forgotPasswordViewModel,
        profileViewModel: profileViewModel,
        notificationViewModel: notificationViewModel,
      ),
    );
  }
}
