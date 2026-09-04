import '../../models/transaction_type.dart';

abstract interface class TransactionRepository {
  Future<List<EnumOption>> getTransactionTypes();

  Future<PaymentResult> processPayment({
    required String orderId,
    required ProcessPaymentRequest request,
  });

  Future<PendingPaymentCountdownResult> getPendingPaymentCountdown(
    String orderId,
  );
}
