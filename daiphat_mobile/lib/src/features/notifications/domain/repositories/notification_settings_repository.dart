import '../entities/notification_setting.dart';

abstract class NotificationSettingsRepository {
  Future<List<NotificationSettingModel>> getMySettings();

  Future<NotificationSettingModel> upsertSetting(
    UpsertNotificationSettingRequest request,
  );
}
