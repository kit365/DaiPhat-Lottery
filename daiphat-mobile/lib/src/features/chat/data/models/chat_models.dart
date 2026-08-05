enum ConversationStatus {
  open,
  active,
  waitingForOperator,
  waitingForCustomer,
  closed;

  static ConversationStatus? fromString(String? raw) {
    if (raw == null) return null;
    return switch (raw) {
      'OPEN' => ConversationStatus.open,
      'ACTIVE' => ConversationStatus.active,
      'WAITING_FOR_OPERATOR' => ConversationStatus.waitingForOperator,
      'WAITING_FOR_CUSTOMER' => ConversationStatus.waitingForCustomer,
      'CLOSED' => ConversationStatus.closed,
      _ => null,
    };
  }

  String get apiValue => switch (this) {
    ConversationStatus.open => 'OPEN',
    ConversationStatus.active => 'ACTIVE',
    ConversationStatus.waitingForOperator => 'WAITING_FOR_OPERATOR',
    ConversationStatus.waitingForCustomer => 'WAITING_FOR_CUSTOMER',
    ConversationStatus.closed => 'CLOSED',
  };
}

enum ChatSenderType { customer, operator, aiSystem, system }

ChatSenderType parseChatSenderType(String? raw) {
  return switch (raw) {
    'OPERATOR' => ChatSenderType.operator,
    'AI_SYSTEM' => ChatSenderType.aiSystem,
    'SYSTEM' => ChatSenderType.system,
    _ => ChatSenderType.customer,
  };
}

class ChatConversationModel {
  const ChatConversationModel({
    required this.id,
    required this.title,
    required this.status,
    this.assignedOperatorName,
    this.unreadCount,
  });

  final int id;
  final String title;
  final ConversationStatus? status;
  final String? assignedOperatorName;
  final int? unreadCount;

  factory ChatConversationModel.fromJson(Map<String, dynamic> json) {
    return ChatConversationModel(
      id: (json['id'] as num).toInt(),
      title: json['title']?.toString() ?? '',
      status: ConversationStatus.fromString(json['status']?.toString()),
      assignedOperatorName: json['assignedOperatorName']?.toString(),
      unreadCount: (json['unreadCount'] as num?)?.toInt(),
    );
  }
}

class ChatMessageModel {
  const ChatMessageModel({
    required this.id,
    required this.conversationId,
    required this.senderType,
    required this.type,
    required this.content,
    this.intent,
    this.createdAt,
    this.isRead = false,
  });

  final int id;
  final int conversationId;
  final ChatSenderType senderType;
  final String type;
  final String content;
  final String? intent;
  final DateTime? createdAt;
  final bool isRead;

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatMessageModel(
      id: (json['id'] as num).toInt(),
      conversationId: (json['conversationId'] as num).toInt(),
      senderType: parseChatSenderType(json['senderType']?.toString()),
      type: json['type']?.toString() ?? 'TEXT',
      content: json['content']?.toString().trim() ?? '',
      intent: json['intent']?.toString(),
      createdAt: _parseDate(json['createdAt']),
      isRead: json['isRead'] == true,
    );
  }

  static DateTime? _parseDate(dynamic raw) {
    if (raw == null) return null;
    return DateTime.tryParse(raw.toString());
  }
}

class ChatTimelineItemModel {
  const ChatTimelineItemModel({required this.message});

  final ChatMessageModel message;

  factory ChatTimelineItemModel.fromJson(Map<String, dynamic> json) {
    return ChatTimelineItemModel(
      message: ChatMessageModel.fromJson(
        Map<String, dynamic>.from(json['message'] as Map),
      ),
    );
  }
}

class ChatTimelinePageModel {
  const ChatTimelinePageModel({
    required this.items,
    required this.hasMore,
    this.nextCursor,
  });

  final List<ChatTimelineItemModel> items;
  final bool hasMore;
  final String? nextCursor;

  factory ChatTimelinePageModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? const [];
    return ChatTimelinePageModel(
      items: rawItems
          .map(
            (item) => ChatTimelineItemModel.fromJson(
              Map<String, dynamic>.from(item as Map),
            ),
          )
          .toList(),
      hasMore: json['hasMore'] == true,
      nextCursor: json['nextCursor']?.toString(),
    );
  }
}

class ConversationDetailModel {
  const ConversationDetailModel({
    required this.conversation,
    required this.messages,
  });

  final ChatConversationModel conversation;
  final List<ChatMessageModel> messages;

  factory ConversationDetailModel.fromJson(Map<String, dynamic> json) {
    final rawMessages = json['messages'] as List<dynamic>? ?? const [];
    return ConversationDetailModel(
      conversation: ChatConversationModel.fromJson(
        Map<String, dynamic>.from(json['conversation'] as Map),
      ),
      messages: rawMessages
          .map(
            (item) => ChatMessageModel.fromJson(
              Map<String, dynamic>.from(item as Map),
            ),
          )
          .toList(),
    );
  }
}

class ChatSocketMessageEvent {
  const ChatSocketMessageEvent({
    required this.conversationId,
    required this.content,
    required this.senderType,
    required this.type,
    this.id,
    this.createdAt,
    this.intent,
  });

  final int? id;
  final int conversationId;
  final String content;
  final ChatSenderType senderType;
  final String type;
  final DateTime? createdAt;
  final String? intent;

  factory ChatSocketMessageEvent.fromJson(Map<String, dynamic> json) {
    return ChatSocketMessageEvent(
      id: (json['id'] as num?)?.toInt(),
      conversationId: (json['conversationId'] as num).toInt(),
      content: json['content']?.toString() ?? '',
      senderType: parseChatSenderType(json['senderType']?.toString()),
      type: json['type']?.toString() ?? 'TEXT',
      createdAt: ChatMessageModel._parseDate(json['createdAt']),
      intent: json['intent']?.toString(),
    );
  }
}

class ChatConversationSocketEvent {
  const ChatConversationSocketEvent({
    required this.eventType,
    required this.conversationId,
    required this.status,
    this.assignedOperatorId,
    this.reason,
  });

  final String eventType;
  final int conversationId;
  final ConversationStatus? status;
  final String? assignedOperatorId;
  final String? reason;

  factory ChatConversationSocketEvent.fromJson(Map<String, dynamic> json) {
    return ChatConversationSocketEvent(
      eventType: json['eventType']?.toString() ?? '',
      conversationId: (json['conversationId'] as num).toInt(),
      status: ConversationStatus.fromString(json['status']?.toString()),
      assignedOperatorId: json['assignedOperatorId']?.toString(),
      reason: json['reason']?.toString(),
    );
  }
}

class SuggestedTicketModel {
  const SuggestedTicketModel({
    required this.id,
    required this.numbers,
    this.stationId,
    this.stationName,
    this.drawDate,
    this.price,
  });

  final int id;
  final String numbers;
  final int? stationId;
  final String? stationName;
  final String? drawDate;
  final num? price;

  factory SuggestedTicketModel.fromJson(Map<String, dynamic> json) {
    return SuggestedTicketModel(
      id: (json['id'] as num).toInt(),
      numbers: json['numbers']?.toString() ?? '',
      stationId: (json['stationId'] as num?)?.toInt(),
      stationName: json['stationName']?.toString(),
      drawDate: json['drawDate']?.toString(),
      price: json['price'] as num?,
    );
  }
}
