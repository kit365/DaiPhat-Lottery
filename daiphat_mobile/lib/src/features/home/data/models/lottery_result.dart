import 'package:intl/intl.dart';

class LotteryPrizes {
  const LotteryPrizes({
    this.special = '',
    this.first = '',
    this.second = '',
    this.third = const [],
    this.fourth = const [],
    this.fifth = const [],
    this.sixth = const [],
    this.seventh = const [],
    this.eighth = const [],
  });

  final String special;
  final String first;
  final String second;
  final List<String> third;
  final List<String> fourth;
  final List<String> fifth;
  final List<String> sixth;
  final List<String> seventh;
  final List<String> eighth;
}

class LotteryPrizeRow {
  const LotteryPrizeRow({
    required this.label,
    required this.values,
    this.highlight = false,
  });

  final String label;
  final List<String> values;
  final bool highlight;
}

class LotoRowData {
  const LotoRowData({
    required this.heads,
    required this.focus,
    required this.tails,
  });

  final String heads;
  final String focus;
  final String tails;
}

class LotteryResult {
  const LotteryResult({
    required this.id,
    required this.stationId,
    required this.province,
    required this.dateLabel,
    required this.dayOfWeek,
    required this.drawDate,
    required this.status,
    required this.prizes,
  });

  final int id;
  final int stationId;
  final String province;
  final String dateLabel;
  final String dayOfWeek;
  final DateTime drawDate;
  final String status;
  final LotteryPrizes prizes;

  List<LotteryPrizeRow> get prizeRows => [
        LotteryPrizeRow(label: 'Giải nhất', values: _single(prizes.first)),
        LotteryPrizeRow(label: 'Giải nhì', values: _single(prizes.second)),
        LotteryPrizeRow(label: 'Giải ba', values: prizes.third),
        LotteryPrizeRow(label: 'Giải tư', values: prizes.fourth),
        LotteryPrizeRow(label: 'Giải năm', values: prizes.fifth),
        LotteryPrizeRow(label: 'Giải sáu', values: prizes.sixth),
        LotteryPrizeRow(label: 'Giải bảy', values: prizes.seventh, highlight: true),
        LotteryPrizeRow(label: 'Giải tám', values: prizes.eighth, highlight: true),
      ];

  Iterable<String> get allPrizeNumbers => <String>[
        prizes.special,
        prizes.first,
        prizes.second,
        ...prizes.third,
        ...prizes.fourth,
        ...prizes.fifth,
        ...prizes.sixth,
        ...prizes.seventh,
        ...prizes.eighth,
      ].where((value) => value.trim().isNotEmpty);

  List<LotoRowData> get lotoRows => calculateLotoRows(allPrizeNumbers);
}

List<LotoRowData> calculateLotoRows(Iterable<String> numbers) {
    final allNumbers = numbers.toList();

    final asHead = <String, Map<String, int>>{};
    final asTail = <String, Map<String, int>>{};
    for (var i = 0; i <= 9; i += 1) {
      asHead['$i'] = <String, int>{};
      asTail['$i'] = <String, int>{};
    }

    for (final number in allNumbers) {
      final lastTwo = number.length >= 2 ? number.substring(number.length - 2) : number;
      if (lastTwo.length != 2) {
        continue;
      }

      final head = lastTwo[0];
      final tail = lastTwo[1];
      asHead[head]![tail] = (asHead[head]![tail] ?? 0) + 1;
      asTail[tail]![head] = (asTail[tail]![head] ?? 0) + 1;
    }

    return List.generate(10, (index) {
      final focus = '$index';
      return LotoRowData(
        heads: _formatLotoCounts(asTail[focus]!),
        focus: focus,
        tails: _formatLotoCounts(asHead[focus]!),
      );
    });
}

class LotteryResultSummaryApiResponse {
  const LotteryResultSummaryApiResponse({
    required this.id,
    required this.stationId,
    required this.stationName,
    required this.drawDate,
    required this.status,
  });

  factory LotteryResultSummaryApiResponse.fromJson(Map<String, dynamic> json) {
    return LotteryResultSummaryApiResponse(
      id: (json['id'] as num?)?.toInt() ?? 0,
      stationId: (json['stationId'] as num?)?.toInt() ?? 0,
      stationName: (json['stationName'] ?? '').toString(),
      drawDate: (json['drawDate'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
    );
  }

  final int id;
  final int stationId;
  final String stationName;
  final String drawDate;
  final String status;
}

class LotteryResultDetailApiResponse {
  const LotteryResultDetailApiResponse({
    required this.id,
    required this.prizeCode,
    required this.winningNumber,
  });

  factory LotteryResultDetailApiResponse.fromJson(Map<String, dynamic> json) {
    return LotteryResultDetailApiResponse(
      id: (json['id'] as num?)?.toInt() ?? 0,
      prizeCode: (json['prizeCode'] ?? '').toString(),
      winningNumber: (json['winningNumber'] ?? '').toString(),
    );
  }

  final int id;
  final String prizeCode;
  final String winningNumber;
}

class LotteryResultLiveItemApiResponse {
  const LotteryResultLiveItemApiResponse({
    required this.result,
    required this.details,
    required this.status,
    required this.pollAfterSeconds,
  });

  factory LotteryResultLiveItemApiResponse.fromJson(Map<String, dynamic> json) {
    final detailsJson = json['details'] as List<dynamic>? ?? const [];
    return LotteryResultLiveItemApiResponse(
      result: LotteryResultSummaryApiResponse.fromJson(
        (json['result'] as Map<String, dynamic>? ?? const <String, dynamic>{}),
      ),
      details: detailsJson
          .map((item) => LotteryResultDetailApiResponse.fromJson(item as Map<String, dynamic>))
          .toList(),
      status: json['status']?.toString(),
      pollAfterSeconds: (json['pollAfterSeconds'] as num?)?.toInt(),
    );
  }

  final LotteryResultSummaryApiResponse result;
  final List<LotteryResultDetailApiResponse> details;
  final String? status;
  final int? pollAfterSeconds;
}

class HomeLotteryData {
  const HomeLotteryData({
    required this.results,
    required this.availableProvinces,
    this.isWaitingForResults = false,
  });

  final List<LotteryResult> results;
  final List<String> availableProvinces;
  final bool isWaitingForResults;
}

class HomeLotteryFetchResult {
  const HomeLotteryFetchResult({
    required this.data,
    this.nextPollAfterSeconds,
    this.shouldPollSummary = false,
  });

  final HomeLotteryData data;
  final int? nextPollAfterSeconds;
  final bool shouldPollSummary;
}

LotteryResult mapSummaryToLotteryResult(LotteryResultSummaryApiResponse item) {
  final drawDate = _parseApiDate(item.drawDate);
  return LotteryResult(
    id: item.id,
    stationId: item.stationId,
    province: _normalizeProvinceName(item.stationName),
    dateLabel: DateFormat('dd/MM/yyyy').format(drawDate),
    dayOfWeek: _weekdayLabel(drawDate),
    drawDate: drawDate,
    status: item.status,
    prizes: const LotteryPrizes(),
  );
}

LotteryResult mergeResultWithLiveDetails(
  LotteryResult result,
  LotteryResultLiveItemApiResponse? liveItem,
) {
  if (liveItem == null) {
    return result;
  }

  final details = [...liveItem.details]..sort((a, b) => a.id.compareTo(b.id));

  List<String> byCode(String code) => details
      .where((item) => item.prizeCode == code)
      .map((item) => item.winningNumber)
      .where((value) => value.trim().isNotEmpty)
      .toList();

  return LotteryResult(
    id: result.id,
    stationId: result.stationId,
    province: result.province,
    dateLabel: result.dateLabel,
    dayOfWeek: result.dayOfWeek,
    drawDate: result.drawDate,
    status: liveItem.result.status,
    prizes: LotteryPrizes(
      special: byCode('DB').isNotEmpty ? byCode('DB').first : '',
      first: byCode('G1').isNotEmpty ? byCode('G1').first : '',
      second: byCode('G2').isNotEmpty ? byCode('G2').first : '',
      third: byCode('G3'),
      fourth: byCode('G4'),
      fifth: byCode('G5'),
      sixth: byCode('G6'),
      seventh: byCode('G7'),
      eighth: byCode('G8'),
    ),
  );
}

DateTime _parseApiDate(String value) {
  return DateTime.tryParse(value)?.toLocal() ?? DateTime.now();
}

String _weekdayLabel(DateTime date) {
  const labels = <int, String>{
    DateTime.monday: 'Thứ Hai',
    DateTime.tuesday: 'Thứ Ba',
    DateTime.wednesday: 'Thứ Tư',
    DateTime.thursday: 'Thứ Năm',
    DateTime.friday: 'Thứ Sáu',
    DateTime.saturday: 'Thứ Bảy',
    DateTime.sunday: 'Chủ Nhật',
  };
  return labels[date.weekday] ?? '';
}

String _normalizeProvinceName(String name) {
  switch (name.trim()) {
    case 'Hồ Chí Minh':
      return 'TP. Hồ Chí Minh';
    default:
      return name.trim();
  }
}

String _formatLotoCounts(Map<String, int> counts) {
  final entries = counts.entries.where((entry) => entry.value > 0).toList()
    ..sort((a, b) => a.key.compareTo(b.key));

  return entries
      .map((entry) => entry.value > 1 ? '${entry.key}^${entry.value}' : entry.key)
      .join(', ');
}

List<String> _single(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? const [] : [trimmed];
}
