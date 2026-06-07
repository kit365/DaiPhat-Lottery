import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'data/repositories/auth_repository.dart';
import 'data/services/auth_api_service.dart';
import 'ui/viewmodels/login_viewmodel.dart';
import 'ui/views/lottery_app_view.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');

  final authApiService = AuthApiService();
  final authRepository = AuthRepository(authApiService);
  final loginViewModel = LoginViewModel(authRepository);

  runApp(DaiPhatMobileApp(loginViewModel: loginViewModel));
}

class DaiPhatMobileApp extends StatelessWidget {
  final LoginViewModel loginViewModel;

  const DaiPhatMobileApp({super.key, required this.loginViewModel});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DaiPhat Mobile',
      debugShowCheckedModeBanner: false,
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
      home: const LotteryAppView(),
    );
  }
}
