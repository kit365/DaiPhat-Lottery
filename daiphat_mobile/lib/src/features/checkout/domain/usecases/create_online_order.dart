import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';
import 'package:daiphat_mobile/src/features/orders/domain/repositories/orders_repository.dart';

class CreateOnlineOrder {
  final OrdersRepository _repository;

  const CreateOnlineOrder(this._repository);

  Future<OrderResponse> call(CreateOnlineOrderRequest request) =>
      _repository.createOnlineOrder(request);
}
