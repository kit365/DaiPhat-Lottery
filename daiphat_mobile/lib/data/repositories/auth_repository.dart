import '../models/user.dart';
import '../services/auth_api_service.dart';

class AuthRepository {
  final AuthApiService _apiService;
  User? _currentUser;

  AuthRepository(this._apiService);

  User? get currentUser => _currentUser;

  Future<User> login(String username, String password) async {
    final rawData = await _apiService.loginRaw(username, password);
    final user = User.fromJson(rawData);
    _currentUser = user;
    return user;
  }

  void logout() {
    _currentUser = null;
  }
}
