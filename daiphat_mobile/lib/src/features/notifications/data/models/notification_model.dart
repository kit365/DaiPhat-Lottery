class NotificationModel {
  final int id;
  final String title;
  final String content;
  final bool isRead;
  final String type;
  final String? referenceId;
  final String? referenceType;
  final DateTime createdAt;

  NotificationModel({
    required this.id,
    required this.title,
    required this.content,
    required this.isRead,
    required this.type,
    this.referenceId,
    this.referenceType,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['notificationId'] ?? json['id'] ?? 0,
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      isRead: json['isRead'] ?? json['read'] ?? false,
      type: json['type'] ?? 'SYSTEM',
      referenceId: json['referenceId']?.toString(),
      referenceType: json['referenceType']?.toString(),
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : DateTime.now(),
    );
  }

  NotificationModel copyWith({
    bool? isRead,
  }) {
    return NotificationModel(
      id: id,
      title: title,
      content: content,
      isRead: isRead ?? this.isRead,
      type: type,
      referenceId: referenceId,
      referenceType: referenceType,
      createdAt: createdAt,
    );
  }
}

