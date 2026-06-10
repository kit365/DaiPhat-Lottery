import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';

import 'api_config.dart';
import 'api_exception.dart';

class ApiClient {
  final Dio _dio;
  final CookieJar? _cookieJar;
  String? _accessToken;

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
          if (_accessToken != null && _accessToken!.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $_accessToken';
          }
          handler.next(options);
        },
        onError: (error, handler) {
          handler.reject(error);
        },
      ),
    );
  }

  void setAccessToken(String accessToken) {
    _accessToken = accessToken;
  }

  void clearAccessToken() {
    _accessToken = null;
  }

  Future<void> clearCookies() async {
    await _cookieJar?.deleteAll();
  }

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        path,
        queryParameters: queryParameters,
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
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
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
  }) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
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
  }) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
      );
      return _normalizeResponse(response.data);
    } on DioException catch (error) {
      throw _mapDioException(error);
    } catch (_) {
      throw const ApiException('Không thể kết nối đến máy chủ.');
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

    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      return const ApiException('Yêu cầu đã hết thời gian chờ.');
    }

    if (error.type == DioExceptionType.connectionError) {
      return const ApiException('Không thể kết nối đến máy chủ.');
    }

    return ApiException(
      error.message ?? 'Đã xảy ra lỗi khi gọi API.',
      statusCode: statusCode,
    );
  }
}
