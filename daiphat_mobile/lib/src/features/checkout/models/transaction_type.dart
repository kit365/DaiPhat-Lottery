enum PaymentGateway {
  payos('PAYOS');

  final String value;
  const PaymentGateway(this.value);

  static PaymentGateway fromValue(String value) {
    return PaymentGateway.values.firstWhere(
      (e) => e.value == value,
      orElse: () => PaymentGateway.payos,
    );
  }
}

enum TransactionStatus {
  pending('PENDING'),
  completed('COMPLETED'),
  failed('FAILED'),
  cancelled('CANCELLED'),
  refunded('REFUNDED');

  final String value;
  const TransactionStatus(this.value);

  static TransactionStatus fromValue(String value) {
    return TransactionStatus.values.firstWhere(
      (e) => e.value == value,
      orElse: () => TransactionStatus.pending,
    );
  }
}

enum TransactionTypeEnum {
  offline('OFFLINE', 'Tiền mặt'),
  online('ONLINE', 'Chuyển khoản');

  final String value;
  final String label;
  const TransactionTypeEnum(this.value, this.label);

  static TransactionTypeEnum fromValue(String value) {
    return TransactionTypeEnum.values.firstWhere(
      (e) => e.value == value,
      orElse: () => TransactionTypeEnum.online,
    );
  }
}

class ProcessPaymentRequest {
  final int transactionId;
  final String gateway;

  const ProcessPaymentRequest({
    required this.transactionId,
    required this.gateway,
  });

  Map<String, dynamic> toJson() => {
    'transactionId': transactionId,
    'gateway': gateway,
  };
}

class PaymentResult {
  final int transactionId;
  final String gateway;
  final int? gatewayOrderCode;
  final String? paymentRef;
  final String? checkoutUrl;
  final String status;

  const PaymentResult({
    required this.transactionId,
    required this.gateway,
    this.gatewayOrderCode,
    this.paymentRef,
    this.checkoutUrl,
    required this.status,
  });

  factory PaymentResult.fromJson(Map<String, dynamic> json) {
    return PaymentResult(
      transactionId: json['transactionId'] as int? ?? 0,
      gateway: json['gateway']?.toString() ?? '',
      gatewayOrderCode: json['gatewayOrderCode'] as int?,
      paymentRef: json['paymentRef']?.toString(),
      checkoutUrl: json['checkoutUrl']?.toString(),
      status: json['status']?.toString() ?? '',
    );
  }
}

class EnumOption {
  final String value;
  final String label;

  const EnumOption({required this.value, required this.label});

  factory EnumOption.fromJson(Map<String, dynamic> json) {
    return EnumOption(
      value: json['value']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
    );
  }
}
