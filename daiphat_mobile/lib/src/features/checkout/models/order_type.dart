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
  pendingPayment('PENDING_PAYMENT'),
  paid('PAID'),
  preparing('PREPARING'),
  pendingPickup('PENDING_PICKUP'),
  completed('COMPLETED'),
  cancelled('CANCELLED');

  final String value;
  const OrderStatus(this.value);

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
  final List<TransactionResponse>? transactions;

  const OrderResponse({
    required this.id,
    required this.orderCode,
    required this.totalAmount,
    required this.status,
    this.transactions,
  });

  factory OrderResponse.fromJson(Map<String, dynamic> json) {
    return OrderResponse(
      id: json['id']?.toString() ?? '',
      orderCode: json['orderCode']?.toString() ?? '',
      totalAmount: json['totalAmount'] as int? ?? 0,
      status: json['status']?.toString() ?? '',
      transactions: (json['transactions'] as List<dynamic>?)
          ?.map((e) => TransactionResponse.fromJson(e as Map<String, dynamic>))
          .toList(),
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
