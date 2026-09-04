import '../../models/order_type.dart';
import '../../models/transaction_type.dart';

abstract interface class OrderRepository {
  Future<List<EnumOption>> getOrderReceiveTypes();

  Future<OrderResponse> createOnlineOrder(CreateOnlineOrderRequest request);
}
