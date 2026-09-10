import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'package:daiphat_mobile/src/shared/network/api_exception.dart';

class GoogleAuthService {
  final GoogleSignIn _googleSignIn;
  bool _isInitialized = false;

  GoogleAuthService({GoogleSignIn? googleSignIn})
    : _googleSignIn = googleSignIn ?? GoogleSignIn.instance;

  Future<String?> signIn() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      throw const ApiException(
        'Đăng nhập Google hiện chỉ được hỗ trợ trên Android.',
      );
    }

    try {
      await _ensureInitialized();
      if (!_googleSignIn.supportsAuthenticate()) {
        throw const ApiException(
          'Thiết bị hiện không hỗ trợ đăng nhập Google.',
        );
      }

      final account = await _googleSignIn.authenticate();
      final idToken = account.authentication.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw const ApiException(
          'Google không trả về mã xác thực. Vui lòng thử lại.',
        );
      }
      return idToken;
    } on GoogleSignInException catch (error) {
      if (error.code == GoogleSignInExceptionCode.canceled) {
        return null;
      }
      throw ApiException(_messageFor(error.code));
    }
  }

  Future<void> signOut() async {
    try {
      await _ensureInitialized();
      await _googleSignIn.signOut();
    } catch (_) {
      // Google logout is best-effort; local DaiPhat session cleanup must win.
    }
  }

  Future<void> _ensureInitialized() async {
    if (_isInitialized) {
      return;
    }

    final serverClientId =
        dotenv.env['GOOGLE_WEB_CLIENT_ID']?.trim() ??
        dotenv.env['GOOGLE_CLIENT_ID']?.trim();
    if (serverClientId == null || serverClientId.isEmpty) {
      throw const ApiException('Thiếu GOOGLE_WEB_CLIENT_ID trong file .env.');
    }

    await _googleSignIn.initialize(serverClientId: serverClientId);
    _isInitialized = true;
  }

  String _messageFor(GoogleSignInExceptionCode code) {
    switch (code) {
      case GoogleSignInExceptionCode.clientConfigurationError:
      case GoogleSignInExceptionCode.providerConfigurationError:
        return 'Cấu hình đăng nhập Google chưa hợp lệ.';
      case GoogleSignInExceptionCode.uiUnavailable:
        return 'Không thể mở giao diện đăng nhập Google.';
      case GoogleSignInExceptionCode.interrupted:
        return 'Đăng nhập Google bị gián đoạn. Vui lòng thử lại.';
      default:
        return 'Đăng nhập Google thất bại. Vui lòng thử lại.';
    }
  }
}
