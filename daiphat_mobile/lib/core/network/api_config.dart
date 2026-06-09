import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConfig {
  const ApiConfig._();

  static String get baseUrl =>
      dotenv.get('API_BASE_URL', fallback: 'http://localhost:8080');

  static String get apiPrefix => dotenv.get('API_PREFIX', fallback: '/api');

  static String get apiVersion => dotenv.get('API_VERSION', fallback: '/v1');

  static String get apiBasePath => '$apiPrefix$apiVersion';
}
