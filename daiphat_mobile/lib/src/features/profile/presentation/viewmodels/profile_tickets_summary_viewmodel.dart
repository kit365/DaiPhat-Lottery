import 'package:flutter/foundation.dart';
import 'package:daiphat_mobile/src/features/checkout/data/order_service.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/purchased_ticket.dart';

class ProfileTicketsSummaryViewModel extends ChangeNotifier {
  final OrderService _orderService;

  TicketSummaryStats _stats = TicketSummaryStats.empty;
  TicketSummaryStats get stats => _stats;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  ProfileTicketsSummaryViewModel(this._orderService) {
    loadSummary();
  }

  Future<void> loadSummary() async {
    _isLoading = true;
    notifyListeners();

    try {
      _stats = await _orderService.getMyTicketsSummary();
    } catch (e) {
      debugPrint('ProfileTicketsSummaryViewModel error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
