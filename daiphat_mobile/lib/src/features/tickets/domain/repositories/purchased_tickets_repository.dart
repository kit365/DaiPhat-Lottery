import '../entities/purchased_ticket.dart';

abstract interface class PurchasedTicketsRepository {
  Future<PurchasedTicketsPageResponse> getMyTickets({
    int page = 1,
    int size = 10,
    String? status,
    String? ticketNumber,
    String sortBy = 'createdAt',
    String direction = 'desc',
  });

  Future<TicketSummaryStats> getMyTicketsSummary();
}
