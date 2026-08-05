import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import '../models/transaction_type.dart';

class TransactionService {
  final ApiClient _apiClient;

  TransactionService(this._apiClient);

  Future<List<EnumOption>> getTransactionTypes() async {
    final response = await _apiClient.get('/transactions/types');
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
      '/transactions/$orderId/payment',
      data: request.toJson(),
    );
    final data = response['data'] as Map<String, dynamic>;
    return PaymentResult.fromJson(data);
  }

  Future<PendingPaymentCountdownResult> getPendingPaymentCountdown(
    String orderId,
  ) async {
    final response = await _apiClient.get(
      '/transactions/$orderId/payment/countdown',
    );
    final data = response['data'] as Map<String, dynamic>;
    return PendingPaymentCountdownResult.fromJson(data);
  }
}
