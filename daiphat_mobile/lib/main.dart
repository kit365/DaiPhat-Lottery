import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'data/services/auth_api_service.dart';
import 'data/repositories/auth_repository.dart';
import 'ui/viewmodels/login_viewmodel.dart';
import 'ui/views/login_view.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Load environment variables
  await dotenv.load(fileName: ".env");

  // Initialize Data Layer
  final authApiService = AuthApiService();
  final authRepository = AuthRepository(authApiService);

  // Initialize UI Layer (ViewModel)
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
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: LoginView(viewModel: loginViewModel),
    );
  }
}
