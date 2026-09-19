import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_header_action_button.dart';

void main() {
  tearDown(() {
    AppHeaderActionButton.debugNowOverride = null;
  });

  testWidgets('AppHeaderActionButton throttles rapid double taps to prevent duplicate navigation', (tester) async {
    var tapCount = 0;
    var simulatedTime = DateTime(2026, 1, 1, 12, 0, 0);
    AppHeaderActionButton.debugNowOverride = () => simulatedTime;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AppHeaderActionButton(
            icon: Icons.notifications,
            tooltip: 'Thông báo',
            onTap: () => tapCount++,
          ),
        ),
      ),
    );

    // First tap at t = 0
    await tester.tap(find.byType(AppHeaderActionButton));
    expect(tapCount, 1);

    // Rapid second tap at t = 100ms (should be throttled)
    simulatedTime = simulatedTime.add(const Duration(milliseconds: 100));
    await tester.tap(find.byType(AppHeaderActionButton));
    expect(tapCount, 1);

    // Rapid third tap at t = 300ms (should be throttled)
    simulatedTime = simulatedTime.add(const Duration(milliseconds: 200));
    await tester.tap(find.byType(AppHeaderActionButton));
    expect(tapCount, 1);

    // Tap after 600ms at t = 900ms (should succeed)
    simulatedTime = simulatedTime.add(const Duration(milliseconds: 600));
    await tester.tap(find.byType(AppHeaderActionButton));
    expect(tapCount, 2);
  });
}
