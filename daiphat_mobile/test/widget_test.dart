import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/core/network/api_client.dart';
import 'package:daiphat_mobile/core/router/app_router.dart';
import 'package:daiphat_mobile/core/storage/auth_token_storage.dart';
import 'package:daiphat_mobile/data/repositories/auth_repository.dart';
import 'package:daiphat_mobile/data/services/auth_api_service.dart';
import 'package:daiphat_mobile/main.dart';
import 'package:daiphat_mobile/ui/viewmodels/login_viewmodel.dart';
import 'package:daiphat_mobile/ui/viewmodels/register_viewmodel.dart';
import 'package:daiphat_mobile/ui/viewmodels/forgot_password_viewmodel.dart';
import 'package:daiphat_mobile/ui/viewmodels/profile_viewmodel.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('DaiPhat Mobile smoke test', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    final tokenStorage = await AuthTokenStorage.create();
    final apiClient = ApiClient(
      dio: Dio(BaseOptions(baseUrl: 'http://localhost:8080/api/v1')),
    );
    final authApiService = AuthApiService(apiClient);
    final authRepository = AuthRepository(
      authApiService,
      apiClient,
      tokenStorage,
    );
    final loginViewModel = LoginViewModel(authRepository);
    final registerViewModel = RegisterViewModel(authRepository);
    final forgotPasswordViewModel = ForgotPasswordViewModel(authRepository);
    final profileViewModel = ProfileViewModel(authRepository);
    final router = createAppRouter(
      loginViewModel: loginViewModel,
      registerViewModel: registerViewModel,
      forgotPasswordViewModel: forgotPasswordViewModel,
      profileViewModel: profileViewModel,
    );

    await tester.pumpWidget(
      ProviderScope(child: DaiPhatMobileApp(router: router)),
    );

    expect(find.text('ĐẠI PHÁT'), findsOneWidget);
    expect(find.text('Dịch vụ phổ biến'), findsNothing);

    await tester.pump(const Duration(seconds: 2));
    await tester.pump();

    expect(find.text('Dịch vụ phổ biến'), findsOneWidget);

    await tester.tap(find.text('Cá nhân'));
    await tester.pumpAndSettle();

    expect(find.text('Đăng nhập'), findsWidgets);
    expect(find.text('Email / Số điện thoại'), findsOneWidget);
  });
}
