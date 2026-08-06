import 'package:flutter/foundation.dart';

import 'package:daiphat_mobile/src/features/checkout/models/refund_type.dart';
import 'package:daiphat_mobile/src/features/profile/data/bank_account_service.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';

class BankAccountsViewModel extends ChangeNotifier {
  final BankAccountService _service;

  List<UserBankAccountResponse> _accounts = const [];
  List<UserBankAccountResponse> get accounts => _accounts;

  List<VietQrBankResponse> _banks = const [];
  List<VietQrBankResponse> get banks => _banks;

  bool _isLoading = true;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  int? _mutatingId;
  int? get mutatingId => _mutatingId;

  BankAccountsViewModel(this._service) {
    load();
  }

  Future<void> load({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _error = null;
      notifyListeners();
    }

    try {
      _accounts = await _service.getMyAccounts();
      if (_banks.isEmpty) {
        _banks = await _service.getBanks();
      }
      _error = null;
    } on ApiException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Không tải được danh sách tài khoản ngân hàng.';
      debugPrint('Failed to load bank accounts: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<String?> setDefault(int id) async {
    _mutatingId = id;
    notifyListeners();
    try {
      await _service.setDefaultAccount(id);
      await load(silent: true);
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (e) {
      debugPrint('Failed to set default bank account: $e');
      return 'Không đặt được tài khoản mặc định.';
    } finally {
      _mutatingId = null;
      notifyListeners();
    }
  }

  Future<String?> delete(int id) async {
    _mutatingId = id;
    notifyListeners();
    try {
      await _service.deleteAccount(id);
      await load(silent: true);
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (e) {
      debugPrint('Failed to delete bank account: $e');
      return 'Không xoá được tài khoản ngân hàng.';
    } finally {
      _mutatingId = null;
      notifyListeners();
    }
  }
}
