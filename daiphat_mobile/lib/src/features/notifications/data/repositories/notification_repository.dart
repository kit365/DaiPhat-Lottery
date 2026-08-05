import '../services/notification_api_service.dart';
import '../models/notification_model.dart';
import 'package:daiphat_mobile/src/shared/network/page_response.dart';

class NotificationRepository {
  final NotificationApiService _apiService;

  NotificationRepository(this._apiService);

  Future<PageResponse<NotificationModel>> getMyNotifications(int page, int limit) {
    return _apiService.getMyNotifications(page, limit);
  }

  Future<void> markAsRead(int id) {
    return _apiService.markAsRead(id);
  }

  Future<void> markAllAsRead() {
    return _apiService.markAllAsRead();
  }

  Future<void> deleteReadNotification(int id) {
    return _apiService.deleteReadNotification(id);
  }

  Future<void> deleteAllReadNotifications() {
    return _apiService.deleteAllReadNotifications();
  }
}

