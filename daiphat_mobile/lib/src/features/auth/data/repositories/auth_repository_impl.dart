import 'package:daiphat_mobile/src/features/auth/domain/entities/change_password_request.dart';
import 'package:daiphat_mobile/src/features/auth/domain/entities/forgot_password_request.dart';
import 'package:daiphat_mobile/src/features/auth/domain/entities/password_policy.dart';
import 'package:daiphat_mobile/src/features/auth/domain/entities/register_request.dart';
import 'package:daiphat_mobile/src/features/auth/domain/entities/reset_password_request.dart';
import 'package:daiphat_mobile/src/features/auth/domain/entities/user.dart';
import 'package:daiphat_mobile/src/features/auth/domain/entities/verify_otp_request.dart';
import 'package:daiphat_mobile/src/features/auth/domain/repositories/auth_repository.dart';
import 'package:daiphat_mobile/src/features/profile/domain/entities/update_profile_request.dart';
import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/storage/auth_token_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/auth_api_service.dart';
import '../services/google_auth_service.dart';

class AuthRepositoryImpl implements AuthRepository {
  static const _checkoutUserIdKey = 'checkout.user_id';
  static const _checkoutUserNameKey = 'user_name';
  static const _checkoutUserPhoneKey = 'user_phone';
  final AuthApiService _apiService;
  final ApiClient _apiClient;
  final AuthTokenStorage _tokenStorage;
  final GoogleAuthService _googleAuthService;
  User? _currentUser;

  AuthRepositoryImpl(
    this._apiService,
    this._apiClient,
    this._tokenStorage, [
    GoogleAuthService? googleAuthService,
  ]) : _googleAuthService = googleAuthService ?? GoogleAuthService();

  @override
  User? get currentUser => _currentUser;

  @override
  bool get isAuthenticated =>
      _currentUser != null || _tokenStorage.hasAccessToken();

  @override
  Future<void> restoreSession() async {
    final accessToken = _tokenStorage.getAccessToken();
    if (accessToken == null || accessToken.isEmpty) {
      return;
    }

    _apiClient.setAccessToken(accessToken);
    await _apiClient.restoreAccessSessionIfNeeded();
    await _clearStaleSessionIfNeeded();
  }

  Future<void> _clearStaleSessionIfNeeded() async {
    if ((_apiClient.accessToken == null || _apiClient.accessToken!.isEmpty) &&
        !_tokenStorage.hasAccessToken()) {
      return;
    }

    try {
      final user = await _apiService.getCurrentUser();
      _currentUser = user.copyWith(
        accessToken: _tokenStorage.getAccessToken() ?? '',
      );
      await _saveCheckoutProfile(_currentUser!);
    } on ApiException catch (error) {
      if (error.statusCode == 401 || error.statusCode == 403) {
        await logout();
      }
    } catch (_) {
      // Network hiccup at startup — keep token; protected APIs will retry later.
    }
  }

  @override
  Future<User> login(String username, String password) async {
    final authToken = await _apiService.login(username, password);
    return _finalizeLogin(authToken.accessToken);
  }

  @override
  Future<User?> loginWithGoogle() async {
    final idToken = await _googleAuthService.signIn();
    if (idToken == null) {
      return null;
    }

    final authToken = await _apiService.loginWithGoogle(idToken);
    return _finalizeLogin(authToken.accessToken);
  }

  Future<User> _finalizeLogin(String accessToken) async {
    _apiClient.setAccessToken(accessToken);
    await _tokenStorage.saveAccessToken(accessToken);

    final user = await _apiService.getCurrentUser();
    final authenticatedUser = user.copyWith(accessToken: accessToken);
    _currentUser = authenticatedUser;
    await _saveCheckoutProfile(authenticatedUser);
    return authenticatedUser;
  }

  @override
  Future<void> logout({bool clearCookies = true}) async {
    try {
      // Revoke the refresh token on the backend before removing the local
      // cookie that the logout endpoint needs.
      await _apiService.logout();
    } catch (_) {
      // Local cleanup must still happen when the backend is unreachable or
      // the refresh token is already invalid.
    }

    _apiClient.clearAccessToken();
    if (clearCookies) {
      await _apiClient.clearCookies();
    }
    await _tokenStorage.clear();
    await _clearCheckoutProfile();
    _currentUser = null;
    await _googleAuthService.signOut();
  }

  @override
  Future<User> fetchCurrentUser() async {
    try {
      final user = await _apiService.getCurrentUser();
      if (_currentUser != null) {
        _currentUser = user.copyWith(accessToken: _currentUser!.accessToken);
      } else {
        _currentUser = user.copyWith(
          accessToken: _tokenStorage.getAccessToken() ?? '',
        );
      }
      await _saveCheckoutProfile(_currentUser!);
      return _currentUser!;
    } on ApiException catch (e) {
      if (e.statusCode == 401 || e.statusCode == 403) {
        await logout();
      }
      rethrow;
    }
  }

  @override
  Future<void> register(RegisterRequest request) {
    return _apiService.register(request);
  }

  @override
  Future<void> forgotPasswordRequest(ForgotPasswordRequest request) {
    return _apiService.forgotPasswordRequest(request);
  }

  @override
  Future<String> verifyResetOtp(VerifyOtpRequest request) {
    return _apiService.verifyResetOtp(request);
  }

  @override
  Future<void> resetPassword(ResetPasswordRequest request) {
    return _apiService.resetPassword(request);
  }

  @override
  Future<void> changePassword(ChangePasswordRequest request) {
    return _apiService.changePassword(request);
  }

  @override
  Future<PasswordPolicy> getPasswordPolicy() {
    return _apiService.getPasswordPolicy();
  }

  @override
  Future<void> updateUser(String id, UpdateProfileRequest request) async {
    await _apiService.updateUser(id, request);
    // Refresh the user profile after updating.
    final updatedUser = await _apiService.getCurrentUser();
    if (_currentUser != null) {
      _currentUser = updatedUser.copyWith(
        accessToken: _currentUser!.accessToken,
      );
    } else {
      _currentUser = updatedUser;
    }
    await _saveCheckoutProfile(_currentUser!);
  }

  @override
  Future<void> uploadAvatar(String filePath) async {
    final updatedUser = await _apiService.uploadMyAvatar(filePath);
    if (_currentUser != null) {
      _currentUser = updatedUser.copyWith(
        accessToken: _currentUser!.accessToken,
      );
    } else {
      _currentUser = updatedUser;
    }
    await _saveCheckoutProfile(_currentUser!);
  }

  @override
  Future<void> updateFcmToken(String token) {
    return _apiService.updateFcmToken(token);
  }

  Future<void> _saveCheckoutProfile(User user) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_checkoutUserIdKey, user.id);
    await _writeOrRemove(preferences, _checkoutUserNameKey, user.fullName);
    await _writeOrRemove(preferences, _checkoutUserPhoneKey, user.phone);
  }

  Future<void> _clearCheckoutProfile() async {
    final preferences = await SharedPreferences.getInstance();
    await Future.wait([
      preferences.remove(_checkoutUserIdKey),
      preferences.remove(_checkoutUserNameKey),
      preferences.remove(_checkoutUserPhoneKey),
    ]);
  }

  Future<void> _writeOrRemove(
    SharedPreferences preferences,
    String key,
    String? value,
  ) {
    final normalized = value?.trim() ?? '';
    return normalized.isEmpty
        ? preferences.remove(key)
        : preferences.setString(key, normalized);
  }
}
