import 'package:daiphat_mobile/src/features/checkout/models/refund_type.dart';
import 'package:daiphat_mobile/src/features/checkout/models/transaction_type.dart';
import 'package:daiphat_mobile/src/features/orders/data/datasources/order_remote_data_source.dart';
import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';

import '../../domain/repositories/orders_repository.dart';

class OrdersRepositoryImpl implements OrdersRepository {
  final OrderService _remoteDataSource;

  const OrdersRepositoryImpl(this._remoteDataSource);

  @override
  Future<List<EnumOption>> getOrderReceiveTypes() =>
      _remoteDataSource.getOrderReceiveTypes();

  @override
  Future<OrderResponse> createOnlineOrder(CreateOnlineOrderRequest request) =>
      _remoteDataSource.createOnlineOrder(request);

  @override
  Future<OrdersPageResponse> getMyOrders({
    int page = 1,
    int size = 10,
    String? status,
    String? search,
    String sortBy = 'createdAt',
    String direction = 'desc',
  }) {
    return _remoteDataSource.getMyOrders(
      page: page,
      size: size,
      status: status,
      search: search,
      sortBy: sortBy,
      direction: direction,
    );
  }

  @override
  Future<OrderResponse> getMyOrderDetail(String id) =>
      _remoteDataSource.getMyOrderDetail(id);

  @override
  Future<OrderRefundEligibilityResponse> getRefundEligibility(String orderId) =>
      _remoteDataSource.getRefundEligibility(orderId);

  @override
  Future<void> requestOrderRefund(
    String id,
    CreateOrderRefundRequest request,
  ) =>
      _remoteDataSource.requestOrderRefund(id, request);
}
