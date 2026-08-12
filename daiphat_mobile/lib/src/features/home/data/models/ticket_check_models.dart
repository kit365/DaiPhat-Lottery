class LotteryStationDraw {
  const LotteryStationDraw({
    required this.id,
    required this.province,
  });

  final int id;
  final String province;

  factory LotteryStationDraw.fromJson(Map<String, dynamic> json) {
    final name = (json['name'] ?? json['province'] ?? '').toString().trim();
    return LotteryStationDraw(
      id: _asInt(json['id']) ?? 0,
      province: name.isEmpty ? 'Đài xổ số' : name,
    );
  }
}

class TicketMatchedPrize {
  const TicketMatchedPrize({
    required this.prizeDisplayName,
    required this.winningNumber,
    required this.prizeValue,
  });

  final String prizeDisplayName;
  final String winningNumber;
  final int prizeValue;

  factory TicketMatchedPrize.fromJson(Map<String, dynamic> json) {
    return TicketMatchedPrize(
      prizeDisplayName: (json['prizeDisplayName'] ?? json['prizeCode'] ?? '')
          .toString(),
      winningNumber: (json['winningNumber'] ?? '').toString(),
      prizeValue: _asInt(json['prizeValue']) ?? 0,
    );
  }
}

class TicketCheckResult {
  const TicketCheckResult({
    required this.stationId,
    required this.stationName,
    required this.drawDate,
    required this.ticketNumber,
    required this.resultAvailable,
    required this.winning,
    required this.totalWinningAmount,
    required this.matchedPrizes,
  });

  final int stationId;
  final String stationName;
  final String drawDate;
  final String ticketNumber;
  final bool resultAvailable;
  final bool winning;
  final int totalWinningAmount;
  final List<TicketMatchedPrize> matchedPrizes;

  factory TicketCheckResult.fromJson(Map<String, dynamic> json) {
    final prizes = (json['matchedPrizes'] as List<dynamic>? ?? const [])
        .map((e) => TicketMatchedPrize.fromJson(e as Map<String, dynamic>))
        .toList();
    return TicketCheckResult(
      stationId: _asInt(json['stationId']) ?? 0,
      stationName: (json['stationName'] ?? '').toString(),
      drawDate: (json['drawDate'] ?? '').toString(),
      ticketNumber: (json['ticketNumber'] ?? '').toString(),
      resultAvailable: json['resultAvailable'] == true,
      winning: json['winning'] == true,
      totalWinningAmount: _asInt(json['totalWinningAmount']) ?? 0,
      matchedPrizes: prizes,
    );
  }
}

int? _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '');
}
