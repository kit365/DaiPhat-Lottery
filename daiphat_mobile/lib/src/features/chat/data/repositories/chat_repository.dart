import 'package:shared_preferences/shared_preferences.dart';

import '../../domain/entities/chat_models.dart';
import '../../domain/repositories/chat_repository_port.dart';
import '../../utils/chat_constants.dart';
import '../services/chat_api_service.dart';
import '../services/chat_websocket_service.dart';

class ChatRepository implements ChatRepositoryPort {
  ChatRepository({
    required ChatApiService apiService,
    required ChatWebSocketService webSocketService,
    required Future<String?> Function() readAccessToken,
  }) : _apiService = apiService,
       _webSocketService = webSocketService,
       _readAccessToken = readAccessToken;

  final ChatApiService _apiService;
  final ChatWebSocketService _webSocketService;
  final Future<String?> Function() _readAccessToken;

  @override
  Future<bool> getAiStatus() => _apiService.getAiStatus();

  @override
  Future<ConversationDetailModel?> getOpenConversation() =>
      _apiService.getOpenConversation();

  @override
  Future<ConversationDetailModel?> getConversationDetail(int id) =>
      _apiService.getConversationDetail(id);

  @override
  Future<ConversationDetailModel?> initConversation({
    String? title,
    String? content,
    bool requestStaff = false,
  }) => _apiService.initConversation(
    title: title,
    content: content,
    requestStaff: requestStaff,
  );

  @override
  Future<ConversationDetailModel?> escalateConversation(int id) =>
      _apiService.escalateConversation(id);

  @override
  Future<ConversationDetailModel?> cancelStaffRequest(int id) =>
      _apiService.cancelStaffRequest(id);

  @override
  Future<ConversationDetailModel?> disconnectStaff(int id) =>
      _apiService.disconnectStaff(id);

  @override
  Future<void> markAsRead(int id) => _apiService.markAsRead(id);

  @override
  Future<ChatTimelinePageModel> getTimeline({
    int limit = 30,
    String? beforeCreatedAt,
    int? beforeId,
  }) => _apiService.getMyTimeline(
    limit: limit,
    beforeCreatedAt: beforeCreatedAt,
    beforeId: beforeId,
  );

  @override
  Future<void> connectWebSocket() async {
    final token = await readAccessToken();
    if (token == null || token.isEmpty) {
      throw Exception('Thiếu access token để kết nối chat.');
    }
    await _webSocketService.connect(token);
  }

  @override
  Future<String?> readAccessToken() => _readAccessToken();

  @override
  Future<void> disconnectWebSocket() => _webSocketService.disconnect();

  @override
  Future<void> sendRealtimeMessage({
    required int conversationId,
    required String content,
  }) => _webSocketService.sendMessage(
    conversationId: conversationId,
    content: content,
  );

  @override
  void subscribeInbox({
    required ChatSocketMessageHandler onMessage,
    required ChatConversationEventHandler onConversationEvent,
  }) {
    _webSocketService.subscribeInbox(
      onMessage: onMessage,
      onConversationEvent: onConversationEvent,
    );
  }

  @override
  void subscribeConversation(
    int conversationId, {
    required ChatSocketMessageHandler onMessage,
    required ChatConversationEventHandler onConversationEvent,
  }) {
    _webSocketService.subscribeConversation(
      conversationId,
      onMessage: onMessage,
      onConversationEvent: onConversationEvent,
    );
  }

  @override
  void unsubscribeConversation(int conversationId) =>
      _webSocketService.unsubscribeConversation(conversationId);

  @override
  Future<void> saveLastConversationId(int id) async {
    final prefs = await SharedPreferences.getInstance();
    final key = _conversationStorageKey(prefs);
    if (key == null) return;
    await prefs.setInt(key, id);
    await prefs.remove(chatLastConversationKey);
  }

  @override
  Future<int?> readLastConversationId() async {
    final prefs = await SharedPreferences.getInstance();
    final key = _conversationStorageKey(prefs);
    await prefs.remove(chatLastConversationKey);
    return key == null ? null : prefs.getInt(key);
  }

  @override
  Future<void> clearLastConversationId() async {
    final prefs = await SharedPreferences.getInstance();
    final key = _conversationStorageKey(prefs);
    if (key != null) await prefs.remove(key);
    await prefs.remove(chatLastConversationKey);
  }

  String? _conversationStorageKey(SharedPreferences preferences) {
    final userId = preferences.getString('checkout.user_id')?.trim() ?? '';
    if (userId.isEmpty) return null;
    return '$chatLastConversationKey.$userId';
  }
}
