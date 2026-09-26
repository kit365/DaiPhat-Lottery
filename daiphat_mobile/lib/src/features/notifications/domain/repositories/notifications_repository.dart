import 'package:daiphat_mobile/src/shared/network/page_response.dart';

import '../entities/notification.dart';

abstract class NotificationsRepository {
  Future<PageResponse<NotificationModel>> getMyNotifications(
    int page,
    int limit,
  );

  Future<void> markAsRead(int id);

  Future<void> markAllAsRead();

  Future<bool> isReferenceAvailable(int id);

  Future<void> deleteReadNotification(int id);

  Future<void> deleteAllReadNotifications();
}
