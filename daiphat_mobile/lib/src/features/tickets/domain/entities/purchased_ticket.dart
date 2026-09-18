import 'package:daiphat_mobile/src/shared/domain/entities/pagination_meta.dart';

class PurchasedTicket {
  final String orderId;
  final String orderCode;
  final int? orderDetailId;
  final int ticketId;
  final int? serialId;
  final String? serialNumber;
  final String? serialStatus;
  final String? orderDetailStatus;
  final String? payoutState;
  final String numbers;
  final String? stationName;
  final String drawDate;
  final int price;
  final String purchasedAt;
  final String drawResultStatus;
  final String? matchedPrizeCode;
  final String? matchedPrizeDisplayName;
  final int? prizeAmount;
  final int? activePayoutRequestId;
  final String? activePayoutStatus;
  final String? orderType;
  final String? receiveType;
  final String? actualPickedUpAt;
  final String? handedOverAt;
  final String? rejectedAt;
  final String? claimChannel;
  final bool? canClaimOnline;
  final bool requiresStationOfficeRedemption;
  final String? customerRedemptionDeadline;
  final String? issuerRedemptionDeadline;
  final String? redemptionZone;
  final int? daysRemainingToIssuer;

  const PurchasedTicket({
    required this.orderId,
    required this.orderCode,
    this.orderDetailId,
    required this.ticketId,
    this.serialId,
    this.serialNumber,
    this.serialStatus,
    this.orderDetailStatus,
    this.payoutState,
    required this.numbers,
    this.stationName,
    required this.drawDate,
    required this.price,
    required this.purchasedAt,
    required this.drawResultStatus,
    this.matchedPrizeCode,
    this.matchedPrizeDisplayName,
    this.prizeAmount,
    this.activePayoutRequestId,
    this.activePayoutStatus,
    this.orderType,
    this.receiveType,
    this.actualPickedUpAt,
    this.handedOverAt,
    this.rejectedAt,
    this.claimChannel,
    this.canClaimOnline,
    this.requiresStationOfficeRedemption = false,
    this.customerRedemptionDeadline,
    this.issuerRedemptionDeadline,
    this.redemptionZone,
    this.daysRemainingToIssuer,
  });

  factory PurchasedTicket.fromJson(Map<String, dynamic> json) {
    return PurchasedTicket(
      orderId: json['orderId']?.toString() ?? '',
      orderCode: json['orderCode']?.toString() ?? '',
      orderDetailId: json['orderDetailId'] as int?,
      ticketId: json['ticketId'] as int? ?? 0,
      serialId: json['serialId'] as int?,
      serialNumber: json['serialNumber']?.toString(),
      serialStatus: json['serialStatus']?.toString(),
      orderDetailStatus: json['orderDetailStatus']?.toString(),
      payoutState: json['payoutState']?.toString(),
      numbers: json['numbers']?.toString() ?? '',
      stationName: json['stationName']?.toString(),
      drawDate: json['drawDate']?.toString() ?? '',
      price: _parseInt(json['price']),
      purchasedAt: json['purchasedAt']?.toString() ?? '',
      drawResultStatus: json['drawResultStatus']?.toString() ?? 'PENDING_DRAW',
      matchedPrizeCode: json['matchedPrizeCode']?.toString(),
      matchedPrizeDisplayName: json['matchedPrizeDisplayName']?.toString(),
      prizeAmount: json['prizeAmount'] == null
          ? null
          : _parseInt(json['prizeAmount']),
      activePayoutRequestId: json['activePayoutRequestId'] as int?,
      activePayoutStatus: json['activePayoutStatus']?.toString(),
      orderType: json['orderType']?.toString(),
      receiveType: json['receiveType']?.toString(),
      actualPickedUpAt: json['actualPickedUpAt']?.toString(),
      handedOverAt: json['handedOverAt']?.toString(),
      rejectedAt: json['rejectedAt']?.toString(),
      claimChannel: json['claimChannel']?.toString(),
      canClaimOnline: json['canClaimOnline'] as bool?,
      requiresStationOfficeRedemption:
          json['requiresStationOfficeRedemption'] as bool? ?? false,
      customerRedemptionDeadline: json['customerRedemptionDeadline']
          ?.toString(),
      issuerRedemptionDeadline: json['issuerRedemptionDeadline']?.toString(),
      redemptionZone: json['redemptionZone']?.toString(),
      daysRemainingToIssuer: json['daysRemainingToIssuer'] as int?,
    );
  }

  static int _parseInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is double) return value.toInt();
    return int.tryParse(value.toString()) ?? 0;
  }

  PurchasedTicket copyWith({
    String? orderId,
    String? orderCode,
    int? orderDetailId,
    int? ticketId,
    int? serialId,
    String? serialNumber,
    String? serialStatus,
    String? orderDetailStatus,
    String? payoutState,
    String? numbers,
    String? stationName,
    String? drawDate,
    int? price,
    String? purchasedAt,
    String? drawResultStatus,
    String? matchedPrizeCode,
    String? matchedPrizeDisplayName,
    int? prizeAmount,
    int? activePayoutRequestId,
    String? activePayoutStatus,
    String? orderType,
    String? receiveType,
    String? actualPickedUpAt,
    String? handedOverAt,
    String? rejectedAt,
    String? claimChannel,
    bool? canClaimOnline,
    bool? requiresStationOfficeRedemption,
    String? customerRedemptionDeadline,
    String? issuerRedemptionDeadline,
    String? redemptionZone,
    int? daysRemainingToIssuer,
  }) {
    return PurchasedTicket(
      orderId: orderId ?? this.orderId,
      orderCode: orderCode ?? this.orderCode,
      orderDetailId: orderDetailId ?? this.orderDetailId,
      ticketId: ticketId ?? this.ticketId,
      serialId: serialId ?? this.serialId,
      serialNumber: serialNumber ?? this.serialNumber,
      serialStatus: serialStatus ?? this.serialStatus,
      orderDetailStatus: orderDetailStatus ?? this.orderDetailStatus,
      payoutState: payoutState ?? this.payoutState,
      numbers: numbers ?? this.numbers,
      stationName: stationName ?? this.stationName,
      drawDate: drawDate ?? this.drawDate,
      price: price ?? this.price,
      purchasedAt: purchasedAt ?? this.purchasedAt,
      drawResultStatus: drawResultStatus ?? this.drawResultStatus,
      matchedPrizeCode: matchedPrizeCode ?? this.matchedPrizeCode,
      matchedPrizeDisplayName:
          matchedPrizeDisplayName ?? this.matchedPrizeDisplayName,
      prizeAmount: prizeAmount ?? this.prizeAmount,
      activePayoutRequestId:
          activePayoutRequestId ?? this.activePayoutRequestId,
      activePayoutStatus: activePayoutStatus ?? this.activePayoutStatus,
      orderType: orderType ?? this.orderType,
      receiveType: receiveType ?? this.receiveType,
      actualPickedUpAt: actualPickedUpAt ?? this.actualPickedUpAt,
      handedOverAt: handedOverAt ?? this.handedOverAt,
      rejectedAt: rejectedAt ?? this.rejectedAt,
      claimChannel: claimChannel ?? this.claimChannel,
      canClaimOnline: canClaimOnline ?? this.canClaimOnline,
      requiresStationOfficeRedemption:
          requiresStationOfficeRedemption ??
          this.requiresStationOfficeRedemption,
      customerRedemptionDeadline:
          customerRedemptionDeadline ?? this.customerRedemptionDeadline,
      issuerRedemptionDeadline:
          issuerRedemptionDeadline ?? this.issuerRedemptionDeadline,
      redemptionZone: redemptionZone ?? this.redemptionZone,
      daysRemainingToIssuer:
          daysRemainingToIssuer ?? this.daysRemainingToIssuer,
    );
  }

  String get detailRouteId =>
      orderDetailId?.toString() ??
      '$orderId-$ticketId-${serialNumber ?? numbers}';
}

class PurchasedTicketsPageResponse {
  final List<PurchasedTicket> records;
  final PaginationMeta pagination;

  const PurchasedTicketsPageResponse({
    required this.records,
    required this.pagination,
  });

  factory PurchasedTicketsPageResponse.fromJson(Map<String, dynamic> json) {
    final list = json['recordList'] as List<dynamic>? ?? [];
    return PurchasedTicketsPageResponse(
      records: list
          .map((e) => PurchasedTicket.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: PaginationMeta.fromJson(
        json['pagination'] as Map<String, dynamic>? ?? {},
      ),
    );
  }
}

class TicketSummaryStats {
  final int pendingCount;
  final int drawnCount;
  final int wonCount;

  const TicketSummaryStats({
    required this.pendingCount,
    required this.drawnCount,
    required this.wonCount,
  });

  static const empty = TicketSummaryStats(
    pendingCount: 0,
    drawnCount: 0,
    wonCount: 0,
  );
}
