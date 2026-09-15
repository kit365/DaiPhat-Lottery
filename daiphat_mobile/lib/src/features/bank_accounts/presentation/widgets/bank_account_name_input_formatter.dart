import 'package:flutter/services.dart';

/// Keeps bank-account holder names in the ASCII uppercase format expected by
/// Vietnamese banks. Accented letters and other unsupported characters are
/// rejected instead of being silently submitted with a different value.
class BankAccountNameInputFormatter extends TextInputFormatter {
  const BankAccountNameInputFormatter();

  static final RegExp _validName = RegExp(r'^[A-Z ]*$');

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final uppercase = newValue.text.toUpperCase();
    if (!_validName.hasMatch(uppercase)) {
      return oldValue;
    }

    return newValue.copyWith(text: uppercase, composing: TextRange.empty);
  }
}
