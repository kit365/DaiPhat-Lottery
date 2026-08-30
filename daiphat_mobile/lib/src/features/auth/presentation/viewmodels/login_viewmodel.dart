import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/features/auth/data/repositories/auth_repository.dart';
import 'package:daiphat_mobile/src/features/auth/data/models/user.dart';

class LoginViewModel extends ChangeNotifier {
  final AuthRepository _authRepository;

  LoginViewModel(this._authRepository);

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
    return _authenticate(() => _authRepository.login(username, password));
  }

  Future<bool> loginWithGoogle() async {
    return _authenticate(_authRepository.loginWithGoogle);
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

      // Save user profile to SharedPreferences for checkout auto-fill
      try {
        final prefs = await SharedPreferences.getInstance();
        if (_user!.fullName != null && _user!.fullName!.isNotEmpty) {
          await prefs.setString('user_name', _user!.fullName!);
        }
        if (_user!.phone != null && _user!.phone!.isNotEmpty) {
          await prefs.setString('user_phone', _user!.phone!);
        }
      } catch (e) {
        debugPrint('Failed to save user profile to SharedPreferences: $e');
      }

      try {
        final fcmToken = await FirebaseMessaging.instance.getToken();
        if (fcmToken != null) {
          await _authRepository.updateFcmToken(fcmToken);
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
