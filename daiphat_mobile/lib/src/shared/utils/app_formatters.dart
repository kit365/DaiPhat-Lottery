import 'package:intl/intl.dart';

/// Centralized formatting utilities for currency, numbers, and dates/times.
abstract final class AppFormatters {
  static final NumberFormat _currencyFormatter = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: 'đ',
    decimalDigits: 0,
  );

  static final DateFormat _dateFormatter = DateFormat('dd/MM/yyyy');
  static final DateFormat _dateTimeFormatter = DateFormat('HH:mm dd/MM/yyyy');

  /// Formats [amount] as Vietnamese Dong (e.g., "10.000 đ").
  /// Returns "0 đ" if [amount] is null.
  static String formatCurrency(num? amount) {
    if (amount == null) return '0 đ';
    return _currencyFormatter.format(amount).trim();
  }

  /// Formats [dateTime] to "HH:mm dd/MM/yyyy" (e.g., "14:30 29/08/2026").
  static String formatDateTime(DateTime? dateTime, {String fallback = ''}) {
    if (dateTime == null) return fallback;
    return _dateTimeFormatter.format(dateTime);
  }

  /// Formats ISO 8601 string to "dd/MM/yyyy".
  static String formatDateIso(String? isoString, {String fallback = ''}) {
    if (isoString == null || isoString.trim().isEmpty) return fallback;
    final parsed = DateTime.tryParse(isoString.trim());
    if (parsed == null) return fallback;
    return _dateFormatter.format(parsed);
  }

  /// Formats ISO 8601 string to "HH:mm dd/MM/yyyy".
  static String formatDateTimeIso(String? isoString, {String fallback = ''}) {
    if (isoString == null || isoString.trim().isEmpty) return fallback;
    final parsed = DateTime.tryParse(isoString.trim());
    if (parsed == null) return fallback;
    return _dateTimeFormatter.format(parsed);
  }
}
