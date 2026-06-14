import '../models/lottery_ticket.dart';
import '../services/lottery_ticket_api_service.dart';

class LotteryTicketRepository {
  LotteryTicketRepository(this._apiService);

  final LotteryTicketApiService _apiService;

  Future<List<LotteryTicket>> fetchOpenTickets({
    String? search,
  }) async {
    final response = await _apiService.getLotteryTickets(
      page: 1,
      size: 100,
      sortBy: 'drawDate',
      direction: 'asc',
    );

    return response.items;
  }
}
