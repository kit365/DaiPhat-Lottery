import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:daiphat_mobile/src/features/checkout/data/order_service.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/purchased_ticket.dart';

class MyTicketsViewModel extends ChangeNotifier {
  final OrderService _orderService;

  List<PurchasedTicket> _tickets = [];
  List<PurchasedTicket> get tickets => _tickets;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _isLoadingMore = false;
  bool get isLoadingMore => _isLoadingMore;

  String? _error;
  String? get error => _error;

  int _page = 1;
  bool _hasMore = true;
  bool get hasMore => _hasMore;

  int _totalRecords = 0;
  int get totalRecords => _totalRecords;

  String? _selectedStatus;
  String? get selectedStatus => _selectedStatus;

  String _searchQuery = '';
  String get searchQuery => _searchQuery;

  Timer? _searchDebounce;

  MyTicketsViewModel(this._orderService) {
    fetchTickets(refresh: true);
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    super.dispose();
  }

  Future<void> fetchTickets({bool refresh = false}) async {
    if (refresh) {
      _page = 1;
      _hasMore = true;
      _tickets = [];
      _error = null;
      _isLoading = true;
      notifyListeners();
    } else {
      if (!_hasMore || _isLoading || _isLoadingMore) return;
      _isLoadingMore = true;
      notifyListeners();
    }

    try {
      final result = await _orderService.getMyTickets(
        page: _page,
        size: 10,
        status: _selectedStatus,
        ticketNumber: _searchQuery.trim().isEmpty ? null : _searchQuery.trim(),
      );

      if (refresh) {
        _tickets = result.records;
      } else {
        _tickets.addAll(result.records);
      }

      _totalRecords = result.pagination.totalRecords;
      _hasMore = !result.pagination.isLast;
      if (_hasMore) _page++;
    } catch (e) {
      _error = e.toString();
      debugPrint('MyTicketsViewModel error: $e');
    } finally {
      _isLoading = false;
      _isLoadingMore = false;
      notifyListeners();
    }
  }

  void setStatusFilter(String? status) {
    if (_selectedStatus == status) return;
    _selectedStatus = status;
    fetchTickets(refresh: true);
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 400), () {
      fetchTickets(refresh: true);
    });
    notifyListeners();
  }

  int get pendingCountOnPage =>
      _tickets.where((t) => t.drawResultStatus == 'PENDING_DRAW').length;

  int get wonCountOnPage =>
      _tickets.where((t) => t.drawResultStatus == 'WON').length;
}
