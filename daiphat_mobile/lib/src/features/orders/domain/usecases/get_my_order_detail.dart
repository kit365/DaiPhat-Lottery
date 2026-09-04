import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';

import '../repositories/orders_repository.dart';

class GetMyOrderDetail {
  final OrdersRepository _repository;

  const GetMyOrderDetail(this._repository);

  Future<OrderResponse> call(String orderId) =>
      _repository.getMyOrderDetail(orderId);
}
