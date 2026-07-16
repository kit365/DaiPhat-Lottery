import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import '../models/order_type.dart';
import '../models/refund_type.dart';
import '../models/transaction_type.dart';

class OrderService {
  final ApiClient _apiClient;

  OrderService(this._apiClient);

  Future<List<EnumOption>> getOrderReceiveTypes() async {
    final response = await _apiClient.get('/orders/receive-types');
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
      '/orders/online',
      data: request.toJson(),
    );
    final data = response['data'] as Map<String, dynamic>;
    return OrderResponse.fromJson(data);
  }

  Future<OrdersPageResponse> getMyOrders({
    int page = 1,
    int size = 10,
    String? status,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'size': size,
      if (status != null && status.isNotEmpty) 'status': status,
    };
    final response = await _apiClient.get(
      '/orders/my-orders',
      queryParameters: params,
    );
    final data = response['data'] as Map<String, dynamic>;
    return OrdersPageResponse.fromJson(data);
  }

  Future<OrderResponse> getMyOrderDetail(String id) async {
    final response = await _apiClient.get('/orders/my-orders/$id');
    final data = response['data'] as Map<String, dynamic>;
    return OrderResponse.fromJson(data);
  }

  Future<void> cancelOrder(String id) async {
    await _apiClient.post('/orders/$id/cancel');
  }

  Future<OrderRefundEligibilityResponse> getRefundEligibility(
    String orderId,
  ) async {
    final response = await _apiClient.get(
      '/orders/my-orders/$orderId/refund-eligibility',
    );
    final data = response['data'] as Map<String, dynamic>;
    return OrderRefundEligibilityResponse.fromJson(data);
  }

  Future<void> requestOrderRefund(
    String id,
    CreateOrderRefundRequest request,
  ) async {
    await _apiClient.post('/orders/$id/refund', data: request.toJson());
  }
}
