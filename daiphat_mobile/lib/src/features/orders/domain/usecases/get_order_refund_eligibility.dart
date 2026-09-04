import 'package:daiphat_mobile/src/features/refunds/domain/entities/refund_request.dart';

import '../repositories/orders_repository.dart';

class GetOrderRefundEligibility {
  final OrdersRepository _repository;

  const GetOrderRefundEligibility(this._repository);

  Future<OrderRefundEligibilityResponse> call(String orderId) =>
      _repository.getRefundEligibility(orderId);
}
