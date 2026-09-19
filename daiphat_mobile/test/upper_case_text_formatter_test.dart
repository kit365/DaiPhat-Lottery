import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/shared/utils/upper_case_text_formatter.dart';

void main() {
  group('UpperCaseTextFormatter unit tests', () {
    const formatter = UpperCaseTextFormatter();

    test('immediately converts typed lowercase character to uppercase', () {
      const oldValue = TextEditingValue.empty;
      const newValue = TextEditingValue(
        text: 'n',
        selection: TextSelection.collapsed(offset: 1),
      );

      final result = formatter.formatEditUpdate(oldValue, newValue);

      expect(result.text, 'N');
      expect(result.selection.baseOffset, 1);
      expect(result.selection.extentOffset, 1);
    });

    test('converts sequence of characters to uppercase real-time without waiting for space', () {
      var current = TextEditingValue.empty;
      const input = 'nguyen van a';
      final buffer = StringBuffer();

      for (var i = 0; i < input.length; i++) {
        buffer.write(input[i]);
        final next = TextEditingValue(
          text: buffer.toString(),
          selection: TextSelection.collapsed(offset: buffer.length),
        );
        current = formatter.formatEditUpdate(current, next);

        // Every character typed must be uppercase immediately
        expect(current.text, buffer.toString().toUpperCase());
        expect(current.selection.baseOffset, buffer.length);
      }

      expect(current.text, 'NGUYEN VAN A');
    });

    test('preserves cursor position when typing in the middle of text', () {
      const oldValue = TextEditingValue(
        text: 'NGUYEN A',
        selection: TextSelection.collapsed(offset: 7),
      );
      const newValue = TextEditingValue(
        text: 'NGUYEN vA',
        selection: TextSelection.collapsed(offset: 8),
      );

      final result = formatter.formatEditUpdate(oldValue, newValue);

      expect(result.text, 'NGUYEN VA');
      expect(result.selection.baseOffset, 8);
      expect(result.selection.extentOffset, 8);
    });

    test('converts Vietnamese accented characters to uppercase immediately', () {
      const oldValue = TextEditingValue.empty;
      const newValue = TextEditingValue(
        text: 'nguyễn văn anh',
        selection: TextSelection.collapsed(offset: 14),
      );

      final result = formatter.formatEditUpdate(oldValue, newValue);

      expect(result.text, 'NGUYỄN VĂN ANH');
      expect(result.selection.baseOffset, 14);
    });

    test('returns exact newValue if already uppercase', () {
      const oldValue = TextEditingValue(
        text: 'NGUYEN',
        selection: TextSelection.collapsed(offset: 6),
      );
      const newValue = TextEditingValue(
        text: 'NGUYEN ',
        selection: TextSelection.collapsed(offset: 7),
      );

      final result = formatter.formatEditUpdate(oldValue, newValue);

      expect(identical(result, newValue), isTrue);
    });
  });

  group('UpperCaseTextFormatter Widget Test', () {
    testWidgets('TextFormField with UpperCaseTextFormatter displays uppercase immediately as typed', (tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextFormField(
              controller: controller,
              inputFormatters: const [UpperCaseTextFormatter()],
            ),
          ),
        ),
      );

      await tester.enterText(find.byType(TextFormField), 'nguyen van a');
      await tester.pump();

      expect(controller.text, 'NGUYEN VAN A');
      expect(find.text('NGUYEN VAN A'), findsOneWidget);
    });
  });
}
