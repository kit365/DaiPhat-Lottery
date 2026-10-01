import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';
import '../repositories/orders_repository.dart';

class SubmitPaymentTimeoutComplaint {
  final OrdersRepository _repository;

  const SubmitPaymentTimeoutComplaint(this._repository);

  Future<OrderResponse> call(String orderId, String filePath) =>
      _repository.submitPaymentTimeoutComplaint(orderId, filePath);
}
