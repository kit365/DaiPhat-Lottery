import '../entities/purchased_ticket.dart';
import '../repositories/purchased_tickets_repository.dart';

class GetMyTickets {
  final PurchasedTicketsRepository _repository;

  const GetMyTickets(this._repository);

  Future<PurchasedTicketsPageResponse> call({
    int page = 1,
    int size = 10,
    String? status,
    String? ticketNumber,
    String sortBy = 'createdAt',
    String direction = 'desc',
  }) {
    return _repository.getMyTickets(
      page: page,
      size: size,
      status: status,
      ticketNumber: ticketNumber,
      sortBy: sortBy,
      direction: direction,
    );
  }
}
