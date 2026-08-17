class TicketSearchFilter {
  const TicketSearchFilter({
    this.tailRanges = const [],
    this.numberTypes = const [],
  });

  /// API form, e.g. `00-09`.
  final List<String> tailRanges;

  /// `DOUBLE` | `SEQUENTIAL` | `REPEATING`.
  final List<String> numberTypes;

  static const empty = TicketSearchFilter();

  static const presetTailRanges = [
    '00-09',
    '10-19',
    '20-29',
    '30-39',
    '40-49',
    '50-59',
    '60-69',
    '70-79',
    '80-89',
    '90-99',
  ];

  int get count => tailRanges.length + numberTypes.length;

  bool get isEmpty => count == 0;

  String get signature => '${tailRanges.join(',')}|${numberTypes.join(',')}';

  TicketSearchFilter copyWith({
    List<String>? tailRanges,
    List<String>? numberTypes,
  }) {
    return TicketSearchFilter(
      tailRanges: tailRanges ?? this.tailRanges,
      numberTypes: numberTypes ?? this.numberTypes,
    );
  }
}

String toApiTailRange(String label) =>
    label.replaceAll(RegExp(r'\s+'), '').replaceAll('–', '-');

String toUiTailRangeLabel(String apiRange) {
  final normalized = toApiTailRange(apiRange);
  final parts = normalized.split('-');
  if (parts.length != 2) return apiRange;
  return '${parts[0]} - ${parts[1]}';
}

String normalizeTwoDigitTail(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  if (digits.isEmpty) return '';
  return digits.length <= 2
      ? digits.padLeft(2, '0')
      : digits.substring(digits.length - 2);
}
