import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/main.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  testWidgets('App starts without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: DaiPhatMobileApp()));
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
