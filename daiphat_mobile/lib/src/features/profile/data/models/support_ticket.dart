import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';

enum TicketStatus {
  open('OPEN', 'Mới tạo'),
  inProgress('IN_PROGRESS', 'Đang xử lý'),
  waitingForCustomer('WAITING_FOR_CUSTOMER', 'Chờ khách phản hồi'),
  resolved('RESOLVED', 'Đã giải quyết'),
  rejected('REJECTED', 'Đã từ chối'),
  closed('CLOSED', 'Đã đóng');

  final String value;
  final String label;
  const TicketStatus(this.value, this.label);

  static TicketStatus fromValue(String? value) {
    return TicketStatus.values.firstWhere(
      (e) => e.value == value,
      orElse: () => TicketStatus.open,
    );
  }

  bool get isTerminal =>
      this == TicketStatus.resolved ||
      this == TicketStatus.rejected ||
      this == TicketStatus.closed;
}

enum TicketRefType {
  order('ORDER', 'Đơn hàng'),
  paymentTransaction('PAYMENT_TRANSACTION', 'Giao dịch thanh toán'),
  prizeClaim('PRIZE_CLAIM', 'Yêu cầu nhận thưởng'),
  refundRequest('REFUND_REQUEST', 'Yêu cầu hoàn tiền');

  final String value;
  final String label;
  const TicketRefType(this.value, this.label);

  static TicketRefType? fromValue(String? value) {
    if (value == null) return null;
    for (final e in TicketRefType.values) {
      if (e.value == value) return e;
    }
    return null;
  }
}

enum TicketCommentSenderRole {
  customer('CUSTOMER'),
  operator('OPERATOR'),
  system('SYSTEM');

  final String value;
  const TicketCommentSenderRole(this.value);

  static TicketCommentSenderRole fromValue(String? value) {
    return TicketCommentSenderRole.values.firstWhere(
      (e) => e.value == value,
      orElse: () => TicketCommentSenderRole.system,
    );
  }
}

class TicketCategoryResponse {
  final int id;
  final String name;
  final String code;
  final String description;
  final int priority;
  final TicketRefType? requiredRefType;
  final bool isActive;

  const TicketCategoryResponse({
    required this.id,
    required this.name,
    required this.code,
    required this.description,
    required this.priority,
    required this.isActive,
    this.requiredRefType,
  });

  factory TicketCategoryResponse.fromJson(Map<String, dynamic> json) {
    return TicketCategoryResponse(
      id: json['id'] as int? ?? 0,
      name: json['name']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      priority: json['priority'] as int? ?? 0,
      requiredRefType: TicketRefType.fromValue(json['requiredRefType']?.toString()),
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}

class SupportTicketCommentResponse {
  final int id;
  final String? senderId;
  final TicketCommentSenderRole senderRole;
  final String content;
  final String? attachmentUrl;
  final String createdAt;

  const SupportTicketCommentResponse({
    required this.id,
    required this.senderRole,
    required this.content,
    required this.createdAt,
    this.senderId,
    this.attachmentUrl,
  });

  factory SupportTicketCommentResponse.fromJson(Map<String, dynamic> json) {
    return SupportTicketCommentResponse(
      id: json['id'] as int? ?? 0,
      senderId: json['senderId']?.toString(),
      senderRole:
          TicketCommentSenderRole.fromValue(json['senderRole']?.toString()),
      content: json['content']?.toString() ?? '',
      attachmentUrl: json['attachmentUrl']?.toString(),
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }
}

class SupportTicketSummaryResponse {
  final int id;
  final int ticketCategoryId;
  final String title;
  final TicketStatus status;
  final String? refId;
  final TicketRefType? refType;
  final String? dueAt;
  final String createdAt;
  final String updatedAt;

  const SupportTicketSummaryResponse({
    required this.id,
    required this.ticketCategoryId,
    required this.title,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.refId,
    this.refType,
    this.dueAt,
  });

  factory SupportTicketSummaryResponse.fromJson(Map<String, dynamic> json) {
    return SupportTicketSummaryResponse(
      id: json['id'] as int? ?? 0,
      ticketCategoryId: json['ticketCategoryId'] as int? ?? 0,
      title: json['title']?.toString() ?? '',
      status: TicketStatus.fromValue(json['status']?.toString()),
      refId: json['refId']?.toString(),
      refType: TicketRefType.fromValue(json['refType']?.toString()),
      dueAt: json['dueAt']?.toString(),
      createdAt: json['createdAt']?.toString() ?? '',
      updatedAt: json['updatedAt']?.toString() ?? '',
    );
  }
}

class SupportTicketResponse {
  final int id;
  final int ticketCategoryId;
  final String title;
  final String description;
  final String? attachmentUrl;
  final String? refId;
  final TicketRefType? refType;
  final TicketStatus status;
  final String? response;
  final int? resolvedReasonId;
  final int? rejectedReasonId;
  final String? resolvedAt;
  final String? dueAt;
  final String createdAt;
  final String updatedAt;
  final List<SupportTicketCommentResponse> comments;
  final String? ticketCategoryName;
  final String? ticketCategoryCode;

  const SupportTicketResponse({
    required this.id,
    required this.ticketCategoryId,
    required this.title,
    required this.description,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.attachmentUrl,
    this.refId,
    this.refType,
    this.response,
    this.resolvedReasonId,
    this.rejectedReasonId,
    this.resolvedAt,
    this.dueAt,
    this.comments = const [],
    this.ticketCategoryName,
    this.ticketCategoryCode,
  });

  factory SupportTicketResponse.fromJson(Map<String, dynamic> json) {
    final commentsJson = json['comments'] as List<dynamic>? ?? const [];
    return SupportTicketResponse(
      id: json['id'] as int? ?? 0,
      ticketCategoryId: json['ticketCategoryId'] as int? ?? 0,
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      attachmentUrl: json['attachmentUrl']?.toString(),
      refId: json['refId']?.toString(),
      refType: TicketRefType.fromValue(json['refType']?.toString()),
      status: TicketStatus.fromValue(json['status']?.toString()),
      response: json['response']?.toString(),
      resolvedReasonId: json['resolvedReasonId'] as int?,
      rejectedReasonId: json['rejectedReasonId'] as int?,
      resolvedAt: json['resolvedAt']?.toString(),
      dueAt: json['dueAt']?.toString(),
      createdAt: json['createdAt']?.toString() ?? '',
      updatedAt: json['updatedAt']?.toString() ?? '',
      comments: commentsJson
          .map((e) =>
              SupportTicketCommentResponse.fromJson(e as Map<String, dynamic>))
          .toList(),
      ticketCategoryName: json['ticketCategoryName']?.toString(),
      ticketCategoryCode: json['ticketCategoryCode']?.toString(),
    );
  }
}

class SupportTicketPageResult {
  final List<SupportTicketSummaryResponse> records;
  final PaginationMeta pagination;

  const SupportTicketPageResult({
    required this.records,
    required this.pagination,
  });

  factory SupportTicketPageResult.fromJson(Map<String, dynamic> json) {
    final list = json['recordList'] as List<dynamic>? ?? const [];
    return SupportTicketPageResult(
      records: list
          .map((e) =>
              SupportTicketSummaryResponse.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: PaginationMeta.fromJson(
        json['pagination'] as Map<String, dynamic>? ?? {},
      ),
    );
  }
}

/// Khách được huỷ/rút khi ticket chưa ở trạng thái kết thúc.
bool canCustomerCancelTicket(TicketStatus status) => !status.isTerminal;

/// Khách chỉ được gửi bình luận khi chưa kết thúc và không gửi 2 lần liên tiếp.
bool canCustomerSendComment(
  TicketStatus status,
  List<SupportTicketCommentResponse> comments,
) {
  if (status.isTerminal) return false;
  final conversational = comments
      .where((c) => c.senderRole != TicketCommentSenderRole.system)
      .toList()
    ..sort((a, b) =>
        (DateTime.tryParse(a.createdAt) ?? DateTime(0))
            .compareTo(DateTime.tryParse(b.createdAt) ?? DateTime(0)));
  if (conversational.isEmpty) return true;
  return conversational.last.senderRole != TicketCommentSenderRole.customer;
}
