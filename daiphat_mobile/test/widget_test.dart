import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/main.dart';
import 'package:daiphat_mobile/data/services/auth_api_service.dart';
import 'package:daiphat_mobile/data/repositories/auth_repository.dart';
import 'package:daiphat_mobile/ui/viewmodels/login_viewmodel.dart';

void main() {
  testWidgets('DaiPhat Mobile smoke test', (WidgetTester tester) async {
    // For testing, we can just initialize with empty dependencies
    // if the view doesn't immediately call them.
    final authApiService = AuthApiService();
    final authRepository = AuthRepository(authApiService);
    final loginViewModel = LoginViewModel(authRepository);

    await tester.pumpWidget(DaiPhatMobileApp(loginViewModel: loginViewModel));

    // Verify that login screen is displayed.
    expect(find.text('Login'), findsWidgets);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });
}
