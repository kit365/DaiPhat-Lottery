import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb, kReleaseMode;
import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConfig {
  const ApiConfig._();

  static String get baseUrl {
    final mobileOverride = dotenv.env['MOBILE_API_BASE_URL']?.trim();
    final configured = mobileOverride != null && mobileOverride.isNotEmpty
        ? mobileOverride
        : (dotenv.env['VITE_API_BASE_URL']?.trim().isNotEmpty == true
            ? dotenv.env['VITE_API_BASE_URL']!.trim()
            : dotenv.env['API_BASE_URL']?.trim());
    final url = configured ?? (kReleaseMode ? '' : 'http://localhost:8080');
    final uri = Uri.tryParse(url);
    if (uri == null || uri.scheme.isEmpty || uri.host.isEmpty) {
      throw StateError('API_BASE_URL phải là một URL hợp lệ.');
    }
    if (kReleaseMode && uri.scheme != 'https') {
      throw StateError('Bản phát hành chỉ được dùng API HTTPS.');
    }
    if (!kIsWeb && Platform.isAndroid &&
        (uri.host == 'localhost' || uri.host == '127.0.0.1')) {
      return uri.replace(host: '10.0.2.2').toString();
    }
    return url;
  }

  static String get apiPrefix => dotenv.get('API_PREFIX', fallback: '/api');

  static String get apiVersion => dotenv.get('API_VERSION', fallback: '/v1');

  static String get apiBasePath => '$apiPrefix$apiVersion';
}
