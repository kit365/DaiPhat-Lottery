import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import 'package:daiphat_mobile/src/shared/storage/auth_token_storage.dart';

import '../../data/models/chat_models.dart';
import '../../data/repositories/chat_repository.dart';
import '../../data/services/chat_api_service.dart';
import '../../data/services/chat_websocket_service.dart';
import '../../utils/chat_constants.dart';
import '../../utils/chat_message_mapper.dart';

class ChatState {
  const ChatState({
    this.isLoading = false,
    this.isSending = false,
    this.isAuthenticated = false,
    this.isAiEnabled = true,
    this.conversationId,
    this.conversationStatus,
    this.assignedOperatorName,
    this.timelineMessages = const [],
    this.overlayMessages = const [],
    this.quickReplies = const [],
    this.statusBanner,
    this.hasMoreTimeline = false,
    this.errorMessage,
    this.showWelcome = true,
  });

  final bool isLoading;
  final bool isSending;
  final bool isAuthenticated;
  final bool isAiEnabled;
  final int? conversationId;
  final ConversationStatus? conversationStatus;
  final String? assignedOperatorName;
  final List<UiChatMessage> timelineMessages;
  final List<UiChatMessage> overlayMessages;
  final List<QuickReplyChip> quickReplies;
  final String? statusBanner;
  final bool hasMoreTimeline;
  final String? errorMessage;
  final bool showWelcome;

  List<UiChatMessage> get visibleMessages {
    final merged = mergeTimelineWithOverlay(
      timeline: timelineMessages,
      overlay: overlayMessages,
    );
    if (merged.isEmpty && showWelcome) {
      return [welcomeMessage()];
    }
    return merged;
  }

  bool get hasCustomerMessages =>
      visibleMessages.any((message) => message.isUser);

  ChatState copyWith({
    bool? isLoading,
    bool? isSending,
    bool? isAuthenticated,
    bool? isAiEnabled,
    int? conversationId,
    ConversationStatus? conversationStatus,
    String? assignedOperatorName,
    List<UiChatMessage>? timelineMessages,
    List<UiChatMessage>? overlayMessages,
    List<QuickReplyChip>? quickReplies,
    String? statusBanner,
    bool? hasMoreTimeline,
    String? errorMessage,
    bool? showWelcome,
    bool clearConversation = false,
    bool clearStatusBanner = false,
    bool clearError = false,
  }) {
    return ChatState(
      isLoading: isLoading ?? this.isLoading,
      isSending: isSending ?? this.isSending,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isAiEnabled: isAiEnabled ?? this.isAiEnabled,
      conversationId: clearConversation
          ? null
          : conversationId ?? this.conversationId,
      conversationStatus: clearConversation
          ? null
          : conversationStatus ?? this.conversationStatus,
      assignedOperatorName: clearConversation
          ? null
          : assignedOperatorName ?? this.assignedOperatorName,
      timelineMessages: timelineMessages ?? this.timelineMessages,
      overlayMessages: overlayMessages ?? this.overlayMessages,
      quickReplies: quickReplies ?? this.quickReplies,
      statusBanner: clearStatusBanner
          ? null
          : statusBanner ?? this.statusBanner,
      hasMoreTimeline: hasMoreTimeline ?? this.hasMoreTimeline,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      showWelcome: showWelcome ?? this.showWelcome,
    );
  }
}

final chatWebSocketServiceProvider = Provider<ChatWebSocketService>((ref) {
  final service = ChatWebSocketService();
  ref.onDispose(service.disconnect);
  return service;
});

final chatApiServiceProvider = Provider<ChatApiService>(
  (ref) => ChatApiService(ref.watch(apiClientProvider)),
);

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  return ChatRepository(
    apiService: ref.watch(chatApiServiceProvider),
    webSocketService: ref.watch(chatWebSocketServiceProvider),
    readAccessToken: () async {
      final storage = await AuthTokenStorage.create();
      return storage.getAccessToken();
    },
  );
});

final chatViewModelProvider = NotifierProvider<ChatViewModel, ChatState>(
  ChatViewModel.new,
);

class ChatViewModel extends Notifier<ChatState> {
  ChatRepository get _repository => ref.read(chatRepositoryProvider);

  Timer? _typingTimer;
  Timer? _aiStatusTimer;
  String? _timelineCursor;
  bool _bootstrapped = false;
  int? _subscribedConversationId;
  String? _lastReadAckKey;
  bool _timelineRefreshInFlight = false;
  int _sessionEpoch = 0;

  @override
  ChatState build() {
    ref.onDispose(_disposeTimers);
    return const ChatState();
  }

  Future<void> bootstrap({required bool isAuthenticated}) async {
    if (!isAuthenticated) {
      await _resetSession();
      return;
    }

    if (_bootstrapped) return;
    _bootstrapped = true;
    final sessionEpoch = ++_sessionEpoch;

    state = state.copyWith(
      isLoading: true,
      isAuthenticated: true,
      clearError: true,
    );
    try {
      final isAiEnabled = await _repository.getAiStatus();
      if (!_isCurrentSession(sessionEpoch)) return;
      state = state.copyWith(isAiEnabled: isAiEnabled);

      ConversationDetailModel? detail = await _repository.getOpenConversation();
      if (!_isCurrentSession(sessionEpoch)) return;
      detail ??= await _loadStoredConversation();
      if (!_isCurrentSession(sessionEpoch)) return;

      if (detail != null) {
        _applyConversation(detail.conversation);
        await _repository.saveLastConversationId(detail.conversation.id);
      }

      await _loadTimeline(reset: true);
      if (!_isCurrentSession(sessionEpoch)) return;
      await _connectAndSubscribe();
      if (!_isCurrentSession(sessionEpoch)) return;
      _startAiStatusPolling();
      _refreshQuickReplies();
      await _markReadIfNeeded();
    } catch (error) {
      if (_isCurrentSession(sessionEpoch)) {
        state = state.copyWith(errorMessage: error.toString());
      }
    } finally {
      if (_isCurrentSession(sessionEpoch)) {
        state = state.copyWith(isLoading: false);
      }
    }
  }

  Future<void> refresh() async {
    if (!state.isAuthenticated) return;
    await _loadTimeline(reset: true);
    _refreshQuickReplies();
  }

  Future<void> loadMoreTimeline() async {
    if (!state.hasMoreTimeline || state.isLoading) return;
    final (beforeCreatedAt, beforeId) = parseTimelineCursor(_timelineCursor);
    if (beforeCreatedAt == null || beforeId == null) return;

    state = state.copyWith(isLoading: true);
    try {
      final page = await _repository.getTimeline(
        beforeCreatedAt: beforeCreatedAt,
        beforeId: beforeId,
      );
      final older = mapTimelineItems(page.items);
      state = state.copyWith(
        timelineMessages: [...older, ...state.timelineMessages],
        hasMoreTimeline: page.hasMore,
      );
      _timelineCursor = page.nextCursor;
    } finally {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> sendText(String rawText) async {
    final text = rawText.trim();
    if (text.isEmpty || state.isSending || !state.isAuthenticated) return;

    final wantsStaff = isStaffRequestText(text);
    final sendToken = DateTime.now().millisecondsSinceEpoch.toString();
    final optimistic = UiChatMessage(
      id: 'optimistic-user-$sendToken',
      isUser: true,
      text: mapCustomerDisplayText(text),
      sentContent: mapCustomerDisplayText(text) == text ? null : text,
      timeLabel: formatMessageTime(DateTime.now()),
    );

    final overlay = [...state.overlayMessages, optimistic];
    if (isOpenBotThread(state.conversationStatus) && !wantsStaff) {
      overlay.add(typingMessage(sendToken));
      _startTypingTimeout(sendToken);
    }

    state = state.copyWith(
      isSending: true,
      overlayMessages: overlay,
      showWelcome: false,
      clearError: true,
    );
    _refreshQuickReplies();

    try {
      final status = state.conversationStatus;
      final conversationId = state.conversationId;
      final isClosed = status == ConversationStatus.closed;
      final shouldInit = conversationId == null || isClosed;

      if (shouldInit) {
        final detail = await _repository.initConversation(
          title: wantsStaff
              ? 'Yêu cầu gặp nhân viên'
              : 'Yêu cầu hỗ trợ từ khách hàng',
          content: text,
          requestStaff: wantsStaff,
        );
        if (detail == null) {
          throw Exception('Không thể khởi tạo cuộc trò chuyện.');
        }
        _applyConversation(detail.conversation);
        await _repository.saveLastConversationId(detail.conversation.id);
        await _connectAndSubscribe(forceResubscribe: true);
        await _loadTimeline(reset: true);
      } else {
        await _repository.sendRealtimeMessage(
          conversationId: conversationId,
          content: text,
        );
        if (wantsStaff && status == ConversationStatus.open) {
          final detail = await _repository.escalateConversation(conversationId);
          if (detail != null) _applyConversation(detail.conversation);
        }
        unawaited(_refreshTimelineSoon());
      }
    } catch (error) {
      state = state.copyWith(
        overlayMessages: state.overlayMessages
            .where((message) => !message.id.contains(sendToken))
            .toList(),
        errorMessage: error.toString(),
      );
    } finally {
      state = state.copyWith(isSending: false);
      _refreshQuickReplies();
    }
  }

  Future<void> handleQuickReply(QuickReplyChip chip) async {
    if (chip.action == QuickReplyAction.staff) {
      await _requestStaff(fromChip: true);
      return;
    }
    if (chip.message != null) {
      await sendText(chip.message!);
    }
  }

  Future<void> _requestStaff({bool fromChip = false}) async {
    if (!state.isAuthenticated || state.isSending) return;

    state = state.copyWith(isSending: true, clearError: true);
    try {
      final conversationId = state.conversationId;
      final status = state.conversationStatus;

      if (conversationId == null || status == ConversationStatus.closed) {
        final detail = await _repository.initConversation(
          title: 'Yêu cầu gặp nhân viên',
          requestStaff: true,
        );
        if (detail == null) {
          throw Exception('Không thể chuyển yêu cầu cho nhân viên.');
        }
        _applyConversation(detail.conversation);
        await _repository.saveLastConversationId(detail.conversation.id);
        await _connectAndSubscribe(forceResubscribe: true);
        await _loadTimeline(reset: true);
      } else if (status == ConversationStatus.open) {
        final detail = await _repository.escalateConversation(conversationId);
        if (detail != null) _applyConversation(detail.conversation);
      } else if (!fromChip) {
        state = state.copyWith(
          statusBanner: 'Yêu cầu gặp nhân viên đã được ghi nhận.',
        );
      }
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
    } finally {
      state = state.copyWith(isSending: false);
      _refreshQuickReplies();
    }
  }

  Future<ConversationDetailModel?> _loadStoredConversation() async {
    final lastId = await _repository.readLastConversationId();
    if (lastId == null) return null;
    return _repository.getConversationDetail(lastId);
  }

  Future<void> _loadTimeline({required bool reset}) async {
    if (reset && _timelineRefreshInFlight) return;
    if (reset) _timelineRefreshInFlight = true;
    try {
      final page = await _repository.getTimeline();
      final mapped = mapTimelineItems(page.items);
      state = state.copyWith(
        timelineMessages: reset
            ? mapped
            : [...mapped, ...state.timelineMessages],
        hasMoreTimeline: page.hasMore,
        overlayMessages: reset ? _pruneOverlay(mapped) : state.overlayMessages,
        showWelcome: mapped.isEmpty,
      );
      _timelineCursor = page.nextCursor;
    } finally {
      if (reset) _timelineRefreshInFlight = false;
    }
  }

  List<UiChatMessage> _pruneOverlay(List<UiChatMessage> timeline) {
    return state.overlayMessages.where((overlay) {
      if (overlay.id.startsWith('optimistic-user-')) {
        return !timeline.any((item) => _customerMessagesMatch(item, overlay));
      }
      if (overlay.variant == ChatMessageVariant.typing) return true;
      return true;
    }).toList();
  }

  Future<void> _connectAndSubscribe({bool forceResubscribe = false}) async {
    await _repository.connectWebSocket();
    _repository.subscribeInbox(
      onMessage: _handleSocketMessage,
      onConversationEvent: _handleConversationEvent,
    );

    final conversationId = state.conversationId;
    if (conversationId == null) {
      if (_subscribedConversationId != null) {
        _repository.unsubscribeConversation(_subscribedConversationId!);
        _subscribedConversationId = null;
      }
      return;
    }
    if (!forceResubscribe && _subscribedConversationId == conversationId) {
      return;
    }
    if (_subscribedConversationId != null) {
      _repository.unsubscribeConversation(_subscribedConversationId!);
    }
    _subscribedConversationId = conversationId;
    _repository.subscribeConversation(
      conversationId,
      onMessage: _handleSocketMessage,
      onConversationEvent: _handleConversationEvent,
    );
  }

  void _handleSocketMessage(ChatSocketMessageEvent event) {
    if (!ref.mounted) return;
    if (state.conversationId != null &&
        event.conversationId != state.conversationId) {
      return;
    }

    final mapped = mapSocketMessage(event);
    if (!mapped.isUser) {
      _clearTypingIndicators();
    }

    if (state.timelineMessages.any((message) => message.id == mapped.id)) {
      return;
    }

    state = state.copyWith(
      timelineMessages: [...state.timelineMessages, mapped],
      overlayMessages: _pruneOverlay([...state.timelineMessages, mapped]),
      showWelcome: false,
    );
    _refreshQuickReplies();
    unawaited(_markReadIfNeeded());
  }

  Future<void> _handleConversationEvent(
    ChatConversationSocketEvent event,
  ) async {
    if (!ref.mounted) return;
    if (state.conversationId != null &&
        event.conversationId != state.conversationId) {
      return;
    }

    state = state.copyWith(
      conversationStatus: event.status ?? state.conversationStatus,
      statusBanner: _bannerForEvent(event.eventType),
    );

    // The backend emits MESSAGE_READ after the detail/read endpoints update
    // the conversation. Calling getConversationDetail here would emit another
    // MESSAGE_READ event and create a client/server feedback loop.
    if (event.eventType == 'MESSAGE_READ') {
      _markConversationMessagesAsRead(event.conversationId);
      return;
    }

    if (event.eventType == 'CONVERSATION_CLOSED') {
      await _loadTimeline(reset: true);
      if (!ref.mounted) return;
      final open = await _repository.getOpenConversation();
      if (!ref.mounted) return;
      if (open != null) {
        _applyConversation(open.conversation);
        await _connectAndSubscribe(forceResubscribe: true);
      } else {
        if (_subscribedConversationId != null) {
          _repository.unsubscribeConversation(_subscribedConversationId!);
          _subscribedConversationId = null;
        }
        _lastReadAckKey = null;
        state = state.copyWith(clearConversation: true);
      }
    } else if (event.eventType == 'CONVERSATION_STAFF_REQUEST_CANCELLED' ||
        event.eventType == 'CONVERSATION_TAKEN' ||
        event.eventType == 'CONVERSATION_ASSIGNED') {
      final detail = await _repository.getConversationDetail(
        event.conversationId,
      );
      if (!ref.mounted) return;
      if (detail != null) _applyConversation(detail.conversation);
      await _loadTimeline(reset: true);
    } else {
      await _loadTimeline(reset: true);
    }
    if (!ref.mounted) return;
    _refreshQuickReplies();
  }

  String? _bannerForEvent(String eventType) {
    return switch (eventType) {
      'CONVERSATION_ESCALATED' => 'Đang chờ nhân viên hỗ trợ...',
      'CONVERSATION_TAKEN' ||
      'CONVERSATION_ASSIGNED' => 'Nhân viên Đại Phát đang hỗ trợ bạn.',
      'CONVERSATION_STAFF_REQUEST_CANCELLED' => 'Đã huỷ yêu cầu gặp nhân viên.',
      'CONVERSATION_CLOSED' => 'Phiên chat đã kết thúc.',
      _ => state.statusBanner,
    };
  }

  void _applyConversation(ChatConversationModel conversation) {
    if (state.conversationId != conversation.id) {
      _lastReadAckKey = null;
      if (_subscribedConversationId != null &&
          _subscribedConversationId != conversation.id) {
        _repository.unsubscribeConversation(_subscribedConversationId!);
        _subscribedConversationId = null;
      }
    }
    state = state.copyWith(
      conversationId: conversation.id,
      conversationStatus: conversation.status,
      assignedOperatorName: conversation.assignedOperatorName,
    );
  }

  void _refreshQuickReplies() {
    final lastBot = state.visibleMessages
        .where((message) => !message.isUser)
        .lastOrNull;
    final chips = resolveQuickReplies(
      isAiEnabled: state.isAiEnabled,
      hasCustomerMessages: state.hasCustomerMessages,
      showWelcome: lastBot?.id == 'welcome',
    );

    if (lastBot?.variant == ChatMessageVariant.ticketSuggest) {
      state = state.copyWith(
        quickReplies: [
          ...chips,
          ...ticketSuggestFollowUpChips(
            collectSuggestedTicketIds(state.visibleMessages),
          ),
        ],
      );
      return;
    }

    final canShow =
        isOpenBotThread(state.conversationStatus) &&
        state.conversationStatus != ConversationStatus.waitingForOperator &&
        !state.isSending;
    state = state.copyWith(quickReplies: canShow ? chips : const []);
  }

  Future<void> _markReadIfNeeded() async {
    final conversationId = state.conversationId;
    if (conversationId == null) return;
    final unreadMessageIds =
        state.timelineMessages
            .where(
              (message) =>
                  message.conversationId == conversationId &&
                  message.fromStaff &&
                  !message.isRead,
            )
            .map((message) => message.id)
            .toList()
          ..sort();
    if (unreadMessageIds.isEmpty) return;

    final readAckKey = '$conversationId:${unreadMessageIds.join(',')}';
    if (_lastReadAckKey == readAckKey) return;
    _lastReadAckKey = readAckKey;
    _markConversationMessagesAsRead(conversationId);
    await _repository.markAsRead(conversationId);
  }

  void _markConversationMessagesAsRead(int conversationId) {
    var changed = false;
    final updated = state.timelineMessages.map((message) {
      if (message.conversationId != conversationId ||
          !message.fromStaff ||
          message.isRead) {
        return message;
      }
      changed = true;
      return message.copyWith(isRead: true);
    }).toList();
    if (changed) {
      state = state.copyWith(timelineMessages: updated);
    }
  }

  Future<void> _refreshTimelineSoon() async {
    await Future<void>.delayed(const Duration(milliseconds: 1200));
    if (!ref.mounted) return;
    await _loadTimeline(reset: true);
    if (!ref.mounted) return;
    _refreshQuickReplies();
  }

  void _startTypingTimeout(String token) {
    _typingTimer?.cancel();
    _typingTimer = Timer(
      const Duration(milliseconds: ChatWsConstants.typingTimeoutMs),
      () {
        if (!ref.mounted) return;
        state = state.copyWith(
          overlayMessages: state.overlayMessages
              .where((message) => message.id != 'typing-$token')
              .toList(),
        );
      },
    );
  }

  void _clearTypingIndicators() {
    _typingTimer?.cancel();
    state = state.copyWith(
      overlayMessages: state.overlayMessages
          .where((message) => message.variant != ChatMessageVariant.typing)
          .toList(),
    );
  }

  void _startAiStatusPolling() {
    _aiStatusTimer?.cancel();
    _aiStatusTimer = Timer.periodic(const Duration(seconds: 10), (_) async {
      final enabled = await _repository.getAiStatus();
      if (!ref.mounted) return;
      if (enabled != state.isAiEnabled) {
        state = state.copyWith(isAiEnabled: enabled);
        _refreshQuickReplies();
      }
    });
  }

  void _disposeTimers() {
    _typingTimer?.cancel();
    _aiStatusTimer?.cancel();
    _lastReadAckKey = null;
    _subscribedConversationId = null;
    unawaited(_repository.disconnectWebSocket());
  }

  bool _isCurrentSession(int epoch) {
    return state.isAuthenticated && epoch == _sessionEpoch;
  }

  Future<void> _resetSession() async {
    _sessionEpoch++;
    _bootstrapped = false;
    _timelineCursor = null;
    _timelineRefreshInFlight = false;
    _typingTimer?.cancel();
    _aiStatusTimer?.cancel();
    _lastReadAckKey = null;
    _subscribedConversationId = null;
    await _repository.disconnectWebSocket();
    await _repository.clearLastConversationId();
    state = const ChatState();
  }

  bool _customerMessagesMatch(
    UiChatMessage timeline,
    UiChatMessage optimistic,
  ) {
    final timelineKey = timeline.sentContent ?? timeline.text;
    final optimisticKey = optimistic.sentContent ?? optimistic.text;
    return timelineKey.trim() == optimisticKey.trim();
  }
}

extension _LastOrNull<E> on Iterable<E> {
  E? get lastOrNull => isEmpty ? null : last;
}
