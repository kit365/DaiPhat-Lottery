import '../../domain/repositories/order_repository.dart';
import '../../models/order_type.dart';
import '../../models/transaction_type.dart';
import '../order_service.dart';

class OrderRepositoryImpl implements OrderRepository {
  final OrderService _remoteDataSource;

  const OrderRepositoryImpl(this._remoteDataSource);

  @override
  Future<List<EnumOption>> getOrderReceiveTypes() =>
      _remoteDataSource.getOrderReceiveTypes();

  @override
  Future<OrderResponse> createOnlineOrder(CreateOnlineOrderRequest request) =>
      _remoteDataSource.createOnlineOrder(request);
}
