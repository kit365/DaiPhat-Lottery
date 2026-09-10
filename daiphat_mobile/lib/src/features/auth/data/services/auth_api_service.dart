import 'package:dio/dio.dart';

import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import '../dto/login_request.dart';
import '../dto/register_request.dart';
import '../dto/forgot_password_request.dart';
import '../dto/verify_otp_request.dart';
import '../dto/reset_password_request.dart';
import '../dto/change_password_request.dart';
import 'package:daiphat_mobile/src/features/profile/data/dto/update_profile_request.dart';
import '../models/auth_token.dart';
import '../models/password_policy.dart';
import '../models/user.dart';
import 'package:daiphat_mobile/src/shared/network/api_response.dart';

class AuthApiService {
  final ApiClient _apiClient;

  AuthApiService(this._apiClient);

  static const String _baseAuth = '/auth';
  static const String _baseUsers = '/users';

  Future<AuthToken> login(String username, String password) async {
    final request = LoginRequest(username: username, password: password);

    final response = await _apiClient.post(
      '$_baseAuth/login',
      data: request.toJson(),
      includeAuth: false,
    );

    final apiResponse = ApiResponse<AuthToken>.fromJson(
      response,
      (json) => AuthToken.fromJson(json as Map<String, dynamic>),
    );

    if (!apiResponse.isSuccess) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Đăng nhập thất bại.',
      );
    }

    if (apiResponse.data == null) {
      throw const ApiException('Dữ liệu đăng nhập không hợp lệ.');
    }

    return apiResponse.data!;
  }

  Future<AuthToken> loginWithGoogle(String idToken) async {
    final response = await _apiClient.post(
      '$_baseAuth/google',
      data: {'idToken': idToken},
      includeAuth: false,
    );

    final apiResponse = ApiResponse<AuthToken>.fromJson(
      response,
      (json) => AuthToken.fromJson(json as Map<String, dynamic>),
    );

    if (!apiResponse.isSuccess) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Đăng nhập Google thất bại.',
      );
    }

    if (apiResponse.data == null || apiResponse.data!.accessToken.isEmpty) {
      throw const ApiException('Dữ liệu đăng nhập Google không hợp lệ.');
    }

    return apiResponse.data!;
  }

  Future<void> logout() async {
    final response = await _apiClient.post(
      '$_baseAuth/logout',
      includeAuth: false,
    );
    final apiResponse = ApiResponse.fromJson(response, null);
    if (!apiResponse.isSuccess) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Đăng xuất thất bại.',
      );
    }
  }

  Future<User> getCurrentUser() async {
    final response = await _apiClient.get('$_baseUsers/me');

    final apiResponse = ApiResponse<User>.fromJson(
      response,
      (json) => User.fromJson(json as Map<String, dynamic>),
    );

    if (!apiResponse.isSuccess) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Không thể lấy thông tin người dùng.',
      );
    }

    if (apiResponse.data == null) {
      throw const ApiException('Dữ liệu người dùng trống.');
    }

    return apiResponse.data!;
  }

  Future<void> register(RegisterRequest request) async {
    final response = await _apiClient.post(
      '$_baseAuth/register',
      data: request.toJson(),
    );
    final apiResponse = ApiResponse.fromJson(response, null);
    if (!apiResponse.isSuccess) {
      throw ApiException(apiResponse.message);
    }
  }

  Future<void> forgotPasswordRequest(ForgotPasswordRequest request) async {
    final response = await _apiClient.post(
      '$_baseAuth/forgot-password/request',
      data: request.toJson(),
    );
    final apiResponse = ApiResponse.fromJson(response, null);
    if (!apiResponse.isSuccess) {
      throw ApiException(apiResponse.message);
    }
  }

  Future<String> verifyResetOtp(VerifyOtpRequest request) async {
    final response = await _apiClient.post(
      '$_baseAuth/forgot-password/verify',
      data: request.toJson(),
    );

    final apiResponse = ApiResponse<String>.fromJson(
      response,
      (json) => (json as Map<String, dynamic>)['resetToken'] as String,
    );

    if (!apiResponse.isSuccess) throw ApiException(apiResponse.message);
    if (apiResponse.data == null) {
      throw const ApiException('Dữ liệu xác thực OTP không hợp lệ.');
    }

    return apiResponse.data!;
  }

  Future<void> resetPassword(ResetPasswordRequest request) async {
    final response = await _apiClient.post(
      '$_baseAuth/forgot-password/reset',
      data: request.toJson(),
    );
    final apiResponse = ApiResponse.fromJson(response, null);
    if (!apiResponse.isSuccess) throw ApiException(apiResponse.message);
  }

  Future<void> changePassword(ChangePasswordRequest request) async {
    final response = await _apiClient.post(
      '$_baseAuth/change-password',
      data: request.toJson(),
    );
    final apiResponse = ApiResponse.fromJson(response, null);
    if (!apiResponse.isSuccess) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Không thể cập nhật mật khẩu.',
      );
    }
  }

  Future<void> updateUser(String id, UpdateProfileRequest request) async {
    final response = await _apiClient.put(
      '$_baseUsers/$id',
      data: request.toJson(),
    );
    final apiResponse = ApiResponse.fromJson(response, null);
    if (!apiResponse.isSuccess) throw ApiException(apiResponse.message);
  }

  Future<User> uploadMyAvatar(String filePath) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
    });

    final response = await _apiClient.post(
      '$_baseUsers/me/avatar',
      data: formData,
    );

    final apiResponse = ApiResponse<User>.fromJson(
      response,
      (json) => User.fromJson(json as Map<String, dynamic>),
    );

    if (!apiResponse.isSuccess) throw ApiException(apiResponse.message);
    if (apiResponse.data == null) {
      throw const ApiException('Không thể lấy thông tin người dùng.');
    }

    return apiResponse.data!;
  }

  Future<void> updateFcmToken(String token) async {
    final response = await _apiClient.post(
      '$_baseUsers/me/fcm-token',
      data: {'fcmToken': token},
    );
    final apiResponse = ApiResponse.fromJson(response, null);
    if (!apiResponse.isSuccess) throw ApiException(apiResponse.message);
  }

  Future<PasswordPolicy> getPasswordPolicy() async {
    final response = await _apiClient.get(
      '$_baseAuth/password-policy',
      includeAuth: false,
    );

    final apiResponse = ApiResponse<PasswordPolicy>.fromJson(
      response,
      (json) => PasswordPolicy.fromJson(json as Map<String, dynamic>),
    );

    if (!apiResponse.isSuccess) {
      throw ApiException(
        apiResponse.message.isNotEmpty
            ? apiResponse.message
            : 'Không thể lấy chính sách mật khẩu.',
      );
    }

    if (apiResponse.data == null) {
      throw const ApiException('Dữ liệu chính sách mật khẩu trống.');
    }

    return apiResponse.data!;
  }
}
