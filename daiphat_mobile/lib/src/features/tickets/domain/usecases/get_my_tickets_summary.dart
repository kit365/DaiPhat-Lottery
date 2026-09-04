import '../entities/purchased_ticket.dart';
import '../repositories/purchased_tickets_repository.dart';

class GetMyTicketsSummary {
  final PurchasedTicketsRepository _repository;

  const GetMyTicketsSummary(this._repository);

  Future<TicketSummaryStats> call() => _repository.getMyTicketsSummary();
}
