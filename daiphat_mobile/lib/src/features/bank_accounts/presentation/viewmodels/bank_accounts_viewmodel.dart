import 'package:flutter/foundation.dart';

import 'package:daiphat_mobile/src/features/bank_accounts/domain/entities/bank_account.dart';
import 'package:daiphat_mobile/src/features/bank_accounts/domain/usecases/bank_account_usecases.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';

class BankAccountsViewModel extends ChangeNotifier {
  final GetMyBankAccounts _getMyBankAccounts;
  final GetBanks _getBanks;
  final SetDefaultBankAccount _setDefaultBankAccount;
  final DeleteBankAccount _deleteBankAccount;

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

  BankAccountsViewModel(
    this._getMyBankAccounts,
    this._getBanks,
    this._setDefaultBankAccount,
    this._deleteBankAccount,
  ) {
    load();
  }

  Future<void> load({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _error = null;
      notifyListeners();
    }

    try {
      _accounts = await _getMyBankAccounts();
      if (_banks.isEmpty) {
        _banks = await _getBanks();
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
      await _setDefaultBankAccount(id);
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
      await _deleteBankAccount(id);
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
