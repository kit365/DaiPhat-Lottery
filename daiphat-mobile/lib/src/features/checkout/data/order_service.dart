import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import '../models/order_type.dart';
import '../models/refund_type.dart';
import '../models/transaction_type.dart';
import '../../profile/data/models/purchased_ticket.dart';

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

  Future<PurchasedTicketsPageResponse> getMyTickets({
    int page = 1,
    int size = 10,
    String? status,
    String? ticketNumber,
    String sortBy = 'createdAt',
    String direction = 'desc',
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'size': size,
      'sortBy': sortBy,
      'direction': direction,
      if (status != null && status.isNotEmpty) 'status': status,
      if (ticketNumber != null && ticketNumber.isNotEmpty)
        'ticketNumber': ticketNumber,
    };
    final response = await _apiClient.get(
      '/orders/my-tickets',
      queryParameters: params,
    );
    final data = response['data'] as Map<String, dynamic>;
    return PurchasedTicketsPageResponse.fromJson(data);
  }

  Future<TicketSummaryStats> getMyTicketsSummary() async {
    final results = await Future.wait([
      getMyTickets(page: 1, size: 1, status: 'PENDING_DRAW'),
      getMyTickets(page: 1, size: 1, status: 'WON'),
      getMyTickets(page: 1, size: 1, status: 'LOST'),
    ]);

    final pending = results[0].pagination.totalRecords;
    final won = results[1].pagination.totalRecords;
    final lost = results[2].pagination.totalRecords;

    return TicketSummaryStats(
      pendingCount: pending,
      drawnCount: won + lost,
      wonCount: won,
    );
  }
}
