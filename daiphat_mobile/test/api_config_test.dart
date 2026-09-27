import 'dart:io';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:daiphat_mobile/src/shared/network/api_config.dart';
import 'package:daiphat_mobile/src/features/chat/utils/chat_constants.dart';

void main() {
  test('ApiConfig reads https://daiphat.id.vn from .env', () async {
    final envFile = File('.env');
    expect(envFile.existsSync(), isTrue);

    await dotenv.load(fileName: '.env');

    final expectedBaseUrl = dotenv.env['MOBILE_API_BASE_URL'] ?? dotenv.env['API_BASE_URL'] ?? 'https://daiphat.id.vn';
    expect(ApiConfig.baseUrl, expectedBaseUrl);
    expect(ApiConfig.apiPrefix, '/api');
    expect(ApiConfig.apiVersion, '/v1');
    expect(ApiConfig.apiBasePath, '/api/v1');
    expect(ChatWsConstants.wsUrl(ApiConfig.baseUrl), '$expectedBaseUrl/api/v1/ws');
  });
}
