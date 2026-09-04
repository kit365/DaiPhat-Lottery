import '../../domain/entities/purchased_ticket.dart';
import '../../domain/repositories/purchased_tickets_repository.dart';
import '../datasources/purchased_tickets_remote_data_source.dart';

class PurchasedTicketsRepositoryImpl implements PurchasedTicketsRepository {
  final PurchasedTicketsRemoteDataSource _remoteDataSource;

  const PurchasedTicketsRepositoryImpl(this._remoteDataSource);

  @override
  Future<PurchasedTicketsPageResponse> getMyTickets({
    int page = 1,
    int size = 10,
    String? status,
    String? ticketNumber,
    String sortBy = 'createdAt',
    String direction = 'desc',
  }) {
    return _remoteDataSource.getMyTickets(
      page: page,
      size: size,
      status: status,
      ticketNumber: ticketNumber,
      sortBy: sortBy,
      direction: direction,
    );
  }

  @override
  Future<TicketSummaryStats> getMyTicketsSummary() =>
      _remoteDataSource.getMyTicketsSummary();
}
