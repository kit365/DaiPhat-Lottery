import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';
import 'package:daiphat_mobile/src/features/checkout/models/refund_type.dart';

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
