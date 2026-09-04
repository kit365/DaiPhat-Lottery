import 'package:flutter/foundation.dart';

import 'package:daiphat_mobile/src/features/bank_accounts/domain/entities/bank_account.dart';
import 'package:daiphat_mobile/src/features/bank_accounts/domain/usecases/bank_account_usecases.dart';
import 'package:daiphat_mobile/src/features/refunds/domain/entities/refund_request.dart';
import 'package:daiphat_mobile/src/features/refunds/domain/usecases/refund_usecases.dart';

class RefundDetailViewModel extends ChangeNotifier {
  final GetRefundDetail _getRefundDetail;
  final AttachRefundBankAccount _attachRefundBankAccount;
  final GetMyBankAccounts _getMyBankAccounts;
  final int refundId;

  RefundDetailViewModel(
    this._getRefundDetail,
    this._attachRefundBankAccount,
    this._getMyBankAccounts,
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
      _refund = await _getRefundDetail(refundId);
      if (_refund?.status == RefundRequestStatus.waitingForInfo) {
        _myBanks = await _getMyBankAccounts();
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
      _refund = await _attachRefundBankAccount(
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
