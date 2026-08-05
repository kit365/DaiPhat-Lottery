import 'dart:async';
import 'dart:convert';

import 'package:stomp_dart_client/stomp_dart_client.dart';

import 'package:daiphat_mobile/src/shared/network/api_config.dart';

import '../../utils/chat_constants.dart';
import '../models/chat_models.dart';

typedef ChatSocketMessageHandler = void Function(ChatSocketMessageEvent event);
typedef ChatConversationEventHandler = void Function(
  ChatConversationSocketEvent event,
);

class ChatWebSocketService {
  StompClient? _client;
  String? _token;
  final Map<String, void Function(StompFrame)> _subscriptions = {};

  Future<void> connect(String token) async {
    if (_client != null && _token == token && _client!.connected) {
      return;
    }

    await disconnect();
    _token = token;

    final completer = Completer<void>();
    _client = StompClient(
      config: StompConfig.sockJS(
        url: ChatWsConstants.wsUrl(ApiConfig.baseUrl, token),
        reconnectDelay: const Duration(milliseconds: ChatWsConstants.reconnectDelayMs),
        heartbeatIncoming: const Duration(milliseconds: ChatWsConstants.heartbeatMs),
        heartbeatOutgoing: const Duration(milliseconds: ChatWsConstants.heartbeatMs),
        stompConnectHeaders: {'Authorization': 'Bearer $token'},
        webSocketConnectHeaders: {'Authorization': 'Bearer $token'},
        onConnect: (_) {
          for (final entry in _subscriptions.entries) {
            _activateSubscription(entry.key, entry.value);
          }
          if (!completer.isCompleted) completer.complete();
        },
        onWebSocketError: (_) {
          if (!completer.isCompleted) {
            completer.completeError(Exception('WebSocket connection failed'));
          }
        },
        onStompError: (frame) {
          if (!completer.isCompleted) {
            completer.completeError(
              Exception(frame.body ?? 'STOMP connection failed'),
            );
          }
        },
        onDisconnect: (_) {
          _client = null;
        },
      ),
    );

    _client!.activate();
    await completer.future.timeout(const Duration(seconds: 15));
  }

  Future<void> disconnect() async {
    _client?.deactivate();
    _client = null;
    _token = null;
    _subscriptions.clear();
  }

  Future<void> sendMessage({
    required int conversationId,
    required String content,
  }) async {
    await _ensureConnected();
    _client!.send(
      destination: ChatWsConstants.sendDestination,
      body: jsonEncode({
        'conversationId': conversationId,
        'content': content,
        'type': 'TEXT',
      }),
    );
  }

  void subscribeInbox({
    required ChatSocketMessageHandler onMessage,
    required ChatConversationEventHandler onConversationEvent,
  }) {
    _subscribe(
      ChatWsConstants.inboxQueue,
      (frame) => _dispatchFrame(frame, onMessage, onConversationEvent),
    );
  }

  void subscribeConversation(
    int conversationId, {
    required ChatSocketMessageHandler onMessage,
    required ChatConversationEventHandler onConversationEvent,
  }) {
    _subscribe(
      ChatWsConstants.conversationTopic(conversationId),
      (frame) => _dispatchFrame(frame, onMessage, onConversationEvent),
    );
  }

  void _subscribe(String destination, void Function(StompFrame) callback) {
    _subscriptions[destination] = callback;
    if (_client?.connected == true) {
      _activateSubscription(destination, callback);
    }
  }

  void _activateSubscription(
    String destination,
    void Function(StompFrame) callback,
  ) {
    _client?.subscribe(destination: destination, callback: callback);
  }

  Future<void> _ensureConnected() async {
    if (_client?.connected == true) return;
    if (_token == null) {
      throw Exception('Missing access token for chat websocket');
    }
    await connect(_token!);
  }

  void _dispatchFrame(
    StompFrame frame,
    ChatSocketMessageHandler onMessage,
    ChatConversationEventHandler onConversationEvent,
  ) {
    if (frame.body == null || frame.body!.isEmpty) return;
    final decoded = jsonDecode(frame.body!) as Map<String, dynamic>;
    if (_isConversationEvent(decoded)) {
      onConversationEvent(ChatConversationSocketEvent.fromJson(decoded));
      return;
    }
    onMessage(ChatSocketMessageEvent.fromJson(decoded));
  }

  bool _isConversationEvent(Map<String, dynamic> json) {
    return json.containsKey('eventType') && json.containsKey('conversationId');
  }
}
