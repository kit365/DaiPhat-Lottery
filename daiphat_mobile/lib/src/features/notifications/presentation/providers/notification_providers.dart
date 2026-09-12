import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/repositories/notification_settings_repository.dart';
import '../../domain/repositories/notifications_repository.dart';
import '../../domain/usecases/notification_setting_usecases.dart';
import '../../domain/usecases/notification_usecases.dart';
import '../viewmodels/notification_viewmodel.dart';

final notificationsRepositoryProvider = Provider<NotificationsRepository>((
  ref,
) {
  throw UnimplementedError(
    'notificationsRepositoryProvider phải được override trong bootstrap',
  );
});

final notificationSettingsRepositoryProvider =
    Provider<NotificationSettingsRepository>((ref) {
    throw UnimplementedError(
      'notificationSettingsRepositoryProvider phải được override trong bootstrap',
    );
  });

final getMyNotificationsProvider = Provider<GetMyNotifications>((ref) {
  return GetMyNotifications(ref.watch(notificationsRepositoryProvider));
});

final markNotificationAsReadProvider =
    Provider<MarkNotificationAsRead>((ref) {
  return MarkNotificationAsRead(ref.watch(notificationsRepositoryProvider));
});

final markAllNotificationsAsReadProvider =
    Provider<MarkAllNotificationsAsRead>((ref) {
  return MarkAllNotificationsAsRead(ref.watch(notificationsRepositoryProvider));
});

final checkNotificationReferenceAvailableProvider =
    Provider<CheckNotificationReferenceAvailable>((ref) {
  return CheckNotificationReferenceAvailable(
    ref.watch(notificationsRepositoryProvider),
  );
});

final deleteReadNotificationProvider =
    Provider<DeleteReadNotification>((ref) {
  return DeleteReadNotification(ref.watch(notificationsRepositoryProvider));
});

final deleteAllReadNotificationsProvider =
    Provider<DeleteAllReadNotifications>((ref) {
  return DeleteAllReadNotifications(ref.watch(notificationsRepositoryProvider));
});

final getMyNotificationSettingsProvider =
    Provider<GetMyNotificationSettings>((ref) {
  return GetMyNotificationSettings(
    ref.watch(notificationSettingsRepositoryProvider),
  );
});

final upsertNotificationSettingProvider =
    Provider<UpsertNotificationSetting>((ref) {
  return UpsertNotificationSetting(
    ref.watch(notificationSettingsRepositoryProvider),
  );
});

final notificationViewModelProvider = Provider<NotificationViewModel>((ref) {
  throw UnimplementedError(
    'notificationViewModelProvider phải được override trong bootstrap',
  );
});

final unreadNotificationCountProvider =
    NotifierProvider<UnreadNotificationCountNotifier, int>(
      UnreadNotificationCountNotifier.new,
    );

class UnreadNotificationCountNotifier extends Notifier<int> {
  @override
  int build() {
    final vm = ref.watch(notificationViewModelProvider);
    void listener() {
      state = vm.unreadCount;
    }

    vm.addListener(listener);
    ref.onDispose(() => vm.removeListener(listener));
    return vm.unreadCount;
  }
}
