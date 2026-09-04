import 'package:daiphat_mobile/src/features/checkout/models/refund_type.dart';

import '../repositories/orders_repository.dart';

class GetOrderRefundEligibility {
  final OrdersRepository _repository;

  const GetOrderRefundEligibility(this._repository);

  Future<OrderRefundEligibilityResponse> call(String orderId) =>
      _repository.getRefundEligibility(orderId);
}
