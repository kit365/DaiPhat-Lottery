import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/services/notification_setting_service.dart';
import '../viewmodels/notification_viewmodel.dart';

final notificationSettingServiceProvider = Provider<NotificationSettingService>(
  (ref) {
    throw UnimplementedError(
      'notificationSettingServiceProvider phải được override trong bootstrap',
    );
  },
);

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
