import 'package:flutter/material.dart';
import '../../domain/entities/forgot_password_request.dart';
import '../../domain/entities/reset_password_request.dart';
import '../../domain/entities/verify_otp_request.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/usecases/auth_usecases.dart';

enum ForgotPasswordStep { email, otp, reset }

class ForgotPasswordViewModel extends ChangeNotifier {
  final RequestPasswordResetOtp _requestPasswordResetOtp;
  final VerifyPasswordResetOtp _verifyPasswordResetOtp;
  final ResetPassword _resetPassword;

  ForgotPasswordViewModel(
    AuthRepository authRepository, {
    RequestPasswordResetOtp? requestPasswordResetOtp,
    VerifyPasswordResetOtp? verifyPasswordResetOtp,
    ResetPassword? resetPassword,
  })  : _requestPasswordResetOtp =
            requestPasswordResetOtp ?? RequestPasswordResetOtp(authRepository),
        _verifyPasswordResetOtp =
            verifyPasswordResetOtp ?? VerifyPasswordResetOtp(authRepository),
        _resetPassword = resetPassword ?? ResetPassword(authRepository);

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
      await _requestPasswordResetOtp(ForgotPasswordRequest(email: email));
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
      final token = await _verifyPasswordResetOtp(
        VerifyOtpRequest(email: _email, otp: otp),
      );
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
      await _resetPassword(ResetPasswordRequest(
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

