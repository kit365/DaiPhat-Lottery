import 'package:shared_preferences/shared_preferences.dart';

class AuthTokenStorage {
  static const _accessTokenKey = 'auth.access_token';

  final SharedPreferences _preferences;

  const AuthTokenStorage(this._preferences);

  static Future<AuthTokenStorage> create() async {
    final preferences = await SharedPreferences.getInstance();
    return AuthTokenStorage(preferences);
  }

  String? getAccessToken() {
    return _preferences.getString(_accessTokenKey);
  }

  bool hasAccessToken() {
    final accessToken = getAccessToken();
    return accessToken != null && accessToken.isNotEmpty;
  }

  Future<void> saveAccessToken(String accessToken) {
    return _preferences.setString(_accessTokenKey, accessToken);
  }

  Future<void> clear() {
    return _preferences.remove(_accessTokenKey);
  }
}
