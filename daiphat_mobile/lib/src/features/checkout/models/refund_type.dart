class UserBankAccountResponse {
  final int id;
  final String bankName;
  final String? bankLogo;
  final String bankBin;
  final String bankAccountNo;
  final String bankAccountName;
  final bool isDefault;
  final String? createdAt;
  final String? updatedAt;

  const UserBankAccountResponse({
    required this.id,
    required this.bankName,
    required this.bankBin,
    required this.bankAccountNo,
    required this.bankAccountName,
    required this.isDefault,
    this.bankLogo,
    this.createdAt,
    this.updatedAt,
  });

  factory UserBankAccountResponse.fromJson(Map<String, dynamic> json) {
    return UserBankAccountResponse(
      id: json['id'] as int? ?? 0,
      bankName: json['bankName']?.toString() ?? '',
      bankLogo: json['bankLogo']?.toString(),
      bankBin: json['bankBin']?.toString() ?? '',
      bankAccountNo: json['bankAccountNo']?.toString() ?? '',
      bankAccountName: json['bankAccountName']?.toString() ?? '',
      isDefault: json['isDefault'] as bool? ?? false,
      createdAt: json['createdAt']?.toString(),
      updatedAt: json['updatedAt']?.toString(),
    );
  }
}

class CreateUserBankAccountRequest {
  final String bankBin;
  final String bankAccountNo;
  final String bankAccountName;
  final bool isDefault;
  final bool agreedToRefundTerms;

  const CreateUserBankAccountRequest({
    required this.bankBin,
    required this.bankAccountNo,
    required this.bankAccountName,
    this.isDefault = false,
    required this.agreedToRefundTerms,
  });

  Map<String, dynamic> toJson() => {
        'bankBin': bankBin,
        'bankAccountNo': bankAccountNo,
        'bankAccountName': bankAccountName,
        'isDefault': isDefault,
        'agreedToRefundTerms': agreedToRefundTerms,
      };
}

class VietQrBankResponse {
  final String code;
  final String bin;
  final String name;
  final String shortName;
  final String? logo;

  const VietQrBankResponse({
    required this.code,
    required this.bin,
    required this.name,
    required this.shortName,
    this.logo,
  });

  factory VietQrBankResponse.fromJson(Map<String, dynamic> json) {
    return VietQrBankResponse(
      code: json['code']?.toString() ?? '',
      bin: json['bin']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      shortName: json['shortName']?.toString() ?? '',
      logo: json['logo']?.toString(),
    );
  }
}

class CreateOrderRefundRequest {
  final String refundReason;
  final int bankAccountId;

  const CreateOrderRefundRequest({
    required this.refundReason,
    required this.bankAccountId,
  });

  Map<String, dynamic> toJson() => {
        'refundReason': refundReason,
        'bankAccountId': bankAccountId,
      };
}

class RefundEligibleTicketItem {
  final int? orderDetailId;
  final String? numbers;
  final String? stationName;
  final String? drawDate;
  final int quantity;
  final int unitPrice;
  final int subtotalAmount;

  const RefundEligibleTicketItem({
    this.orderDetailId,
    this.numbers,
    this.stationName,
    this.drawDate,
    required this.quantity,
    required this.unitPrice,
    required this.subtotalAmount,
  });

  factory RefundEligibleTicketItem.fromJson(Map<String, dynamic> json) {
    return RefundEligibleTicketItem(
      orderDetailId: json['orderDetailId'] as int?,
      numbers: json['numbers']?.toString(),
      stationName: json['stationName']?.toString(),
      drawDate: json['drawDate']?.toString(),
      quantity: json['quantity'] as int? ?? 0,
      unitPrice: json['unitPrice'] as int? ?? 0,
      subtotalAmount: json['subtotalAmount'] as int? ?? 0,
    );
  }
}

class OrderRefundEligibilityResponse {
  final bool eligible;
  final String? reason;
  final int? remainingSeconds;
  final int graceMinutes;
  final String? refundDeadlineAt;
  final String? paymentSuccessAt;
  final String? orderId;
  final String? orderCode;
  final String? orderStatus;
  final int? orderTotalAmount;
  final String? orderCreatedAt;
  final List<RefundEligibleTicketItem> refundTickets;
  final int? totalRefundAmount;

  const OrderRefundEligibilityResponse({
    required this.eligible,
    required this.graceMinutes,
    required this.refundTickets,
    this.reason,
    this.remainingSeconds,
    this.refundDeadlineAt,
    this.paymentSuccessAt,
    this.orderId,
    this.orderCode,
    this.orderStatus,
    this.orderTotalAmount,
    this.orderCreatedAt,
    this.totalRefundAmount,
  });

  factory OrderRefundEligibilityResponse.fromJson(Map<String, dynamic> json) {
    final tickets = json['refundTickets'] as List<dynamic>? ?? const [];
    return OrderRefundEligibilityResponse(
      eligible: json['eligible'] as bool? ?? false,
      reason: json['reason']?.toString(),
      remainingSeconds: json['remainingSeconds'] as int?,
      graceMinutes: json['graceMinutes'] as int? ?? 0,
      refundDeadlineAt: json['refundDeadlineAt']?.toString(),
      paymentSuccessAt: json['paymentSuccessAt']?.toString(),
      orderId: json['orderId']?.toString(),
      orderCode: json['orderCode']?.toString(),
      orderStatus: json['orderStatus']?.toString(),
      orderTotalAmount: json['orderTotalAmount'] as int?,
      orderCreatedAt: json['orderCreatedAt']?.toString(),
      refundTickets: tickets
          .map(
            (e) => RefundEligibleTicketItem.fromJson(e as Map<String, dynamic>),
          )
          .toList(),
      totalRefundAmount: json['totalRefundAmount'] as int?,
    );
  }
}

int computeRefundSecondsLeft({
  String? refundDeadlineAt,
  String? paymentSuccessAt,
  int? graceMinutes,
  int? fallbackRemainingSeconds,
}) {
  final now = DateTime.now().millisecondsSinceEpoch;

  if (refundDeadlineAt != null && refundDeadlineAt.isNotEmpty) {
    final deadline = DateTime.tryParse(refundDeadlineAt)?.millisecondsSinceEpoch;
    if (deadline != null) {
      return ((deadline - now) / 1000).floor().clamp(0, 1 << 31);
    }
  }

  if (paymentSuccessAt != null &&
      paymentSuccessAt.isNotEmpty &&
      graceMinutes != null &&
      graceMinutes > 0) {
    final paidAt = DateTime.tryParse(paymentSuccessAt)?.millisecondsSinceEpoch;
    if (paidAt != null) {
      final deadline = paidAt + Duration(minutes: graceMinutes).inMilliseconds;
      return ((deadline - now) / 1000).floor().clamp(0, 1 << 31);
    }
  }

  return (fallbackRemainingSeconds ?? 0).clamp(0, 1 << 31);
}

bool isRefundWindowOpen({
  String? refundDeadlineAt,
  String? paymentSuccessAt,
  int? graceMinutes,
  int? remainingSeconds,
}) {
  return computeRefundSecondsLeft(
        refundDeadlineAt: refundDeadlineAt,
        paymentSuccessAt: paymentSuccessAt,
        graceMinutes: graceMinutes,
        fallbackRemainingSeconds: remainingSeconds,
      ) >
      0;
}
