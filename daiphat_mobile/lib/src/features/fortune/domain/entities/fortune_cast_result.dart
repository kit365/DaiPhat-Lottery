class FortuneCastPreviousSummary {
  const FortuneCastPreviousSummary({
    required this.castDate,
    required this.luckyTail,
    required this.userElement,
  });

  final String castDate;
  final String luckyTail;
  final String userElement;

  factory FortuneCastPreviousSummary.fromJson(Map<String, dynamic> json) {
    return FortuneCastPreviousSummary(
      castDate: json['castDate']?.toString() ?? '',
      luckyTail: json['luckyTail']?.toString() ?? '',
      userElement: json['userElement']?.toString() ?? '',
    );
  }
}

class FortuneCastResult {
  const FortuneCastResult({
    required this.luckyTail,
    required this.primaryTail,
    required this.fallbackUsed,
    required this.userElement,
    required this.dayElement,
    required this.prose,
    required this.proseSource,
    required this.castDate,
    required this.sellableDrawDate,
    required this.buyPath,
    required this.alreadyCastToday,
    this.fallbackReason,
    this.previousCastSummary,
    this.nextUnlockAt,
  });

  final String luckyTail;
  final String primaryTail;
  final bool fallbackUsed;
  final String? fallbackReason;
  final String userElement;
  final String dayElement;
  final String prose;
  final String proseSource;
  final String castDate;
  final String sellableDrawDate;
  final String buyPath;
  final bool alreadyCastToday;
  final FortuneCastPreviousSummary? previousCastSummary;
  final DateTime? nextUnlockAt;

  factory FortuneCastResult.fromJson(Map<String, dynamic> json) {
    final previous = json['previousCastSummary'];
    return FortuneCastResult(
      luckyTail: json['luckyTail']?.toString() ?? '',
      primaryTail: json['primaryTail']?.toString() ?? '',
      fallbackUsed: json['fallbackUsed'] == true,
      fallbackReason: json['fallbackReason']?.toString(),
      userElement: json['userElement']?.toString() ?? '',
      dayElement: json['dayElement']?.toString() ?? '',
      prose: json['prose']?.toString() ?? '',
      proseSource: json['proseSource']?.toString() ?? '',
      castDate: json['castDate']?.toString() ?? '',
      sellableDrawDate: json['sellableDrawDate']?.toString() ?? '',
      buyPath: json['buyPath']?.toString() ?? '',
      alreadyCastToday: json['alreadyCastToday'] == true,
      previousCastSummary: previous is Map<String, dynamic>
          ? FortuneCastPreviousSummary.fromJson(previous)
          : null,
      nextUnlockAt: _parseInstant(json['nextUnlockAt']),
    );
  }

  FortuneCastResult copyWith({
    bool? alreadyCastToday,
    DateTime? nextUnlockAt,
    bool clearNextUnlockAt = false,
  }) {
    return FortuneCastResult(
      luckyTail: luckyTail,
      primaryTail: primaryTail,
      fallbackUsed: fallbackUsed,
      fallbackReason: fallbackReason,
      userElement: userElement,
      dayElement: dayElement,
      prose: prose,
      proseSource: proseSource,
      castDate: castDate,
      sellableDrawDate: sellableDrawDate,
      buyPath: buyPath,
      alreadyCastToday: alreadyCastToday ?? this.alreadyCastToday,
      previousCastSummary: previousCastSummary,
      nextUnlockAt: clearNextUnlockAt
          ? null
          : (nextUnlockAt ?? this.nextUnlockAt),
    );
  }

  static DateTime? _parseInstant(Object? value) {
    if (value == null) return null;
    return DateTime.tryParse(value.toString())?.toLocal();
  }
}

class CastFortunePayload {
  const CastFortunePayload({
    this.birthYear,
    this.birthDate,
    this.randomElement = false,
  });

  final int? birthYear;
  final String? birthDate;
  final bool randomElement;

  Map<String, dynamic> toJson() {
    final body = <String, dynamic>{};
    if (birthDate != null && birthDate!.isNotEmpty) {
      body['birthDate'] = birthDate;
    } else if (birthYear != null) {
      body['birthYear'] = birthYear;
    }
    if (randomElement) {
      body['randomElement'] = true;
      if (body['birthYear'] == null && body['birthDate'] == null) {
        body['birthYear'] = DateTime.now().year;
      }
    }
    return body;
  }
}
