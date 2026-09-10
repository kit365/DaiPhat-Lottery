import '../../models/transaction_type.dart';
import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';

abstract interface class TransactionRepository {
  Future<List<EnumOption>> getTransactionTypes();

  Future<PaymentResult> processPayment({
    required String orderId,
    required ProcessPaymentRequest request,
  });

  Future<PendingPaymentCountdownResult> getPendingPaymentCountdown(
    String orderId,
  );

  Future<OrderResponse> syncOnlinePayment(String orderId);
}
