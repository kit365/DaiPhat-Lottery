import '../entities/notification_setting.dart';
import '../repositories/notification_settings_repository.dart';

class GetMyNotificationSettings {
  final NotificationSettingsRepository _repository;
  const GetMyNotificationSettings(this._repository);

  Future<List<NotificationSettingModel>> call() => _repository.getMySettings();
}

class UpsertNotificationSetting {
  final NotificationSettingsRepository _repository;
  const UpsertNotificationSetting(this._repository);

  Future<NotificationSettingModel> call(
    UpsertNotificationSettingRequest request,
  ) =>
      _repository.upsertSetting(request);
}
