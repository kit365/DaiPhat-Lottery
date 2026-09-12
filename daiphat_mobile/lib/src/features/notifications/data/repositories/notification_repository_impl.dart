import 'package:daiphat_mobile/src/shared/network/page_response.dart';

import '../../domain/entities/notification.dart';
import '../../domain/repositories/notifications_repository.dart';
import '../services/notification_api_service.dart';

class NotificationRepositoryImpl implements NotificationsRepository {
  final NotificationApiService _apiService;

  const NotificationRepositoryImpl(this._apiService);

  @override
  Future<PageResponse<NotificationModel>> getMyNotifications(
    int page,
    int limit,
  ) =>
      _apiService.getMyNotifications(page, limit);

  @override
  Future<void> markAsRead(int id) => _apiService.markAsRead(id);

  @override
  Future<void> markAllAsRead() => _apiService.markAllAsRead();

  @override
  Future<bool> isReferenceAvailable(int id) =>
      _apiService.isReferenceAvailable(id);

  @override
  Future<void> deleteReadNotification(int id) =>
      _apiService.deleteReadNotification(id);

  @override
  Future<void> deleteAllReadNotifications() =>
      _apiService.deleteAllReadNotifications();
}
