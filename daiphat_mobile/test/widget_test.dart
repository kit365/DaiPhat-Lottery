import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/app/app.dart';

void main() {
  testWidgets('DaiPhatMobileApp renders router content', (
    WidgetTester tester,
  ) async {
    final router = GoRouter(
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const Scaffold(
            body: Center(child: Text('Monorepo bootstrap smoke test')),
          ),
        ),
      ],
    );

    await tester.pumpWidget(DaiPhatMobileApp(router: router));
    await tester.pumpAndSettle();

    expect(find.text('Monorepo bootstrap smoke test'), findsOneWidget);
  });
}
