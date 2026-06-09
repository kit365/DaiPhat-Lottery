import 'package:cookie_jar/cookie_jar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import 'core/network/api_client.dart';
import 'core/router/app_router.dart';
import 'core/storage/auth_token_storage.dart';
import 'data/repositories/auth_repository.dart';
import 'data/services/auth_api_service.dart';
import 'ui/viewmodels/login_viewmodel.dart';
import 'ui/viewmodels/register_viewmodel.dart';
import 'ui/viewmodels/forgot_password_viewmodel.dart';
import 'ui/viewmodels/profile_viewmodel.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');

  final documentsDirectory = await getApplicationDocumentsDirectory();
  final cookieJar = PersistCookieJar(
    storage: FileStorage('${documentsDirectory.path}/.cookies'),
  );
  final tokenStorage = await AuthTokenStorage.create();
  final apiClient = ApiClient(cookieJar: cookieJar);
  final authApiService = AuthApiService(apiClient);
  final authRepository = AuthRepository(
    authApiService,
    apiClient,
    tokenStorage,
  );
  await authRepository.restoreSession();

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

  runApp(ProviderScope(child: DaiPhatMobileApp(router: router)));
}

class DaiPhatMobileApp extends StatelessWidget {
  final RouterConfig<Object> router;

  const DaiPhatMobileApp({super.key, required this.router});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'ĐẠI PHÁT Mobile',
      debugShowCheckedModeBanner: false,
      routerConfig: router,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFE90000),
          primary: const Color(0xFFE90000),
        ),
        scaffoldBackgroundColor: const Color(0xFFFFFBFA),
        fontFamily: 'Roboto',
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          elevation: 0,
          foregroundColor: Colors.white,
          backgroundColor: Color(0xFFE90000),
          titleTextStyle: TextStyle(
            color: Colors.white,
            fontSize: 17,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}
