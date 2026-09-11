import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/features/auth/domain/entities/user.dart';
import 'package:daiphat_mobile/src/features/auth/domain/repositories/auth_repository.dart';
import 'package:daiphat_mobile/src/features/auth/domain/usecases/auth_usecases.dart';

class LoginViewModel extends ChangeNotifier {
  final AuthRepository _authRepository;
  final Login _login;
  final LoginWithGoogle _loginWithGoogle;
  final UpdateFcmToken _updateFcmToken;

  LoginViewModel(
    this._authRepository, {
    Login? login,
    LoginWithGoogle? loginWithGoogle,
    UpdateFcmToken? updateFcmToken,
  })  : _login = login ?? Login(_authRepository),
        _loginWithGoogle = loginWithGoogle ?? LoginWithGoogle(_authRepository),
        _updateFcmToken = updateFcmToken ?? UpdateFcmToken(_authRepository);

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  User? _user;
  User? get user => _user;
  bool get isAuthenticated => _authRepository.isAuthenticated;

  void onLoggedOut() {
    _user = null;
    notifyListeners();
  }

  Future<bool> login(String username, String password) async {
    return _authenticate(() => _login(username, password));
  }

  Future<bool> loginWithGoogle() async {
    return _authenticate(_loginWithGoogle.call);
  }

  Future<bool> _authenticate(Future<User?> Function() authenticate) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _user = await authenticate();
      if (_user == null) {
        return false;
      }

      try {
        final fcmToken = await FirebaseMessaging.instance.getToken();
        if (fcmToken != null) {
          await _updateFcmToken(fcmToken);
        }
      } catch (e) {
        debugPrint('Failed to update FCM token: $e');
      }

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
