import 'package:flutter/material.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import '../../domain/entities/register_request.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/usecases/auth_usecases.dart';

class RegisterViewModel extends ChangeNotifier {
  final RegisterAccount _registerAccount;

  RegisterViewModel(
    AuthRepository authRepository, {
    RegisterAccount? registerAccount,
  }) : _registerAccount = registerAccount ?? RegisterAccount(authRepository);

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  Future<bool> register(RegisterRequest request) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _registerAccount(request);
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}

