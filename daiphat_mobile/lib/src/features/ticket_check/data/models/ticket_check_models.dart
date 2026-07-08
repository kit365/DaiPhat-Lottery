class LotteryStationDraw {
  const LotteryStationDraw({
    required this.id,
    required this.province,
    this.drawTime,
    this.nextDrawDate,
    this.thumbnailUrl,
    this.image,
  });

  factory LotteryStationDraw.fromJson(Map<String, dynamic> json) {
    final province = (json['province'] ?? json['name'] ?? '').toString().trim();
    return LotteryStationDraw(
      id: (json['id'] as num?)?.toInt() ?? 0,
      province: province,
      drawTime: json['drawTime']?.toString(),
      nextDrawDate: json['nextDrawDate']?.toString(),
      thumbnailUrl: json['thumbnailUrl']?.toString(),
      image: json['image']?.toString(),
    );
  }

  final int id;
  final String province;
  final String? drawTime;
  final String? nextDrawDate;
  final String? thumbnailUrl;
  final String? image;
}

class TicketMatchedPrize {
  const TicketMatchedPrize({
    required this.prizeLevel,
    required this.prizeDisplayName,
    required this.prizeCode,
    required this.prizeValue,
    required this.matchDigits,
    required this.matchFrom,
    required this.matchFromDisplayName,
    required this.winningNumber,
  });

  factory TicketMatchedPrize.fromJson(Map<String, dynamic> json) {
    return TicketMatchedPrize(
      prizeLevel: json['prizeLevel']?.toString() ?? '',
      prizeDisplayName: json['prizeDisplayName']?.toString() ?? '',
      prizeCode: json['prizeCode']?.toString() ?? '',
      prizeValue: (json['prizeValue'] as num?)?.toInt() ?? 0,
      matchDigits: (json['matchDigits'] as num?)?.toInt() ?? 0,
      matchFrom: json['matchFrom']?.toString() ?? '',
      matchFromDisplayName: json['matchFromDisplayName']?.toString() ?? '',
      winningNumber: json['winningNumber']?.toString() ?? '',
    );
  }

  final String prizeLevel;
  final String prizeDisplayName;
  final String prizeCode;
  final int prizeValue;
  final int matchDigits;
  final String matchFrom;
  final String matchFromDisplayName;
  final String winningNumber;
}

class TicketCheckResult {
  const TicketCheckResult({
    required this.resultId,
    required this.stationId,
    required this.stationName,
    required this.drawDate,
    required this.ticketNumber,
    required this.resultStatus,
    required this.resultAvailable,
    required this.canCheck,
    required this.winning,
    required this.totalWinningAmount,
    required this.matchedPrizes,
  });

  factory TicketCheckResult.fromJson(Map<String, dynamic> json) {
    final matchedPrizes = (json['matchedPrizes'] as List<dynamic>? ?? const [])
        .map((item) => TicketMatchedPrize.fromJson(item as Map<String, dynamic>))
        .toList();

    return TicketCheckResult(
      resultId: (json['resultId'] as num?)?.toInt() ?? 0,
      stationId: (json['stationId'] as num?)?.toInt() ?? 0,
      stationName: json['stationName']?.toString() ?? '',
      drawDate: json['drawDate']?.toString() ?? '',
      ticketNumber: json['ticketNumber']?.toString() ?? '',
      resultStatus: json['resultStatus']?.toString() ?? '',
      resultAvailable: json['resultAvailable'] as bool? ?? false,
      canCheck: json['canCheck'] as bool? ?? false,
      winning: json['winning'] as bool? ?? false,
      totalWinningAmount: (json['totalWinningAmount'] as num?)?.toInt() ?? 0,
      matchedPrizes: matchedPrizes,
    );
  }

  final int resultId;
  final int stationId;
  final String stationName;
  final String drawDate;
  final String ticketNumber;
  final String resultStatus;
  final bool resultAvailable;
  final bool canCheck;
  final bool winning;
  final int totalWinningAmount;
  final List<TicketMatchedPrize> matchedPrizes;
}
