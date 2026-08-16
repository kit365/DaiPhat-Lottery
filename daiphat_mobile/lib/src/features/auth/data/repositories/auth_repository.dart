import 'dart:async';

import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/storage/auth_token_storage.dart';
import '../dto/register_request.dart';
import '../dto/forgot_password_request.dart';
import '../dto/verify_otp_request.dart';
import '../dto/reset_password_request.dart';
import 'package:daiphat_mobile/src/features/profile/data/dto/update_profile_request.dart';
import '../models/user.dart';
import '../services/auth_api_service.dart';

class AuthRepository {
  final AuthApiService _apiService;
  final ApiClient _apiClient;
  final AuthTokenStorage _tokenStorage;
  User? _currentUser;

  AuthRepository(this._apiService, this._apiClient, this._tokenStorage);

  User? get currentUser => _currentUser;
  bool get isAuthenticated =>
      _currentUser != null || _tokenStorage.hasAccessToken();

  Future<void> restoreSession() async {
    final accessToken = _tokenStorage.getAccessToken();
    if (accessToken == null || accessToken.isEmpty) {
      return;
    }

    _apiClient.setAccessToken(accessToken);
    unawaited(_clearStaleSessionIfNeeded());
  }

  Future<void> _clearStaleSessionIfNeeded() async {
    try {
      final user = await _apiService.getCurrentUser();
      _currentUser = user.copyWith(accessToken: _tokenStorage.getAccessToken() ?? '');
    } on ApiException catch (error) {
      if (error.statusCode == 401 || error.statusCode == 403) {
        await logout();
      }
    } catch (_) {
      // Network hiccup at startup — keep token; protected APIs will retry later.
    }
  }

  Future<User> login(String username, String password) async {
    final authToken = await _apiService.login(username, password);
    _apiClient.setAccessToken(authToken.accessToken);
    await _tokenStorage.saveAccessToken(authToken.accessToken);

    final user = await _apiService.getCurrentUser();
    final authenticatedUser = user.copyWith(accessToken: authToken.accessToken);
    _currentUser = authenticatedUser;
    return authenticatedUser;
  }

  Future<void> logout() async {
    _apiClient.clearAccessToken();
    await _apiClient.clearCookies();
    await _tokenStorage.clear();
    _currentUser = null;
  }

  Future<User> fetchCurrentUser() async {
    try {
      final user = await _apiService.getCurrentUser();
      if (_currentUser != null) {
        _currentUser = user.copyWith(accessToken: _currentUser!.accessToken);
      } else {
        _currentUser = user.copyWith(accessToken: _tokenStorage.getAccessToken() ?? '');
      }
      return _currentUser!;
    } on ApiException catch (e) {
      if (e.statusCode == 401 || e.statusCode == 403) {
        await logout();
      }
      rethrow;
    }
  }

  Future<void> register(RegisterRequest request) {
    return _apiService.register(request);
  }

  Future<void> forgotPasswordRequest(ForgotPasswordRequest request) {
    return _apiService.forgotPasswordRequest(request);
  }

  Future<String> verifyResetOtp(VerifyOtpRequest request) {
    return _apiService.verifyResetOtp(request);
  }

  Future<void> resetPassword(ResetPasswordRequest request) {
    return _apiService.resetPassword(request);
  }

  Future<void> updateUser(String id, UpdateProfileRequest request) async {
    await _apiService.updateUser(id, request);
    // Refresh the user profile after updating
    final updatedUser = await _apiService.getCurrentUser();
    if (_currentUser != null) {
      _currentUser = updatedUser.copyWith(accessToken: _currentUser!.accessToken);
    } else {
      _currentUser = updatedUser;
    }
  }

  Future<void> uploadAvatar(String filePath) async {
    final updatedUser = await _apiService.uploadMyAvatar(filePath);
    if (_currentUser != null) {
      _currentUser = updatedUser.copyWith(accessToken: _currentUser!.accessToken);
    } else {
      _currentUser = updatedUser;
    }
  }

  Future<void> updateFcmToken(String token) {
    return _apiService.updateFcmToken(token);
  }
}

