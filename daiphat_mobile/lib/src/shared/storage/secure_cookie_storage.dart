import 'dart:convert';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureCookieStorage extends Storage {
  SecureCookieStorage(this._storage);

  static const _keyPrefix = 'auth.cookie.';
  static const _indexKey = 'auth.cookie.keys';

  final FlutterSecureStorage _storage;
  final Set<String> _keys = <String>{};

  @override
  Future<void> init(bool persistSession, bool ignoreExpires) async {
    final encodedKeys = await _storage.read(key: _indexKey);
    if (encodedKeys == null) return;
    try {
      final decoded = jsonDecode(encodedKeys);
      if (decoded is List) {
        _keys.addAll(decoded.whereType<String>());
      }
    } on FormatException {
      await _storage.delete(key: _indexKey);
    }
  }

  @override
  Future<String?> read(String key) => _storage.read(key: _storageKey(key));

  @override
  Future<void> write(String key, String value) async {
    await _storage.write(key: _storageKey(key), value: value);
    if (_keys.add(key)) await _saveIndex();
  }

  @override
  Future<void> delete(String key) async {
    await _storage.delete(key: _storageKey(key));
    if (_keys.remove(key)) await _saveIndex();
  }

  @override
  Future<void> deleteAll(List<String> keys) async {
    final keysToDelete = <String>{..._keys, ...keys};
    for (final key in keysToDelete) {
      await _storage.delete(key: _storageKey(key));
    }
    _keys.clear();
    await _storage.delete(key: _indexKey);
  }

  String _storageKey(String key) {
    return '$_keyPrefix${base64Url.encode(utf8.encode(key))}';
  }

  Future<void> _saveIndex() {
    return _storage.write(key: _indexKey, value: jsonEncode(_keys.toList()));
  }
}
