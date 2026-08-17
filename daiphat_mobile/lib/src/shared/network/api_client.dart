import 'dart:async';
import 'dart:convert';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';

import 'api_config.dart';
import 'api_exception.dart';

/// HTTP client aligned with website `daiphat-fe/src/api/index.ts`:
/// - login 401 → sai mật khẩu
/// - refresh 401 → phiên hết
/// - API khác 401 → refresh 1 lần, xếp hàng, gọi lại
/// - refresh xong vẫn 401 → xóa session
class ApiClient {
  static const _sessionExpiredMessage =
      'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  static const _invalidCredentialsMessage =
      'Tên đăng nhập hoặc mật khẩu không chính xác.';

  final Dio _dio;
  final CookieJar? _cookieJar;
  String? _accessToken;
  String? Function()? resolveAccessToken;
  Future<void> Function(String accessToken)? onAccessTokenRefreshed;
  Future<void> Function()? onSessionExpired;

  bool _isRefreshing = false;
  Completer<String?>? _refreshCompleter;

  ApiClient({Dio? dio, CookieJar? cookieJar})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: '${ApiConfig.baseUrl}${ApiConfig.apiBasePath}',
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 15),
              sendTimeout: const Duration(seconds: 15),
              headers: const {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
            ),
          ),
      _cookieJar = cookieJar {
    if (_cookieJar != null) {
      _dio.interceptors.add(CookieManager(_cookieJar));
    }

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (_isPublicAuthEndpoint(options.path) ||
              options.extra['includeAuth'] == false) {
            options.headers.remove('Authorization');
            handler.next(options);
            return;
          }

          final token = _resolveAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          } else {
            options.headers.remove('Authorization');
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final requestOptions = error.requestOptions;
          final status = error.response?.statusCode;
          final isRetry = requestOptions.extra['isRetry'] == true;
          final path = requestOptions.path;

          if (status != 401 || isRetry || _isPublicAuthEndpoint(path)) {
            handler.reject(error);
            return;
          }

          try {
            final newToken = await _refreshAccessToken();
            if (newToken != null && newToken.isNotEmpty) {
              final retryOptions = requestOptions.copyWith(
                extra: {
                  ...requestOptions.extra,
                  'isRetry': true,
                },
                headers: {
                  ...requestOptions.headers,
                  'Authorization': 'Bearer $newToken',
                },
              );
              final retryResponse = await _dio.fetch(retryOptions);
              handler.resolve(retryResponse);
              return;
            }
            // Refresh returned null = cookie hết/không hợp lệ.
            await _handleExpiredSession(clearCookies: true);
          } on DioException catch (refreshError) {
            final refreshStatus = refreshError.response?.statusCode;
            // Chỉ xóa phiên khi refresh bị từ chối auth; lỗi mạng giữ session.
            if (refreshStatus == 401 || refreshStatus == 403) {
              await _handleExpiredSession(clearCookies: true);
            }
          } catch (_) {
            // Không xóa session vì lỗi không xác định / mạng.
          }

          handler.reject(error);
        },
      ),
    );
  }

  void setAccessToken(String accessToken) {
    _accessToken = accessToken;
  }

  String? get accessToken => _accessToken ?? resolveAccessToken?.call();

  void clearAccessToken() {
    _accessToken = null;
  }

  Future<void> clearCookies() async {
    await _cookieJar?.deleteAll();
  }

  /// Same as website `restoreAccessSessionIfNeeded`: refresh before /me
  /// when the access JWT is expired but the refresh cookie is still valid.
  Future<void> restoreAccessSessionIfNeeded() async {
    final token = _resolveAccessToken();
    if (token == null || token.isEmpty || !_isJwtExpiredOrStale(token)) {
      return;
    }

    final newToken = await _refreshAccessToken();
    if (newToken == null || newToken.isEmpty) {
      // Keep the stored access token. Hot reload can race refresh-token
      // rotation; wiping here logs the user out right after login.
    }
  }

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    bool includeAuth = true,
  }) async {
    return _send(
      () => _dio.get<Map<String, dynamic>>(
        path,
        queryParameters: queryParameters,
        options: Options(extra: {'includeAuth': includeAuth}),
      ),
    );
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    bool includeAuth = true,
  }) async {
    return _send(
      () => _dio.post<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: Options(extra: {'includeAuth': includeAuth}),
      ),
    );
  }

  Future<Map<String, dynamic>> put(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    bool includeAuth = true,
  }) async {
    return _send(
      () => _dio.put<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: Options(extra: {'includeAuth': includeAuth}),
      ),
    );
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    bool includeAuth = true,
  }) async {
    return _send(
      () => _dio.patch<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: Options(extra: {'includeAuth': includeAuth}),
      ),
    );
  }

  Future<Map<String, dynamic>> delete(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    bool includeAuth = true,
  }) async {
    return _send(
      () => _dio.delete<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: Options(extra: {'includeAuth': includeAuth}),
      ),
    );
  }

  Future<Map<String, dynamic>> _send(
    Future<Response<Map<String, dynamic>>> Function() request,
  ) async {
    try {
      final response = await request();
      return _normalizeResponse(response.data);
    } on DioException catch (error) {
      throw _mapDioException(error);
    } catch (_) {
      throw const ApiException('Không thể kết nối đến máy chủ.');
    }
  }

  String? _resolveAccessToken() {
    final inMemory = _accessToken;
    if (inMemory != null && inMemory.isNotEmpty) {
      return inMemory;
    }

    final stored = resolveAccessToken?.call();
    if (stored != null && stored.isNotEmpty) {
      _accessToken = stored;
      return stored;
    }

    return null;
  }

  bool _isPublicAuthEndpoint(String path) {
    return path.contains('/auth/login') ||
        path.contains('/auth/register') ||
        path.contains('/auth/google') ||
        path.contains('/auth/refresh-token') ||
        path.contains('/auth/forgot-password') ||
        path.contains('/auth/verify-email') ||
        path.contains('/auth/logout');
  }

  bool _isLoginEndpoint(String path) {
    return path.contains('/auth/login') || path.contains('/auth/google');
  }

  Future<String?> _refreshAccessToken() async {
    if (_isRefreshing) {
      return _refreshCompleter!.future;
    }

    _isRefreshing = true;
    _refreshCompleter = Completer<String?>();

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/refresh-token',
        options: Options(
          extra: {
            'includeAuth': false,
            'isRetry': true,
          },
        ),
      );

      final newToken = _readAccessToken(response.data?['data']);
      if (newToken != null && newToken.isNotEmpty) {
        setAccessToken(newToken);
        await onAccessTokenRefreshed?.call(newToken);
        _refreshCompleter?.complete(newToken);
        return newToken;
      }

      _refreshCompleter?.complete(null);
      return null;
    } catch (error) {
      if (!(_refreshCompleter?.isCompleted ?? true)) {
        _refreshCompleter?.completeError(error);
      }
      rethrow;
    } finally {
      _isRefreshing = false;
      _refreshCompleter = null;
    }
  }

  Future<void> _handleExpiredSession({bool clearCookies = true}) async {
    clearAccessToken();
    final callback = onSessionExpired;
    if (callback == null || !clearCookies) {
      return;
    }
    try {
      await callback();
    } catch (_) {
      // Keep the original 401 flow even if local logout fails.
    }
  }

  Map<String, dynamic> _normalizeResponse(Map<String, dynamic>? responseData) {
    return responseData ?? <String, dynamic>{};
  }

  ApiException _mapDioException(DioException error) {
    final statusCode = error.response?.statusCode;
    final path = error.requestOptions.path;
    final serverMessage = _readServerMessage(error.response?.data);

    if (statusCode == 401) {
      if (_isLoginEndpoint(path)) {
        return ApiException(
          serverMessage ?? _invalidCredentialsMessage,
          statusCode: 401,
        );
      }
      return const ApiException(_sessionExpiredMessage, statusCode: 401);
    }

    if (statusCode == 403) {
      return ApiException(
        serverMessage ?? 'Tài khoản của bạn không có quyền truy cập.',
        statusCode: 403,
      );
    }

    if (serverMessage != null) {
      return ApiException(serverMessage, statusCode: statusCode);
    }

    if (statusCode == 404) {
      return const ApiException(
        'Không tìm thấy tài nguyên yêu cầu!',
        statusCode: 404,
      );
    }

    if (statusCode == 500 ||
        statusCode == 502 ||
        statusCode == 503 ||
        statusCode == 504) {
      return ApiException(
        'Máy chủ đang bảo trì hoặc quá tải. Vui lòng thử lại sau!',
        statusCode: statusCode,
      );
    }

    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      return const ApiException(
        'Yêu cầu đã hết thời gian chờ. Vui lòng kiểm tra lại kết nối mạng.',
      );
    }

    if (error.type == DioExceptionType.connectionError) {
      return const ApiException(
        'Không thể kết nối đến máy chủ. Vui lòng kiểm tra Backend API.',
      );
    }

    return ApiException(
      'Đã có lỗi xảy ra từ máy chủ!',
      statusCode: statusCode,
    );
  }

  static String? _readAccessToken(dynamic payload) {
    if (payload is! Map) {
      return null;
    }
    final token =
        payload['access_token']?.toString() ??
        payload['accessToken']?.toString();
    if (token == null || token.isEmpty || token == 'null') {
      return null;
    }
    return token;
  }

  static String? _readServerMessage(dynamic responseData) {
    if (responseData is! Map) {
      return null;
    }
    final message = responseData['message'];
    if (message is String && message.isNotEmpty) {
      return message;
    }
    if (message is List && message.isNotEmpty) {
      return message.join('\n');
    }
    return null;
  }

  static bool _isJwtExpiredOrStale(String token, {int skewMs = 30000}) {
    try {
      final parts = token.split('.');
      if (parts.length < 2) {
        return true;
      }
      final payload = jsonDecode(_decodeJwtPayload(parts[1]));
      final exp = payload is Map ? payload['exp'] : null;
      if (exp is! num) {
        return true;
      }
      return exp * 1000 <= DateTime.now().millisecondsSinceEpoch + skewMs;
    } catch (_) {
      return true;
    }
  }

  static String _decodeJwtPayload(String segment) {
    var output = segment.replaceAll('-', '+').replaceAll('_', '/');
    switch (output.length % 4) {
      case 2:
        output += '==';
        break;
      case 3:
        output += '=';
        break;
    }
    return utf8.decode(base64Decode(output));
  }
}
