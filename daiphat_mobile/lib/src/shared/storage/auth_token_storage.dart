import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthTokenStorage {
  static const _accessTokenKey = 'auth.access_token';

  final SharedPreferences _preferences;
  final FlutterSecureStorage? _secureStorage;
  String? _accessToken;

  AuthTokenStorage(this._preferences, [this._secureStorage])
    : _accessToken = _preferences.getString(_accessTokenKey);

  static Future<AuthTokenStorage> create() async {
    final preferences = await SharedPreferences.getInstance();
    const secureStorage = FlutterSecureStorage();
    final storage = AuthTokenStorage(preferences, secureStorage);
    final secureToken = await secureStorage.read(key: _accessTokenKey);
    final legacyToken = preferences.getString(_accessTokenKey);
    storage._accessToken = secureToken ?? legacyToken;
    if (secureToken == null && legacyToken != null && legacyToken.isNotEmpty) {
      await secureStorage.write(key: _accessTokenKey, value: legacyToken);
    }
    if (legacyToken != null) await preferences.remove(_accessTokenKey);
    return storage;
  }

  String? getAccessToken() {
    return _accessToken;
  }

  bool hasAccessToken() {
    final accessToken = getAccessToken();
    return accessToken != null && accessToken.isNotEmpty;
  }

  Future<void> saveAccessToken(String accessToken) async {
    _accessToken = accessToken;
    if (_secureStorage == null) {
      await _preferences.setString(_accessTokenKey, accessToken);
      return;
    }
    await _secureStorage.write(key: _accessTokenKey, value: accessToken);
    await _preferences.remove(_accessTokenKey);
  }

  Future<void> clear() async {
    _accessToken = null;
    await _secureStorage?.delete(key: _accessTokenKey);
    await _preferences.remove(_accessTokenKey);
  }
}
