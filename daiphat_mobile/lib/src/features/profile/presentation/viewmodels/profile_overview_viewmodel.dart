import 'package:flutter/foundation.dart';

import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';
import 'package:daiphat_mobile/src/features/orders/domain/usecases/get_my_orders.dart';
import 'package:daiphat_mobile/src/features/tickets/domain/entities/purchased_ticket.dart';
import 'package:daiphat_mobile/src/features/tickets/domain/usecases/get_my_tickets.dart';
import 'package:daiphat_mobile/src/features/tickets/domain/usecases/get_my_tickets_summary.dart';

class ProfileOverviewViewModel extends ChangeNotifier {
  final GetMyOrders _getMyOrders;
  final GetMyTickets _getMyTickets;
  final GetMyTicketsSummary _getMyTicketsSummary;

  ProfileOverviewViewModel(
    this._getMyOrders,
    this._getMyTickets,
    this._getMyTicketsSummary,
  ) {
    load();
  }

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  int _totalOrders = 0;
  int get totalOrders => _totalOrders;

  TicketSummaryStats _ticketStats = TicketSummaryStats.empty;
  TicketSummaryStats get ticketStats => _ticketStats;

  List<OrderResponse> _recentOrders = const [];
  List<OrderResponse> get recentOrders => _recentOrders;

  List<PurchasedTicket> _recentTickets = const [];
  List<PurchasedTicket> get recentTickets => _recentTickets;

  int get totalTicketsBought =>
      _ticketStats.pendingCount + _ticketStats.drawnCount;

  Future<void> load() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        _getMyOrders(page: 1, size: 5),
        _getMyTicketsSummary(),
        _getMyTickets(page: 1, size: 5),
      ]);

      final ordersPage = results[0] as OrdersPageResponse;
      final stats = results[1] as TicketSummaryStats;
      final ticketsPage = results[2] as PurchasedTicketsPageResponse;

      _totalOrders = ordersPage.pagination.totalRecords;
      _recentOrders = ordersPage.records;
      _ticketStats = stats;
      _recentTickets = ticketsPage.records;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
