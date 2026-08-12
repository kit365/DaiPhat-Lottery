import 'package:daiphat_mobile/src/shared/network/api_client.dart';
import 'package:daiphat_mobile/src/shared/network/api_response.dart';
import 'package:daiphat_mobile/src/shared/network/page_response.dart';
import '../models/notification_model.dart';

class NotificationApiService {
  final ApiClient _apiClient;

  NotificationApiService(this._apiClient);

  Future<PageResponse<NotificationModel>> getMyNotifications(int page, int limit) async {
    final response = await _apiClient.get(
      '/notifications/me',
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
    final response = await _apiClient.patch('/notifications/$id/read');
    final apiResponse = ApiResponse<void>.fromJson(response, null);
    if (!apiResponse.isSuccess) {
      throw Exception(apiResponse.message);
    }
  }

  Future<void> markAllAsRead() async {
    final response = await _apiClient.patch('/notifications/read-all');
    final apiResponse = ApiResponse<void>.fromJson(response, null);
    if (!apiResponse.isSuccess) {
      throw Exception(apiResponse.message);
    }
  }

  Future<void> deleteReadNotification(int id) async {
    final response = await _apiClient.delete('/notifications/$id');
    final apiResponse = ApiResponse<void>.fromJson(response, null);
    if (!apiResponse.isSuccess) {
      throw Exception(apiResponse.message);
    }
  }

  Future<bool> isReferenceAvailable(int id) async {
    final response = await _apiClient.get('/notifications/$id/reference');
    final data = response['data'];
    if (data is Map<String, dynamic>) {
      return data['available'] as bool? ?? false;
    }
    return false;
  }

  Future<void> deleteAllReadNotifications() async {
    final response = await _apiClient.delete('/notifications/read-all');
    final apiResponse = ApiResponse<void>.fromJson(response, null);
    if (!apiResponse.isSuccess) {
      throw Exception(apiResponse.message);
    }
  }
}

