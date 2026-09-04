import '../../models/order_type.dart';
import '../repositories/order_repository.dart';

class CreateOnlineOrder {
  final OrderRepository _repository;

  const CreateOnlineOrder(this._repository);

  Future<OrderResponse> call(CreateOnlineOrderRequest request) =>
      _repository.createOnlineOrder(request);
}
