import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_response.dart';
import 'package:daiphat_mobile/src/shared/network/page_response.dart';
import '../models/notification_model.dart';

class NotificationApiService {
  static const _baseNotifications = '/notifications';

  final ApiClient _apiClient;

  NotificationApiService(this._apiClient);

  Future<PageResponse<NotificationModel>> getMyNotifications(int page, int limit) async {
    final response = await _apiClient.get(
      '$_baseNotifications/me',
      queryParameters: {'page': page, 'limit': limit},
    );

    final apiResponse = ApiResponse<PageResponse<NotificationModel>>.fromJson(
      response,
      (json) => PageResponse.fromJson(json, (itemJson) => NotificationModel.fromJson(itemJson)),
    );

    if (!apiResponse.isSuccess) {
      throw Exception(apiResponse.message);
    }
    return apiResponse.data!;
  }

  Future<void> markAsRead(int id) async {
    final response = await _apiClient.patch('$_baseNotifications/$id/read');
    final apiResponse = ApiResponse<void>.fromJson(response, null);
    if (!apiResponse.isSuccess) {
      throw Exception(apiResponse.message);
    }
  }

  Future<void> markAllAsRead() async {
    final response = await _apiClient.patch('$_baseNotifications/read-all');
    final apiResponse = ApiResponse<void>.fromJson(response, null);
    if (!apiResponse.isSuccess) {
      throw Exception(apiResponse.message);
    }
  }

  Future<void> deleteReadNotification(int id) async {
    final response = await _apiClient.delete('$_baseNotifications/$id');
    final apiResponse = ApiResponse<void>.fromJson(response, null);
    if (!apiResponse.isSuccess) {
      throw Exception(apiResponse.message);
    }
  }

  Future<bool> isReferenceAvailable(int id) async {
    final response = await _apiClient.get('$_baseNotifications/$id/reference');
    final data = response['data'];
    if (data is Map<String, dynamic>) {
      return data['available'] as bool? ?? false;
    }
    return false;
  }

  Future<void> deleteAllReadNotifications() async {
    final response = await _apiClient.delete('$_baseNotifications/read-all');
    final apiResponse = ApiResponse<void>.fromJson(response, null);
    if (!apiResponse.isSuccess) {
      throw Exception(apiResponse.message);
    }
  }
}

