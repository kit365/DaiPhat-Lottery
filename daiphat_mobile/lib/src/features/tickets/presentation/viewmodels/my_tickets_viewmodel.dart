import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:daiphat_mobile/src/features/tickets/domain/entities/purchased_ticket.dart';
import 'package:daiphat_mobile/src/features/tickets/presentation/utils/ticket_display_utils.dart';
import 'package:daiphat_mobile/src/features/tickets/domain/usecases/get_my_tickets.dart';
import 'package:daiphat_mobile/src/features/tickets/domain/usecases/get_my_tickets_summary.dart';

class MyTicketsViewModel extends ChangeNotifier {
  final GetMyTickets _getMyTickets;
  final GetMyTicketsSummary? _getMyTicketsSummary;

  List<PurchasedTicket> _tickets = [];
  List<PurchasedTicket> get tickets => _tickets;

  TicketSummaryStats? _summaryStats;
  TicketSummaryStats? get summaryStats => _summaryStats;

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

  bool? _selectedRedeemed;
  bool? get selectedRedeemed => _selectedRedeemed;

  String _selectedChannel = 'ALL';
  String get selectedChannel => _selectedChannel;

  String _searchQuery = '';
  String get searchQuery => _searchQuery;

  Timer? _searchDebounce;
  int _requestGeneration = 0;
  bool _disposed = false;

  MyTicketsViewModel(this._getMyTickets, [this._getMyTicketsSummary]) {
    fetchTickets(refresh: true);
  }

  @override
  void dispose() {
    _disposed = true;
    _requestGeneration++;
    _searchDebounce?.cancel();
    super.dispose();
  }

  Future<void> _fetchSummaryStats() async {
    if (_getMyTicketsSummary == null || _disposed) return;
    try {
      final stats = await _getMyTicketsSummary();
      if (_disposed) return;
      _summaryStats = stats;
      notifyListeners();
    } catch (e) {
      if (kDebugMode) debugPrint('MyTicketsViewModel summary error: $e');
    }
  }

  Future<void> fetchTickets({bool refresh = false}) async {
    if (_disposed) return;
    if (refresh) {
      _page = 1;
      _hasMore = true;
      _tickets = [];
      _error = null;
      _isLoading = true;
      notifyListeners();
      _fetchSummaryStats();
    } else {
      if (!_hasMore || _isLoading || _isLoadingMore) return;
      _isLoadingMore = true;
      notifyListeners();
    }

    final requestGeneration = ++_requestGeneration;
    final requestPage = _page;
    final requestStatus = _selectedStatus;
    final requestRedeemed = _selectedRedeemed;
    final requestSearch = _searchQuery.trim();

    try {
      final result = await _getMyTickets(
        page: requestPage,
        size: requestRedeemed == false ? 500 : 10,
        status: requestStatus,
        redeemed: requestRedeemed,
        ticketNumber: requestSearch.isEmpty ? null : requestSearch,
      );

      if (_disposed || requestGeneration != _requestGeneration) return;

      if (refresh) {
        _tickets = result.records;
      } else {
        _tickets.addAll(result.records);
      }

      _totalRecords = result.pagination.totalRecords;
      _hasMore = !result.pagination.isLast;
      if (_hasMore) _page++;
    } catch (e) {
      if (_disposed || requestGeneration != _requestGeneration) return;
      _error = e.toString();
      if (kDebugMode) debugPrint('MyTicketsViewModel error: $e');
    } finally {
      if (!_disposed && requestGeneration == _requestGeneration) {
        _isLoading = false;
        _isLoadingMore = false;
        notifyListeners();
      }
    }
  }

  void setStatusFilter(String? status) {
    if (_selectedStatus == status) return;
    _selectedStatus = status;
    if (status != 'WON') {
      _selectedRedeemed = null;
      _selectedChannel = 'ALL';
    }
    fetchTickets(refresh: true);
  }

  void setRedeemedFilter(bool? redeemed) {
    if (_selectedRedeemed == redeemed && _selectedStatus == 'WON') return;
    _selectedRedeemed = redeemed;
    _selectedChannel = 'ALL';
    fetchTickets(refresh: true);
  }

  void setChannelFilter(String channel) {
    if (_selectedChannel == channel) return;
    _selectedChannel = channel;
    notifyListeners();
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
      visibleTickets.where((t) => t.drawResultStatus == 'PENDING_DRAW').length;

  int get wonCountOnPage =>
      visibleTickets.where((t) => t.drawResultStatus == 'WON').length;

  int get totalPendingCount => _summaryStats?.pendingCount ?? pendingCountOnPage;

  int get totalWonCount => _summaryStats?.wonCount ?? wonCountOnPage;

  int get totalAllCount => _summaryStats != null
      ? (_summaryStats!.pendingCount + _summaryStats!.drawnCount)
      : displayedTotalRecords;

  List<PurchasedTicket> get visibleTickets {
    if (_selectedRedeemed != false || _selectedChannel == 'ALL') {
      return _tickets;
    }
    return _tickets
        .where((ticket) {
          return _selectedChannel == 'ONLINE'
              ? isTicketOnlineRedemption(ticket)
              : isTicketCounterRedemption(ticket);
        })
        .toList(growable: false);
  }

  int get displayedTotalRecords =>
      _selectedRedeemed == false && _selectedChannel != 'ALL'
          ? visibleTickets.length
          : _totalRecords;
}
