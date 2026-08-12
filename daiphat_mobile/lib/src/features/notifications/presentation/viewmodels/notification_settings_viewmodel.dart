import 'package:flutter/foundation.dart';

import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import '../../data/models/notification_setting_model.dart';
import '../../data/services/notification_setting_service.dart';

class NotificationSettingOption {
  final String channel;
  final String type;
  final String title;
  final String description;

  const NotificationSettingOption({
    required this.channel,
    required this.type,
    required this.title,
    required this.description,
  });

  String get key => '$channel::$type';
}

class NotificationSettingsViewModel extends ChangeNotifier {
  final NotificationSettingService _service;

  /// Mirrors the settings the backend manages for a customer account.
  static const options = <NotificationSettingOption>[
    NotificationSettingOption(
      channel: 'IN_APP',
      type: 'RESULT',
      title: 'Thông báo khi trúng thưởng',
      description: 'Nhận thông báo ngay khi vé của bạn trúng thưởng.',
    ),
    NotificationSettingOption(
      channel: 'IN_APP',
      type: 'DRAW_RESULT',
      title: 'Thông báo khi có kết quả xổ số',
      description: 'Nhận thông báo khi đài bạn theo dõi công bố kết quả.',
    ),
  ];

  final Map<String, bool> _enabled = {};
  final Set<String> _updating = {};

  bool _isLoading = true;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  NotificationSettingsViewModel(this._service) {
    load();
  }

  /// Settings default to enabled until the backend says otherwise.
  bool isEnabled(NotificationSettingOption option) =>
      _enabled[option.key] ?? true;

  bool isUpdating(NotificationSettingOption option) =>
      _updating.contains(option.key);

  Future<void> load() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final settings = await _service.getMySettings();
      _enabled
        ..clear()
        ..addEntries(settings.map((s) => MapEntry(s.key, s.isEnabled)));
    } on ApiException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Không tải được cài đặt thông báo.';
      debugPrint('Failed to load notification settings: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<String?> toggle(NotificationSettingOption option) async {
    if (_updating.contains(option.key)) return null;

    final previous = isEnabled(option);
    final next = !previous;

    _enabled[option.key] = next;
    _updating.add(option.key);
    notifyListeners();

    try {
      final updated = await _service.upsertSetting(
        UpsertNotificationSettingRequest(
          channel: option.channel,
          type: option.type,
          isEnabled: next,
        ),
      );
      _enabled[option.key] = updated.isEnabled;
      return null;
    } on ApiException catch (e) {
      _enabled[option.key] = previous;
      return e.message;
    } catch (e) {
      _enabled[option.key] = previous;
      debugPrint('Failed to update notification setting: $e');
      return 'Không cập nhật được cài đặt. Vui lòng thử lại.';
    } finally {
      _updating.remove(option.key);
      notifyListeners();
    }
  }
}
