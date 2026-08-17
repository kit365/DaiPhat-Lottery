import '../models/lottery_ticket.dart';
import '../services/lottery_ticket_api_service.dart';

class OpenTicketsResult {
  const OpenTicketsResult({
    required this.items,
    required this.pageNumber,
    required this.totalPages,
    required this.totalElements,
    required this.hasMore,
  });

  final List<LotteryTicket> items;
  final int pageNumber;
  final int totalPages;
  final int totalElements;
  final bool hasMore;
}

class LotteryTicketRepository {
  LotteryTicketRepository(this._apiService);

  final LotteryTicketApiService _apiService;

  static const int defaultPageSize = 15;

  /// Lấy vé đang bán từ API public (cùng FE `/lottery-tickets/public`).
  Future<OpenTicketsResult> fetchOpenTickets({
    int page = 1,
    int size = defaultPageSize,
    String? drawDate,
    String? search,
    List<String>? tailRanges,
    List<String>? numberTypes,
  }) async {
    final response = await _apiService.getPublicLotteryTickets(
      page: page,
      size: size,
      drawDate: drawDate,
      search: search,
      searchMode: 'CONTAINS',
      tailRanges: tailRanges,
      numberTypes: numberTypes,
    );

    // Ưu tiên cờ isLast từ API; fallback theo totalRecords.
    final hasMore =
        !response.isLast || (page * size) < response.totalElements;

    return OpenTicketsResult(
      items: response.items.where((ticket) => ticket.quantity > 0).toList(),
      pageNumber: page,
      totalPages: response.totalPages,
      totalElements: response.totalElements,
      hasMore: hasMore,
    );
  }

  Future<LotteryTicket> fetchTicketDetail(int id) {
    return _apiService.getLotteryTicketDetail(id);
  }

  Future<List<String>> fetchStationNamesForDrawDate(String drawDate) {
    return _apiService.getStationNamesForDrawDate(drawDate);
  }
}
