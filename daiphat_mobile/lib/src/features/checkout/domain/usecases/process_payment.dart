import '../../models/transaction_type.dart';
import '../repositories/transaction_repository.dart';

class ProcessPayment {
  final TransactionRepository _repository;

  const ProcessPayment(this._repository);

  Future<PaymentResult> call({
    required String orderId,
    required ProcessPaymentRequest request,
  }) =>
      _repository.processPayment(orderId: orderId, request: request);
}
