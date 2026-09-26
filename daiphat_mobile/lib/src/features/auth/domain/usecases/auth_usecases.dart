import '../entities/change_password_request.dart';
import '../entities/forgot_password_request.dart';
import '../entities/password_policy.dart';
import '../entities/register_request.dart';
import '../entities/reset_password_request.dart';
import '../entities/user.dart';
import '../entities/verify_otp_request.dart';
import '../repositories/auth_repository.dart';

class Login {
  Login(this._repository);

  final AuthRepository _repository;

  Future<User> call(String username, String password) {
    return _repository.login(username, password);
  }
}

class LoginWithGoogle {
  LoginWithGoogle(this._repository);

  final AuthRepository _repository;

  Future<User?> call() {
    return _repository.loginWithGoogle();
  }
}

class RegisterAccount {
  RegisterAccount(this._repository);

  final AuthRepository _repository;

  Future<void> call(RegisterRequest request) {
    return _repository.register(request);
  }
}

class RequestPasswordResetOtp {
  RequestPasswordResetOtp(this._repository);

  final AuthRepository _repository;

  Future<void> call(ForgotPasswordRequest request) {
    return _repository.forgotPasswordRequest(request);
  }
}

class VerifyPasswordResetOtp {
  VerifyPasswordResetOtp(this._repository);

  final AuthRepository _repository;

  Future<String> call(VerifyOtpRequest request) {
    return _repository.verifyResetOtp(request);
  }
}

class ResetPassword {
  ResetPassword(this._repository);

  final AuthRepository _repository;

  Future<void> call(ResetPasswordRequest request) {
    return _repository.resetPassword(request);
  }
}

class ChangePassword {
  ChangePassword(this._repository);

  final AuthRepository _repository;

  Future<void> call(ChangePasswordRequest request) {
    return _repository.changePassword(request);
  }
}

class GetPasswordPolicy {
  GetPasswordPolicy(this._repository);

  final AuthRepository _repository;

  Future<PasswordPolicy> call() {
    return _repository.getPasswordPolicy();
  }
}

class UpdateFcmToken {
  UpdateFcmToken(this._repository);

  final AuthRepository _repository;

  Future<void> call(String token) {
    return _repository.updateFcmToken(token);
  }
}
