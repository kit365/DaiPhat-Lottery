import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/features/refunds/domain/entities/refund_request.dart';
import 'package:daiphat_mobile/src/features/checkout/models/transaction_type.dart';
import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';

class OrderService {
  static const _baseOrders = '/orders';

  final ApiClient _apiClient;

  OrderService(this._apiClient);

  Future<List<EnumOption>> getOrderReceiveTypes() async {
    final response = await _apiClient.get('$_baseOrders/receive-types');
    final data = response['data'];
    if (data is List) {
      return data
          .map((e) => EnumOption.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<OrderResponse> createOnlineOrder(
    CreateOnlineOrderRequest request,
  ) async {
    final response = await _apiClient.post(
      '$_baseOrders/online',
      data: request.toJson(),
    );
    final data = response['data'] as Map<String, dynamic>;
    return OrderResponse.fromJson(data);
  }

  Future<OrdersPageResponse> getMyOrders({
    int page = 1,
    int size = 10,
    String? status,
    String? search,
    String sortBy = 'createdAt',
    String direction = 'desc',
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'size': size,
      if (status != null && status.isNotEmpty) 'status': status,
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      'sortBy': sortBy,
      'direction': direction,
    };
    final response = await _apiClient.get(
      '$_baseOrders/my-orders',
      queryParameters: params,
    );
    final data = response['data'] as Map<String, dynamic>;
    return OrdersPageResponse.fromJson(data);
  }

  Future<OrderResponse> getMyOrderDetail(String id) async {
    final response = await _apiClient.get('$_baseOrders/my-orders/$id');
    final data = response['data'] as Map<String, dynamic>;
    return OrderResponse.fromJson(data);
  }

  Future<void> cancelOrder(String id) async {
    await _apiClient.post('$_baseOrders/$id/cancel');
  }

  Future<OrderRefundEligibilityResponse> getRefundEligibility(
    String orderId,
  ) async {
    final response = await _apiClient.get(
      '$_baseOrders/my-orders/$orderId/refund-eligibility',
    );
    final data = response['data'] as Map<String, dynamic>;
    return OrderRefundEligibilityResponse.fromJson(data);
  }

  Future<void> requestOrderRefund(
    String id,
    CreateOrderRefundRequest request,
  ) async {
    await _apiClient.post('$_baseOrders/$id/refund', data: request.toJson());
  }

}
