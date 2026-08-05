import 'package:flutter/material.dart';
import '../../data/dto/forgot_password_request.dart';
import '../../data/dto/reset_password_request.dart';
import '../../data/dto/verify_otp_request.dart';
import 'package:daiphat_mobile/src/features/auth/data/repositories/auth_repository.dart';

enum ForgotPasswordStep { email, otp, reset }

class ForgotPasswordViewModel extends ChangeNotifier {
  final AuthRepository _authRepository;

  ForgotPasswordViewModel(this._authRepository);

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  ForgotPasswordStep _currentStep = ForgotPasswordStep.email;
  ForgotPasswordStep get currentStep => _currentStep;

  String _email = '';
  String get email => _email;

  String _resetToken = '';

  Future<bool> requestOtp(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authRepository.forgotPasswordRequest(ForgotPasswordRequest(email: email));
      _email = email;
      _currentStep = ForgotPasswordStep.otp;
      return true;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> verifyOtp(String otp) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final token = await _authRepository.verifyResetOtp(VerifyOtpRequest(email: _email, otp: otp));
      _resetToken = token;
      _currentStep = ForgotPasswordStep.reset;
      return true;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> resetPassword(String newPassword, String confirmPassword) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authRepository.resetPassword(ResetPasswordRequest(
        resetToken: _resetToken,
        newPassword: newPassword,
        confirmPassword: confirmPassword,
      ));
      return true;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void reset() {
    _currentStep = ForgotPasswordStep.email;
    _email = '';
    _resetToken = '';
    _error = null;
    _isLoading = false;
    notifyListeners();
  }
}

