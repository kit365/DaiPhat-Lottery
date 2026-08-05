import 'package:flutter/foundation.dart';

import 'package:daiphat_mobile/src/features/profile/data/models/prize_payout_request.dart';
import 'package:daiphat_mobile/src/features/profile/data/prize_payout_service.dart';

class PrizePayoutsViewModel extends ChangeNotifier {
  final PrizePayoutService _service;

  PrizePayoutsViewModel(this._service) {
    fetch(refresh: true);
  }

  final List<PrizePayoutRequestResponse> _items = [];
  List<PrizePayoutRequestResponse> get items => _items;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _isLoadingMore = false;
  bool get isLoadingMore => _isLoadingMore;

  String? _error;
  String? get error => _error;

  int _page = 1;
  bool _hasMore = true;
  bool get hasMore => _hasMore;

  Map<String, int> _statusCounts = const {};
  Map<String, int> get statusCounts => _statusCounts;

  String? _statusFilter;
  String? get statusFilter => _statusFilter;

  String _search = '';
  String get search => _search;

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
      final result = await _service.getMyRequests(
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
      _statusCounts = result.statusCounts;
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
}
