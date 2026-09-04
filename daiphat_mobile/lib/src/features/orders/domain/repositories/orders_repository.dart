import 'package:daiphat_mobile/src/features/checkout/models/refund_type.dart';
import 'package:daiphat_mobile/src/features/checkout/models/transaction_type.dart';
import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';

abstract interface class OrdersRepository {
  Future<List<EnumOption>> getOrderReceiveTypes();

  Future<OrderResponse> createOnlineOrder(CreateOnlineOrderRequest request);

  Future<OrdersPageResponse> getMyOrders({
    int page = 1,
    int size = 10,
    String? status,
    String? search,
    String sortBy = 'createdAt',
    String direction = 'desc',
  });

  Future<OrderResponse> getMyOrderDetail(String id);

  Future<OrderRefundEligibilityResponse> getRefundEligibility(String orderId);

  Future<void> requestOrderRefund(
    String id,
    CreateOrderRefundRequest request,
  );
}
