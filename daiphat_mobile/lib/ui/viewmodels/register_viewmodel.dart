import 'package:flutter/material.dart';
import '../../core/network/api_exception.dart';
import '../../data/dto/auth/register_request.dart';
import '../../data/repositories/auth_repository.dart';

class RegisterViewModel extends ChangeNotifier {
  final AuthRepository _authRepository;

  RegisterViewModel(this._authRepository);

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  Future<bool> register(RegisterRequest request) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authRepository.register(request);
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
