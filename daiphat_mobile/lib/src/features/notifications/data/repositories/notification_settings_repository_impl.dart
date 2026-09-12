import '../../domain/entities/notification_setting.dart';
import '../../domain/repositories/notification_settings_repository.dart';
import '../services/notification_setting_service.dart';

class NotificationSettingsRepositoryImpl
    implements NotificationSettingsRepository {
  final NotificationSettingService _service;

  const NotificationSettingsRepositoryImpl(this._service);

  @override
  Future<List<NotificationSettingModel>> getMySettings() =>
      _service.getMySettings();

  @override
  Future<NotificationSettingModel> upsertSetting(
    UpsertNotificationSettingRequest request,
  ) =>
      _service.upsertSetting(request);
}
