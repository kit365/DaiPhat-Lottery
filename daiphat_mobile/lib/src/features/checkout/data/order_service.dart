import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import '../models/order_type.dart';
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
}
