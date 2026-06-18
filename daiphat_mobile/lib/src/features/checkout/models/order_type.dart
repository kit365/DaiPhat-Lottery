enum OrderReceiveType {
  counterPickup('COUNTER_PICKUP', 'Nhận tại quầy'),
  delivery('DELIVERY', 'Giao tận nơi');

  final String value;
  final String label;
  const OrderReceiveType(this.value, this.label);

  static OrderReceiveType fromValue(String value) {
    return OrderReceiveType.values.firstWhere(
      (e) => e.value == value,
      orElse: () => OrderReceiveType.counterPickup,
    );
  }
}

enum OrderStatus {
  pendingPayment('PENDING_PAYMENT', 'Chờ thanh toán'),
  paid('PAID', 'Đã thanh toán'),
  preparing('PREPARING', 'Đang chuẩn bị'),
  pendingPickup('PENDING_PICKUP', 'Chờ lấy hàng'),
  completed('COMPLETED', 'Hoàn thành'),
  cancelled('CANCELLED', 'Đã hủy');

  final String value;
  final String label;
  const OrderStatus(this.value, this.label);

  static OrderStatus fromValue(String value) {
    return OrderStatus.values.firstWhere(
      (e) => e.value == value,
      orElse: () => OrderStatus.pendingPayment,
    );
  }
}

class CreateOnlineOrderRequest {
  final String name;
  final String phone;
  final List<OrderItemRequest> items;
  final String receiveType;
  final String expectedPickupAt;
  final String? note;

  const CreateOnlineOrderRequest({
    required this.name,
    required this.phone,
    required this.items,
    required this.receiveType,
    required this.expectedPickupAt,
    this.note,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'phone': phone,
    'items': items.map((e) => e.toJson()).toList(),
    'receiveType': receiveType,
    'expectedPickupAt': expectedPickupAt,
    if (note != null) 'note': note,
  };
}

class OrderItemRequest {
  final int lotteryTicketId;
  final int quantity;

  const OrderItemRequest({
    required this.lotteryTicketId,
    required this.quantity,
  });

  Map<String, dynamic> toJson() => {
    'lotteryTicketId': lotteryTicketId,
    'quantity': quantity,
  };
}

class OrderResponse {
  final String id;
  final String orderCode;
  final int totalAmount;
  final String status;
  final String? name;
  final String? phone;
  final String? orderType;
  final String? receiveType;
  final String? expectedPickupAt;
  final String? createdAt;
  final List<TransactionResponse>? transactions;

  const OrderResponse({
    required this.id,
    required this.orderCode,
    required this.totalAmount,
    required this.status,
    this.name,
    this.phone,
    this.orderType,
    this.receiveType,
    this.expectedPickupAt,
    this.createdAt,
    this.transactions,
  });

  factory OrderResponse.fromJson(Map<String, dynamic> json) {
    return OrderResponse(
      id: json['id']?.toString() ?? '',
      orderCode: json['orderCode']?.toString() ?? '',
      totalAmount: json['totalAmount'] as int? ?? 0,
      status: json['status']?.toString() ?? '',
      name: json['name']?.toString(),
      phone: json['phone']?.toString(),
      orderType: json['orderType']?.toString(),
      receiveType: json['receiveType']?.toString(),
      expectedPickupAt: json['expectedPickupAt']?.toString(),
      createdAt: json['createdAt']?.toString(),
      transactions: (json['transactions'] as List<dynamic>?)
          ?.map((e) => TransactionResponse.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class PaginationMeta {
  final int totalRecords;
  final int totalPages;
  final int currentPage;
  final int limit;
  final bool isLast;

  const PaginationMeta({
    required this.totalRecords,
    required this.totalPages,
    required this.currentPage,
    required this.limit,
    required this.isLast,
  });

  factory PaginationMeta.fromJson(Map<String, dynamic> json) {
    return PaginationMeta(
      totalRecords: json['totalRecords'] as int? ?? 0,
      totalPages: json['totalPages'] as int? ?? 0,
      currentPage: json['currentPage'] as int? ?? 1,
      limit: json['limit'] as int? ?? 10,
      isLast: json['isLast'] as bool? ?? true,
    );
  }
}

class OrdersPageResponse {
  final List<OrderResponse> records;
  final PaginationMeta pagination;

  const OrdersPageResponse({
    required this.records,
    required this.pagination,
  });

  factory OrdersPageResponse.fromJson(Map<String, dynamic> json) {
    final list = json['recordList'] as List<dynamic>? ?? [];
    return OrdersPageResponse(
      records: list
          .map((e) => OrderResponse.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: PaginationMeta.fromJson(
        json['pagination'] as Map<String, dynamic>? ?? {},
      ),
    );
  }
}

class TransactionResponse {
  final int id;
  final String orderId;
  final int amount;
  final String gateway;
  final int? gatewayOrderCode;
  final String? paymentRef;
  final String status;
  final String type;

  const TransactionResponse({
    required this.id,
    required this.orderId,
    required this.amount,
    required this.gateway,
    this.gatewayOrderCode,
    this.paymentRef,
    required this.status,
    required this.type,
  });

  factory TransactionResponse.fromJson(Map<String, dynamic> json) {
    return TransactionResponse(
      id: json['id'] as int? ?? 0,
      orderId: json['orderId']?.toString() ?? '',
      amount: json['amount'] as int? ?? 0,
      gateway: json['gateway']?.toString() ?? '',
      gatewayOrderCode: json['gatewayOrderCode'] as int?,
      paymentRef: json['paymentRef']?.toString(),
      status: json['status']?.toString() ?? '',
      type: json['type']?.toString() ?? '',
    );
  }
}
