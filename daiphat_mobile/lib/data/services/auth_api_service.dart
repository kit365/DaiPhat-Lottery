import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

class AuthApiService {
  final http.Client _client;

  AuthApiService({http.Client? client}) : _client = client ?? http.Client();

  String get _baseUrl => dotenv.get('API_BASE_URL');
  String get _loginPath => dotenv.get('LOGIN_ENDPOINT', fallback: '/api/auth/login');

  Future<Map<String, dynamic>> loginRaw(String username, String password) async {
    final uri = Uri.parse('$_baseUrl$_loginPath');
    
    final response = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'password': password,
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Login failed with status: ${response.statusCode}');
    }
  }
}
