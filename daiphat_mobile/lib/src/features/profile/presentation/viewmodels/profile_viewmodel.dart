import 'package:flutter/material.dart';
import 'package:daiphat_mobile/src/features/auth/data/models/user.dart';
import 'package:daiphat_mobile/src/features/auth/data/repositories/auth_repository.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/login_viewmodel.dart';
import 'package:daiphat_mobile/src/features/profile/data/dto/update_profile_request.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';

class ProfileViewModel extends ChangeNotifier {
  final AuthRepository _authRepository;
  final LoginViewModel _loginViewModel;

  ProfileViewModel(this._authRepository, this._loginViewModel) {
    // Automatically load when created
    loadUser();
  }

  User? get user => _authRepository.currentUser;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  bool _showPhone = false;
  bool get showPhone => _showPhone;

  void togglePhoneVisibility() {
    _showPhone = !_showPhone;
    notifyListeners();
  }

  Future<void> loadUser() async {
    _isLoading = true;
    notifyListeners();
    
    try {
      await _authRepository.fetchCurrentUser();
    } catch (e) {
      _errorMessage = 'Không thể tải thông tin tài khoản.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateProfile(UpdateProfileRequest request) async {
    final currentUser = _authRepository.currentUser;
    if (currentUser == null) return false;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _authRepository.updateUser(currentUser.id, request);
      _isLoading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _isLoading = false;
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
      notifyListeners();
      return false;
    }
  }

  Future<bool> uploadAvatar(String filePath) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _authRepository.uploadAvatar(filePath);
      _isLoading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _isLoading = false;
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Đã có lỗi xảy ra khi tải ảnh đại diện.';
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _authRepository.logout();
    _loginViewModel.onLoggedOut();
    notifyListeners();
  }
}

