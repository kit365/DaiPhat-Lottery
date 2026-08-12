import 'package:flutter/foundation.dart';

import 'package:daiphat_mobile/src/features/profile/data/models/prize_payout_request.dart';
import 'package:daiphat_mobile/src/features/profile/data/prize_payout_service.dart';

class PrizePayoutDetailViewModel extends ChangeNotifier {
  final PrizePayoutService _service;
  final int requestId;

  PrizePayoutDetailViewModel(this._service, this.requestId) {
    load();
  }

  PrizePayoutRequestResponse? _payout;
  PrizePayoutRequestResponse? get payout => _payout;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  bool _isCancelling = false;
  bool get isCancelling => _isCancelling;

  Future<void> load() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _payout = await _service.getById(requestId);
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Trả về null nếu thành công, ngược lại trả về message lỗi.
  Future<String?> cancel() async {
    _isCancelling = true;
    notifyListeners();
    try {
      _payout = await _service.cancel(requestId);
      return null;
    } catch (e) {
      return e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isCancelling = false;
      notifyListeners();
    }
  }
}
