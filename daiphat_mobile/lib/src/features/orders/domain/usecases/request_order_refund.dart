import 'package:daiphat_mobile/src/features/refunds/domain/entities/refund_request.dart';

import '../repositories/orders_repository.dart';

class RequestOrderRefund {
  final OrdersRepository _repository;

  const RequestOrderRefund(this._repository);

  Future<void> call(String orderId, CreateOrderRefundRequest request) =>
      _repository.requestOrderRefund(orderId, request);
}
