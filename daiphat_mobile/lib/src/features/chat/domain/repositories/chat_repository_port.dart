import '../entities/chat_models.dart';

typedef ChatSocketMessageHandler = void Function(ChatSocketMessageEvent event);
typedef ChatConversationEventHandler = void Function(
  ChatConversationSocketEvent event,
);

abstract class ChatRepositoryPort {
  Future<bool> getAiStatus();

  Future<ConversationDetailModel?> getOpenConversation();

  Future<ConversationDetailModel?> getConversationDetail(int id);

  Future<ConversationDetailModel?> initConversation({
    String? title,
    String? content,
    bool requestStaff = false,
  });

  Future<ConversationDetailModel?> escalateConversation(int id);

  Future<ConversationDetailModel?> cancelStaffRequest(int id);

  Future<ConversationDetailModel?> disconnectStaff(int id);

  Future<void> markAsRead(int id);

  Future<ChatTimelinePageModel> getTimeline({
    int limit = 30,
    String? beforeCreatedAt,
    int? beforeId,
  });

  Future<void> connectWebSocket();

  Future<String?> readAccessToken();

  Future<void> disconnectWebSocket();

  Future<void> sendRealtimeMessage({
    required int conversationId,
    required String content,
  });

  void subscribeInbox({
    required ChatSocketMessageHandler onMessage,
    required ChatConversationEventHandler onConversationEvent,
  });

  void subscribeConversation(
    int conversationId, {
    required ChatSocketMessageHandler onMessage,
    required ChatConversationEventHandler onConversationEvent,
  });

  void unsubscribeConversation(int conversationId);

  Future<void> saveLastConversationId(int id);

  Future<int?> readLastConversationId();

  Future<void> clearLastConversationId();
}
