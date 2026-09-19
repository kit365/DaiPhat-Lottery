/// Normalizes a ticket number for display without losing leading zeroes.
String normalizeTicketNumber(String? value) {
  final raw = value ?? '';
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  return digits.isNotEmpty ? digits : raw.trim();
}

