const Map<String, String> kFortuneElementLabels = {
  'METAL': 'Kim',
  'WOOD': 'Mộc',
  'WATER': 'Thủy',
  'FIRE': 'Hỏa',
  'EARTH': 'Thổ',
};

String fortuneElementLabel(String? value) {
  if (value == null || value.trim().isEmpty) return '—';
  return kFortuneElementLabels[value.toUpperCase()] ?? value;
}

Duration msUntilUnlock(DateTime? nextUnlockAt, [DateTime? now]) {
  if (nextUnlockAt == null) return Duration.zero;
  final remaining = nextUnlockAt.difference(now ?? DateTime.now());
  return remaining.isNegative ? Duration.zero : remaining;
}

String formatCountdownHms(Duration remaining) {
  final totalSec = remaining.inSeconds < 0 ? 0 : remaining.inSeconds;
  final hours = (totalSec ~/ 3600).toString().padLeft(2, '0');
  final minutes = ((totalSec % 3600) ~/ 60).toString().padLeft(2, '0');
  final seconds = (totalSec % 60).toString().padLeft(2, '0');
  return '$hours:$minutes:$seconds';
}

String formatFortuneDisplayDate(String? value) {
  if (value == null || value.trim().isEmpty) return '—';
  final parsed = _parseCalendarDate(value);
  if (parsed == null) return value;
  final d = parsed.day.toString().padLeft(2, '0');
  final m = parsed.month.toString().padLeft(2, '0');
  return '$d-$m-${parsed.year}';
}

String localizeFortuneProseDates(String prose) {
  return prose.replaceAllMapped(RegExp(r'\b(\d{4})-(\d{2})-(\d{2})\b'), (match) {
    return '${match[3]}-${match[2]}-${match[1]}';
  });
}

({String day, String month, String year}) splitIsoDate(String? iso) {
  if (iso == null || iso.isEmpty) {
    return (day: '', month: '', year: '');
  }
  final normalized = iso.split('T').first;
  final parts = normalized.split('-');
  if (parts.length < 3) {
    return (day: '', month: '', year: '');
  }
  return (day: parts[2], month: parts[1], year: parts[0]);
}

String? buildBirthDateIso(String day, String month, String year, [DateTime? now]) {
  final d = int.tryParse(day);
  final m = int.tryParse(month);
  final y = int.tryParse(year);
  if (d == null || m == null || y == null) return null;

  final date = DateTime(y, m, d);
  if (date.year != y || date.month != m || date.day != d) return null;

  final today = now ?? DateTime.now();
  final todayDate = DateTime(today.year, today.month, today.day);
  if (date.isAfter(todayDate) || y < 1900) return null;

  return '$y-${m.toString().padLeft(2, '0')}-${d.toString().padLeft(2, '0')}';
}

DateTime? parseBuyDrawDate(String? iso) {
  return _parseCalendarDate(iso);
}

({String ticketNumber, String? drawDate}) parseFortuneBuyPath(String buyPath) {
  final uri = Uri.tryParse(buyPath.startsWith('/') ? 'https://local$buyPath' : buyPath);
  if (uri == null) {
    return (ticketNumber: '', drawDate: null);
  }
  return (
    ticketNumber: uri.queryParameters['ticketNumber'] ?? '',
    drawDate: uri.queryParameters['drawDate'],
  );
}

DateTime? _parseCalendarDate(String? value) {
  if (value == null) return null;
  final trimmed = value.trim();
  final iso = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(trimmed);
  if (iso != null) {
    return DateTime(
      int.parse(iso.group(1)!),
      int.parse(iso.group(2)!),
      int.parse(iso.group(3)!),
    );
  }
  final dmy = RegExp(r'^(\d{2})[-/](\d{2})[-/](\d{4})$').firstMatch(trimmed);
  if (dmy != null) {
    return DateTime(
      int.parse(dmy.group(3)!),
      int.parse(dmy.group(2)!),
      int.parse(dmy.group(1)!),
    );
  }
  return DateTime.tryParse(trimmed);
}

const kFortuneShakeDuration = Duration(milliseconds: 1800);
const kFortuneEjectDuration = Duration(milliseconds: 1100);
