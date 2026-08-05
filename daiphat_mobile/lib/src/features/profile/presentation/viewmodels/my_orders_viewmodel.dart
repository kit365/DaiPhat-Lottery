import 'package:flutter/foundation.dart';
import 'package:daiphat_mobile/src/features/checkout/data/order_service.dart';
import 'package:daiphat_mobile/src/features/checkout/models/order_type.dart';

class MyOrdersViewModel extends ChangeNotifier {
  final OrderService _orderService;

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

  MyOrdersViewModel(this._orderService) {
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
      final result = await _orderService.getMyOrders(
        page: _page,
        size: 10,
        status: _selectedStatus,
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
}
