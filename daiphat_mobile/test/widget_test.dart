import 'package:flutter/foundation.dart';
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

    // Verify that the main lottery app is displayed.
    expect(find.text('ĐẠI PHÁT'), findsOneWidget);
    expect(find.text('Trang chủ'), findsWidgets);
    expect(find.text('Mua vé số'), findsWidgets);

    await tester.tap(find.text('Dò vé').last);
    await tester.pumpAndSettle();
    expect(find.text('Kết quả xổ số'), findsOneWidget);

    await tester.tap(find.text('Mua vé số').last);
    await tester.pumpAndSettle();
    expect(find.text('123456'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('ticket-123456')));
    await tester.pumpAndSettle();
    expect(find.text('Chi tiết vé'), findsOneWidget);

    await tester.tap(find.text('Thanh toán ngay'));
    await tester.pumpAndSettle();
    expect(find.text('Giỏ hàng (4)'), findsOneWidget);
  });
}
