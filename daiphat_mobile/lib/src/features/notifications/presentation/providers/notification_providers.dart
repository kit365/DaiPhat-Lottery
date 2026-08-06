import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/services/notification_setting_service.dart';

final notificationSettingServiceProvider = Provider<NotificationSettingService>(
  (ref) {
    throw UnimplementedError(
      'notificationSettingServiceProvider phải được override trong bootstrap',
    );
  },
);
