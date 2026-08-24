import 'package:daiphat_mobile/src/shared/network/api_client.dart';

import '../models/notification_setting_model.dart';

class NotificationSettingService {
  static const _baseNotifications = '/notifications';

  final ApiClient _apiClient;

  NotificationSettingService(this._apiClient);

  Future<List<NotificationSettingModel>> getMySettings() async {
    final response = await _apiClient.get('$_baseNotifications/settings/me');
    final data = response['data'] as List<dynamic>? ?? const [];
    return data
        .map(
          (e) => NotificationSettingModel.fromJson(e as Map<String, dynamic>),
        )
        .toList();
  }

  Future<NotificationSettingModel> upsertSetting(
    UpsertNotificationSettingRequest request,
  ) async {
    final response = await _apiClient.put(
      '$_baseNotifications/settings/me',
      data: request.toJson(),
    );
    final data = response['data'] as Map<String, dynamic>;
    return NotificationSettingModel.fromJson(data);
  }
}
