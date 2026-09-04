import 'package:daiphat_mobile/src/features/tickets/domain/entities/purchased_ticket.dart';
import 'package:daiphat_mobile/src/shared/network/api_client.dart';

class PurchasedTicketsRemoteDataSource {
  static const _baseOrders = '/orders';

  final ApiClient _apiClient;

  const PurchasedTicketsRemoteDataSource(this._apiClient);

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
      '$_baseOrders/my-tickets',
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
