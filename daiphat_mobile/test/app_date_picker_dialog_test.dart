import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_date_picker_dialog.dart';

void main() {
  group('AppDatePickerDialog Widget Tests', () {
    testWidgets('renders month, year, weekday headers and days grid', (tester) async {
      final initial = DateTime(2026, 9, 18);
      DateTime? pickedDate;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () async {
                  pickedDate = await AppDatePickerDialog.show(
                    context,
                    initial,
                    title: 'Chọn ngày sinh',
                    firstDate: DateTime(1900),
                    lastDate: DateTime(2030),
                  );
                },
                child: const Text('Open Picker'),
              ),
            ),
          ),
        ),
      );

      // Open picker
      await tester.tap(find.text('Open Picker'));
      await tester.pumpAndSettle();

      // Verify title, month, year header
      expect(find.text('Chọn ngày sinh'), findsOneWidget);
      expect(find.text('Tháng 9 2026'), findsOneWidget);

      // Verify weekday headers (T2 -> CN)
      expect(find.text('T2'), findsOneWidget);
      expect(find.text('T6'), findsOneWidget);
      expect(find.text('CN'), findsOneWidget);

      // Verify day 18 is visible and select day 20
      expect(find.text('18'), findsOneWidget);
      await tester.tap(find.text('20'));
      await tester.pumpAndSettle();

      // Verify selected date returned
      expect(pickedDate, equals(DateTime(2026, 9, 20)));
    });

    testWidgets('toggles Year Picker mode when tapping Month/Year header', (tester) async {
      final initial = DateTime(2026, 9, 18);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => AppDatePickerDialog.show(
                  context,
                  initial,
                  firstDate: DateTime(1990),
                  lastDate: DateTime(2030),
                ),
                child: const Text('Open Picker'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Picker'));
      await tester.pumpAndSettle();

      // Tap header to switch to year grid
      await tester.tap(find.text('Tháng 9 2026'));
      await tester.pumpAndSettle();

      // Verify year grid is visible with years
      expect(find.text('2026'), findsOneWidget);
      expect(find.text('2024'), findsOneWidget);

      // Tap year 2024
      await tester.tap(find.text('2024'));
      await tester.pumpAndSettle();

      // Verify month/year switched to 2024
      expect(find.text('Tháng 9 2024'), findsOneWidget);
    });

    testWidgets('disables dates after lastDate and ignores tap on future dates', (tester) async {
      final initial = DateTime(2026, 9, 18);
      final last = DateTime(2026, 9, 19);
      DateTime? pickedDate;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () async {
                  pickedDate = await AppDatePickerDialog.show(
                    context,
                    initial,
                    firstDate: DateTime(2026, 9, 1),
                    lastDate: last,
                  );
                },
                child: const Text('Open Picker'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Picker'));
      await tester.pumpAndSettle();

      // Tapping day 20 (future / disabled) should do nothing
      await tester.tap(find.text('20'));
      await tester.pumpAndSettle();
      expect(pickedDate, isNull);
      expect(find.text('Tháng 9 2026'), findsOneWidget);

      // Tapping day 19 (valid / lastDate) should pick 2026-09-19 and close dialog
      await tester.tap(find.text('19'));
      await tester.pumpAndSettle();
      expect(pickedDate, equals(DateTime(2026, 9, 19)));
    });
  });
}
