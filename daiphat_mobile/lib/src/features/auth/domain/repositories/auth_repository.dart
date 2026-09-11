import 'package:daiphat_mobile/src/features/profile/data/dto/update_profile_request.dart';

import '../entities/change_password_request.dart';
import '../entities/forgot_password_request.dart';
import '../entities/password_policy.dart';
import '../entities/register_request.dart';
import '../entities/reset_password_request.dart';
import '../entities/user.dart';
import '../entities/verify_otp_request.dart';

abstract class AuthRepository {
  User? get currentUser;

  bool get isAuthenticated;

  Future<void> restoreSession();

  Future<User> login(String username, String password);

  Future<User?> loginWithGoogle();

  Future<void> logout({bool clearCookies = true});

  Future<User> fetchCurrentUser();

  Future<void> register(RegisterRequest request);

  Future<void> forgotPasswordRequest(ForgotPasswordRequest request);

  Future<String> verifyResetOtp(VerifyOtpRequest request);

  Future<void> resetPassword(ResetPasswordRequest request);

  Future<void> changePassword(ChangePasswordRequest request);

  Future<PasswordPolicy> getPasswordPolicy();

  Future<void> updateUser(String id, UpdateProfileRequest request);

  Future<void> uploadAvatar(String filePath);

  Future<void> updateFcmToken(String token);
}
