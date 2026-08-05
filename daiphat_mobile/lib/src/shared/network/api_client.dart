import 'dart:async';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';

import 'api_config.dart';
import 'api_exception.dart';

class ApiClient {
  final Dio _dio;
  final CookieJar? _cookieJar;
  String? _accessToken;
  String? Function()? resolveAccessToken;
  Future<void> Function(String accessToken)? onAccessTokenRefreshed;

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
          final includeAuth = options.extra['includeAuth'] != false;
          if (includeAuth) {
            final token = _resolveAccessToken();
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          } else {
            options.headers.remove('Authorization');
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final response = error.response;
          final requestOptions = error.requestOptions;
          final includeAuth = requestOptions.extra['includeAuth'] != false;
          final isRetry = requestOptions.extra['isRetry'] == true;

          if (response?.statusCode == 401 &&
              includeAuth &&
              !isRetry &&
              !_isAuthEndpoint(requestOptions.path)) {
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
                final retryResponse = await _dio.fetch<Map<String, dynamic>>(
                  retryOptions,
                );
                handler.resolve(retryResponse);
                return;
              }
            } catch (_) {
              // Fall through to mapped error below.
            }
          }

          handler.reject(error);
        },
      ),
    );
  }

  void setAccessToken(String accessToken) {
    _accessToken = accessToken;
  }

  String? get accessToken => _accessToken;

  void clearAccessToken() {
    _accessToken = null;
  }

  Future<void> clearCookies() async {
    await _cookieJar?.deleteAll();
  }

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    bool includeAuth = true,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        path,
        queryParameters: queryParameters,
        options: Options(extra: {'includeAuth': includeAuth}),
      );
      return _normalizeResponse(response.data);
    } on DioException catch (error) {
      throw _mapDioException(error);
    } catch (_) {
      throw const ApiException('Không thể kết nối đến máy chủ.');
    }
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    bool includeAuth = true,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: Options(extra: {'includeAuth': includeAuth}),
      );
      return _normalizeResponse(response.data);
    } on DioException catch (error) {
      throw _mapDioException(error);
    } catch (_) {
      throw const ApiException('Không thể kết nối đến máy chủ.');
    }
  }

  Future<Map<String, dynamic>> put(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    bool includeAuth = true,
  }) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: Options(extra: {'includeAuth': includeAuth}),
      );
      return _normalizeResponse(response.data);
    } on DioException catch (error) {
      throw _mapDioException(error);
    } catch (_) {
      throw const ApiException('Không thể kết nối đến máy chủ.');
    }
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    bool includeAuth = true,
  }) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: Options(extra: {'includeAuth': includeAuth}),
      );
      return _normalizeResponse(response.data);
    } on DioException catch (error) {
      throw _mapDioException(error);
    } catch (_) {
      throw const ApiException('Không thể kết nối đến máy chủ.');
    }
  }

  Future<Map<String, dynamic>> delete(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    bool includeAuth = true,
  }) async {
    try {
      final response = await _dio.delete<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: Options(extra: {'includeAuth': includeAuth}),
      );
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

  bool _isAuthEndpoint(String path) {
    return path.startsWith('/auth/login') ||
        path.startsWith('/auth/register') ||
        path.startsWith('/auth/refresh-token') ||
        path.startsWith('/auth/logout') ||
        path.startsWith('/auth/forgot-password');
  }

  Future<String?> _refreshAccessToken() async {
    if (_isRefreshing) {
      return _refreshCompleter?.future;
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

      final payload = response.data?['data'];
      String? newToken;
      if (payload is Map<String, dynamic>) {
        newToken = payload['access_token']?.toString();
      }

      if (newToken != null && newToken.isNotEmpty) {
        setAccessToken(newToken);
        await onAccessTokenRefreshed?.call(newToken);
        _refreshCompleter?.complete(newToken);
        return newToken;
      }

      _refreshCompleter?.complete(null);
      return null;
    } catch (error) {
      _refreshCompleter?.completeError(error);
      return null;
    } finally {
      _isRefreshing = false;
      _refreshCompleter = null;
    }
  }

  Map<String, dynamic> _normalizeResponse(Map<String, dynamic>? responseData) {
    return responseData ?? <String, dynamic>{};
  }

  ApiException _mapDioException(DioException error) {
    final statusCode = error.response?.statusCode;
    final responseData = error.response?.data;

    if (responseData is Map<String, dynamic>) {
      final message = responseData['message'];
      if (message is String && message.isNotEmpty) {
        return ApiException(message, statusCode: statusCode);
      } else if (message is List && message.isNotEmpty) {
        return ApiException(message.join('\n'), statusCode: statusCode);
      }
    }

    if (statusCode == 401) {
      return const ApiException(
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        statusCode: 401,
      );
    }

    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      return const ApiException('Yêu cầu đã hết thời gian chờ.');
    }

    if (error.type == DioExceptionType.connectionError) {
      return const ApiException('Không thể kết nối đến máy chủ.');
    }

    return ApiException(
      'Đã xảy ra lỗi khi gọi API.',
      statusCode: statusCode,
    );
  }
}
