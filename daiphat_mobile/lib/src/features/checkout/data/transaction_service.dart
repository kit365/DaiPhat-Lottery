import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import '../models/transaction_type.dart';
import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';

class TransactionService {
  static const _baseTransactions = '/transactions';

  final ApiClient _apiClient;

  TransactionService(this._apiClient);

  Future<List<EnumOption>> getTransactionTypes() async {
    final response = await _apiClient.get('$_baseTransactions/types');
    final data = response['data'];
    if (data is List) {
      return data
          .map((e) => EnumOption.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<PaymentResult> processPayment({
    required String orderId,
    required ProcessPaymentRequest request,
  }) async {
    final response = await _apiClient.post(
      '$_baseTransactions/$orderId/payment',
      data: request.toJson(),
    );
    final data = response['data'] as Map<String, dynamic>;
    return PaymentResult.fromJson(data);
  }

  Future<PendingPaymentCountdownResult> getPendingPaymentCountdown(
    String orderId,
  ) async {
    final response = await _apiClient.get(
      '$_baseTransactions/$orderId/payment/countdown',
    );
    final data = response['data'] as Map<String, dynamic>;
    return PendingPaymentCountdownResult.fromJson(data);
  }

  Future<OrderResponse> syncOnlinePayment(String orderId) async {
    final response = await _apiClient.post(
      '$_baseTransactions/$orderId/payment/sync',
    );
    final data = response['data'] as Map<String, dynamic>;
    return OrderResponse.fromJson(data);
  }

  Future<OrderResponse> cancelPayment({
    required String orderId,
    int? transactionId,
    required String gateway,
    String? reason,
  }) async {
    final response = await _apiClient.post(
      '$_baseTransactions/$orderId/payment/cancel',
      data: {
        if (transactionId != null && transactionId > 0)
          'transactionId': transactionId,
        'gateway': gateway,
        if (reason != null && reason.isNotEmpty) 'reason': reason,
      },
    );
    final data = response['data'] as Map<String, dynamic>;
    return OrderResponse.fromJson(data);
  }
}
