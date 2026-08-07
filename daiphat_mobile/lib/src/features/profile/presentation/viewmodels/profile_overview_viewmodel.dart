import 'package:flutter/foundation.dart';

import 'package:daiphat_mobile/src/features/checkout/data/order_service.dart';
import 'package:daiphat_mobile/src/features/checkout/models/order_type.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/purchased_ticket.dart';

class ProfileOverviewViewModel extends ChangeNotifier {
  final OrderService _orderService;

  ProfileOverviewViewModel(this._orderService) {
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
        _orderService.getMyOrders(page: 1, size: 5),
        _orderService.getMyTicketsSummary(),
        _orderService.getMyTickets(page: 1, size: 5),
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
