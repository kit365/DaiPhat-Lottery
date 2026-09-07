import 'package:daiphat_mobile/src/features/bank_accounts/domain/entities/bank_account.dart';
import 'package:daiphat_mobile/src/shared/domain/entities/pagination_meta.dart';

/// Trạng thái xử lý của một yêu cầu hoàn tiền (đồng bộ với BE / FE web).
enum RefundRequestStatus {
  waitingForInfo('WAITING_FOR_INFO', 'Chờ thông tin STK'),
  approved('APPROVED', 'Đã duyệt'),
  readyToPay('READY_TO_PAY', 'Chờ chuyển khoản'),
  transferred('TRANSFERRED', 'Đã chuyển khoản'),
  paid('PAID', 'Đã chuyển khoản'),
  manualResolution('MANUAL_RESOLUTION', 'Cần xử lý thủ công');

  final String value;
  final String label;
  const RefundRequestStatus(this.value, this.label);

  static RefundRequestStatus fromValue(String? value) {
    return RefundRequestStatus.values.firstWhere(
      (e) => e.value == value,
      orElse: () => RefundRequestStatus.waitingForInfo,
    );
  }

  bool get isTransferComplete =>
      this == RefundRequestStatus.paid || this == RefundRequestStatus.transferred;
}

enum RefundType {
  fullOrder('FULL_ORDER', 'Hoàn cả đơn'),
  orderDetail('ORDER_DETAIL', 'Hoàn từng vé');

  final String value;
  final String label;
  const RefundType(this.value, this.label);

  static RefundType fromValue(String? value) {
    return RefundType.values.firstWhere(
      (e) => e.value == value,
      orElse: () => RefundType.fullOrder,
    );
  }
}

/// Vé nằm trong một yêu cầu hoàn tiền (bản đầy đủ cho màn chi tiết).
class RefundTicketItem {
  final int? orderDetailId;
  final String? numbers;
  final String? serialNumber;
  final String? stationName;
  final String? drawDate;
  final String? ticketImg;
  final int quantity;
  final int unitPrice;
  final int subtotalAmount;
  final bool hasIncident;
  final String? serialStatus;
  final String? ticketCondition;

  const RefundTicketItem({
    this.orderDetailId,
    this.numbers,
    this.serialNumber,
    this.stationName,
    this.drawDate,
    this.ticketImg,
    required this.quantity,
    required this.unitPrice,
    required this.subtotalAmount,
    this.hasIncident = false,
    this.serialStatus,
    this.ticketCondition,
  });

  factory RefundTicketItem.fromJson(Map<String, dynamic> json) {
    return RefundTicketItem(
      orderDetailId: json['orderDetailId'] as int?,
      numbers: json['numbers']?.toString(),
      serialNumber: json['serialNumber']?.toString(),
      stationName: json['stationName']?.toString(),
      drawDate: json['drawDate']?.toString(),
      ticketImg: json['ticketImg']?.toString(),
      quantity: _parseInt(json['quantity']),
      unitPrice: _parseInt(json['unitPrice']),
      subtotalAmount: _parseInt(json['subtotalAmount']),
      hasIncident: json['hasIncident'] as bool? ?? false,
      serialStatus: json['serialStatus']?.toString(),
      ticketCondition: json['ticketCondition']?.toString(),
    );
  }
}

/// Giao dịch chi hoàn tiền (khi đã chuyển khoản).
class RefundPayoutTransaction {
  final String? paidAt;
  final String? note;
  final String? paymentEvidenceUrl;

  const RefundPayoutTransaction({
    this.paidAt,
    this.note,
    this.paymentEvidenceUrl,
  });

  factory RefundPayoutTransaction.fromJson(Map<String, dynamic> json) {
    return RefundPayoutTransaction(
      paidAt: json['paidAt']?.toString(),
      note: json['note']?.toString(),
      paymentEvidenceUrl: json['paymentEvidenceUrl']?.toString(),
    );
  }
}

class RefundRequestResponse {
  final int id;
  final RefundType refundType;
  final String? orderId;
  final String? orderCode;
  final RefundRequestStatus status;
  final int refundAmount;
  final String refundReason;
  final int? bankAccountId;
  final UserBankAccountResponse? bankAccount;
  final String? operatorNote;
  final int retryCount;
  final int maxRefundBankInfoRetry;
  final RefundPayoutTransaction? payoutTransaction;
  final List<RefundTicketItem> refundTickets;
  final List<int> orderDetailIds;
  final String createdAt;
  final String updatedAt;
  final String? reviewedAt;

  const RefundRequestResponse({
    required this.id,
    required this.refundType,
    required this.status,
    required this.refundAmount,
    required this.refundReason,
    required this.createdAt,
    required this.updatedAt,
    this.orderId,
    this.orderCode,
    this.bankAccountId,
    this.bankAccount,
    this.operatorNote,
    this.retryCount = 0,
    this.maxRefundBankInfoRetry = 3,
    this.payoutTransaction,
    this.refundTickets = const [],
    this.orderDetailIds = const [],
    this.reviewedAt,
  });

  factory RefundRequestResponse.fromJson(Map<String, dynamic> json) {
    final ticketsJson = json['refundTickets'] as List<dynamic>? ?? const [];
    final detailIdsJson = json['orderDetailIds'] as List<dynamic>? ?? const [];
    return RefundRequestResponse(
      id: json['id'] as int? ?? 0,
      refundType: RefundType.fromValue(json['refundType']?.toString()),
      orderId: json['orderId']?.toString(),
      orderCode: json['orderCode']?.toString(),
      status: RefundRequestStatus.fromValue(json['status']?.toString()),
      refundAmount: _parseInt(json['refundAmount']),
      refundReason: json['refundReason']?.toString() ?? '',
      bankAccountId: json['bankAccountId'] as int?,
      bankAccount: json['bankAccount'] is Map<String, dynamic>
          ? UserBankAccountResponse.fromJson(
              json['bankAccount'] as Map<String, dynamic>,
            )
          : null,
      operatorNote: json['operatorNote']?.toString(),
      retryCount: json['retryCount'] as int? ?? 0,
      maxRefundBankInfoRetry: json['maxRefundBankInfoRetry'] as int? ?? 3,
      payoutTransaction: json['payoutTransaction'] is Map<String, dynamic>
          ? RefundPayoutTransaction.fromJson(
              json['payoutTransaction'] as Map<String, dynamic>,
            )
          : null,
      refundTickets: ticketsJson
          .map((e) => RefundTicketItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      orderDetailIds: detailIdsJson
          .map((e) => e is int ? e : int.tryParse(e.toString()) ?? 0)
          .toList(),
      createdAt: json['createdAt']?.toString() ?? '',
      updatedAt: json['updatedAt']?.toString() ?? '',
      reviewedAt: json['reviewedAt']?.toString(),
    );
  }
}

/// Trang danh sách yêu cầu hoàn tiền kèm số đếm theo trạng thái.
class RefundPageResult {
  final List<RefundRequestResponse> records;
  final PaginationMeta pagination;
  final Map<String, int> statusCounts;

  const RefundPageResult({
    required this.records,
    required this.pagination,
    required this.statusCounts,
  });

  factory RefundPageResult.fromJson(Map<String, dynamic> json) {
    final list = json['recordList'] as List<dynamic>? ?? const [];
    return RefundPageResult(
      records: list
          .map((e) => RefundRequestResponse.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: PaginationMeta.fromJson(
        json['pagination'] as Map<String, dynamic>? ?? {},
      ),
      statusCounts: _parseCounts(json['statusCounts']),
    );
  }
}

Map<String, int> _parseCounts(dynamic value) {
  if (value is! Map) return const {};
  final result = <String, int>{};
  value.forEach((key, v) {
    result[key.toString()] = _parseInt(v);
  });
  return result;
}

int _parseInt(dynamic value) {
  if (value == null) return 0;
  if (value is int) return value;
  if (value is double) return value.toInt();
  return int.tryParse(value.toString()) ?? 0;
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
  final int? maxRefundRequestsPerDay;
  final int? refundRequestsSubmittedToday;
  final bool dailyLimitReached;

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
    this.maxRefundRequestsPerDay,
    this.refundRequestsSubmittedToday,
    this.dailyLimitReached = false,
  });

  factory OrderRefundEligibilityResponse.fromJson(Map<String, dynamic> json) {
    final tickets = json['refundTickets'] as List<dynamic>? ?? const [];
    return OrderRefundEligibilityResponse(
      eligible: json['eligible'] as bool? ?? false,
      reason: json['reason']?.toString(),
      remainingSeconds: (json['remainingSeconds'] as num?)?.toInt(),
      graceMinutes: (json['graceMinutes'] as num?)?.toInt() ?? 0,
      refundDeadlineAt: json['refundDeadlineAt']?.toString(),
      paymentSuccessAt: json['paymentSuccessAt']?.toString(),
      orderId: json['orderId']?.toString(),
      orderCode: json['orderCode']?.toString(),
      orderStatus: json['orderStatus']?.toString(),
      orderTotalAmount: (json['orderTotalAmount'] as num?)?.toInt(),
      orderCreatedAt: json['orderCreatedAt']?.toString(),
      refundTickets: tickets
          .map((e) => RefundEligibleTicketItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalRefundAmount: (json['totalRefundAmount'] as num?)?.toInt(),
      maxRefundRequestsPerDay: (json['maxRefundRequestsPerDay'] as num?)?.toInt(),
      refundRequestsSubmittedToday:
          (json['refundRequestsSubmittedToday'] as num?)?.toInt(),
      dailyLimitReached: json['dailyLimitReached'] as bool? ?? false,
    );
  }
}

String formatRefundCountdown(int totalSeconds) {
  final seconds = totalSeconds < 0 ? 0 : totalSeconds;
  final minutes = seconds ~/ 60;
  final secs = seconds % 60;
  return '${minutes.toString().padLeft(2, '0')} phút ${secs.toString().padLeft(2, '0')} giây';
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
