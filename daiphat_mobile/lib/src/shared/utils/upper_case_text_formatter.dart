import 'package:flutter/services.dart';

/// Formats text input to uppercase in real time as characters are typed.
///
/// Prevents the common mobile keyboard issue where characters appear lowercase
/// during IME composition and only jump to uppercase after pressing Space or Enter.
class UpperCaseTextFormatter extends TextInputFormatter {
  const UpperCaseTextFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final uppercasedText = newValue.text.toUpperCase();

    if (uppercasedText == newValue.text) {
      return newValue;
    }

    final selectionStart = newValue.selection.start.clamp(
      -1,
      uppercasedText.length,
    );
    final selectionEnd = newValue.selection.end.clamp(
      -1,
      uppercasedText.length,
    );
    final safeSelection = TextSelection(
      baseOffset: selectionStart,
      extentOffset: selectionEnd,
      affinity: newValue.selection.affinity,
      isDirectional: newValue.selection.isDirectional,
    );

    TextRange safeComposing = TextRange.empty;
    if (newValue.isComposingRangeValid &&
        newValue.composing.start >= 0 &&
        newValue.composing.end <= uppercasedText.length) {
      safeComposing = newValue.composing;
    }

    return TextEditingValue(
      text: uppercasedText,
      selection: safeSelection,
      composing: safeComposing,
    );
  }
}
