import '../../core/network/api_client.dart';
import '../../core/network/api_response.dart';
import '../../core/network/page_response.dart';
import '../models/notification_model.dart';

class NotificationApiService {
  final ApiClient _apiClient;

  NotificationApiService(this._apiClient);

  Future<PageResponse<NotificationModel>> getMyNotifications(int page, int limit) async {
    final response = await _apiClient.get(
      '/notifications/me',
      queryParameters: {'page': page, 'limit': limit},
    );
    print('DEBUG API RESPONSE: $response');

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

  Future<void> deleteAllReadNotifications() async {
    final response = await _apiClient.delete('/notifications/read-all');
    final apiResponse = ApiResponse<void>.fromJson(response, null);
    if (!apiResponse.isSuccess) {
      throw Exception(apiResponse.message);
    }
  }
}
