import 'package:flutter/foundation.dart';

import 'package:daiphat_mobile/src/features/profile/data/models/support_ticket.dart';
import 'package:daiphat_mobile/src/features/profile/data/support_ticket_service.dart';

class ComplaintsViewModel extends ChangeNotifier {
  final SupportTicketService _service;

  ComplaintsViewModel(this._service) {
    _loadCategories();
    fetch(refresh: true);
  }

  final List<SupportTicketSummaryResponse> _items = [];
  List<SupportTicketSummaryResponse> get items => _items;

  final Map<int, String> _categoryNames = {};
  Map<int, String> get categoryNames => _categoryNames;

  List<TicketCategoryResponse> _categories = const [];
  List<TicketCategoryResponse> get categories => _categories;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _isLoadingMore = false;
  bool get isLoadingMore => _isLoadingMore;

  String? _error;
  String? get error => _error;

  int _page = 1;
  bool _hasMore = true;
  bool get hasMore => _hasMore;

  int? _cancellingId;
  int? get cancellingId => _cancellingId;

  /// null = tất cả, còn lại là TicketStatus.value
  String? _statusFilter;
  String? get statusFilter => _statusFilter;

  String _search = '';
  String get search => _search;

  Future<void> _loadCategories() async {
    try {
      _categories = await _service.getCategories();
      _categoryNames
        ..clear()
        ..addEntries(_categories.map((c) => MapEntry(c.id, c.name)));
      notifyListeners();
    } catch (_) {}
  }

  Future<void> fetch({bool refresh = false}) async {
    if (refresh) {
      _page = 1;
      _hasMore = true;
      _items.clear();
      _error = null;
      _isLoading = true;
      notifyListeners();
    } else {
      if (!_hasMore || _isLoading || _isLoadingMore) return;
      _isLoadingMore = true;
      notifyListeners();
    }

    try {
      final result = await _service.getMyTickets(
        page: _page,
        limit: 10,
        status: _statusFilter,
        search: _search.isNotEmpty ? _search : null,
      );
      if (refresh) {
        _items
          ..clear()
          ..addAll(result.records);
      } else {
        _items.addAll(result.records);
      }
      _hasMore = !result.pagination.isLast;
      if (_hasMore) _page++;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isLoading = false;
      _isLoadingMore = false;
      notifyListeners();
    }
  }

  void setStatusFilter(String? status) {
    if (_statusFilter == status) return;
    _statusFilter = status;
    fetch(refresh: true);
  }

  void setSearch(String value) {
    if (_search == value) return;
    _search = value;
    fetch(refresh: true);
  }

  /// Trả về null nếu thành công, ngược lại message lỗi.
  Future<String?> cancel(int ticketId) async {
    _cancellingId = ticketId;
    notifyListeners();
    try {
      await _service.close(ticketId);
      await fetch(refresh: true);
      return null;
    } catch (e) {
      return e.toString().replaceFirst('Exception: ', '');
    } finally {
      _cancellingId = null;
      notifyListeners();
    }
  }
}
