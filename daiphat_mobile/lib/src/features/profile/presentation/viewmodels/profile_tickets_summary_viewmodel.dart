import 'package:flutter/foundation.dart';
import 'package:daiphat_mobile/src/features/tickets/domain/entities/purchased_ticket.dart';
import 'package:daiphat_mobile/src/features/tickets/domain/usecases/get_my_tickets_summary.dart';

class ProfileTicketsSummaryViewModel extends ChangeNotifier {
  final GetMyTicketsSummary _getMyTicketsSummary;

  TicketSummaryStats _stats = TicketSummaryStats.empty;
  TicketSummaryStats get stats => _stats;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  ProfileTicketsSummaryViewModel(this._getMyTicketsSummary) {
    loadSummary();
  }

  Future<void> loadSummary() async {
    _isLoading = true;
    notifyListeners();

    try {
      _stats = await _getMyTicketsSummary();
    } catch (e) {
      debugPrint('ProfileTicketsSummaryViewModel error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
