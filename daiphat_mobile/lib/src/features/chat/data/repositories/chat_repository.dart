import 'package:shared_preferences/shared_preferences.dart';

import '../../utils/chat_constants.dart';
import '../../utils/chat_message_mapper.dart';
import '../models/chat_models.dart';
import '../services/chat_api_service.dart';
import '../services/chat_websocket_service.dart';

class ChatRepository {
  ChatRepository({
    required ChatApiService apiService,
    required ChatWebSocketService webSocketService,
    required Future<String?> Function() readAccessToken,
  })  : _apiService = apiService,
        _webSocketService = webSocketService,
        _readAccessToken = readAccessToken;

  final ChatApiService _apiService;
  final ChatWebSocketService _webSocketService;
  final Future<String?> Function() _readAccessToken;

  Future<bool> getAiStatus() => _apiService.getAiStatus();

  Future<ConversationDetailModel?> getOpenConversation() =>
      _apiService.getOpenConversation();

  Future<ConversationDetailModel?> getConversationDetail(int id) =>
      _apiService.getConversationDetail(id);

  Future<ConversationDetailModel?> initConversation({
    String? title,
    String? content,
    bool requestStaff = false,
  }) =>
      _apiService.initConversation(
        title: title,
        content: content,
        requestStaff: requestStaff,
      );

  Future<ConversationDetailModel?> escalateConversation(int id) =>
      _apiService.escalateConversation(id);

  Future<ConversationDetailModel?> cancelStaffRequest(int id) =>
      _apiService.cancelStaffRequest(id);

  Future<ConversationDetailModel?> disconnectStaff(int id) =>
      _apiService.disconnectStaff(id);

  Future<void> markAsRead(int id) => _apiService.markAsRead(id);

  Future<ChatTimelinePageModel> getTimeline({
    int limit = 30,
    String? beforeCreatedAt,
    int? beforeId,
  }) =>
      _apiService.getMyTimeline(
        limit: limit,
        beforeCreatedAt: beforeCreatedAt,
        beforeId: beforeId,
      );

  Future<void> connectWebSocket() async {
    final token = await _readAccessToken();
    if (token == null || token.isEmpty) {
      throw Exception('Thiếu access token để kết nối chat.');
    }
    await _webSocketService.connect(token);
  }

  Future<void> disconnectWebSocket() => _webSocketService.disconnect();

  Future<void> sendRealtimeMessage({
    required int conversationId,
    required String content,
  }) =>
      _webSocketService.sendMessage(
        conversationId: conversationId,
        content: content,
      );

  void subscribeInbox({
    required ChatSocketMessageHandler onMessage,
    required ChatConversationEventHandler onConversationEvent,
  }) {
    _webSocketService.subscribeInbox(
      onMessage: onMessage,
      onConversationEvent: onConversationEvent,
    );
  }

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

  Future<void> saveLastConversationId(int id) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(chatLastConversationKey, id);
  }

  Future<int?> readLastConversationId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(chatLastConversationKey);
  }
}

List<UiChatMessage> mapTimelineItems(List<ChatTimelineItemModel> items) {
  return items.map((item) => mapApiMessage(item.message)).toList();
}

(String?, int?) parseTimelineCursor(String? cursor) {
  if (cursor == null || cursor.isEmpty) return (null, null);
  final parts = cursor.split('|');
  if (parts.length != 2) return (null, null);
  final beforeId = int.tryParse(parts[1]);
  return (parts[0], beforeId);
}
