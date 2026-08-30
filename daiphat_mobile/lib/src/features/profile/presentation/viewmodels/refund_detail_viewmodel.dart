import 'package:flutter/foundation.dart';

import 'package:daiphat_mobile/src/features/checkout/models/refund_type.dart';
import 'package:daiphat_mobile/src/features/profile/data/bank_account_service.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/refund_request.dart';
import 'package:daiphat_mobile/src/features/profile/data/refund_service.dart';

class RefundDetailViewModel extends ChangeNotifier {
  final RefundService _service;
  final BankAccountService _bankAccountService;
  final int refundId;

  RefundDetailViewModel(
    this._service,
    this._bankAccountService,
    this.refundId,
  ) {
    load();
  }

  RefundRequestResponse? _refund;
  RefundRequestResponse? get refund => _refund;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  bool _isSubmitting = false;
  bool get isSubmitting => _isSubmitting;

  List<UserBankAccountResponse> _myBanks = const [];
  List<UserBankAccountResponse> get myBanks => _myBanks;

  Future<void> load() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _refund = await _service.getRefundDetail(refundId);
      if (_refund?.status == RefundRequestStatus.waitingForInfo) {
        _myBanks = await _bankAccountService.getMyAccounts();
      }
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Trả về null nếu thành công, ngược lại trả về message lỗi.
  Future<String?> attachBankAccount(int bankAccountId) async {
    _isSubmitting = true;
    notifyListeners();
    try {
      _refund = await _service.attachBankAccount(
        id: refundId,
        bankAccountId: bankAccountId,
      );
      return null;
    } catch (e) {
      return e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isSubmitting = false;
      notifyListeners();
    }
  }
}
