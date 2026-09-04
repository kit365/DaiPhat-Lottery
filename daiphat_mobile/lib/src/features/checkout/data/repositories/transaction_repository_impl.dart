import '../../domain/repositories/transaction_repository.dart';
import '../../models/transaction_type.dart';
import '../transaction_service.dart';

class TransactionRepositoryImpl implements TransactionRepository {
  final TransactionService _remoteDataSource;

  const TransactionRepositoryImpl(this._remoteDataSource);

  @override
  Future<List<EnumOption>> getTransactionTypes() =>
      _remoteDataSource.getTransactionTypes();

  @override
  Future<PaymentResult> processPayment({
    required String orderId,
    required ProcessPaymentRequest request,
  }) =>
      _remoteDataSource.processPayment(orderId: orderId, request: request);

  @override
  Future<PendingPaymentCountdownResult> getPendingPaymentCountdown(
    String orderId,
  ) =>
      _remoteDataSource.getPendingPaymentCountdown(orderId);
}
