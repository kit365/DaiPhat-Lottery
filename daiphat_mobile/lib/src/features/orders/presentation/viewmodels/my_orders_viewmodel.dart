import 'package:flutter/foundation.dart';
import 'package:daiphat_mobile/src/features/orders/domain/entities/order.dart';
import 'package:daiphat_mobile/src/features/orders/domain/usecases/get_my_orders.dart';

class MyOrdersViewModel extends ChangeNotifier {
  final GetMyOrders _getMyOrders;

  List<OrderResponse> _orders = [];
  List<OrderResponse> get orders => _orders;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _isLoadingMore = false;
  bool get isLoadingMore => _isLoadingMore;

  String? _error;
  String? get error => _error;

  int _page = 1;
  bool _hasMore = true;
  bool get hasMore => _hasMore;

  String? _selectedStatus;
  String? get selectedStatus => _selectedStatus;

  String _search = '';
  String get search => _search;

  String _sortBy = 'createdAt';
  String get sortBy => _sortBy;

  String _direction = 'desc';
  String get direction => _direction;

  MyOrdersViewModel(this._getMyOrders) {
    fetchOrders(refresh: true);
  }

  Future<void> fetchOrders({bool refresh = false}) async {
    if (refresh) {
      _page = 1;
      _hasMore = true;
      _orders = [];
      _error = null;
      _isLoading = true;
      notifyListeners();
    } else {
      if (!_hasMore || _isLoading || _isLoadingMore) return;
      _isLoadingMore = true;
      notifyListeners();
    }

    try {
      final result = await _getMyOrders(
        page: _page,
        size: 10,
        status: _selectedStatus,
        search: _search,
        sortBy: _sortBy,
        direction: _direction,
      );

      if (refresh) {
        _orders = result.records;
      } else {
        _orders.addAll(result.records);
      }

      _hasMore = !result.pagination.isLast;
      if (_hasMore) _page++;
    } catch (e) {
      _error = e.toString();
      debugPrint('MyOrdersViewModel error: $e');
    } finally {
      _isLoading = false;
      _isLoadingMore = false;
      notifyListeners();
    }
  }

  void setStatusFilter(String? status) {
    if (_selectedStatus == status) return;
    _selectedStatus = status;
    fetchOrders(refresh: true);
  }

  void setSearch(String value) {
    var next = value.trim();
    if (next.toUpperCase().startsWith('DP')) {
      next = next.substring(2).trim();
    }
    if (_search == next) return;
    _search = next;
    fetchOrders(refresh: true);
  }

  void setSort(String sortBy, String direction) {
    if (_sortBy == sortBy && _direction == direction) return;
    _sortBy = sortBy;
    _direction = direction;
    fetchOrders(refresh: true);
  }

  void setPriceSort(String? direction) {
    if (direction == null) {
      if (_sortBy == 'createdAt' && _direction == 'desc') return;
      _sortBy = 'createdAt';
      _direction = 'desc';
    } else {
      if (_sortBy == 'totalAmount' && _direction == direction) return;
      _sortBy = 'totalAmount';
      _direction = direction;
    }
    fetchOrders(refresh: true);
  }
}
