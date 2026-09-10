import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConfig {
  const ApiConfig._();

  static String get baseUrl {
    final mobileOverride = dotenv.env['MOBILE_API_BASE_URL']?.trim();
    if (mobileOverride != null && mobileOverride.isNotEmpty) {
      return mobileOverride;
    }

    final url = dotenv.env['VITE_API_BASE_URL']?.trim().isNotEmpty == true
        ? dotenv.env['VITE_API_BASE_URL']!.trim()
        : dotenv.get('API_BASE_URL', fallback: 'http://localhost:8080');
    if (!kIsWeb && Platform.isAndroid) {
      return url
          .replaceAll('localhost', '10.0.2.2')
          .replaceAll('127.0.0.1', '10.0.2.2');
    }
    return url;
  }

  static String get apiPrefix => dotenv.get('API_PREFIX', fallback: '/api');

  static String get apiVersion => dotenv.get('API_VERSION', fallback: '/v1');

  static String get apiBasePath => '$apiPrefix$apiVersion';
}
