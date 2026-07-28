import '../models/lottery_ticket.dart';
import '../services/lottery_ticket_api_service.dart';

class LotteryTicketRepository {
  LotteryTicketRepository(this._apiService);

  final LotteryTicketApiService _apiService;

  /// Lấy vé đang bán từ API public (cùng FE `/lottery-tickets/public`).
  Future<List<LotteryTicket>> fetchOpenTickets({
    String? drawDate,
    String? search,
  }) async {
    final response = await _apiService.getPublicLotteryTickets(
      page: 1,
      size: 100,
      drawDate: drawDate,
      search: search,
      searchMode: 'CONTAINS',
      sortBy: 'drawDate',
      direction: 'asc',
    );

    return response.items.where((ticket) => ticket.quantity > 0).toList();
  }

  Future<LotteryTicket> fetchTicketDetail(int id) {
    return _apiService.getLotteryTicketDetail(id);
  }
}
