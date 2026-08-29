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

class LotteryTicketSnapshot {
  final int id;
  final String? province;
  final String? stationName;
  final String? drawDate;
  final String? ticketType;
  final String? symbol;
  final String? numbers;

  const LotteryTicketSnapshot({
    required this.id,
    this.province,
    this.stationName,
    this.drawDate,
    this.ticketType,
    this.symbol,
    this.numbers,
  });

  factory LotteryTicketSnapshot.fromJson(Map<String, dynamic> json) {
    final prov = json['province']?.toString() ??
        json['provinceName']?.toString() ??
        json['stationName']?.toString() ??
        json['station']?.toString() ??
        json['channelName']?.toString();

    final num = json['numbers']?.toString() ??
        json['number']?.toString() ??
        json['serialNumber']?.toString() ??
        json['code']?.toString();

    return LotteryTicketSnapshot(
      id: json['id'] as int? ?? json['ticketId'] as int? ?? 0,
      province: prov,
      stationName: json['stationName']?.toString() ?? prov,
      drawDate: json['drawDate']?.toString(),
      ticketType: json['ticketType']?.toString() ?? json['type']?.toString(),
      symbol: json['symbol']?.toString(),
      numbers: num,
    );
  }
}

class OrderDetailItem {
  final int id;
  final String status;
  final int price;
  final int quantity;
  final int? lotteryTicketSerialId;
  final LotteryTicketSnapshot? lotteryTicket;

  const OrderDetailItem({
    required this.id,
    required this.status,
    required this.price,
    required this.quantity,
    this.lotteryTicketSerialId,
    this.lotteryTicket,
  });

  factory OrderDetailItem.fromJson(Map<String, dynamic> json) {
    final ticketJson = (json['lotteryTicket'] ??
            json['ticket'] ??
            json['lotteryTicketDto'] ??
            json['ticketSnapshot']) as Map<String, dynamic>?;

    LotteryTicketSnapshot? ticket;
    if (ticketJson != null) {
      ticket = LotteryTicketSnapshot.fromJson(ticketJson);
    } else if (json['province'] != null ||
        json['provinceName'] != null ||
        json['stationName'] != null ||
        json['station'] != null ||
        json['drawDate'] != null ||
        json['ticketType'] != null ||
        json['symbol'] != null ||
        json['numbers'] != null ||
        json['number'] != null ||
        json['serialNumber'] != null) {
      ticket = LotteryTicketSnapshot.fromJson(json);
    }

    return OrderDetailItem(
      id: json['id'] as int? ?? 0,
      status: json['status']?.toString() ?? 'ACTIVE',
      price: json['price'] as int? ?? 0,
      quantity: json['quantity'] as int? ?? 1,
      lotteryTicketSerialId: json['lotteryTicketSerialId'] as int?,
      lotteryTicket: ticket,
    );
  }
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
  final String? actualPickedUpAt;
  final String? createdAt;
  final bool? refundEligible;
  final int? refundRemainingSeconds;
  final int? refundGraceMinutes;
  final String? refundPaymentSuccessAt;
  final String? refundDeadlineAt;
  final List<TransactionResponse>? transactions;
  final List<OrderDetailItem>? orderDetails;

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
    this.actualPickedUpAt,
    this.createdAt,
    this.refundEligible,
    this.refundRemainingSeconds,
    this.refundGraceMinutes,
    this.refundPaymentSuccessAt,
    this.refundDeadlineAt,
    this.transactions,
    this.orderDetails,
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
      actualPickedUpAt: json['actualPickedUpAt']?.toString(),
      createdAt: json['createdAt']?.toString(),
      refundEligible: json['refundEligible'] as bool?,
      refundRemainingSeconds: json['refundRemainingSeconds'] as int?,
      refundGraceMinutes: json['refundGraceMinutes'] as int?,
      refundPaymentSuccessAt: json['refundPaymentSuccessAt']?.toString(),
      refundDeadlineAt: json['refundDeadlineAt']?.toString(),
      transactions: (json['transactions'] as List<dynamic>?)
          ?.map((e) => TransactionResponse.fromJson(e as Map<String, dynamic>))
          .toList(),
      orderDetails: (json['orderDetails'] as List<dynamic>?)
          ?.map((e) => OrderDetailItem.fromJson(e as Map<String, dynamic>))
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
