import '../entities/chat_models.dart';
import '../repositories/chat_repository_port.dart';

class ChatUseCases {
  final ChatRepositoryPort _repository;

  const ChatUseCases(this._repository);

  Future<bool> getAiStatus() => _repository.getAiStatus();

  Future<ConversationDetailModel?> getOpenConversation() =>
      _repository.getOpenConversation();

  Future<ConversationDetailModel?> getConversationDetail(int id) =>
      _repository.getConversationDetail(id);

  Future<ConversationDetailModel?> initConversation({
    String? title,
    String? content,
    bool requestStaff = false,
  }) =>
      _repository.initConversation(
        title: title,
        content: content,
        requestStaff: requestStaff,
      );

  Future<ConversationDetailModel?> escalateConversation(int id) =>
      _repository.escalateConversation(id);

  Future<void> markAsRead(int id) => _repository.markAsRead(id);

  Future<ChatTimelinePageModel> getTimeline({
    int limit = 30,
    String? beforeCreatedAt,
    int? beforeId,
  }) =>
      _repository.getTimeline(
        limit: limit,
        beforeCreatedAt: beforeCreatedAt,
        beforeId: beforeId,
      );

  Future<void> connectWebSocket() => _repository.connectWebSocket();

  Future<String?> readAccessToken() => _repository.readAccessToken();

  Future<void> disconnectWebSocket() => _repository.disconnectWebSocket();

  Future<void> sendRealtimeMessage({
    required int conversationId,
    required String content,
  }) =>
      _repository.sendRealtimeMessage(
        conversationId: conversationId,
        content: content,
      );

  void subscribeInbox({
    required ChatSocketMessageHandler onMessage,
    required ChatConversationEventHandler onConversationEvent,
  }) {
    _repository.subscribeInbox(
      onMessage: onMessage,
      onConversationEvent: onConversationEvent,
    );
  }

  void subscribeConversation(
    int conversationId, {
    required ChatSocketMessageHandler onMessage,
    required ChatConversationEventHandler onConversationEvent,
  }) {
    _repository.subscribeConversation(
      conversationId,
      onMessage: onMessage,
      onConversationEvent: onConversationEvent,
    );
  }

  void unsubscribeConversation(int conversationId) =>
      _repository.unsubscribeConversation(conversationId);

  Future<void> saveLastConversationId(int id) =>
      _repository.saveLastConversationId(id);

  Future<int?> readLastConversationId() => _repository.readLastConversationId();

  Future<void> clearLastConversationId() =>
      _repository.clearLastConversationId();
}
