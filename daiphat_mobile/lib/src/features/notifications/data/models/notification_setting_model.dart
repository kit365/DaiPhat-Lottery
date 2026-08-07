class NotificationSettingModel {
  final int? settingId;
  final String channel;
  final String type;
  final bool isEnabled;
  final String? updatedAt;

  const NotificationSettingModel({
    this.settingId,
    required this.channel,
    required this.type,
    required this.isEnabled,
    this.updatedAt,
  });

  String get key => '$channel::$type';

  factory NotificationSettingModel.fromJson(Map<String, dynamic> json) {
    return NotificationSettingModel(
      settingId: json['notificationSettingId'] as int?,
      channel: json['channel']?.toString() ?? 'IN_APP',
      type: json['type']?.toString() ?? '',
      isEnabled: json['isEnabled'] as bool? ?? true,
      updatedAt: json['updatedAt']?.toString(),
    );
  }

  NotificationSettingModel copyWith({bool? isEnabled}) {
    return NotificationSettingModel(
      settingId: settingId,
      channel: channel,
      type: type,
      isEnabled: isEnabled ?? this.isEnabled,
      updatedAt: updatedAt,
    );
  }
}

class UpsertNotificationSettingRequest {
  final String channel;
  final String type;
  final bool isEnabled;

  const UpsertNotificationSettingRequest({
    required this.channel,
    required this.type,
    required this.isEnabled,
  });

  Map<String, dynamic> toJson() => {
    'channel': channel,
    'type': type,
    'isEnabled': isEnabled,
  };
}
