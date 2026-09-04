import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/datasources/order_remote_data_source.dart';
import '../../domain/repositories/orders_repository.dart';
import '../../domain/usecases/get_my_order_detail.dart';
import '../../domain/usecases/get_my_orders.dart';
import '../../domain/usecases/get_order_refund_eligibility.dart';
import '../../domain/usecases/request_order_refund.dart';

// Transitional dependency for profile/ticket screens pending their migration.
final orderServiceProvider = Provider<OrderService>((ref) {
  throw UnimplementedError(
    'orderServiceProvider must be overridden in bootstrap',
  );
});

final ordersRepositoryProvider = Provider<OrdersRepository>((ref) {
  throw UnimplementedError(
    'ordersRepositoryProvider must be overridden in bootstrap',
  );
});

final getMyOrdersProvider = Provider<GetMyOrders>((ref) {
  return GetMyOrders(ref.watch(ordersRepositoryProvider));
});

final getMyOrderDetailProvider = Provider<GetMyOrderDetail>((ref) {
  return GetMyOrderDetail(ref.watch(ordersRepositoryProvider));
});

final getOrderRefundEligibilityProvider =
    Provider<GetOrderRefundEligibility>((ref) {
      return GetOrderRefundEligibility(ref.watch(ordersRepositoryProvider));
    });

final requestOrderRefundProvider = Provider<RequestOrderRefund>((ref) {
  return RequestOrderRefund(ref.watch(ordersRepositoryProvider));
});
