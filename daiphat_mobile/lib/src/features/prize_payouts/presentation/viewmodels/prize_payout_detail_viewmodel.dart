import 'package:flutter/foundation.dart';

import 'package:daiphat_mobile/src/features/prize_payouts/domain/entities/prize_payout_request.dart';
import 'package:daiphat_mobile/src/features/prize_payouts/domain/usecases/prize_payout_usecases.dart';

class PrizePayoutDetailViewModel extends ChangeNotifier {
  final GetPrizePayoutDetail _getPrizePayoutDetail;
  final CancelPrizePayout _cancelPrizePayout;
  final int requestId;

  PrizePayoutDetailViewModel(
    this._getPrizePayoutDetail,
    this._cancelPrizePayout,
    this.requestId,
  ) {
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
      _payout = await _getPrizePayoutDetail(requestId);
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
      _payout = await _cancelPrizePayout(requestId);
      return null;
    } catch (e) {
      return e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isCancelling = false;
      notifyListeners();
    }
  }
}
