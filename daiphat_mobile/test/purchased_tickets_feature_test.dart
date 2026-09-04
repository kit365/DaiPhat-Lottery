import 'package:flutter_test/flutter_test.dart';

import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';
import 'package:daiphat_mobile/src/features/tickets/domain/entities/purchased_ticket.dart';
import 'package:daiphat_mobile/src/features/tickets/domain/repositories/purchased_tickets_repository.dart';
import 'package:daiphat_mobile/src/features/tickets/domain/usecases/get_my_tickets.dart';
import 'package:daiphat_mobile/src/features/tickets/presentation/viewmodels/my_tickets_viewmodel.dart';

class _FakePurchasedTicketsRepository
    implements PurchasedTicketsRepository {
  int? page;
  int? size;
  String? status;
  String? ticketNumber;

  final ticket = const PurchasedTicket(
    orderId: 'order-uuid',
    orderCode: 'DP123',
    orderDetailId: 42,
    ticketId: 7,
    numbers: '123456',
    drawDate: '2026-09-05',
    price: 10000,
    purchasedAt: '2026-09-04T10:00:00Z',
    drawResultStatus: 'PENDING_DRAW',
  );

  @override
  Future<PurchasedTicketsPageResponse> getMyTickets({
    int page = 1,
    int size = 10,
    String? status,
    String? ticketNumber,
    String sortBy = 'createdAt',
    String direction = 'desc',
  }) async {
    this.page = page;
    this.size = size;
    this.status = status;
    this.ticketNumber = ticketNumber;
    return PurchasedTicketsPageResponse(
      records: [ticket],
      pagination: const PaginationMeta(
        totalRecords: 1,
        totalPages: 1,
        currentPage: 1,
        limit: 10,
        isLast: true,
      ),
    );
  }

  @override
  Future<TicketSummaryStats> getMyTicketsSummary() async {
    return const TicketSummaryStats(
      pendingCount: 1,
      drawnCount: 0,
      wonCount: 0,
    );
  }
}

void main() {
  test('purchased ticket parser preserves its detail route id', () {
    final ticket = PurchasedTicket.fromJson({
      'orderId': 'order-uuid',
      'orderCode': 'DP123',
      'orderDetailId': 42,
      'ticketId': 7,
      'numbers': '123456',
      'drawDate': '2026-09-05',
      'price': 10000,
      'purchasedAt': '2026-09-04T10:00:00Z',
      'drawResultStatus': 'PENDING_DRAW',
    });

    expect(ticket.detailRouteId, '42');
    expect(ticket.orderId, 'order-uuid');
  });

  test('tickets view model preserves paging and status filters', () async {
    final repository = _FakePurchasedTicketsRepository();
    final viewModel = MyTicketsViewModel(GetMyTickets(repository));
    addTearDown(viewModel.dispose);

    await Future<void>.delayed(Duration.zero);
    expect(viewModel.tickets, [repository.ticket]);
    expect(repository.page, 1);
    expect(repository.size, 10);

    viewModel.setStatusFilter('WON');
    await Future<void>.delayed(Duration.zero);
    expect(repository.status, 'WON');
  });
}
