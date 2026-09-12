import 'package:daiphat_mobile/src/shared/network/page_response.dart';

import '../entities/notification.dart';
import '../repositories/notifications_repository.dart';

class GetMyNotifications {
  final NotificationsRepository _repository;
  const GetMyNotifications(this._repository);

  Future<PageResponse<NotificationModel>> call(int page, int limit) =>
      _repository.getMyNotifications(page, limit);
}

class MarkNotificationAsRead {
  final NotificationsRepository _repository;
  const MarkNotificationAsRead(this._repository);

  Future<void> call(int id) => _repository.markAsRead(id);
}

class MarkAllNotificationsAsRead {
  final NotificationsRepository _repository;
  const MarkAllNotificationsAsRead(this._repository);

  Future<void> call() => _repository.markAllAsRead();
}

class CheckNotificationReferenceAvailable {
  final NotificationsRepository _repository;
  const CheckNotificationReferenceAvailable(this._repository);

  Future<bool> call(int id) => _repository.isReferenceAvailable(id);
}

class DeleteReadNotification {
  final NotificationsRepository _repository;
  const DeleteReadNotification(this._repository);

  Future<void> call(int id) => _repository.deleteReadNotification(id);
}

class DeleteAllReadNotifications {
  final NotificationsRepository _repository;
  const DeleteAllReadNotifications(this._repository);

  Future<void> call() => _repository.deleteAllReadNotifications();
}
