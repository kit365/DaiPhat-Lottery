import 'dart:convert';

import '../domain/entities/chat_models.dart';
import 'chat_constants.dart';

enum QuickReplyAction { send, staff }

class QuickReplyChip {
  const QuickReplyChip({
    required this.id,
    required this.label,
    required this.action,
    this.message,
    this.primary = false,
  });

  final String id;
  final String label;
  final QuickReplyAction action;
  final String? message;
  final bool primary;
}

List<QuickReplyChip> buildHubActionChips() => const [
  QuickReplyChip(
    id: 'hub-staff',
    label: 'Gặp nhân viên',
    action: QuickReplyAction.staff,
    primary: true,
  ),
  QuickReplyChip(
    id: 'hub-ticket',
    label: 'Gợi ý vé',
    action: QuickReplyAction.send,
    message: suggestTicketsMessage,
    primary: true,
  ),
  QuickReplyChip(
    id: 'hub-search',
    label: 'Tìm đuôi số',
    action: QuickReplyAction.send,
    message: searchSuffixMessage,
  ),
  QuickReplyChip(
    id: 'hub-results',
    label: 'Kết quả',
    action: QuickReplyAction.send,
    message: 'SCHEDULE_SET_GOAL:RESULT',
  ),
];

List<QuickReplyChip> buildWelcomeQuickReplies() => const [
  QuickReplyChip(
    id: 'welcome-staff',
    label: 'Gặp nhân viên',
    action: QuickReplyAction.staff,
    primary: true,
  ),
  QuickReplyChip(
    id: 'welcome-ticket',
    label: 'Gợi ý vé',
    action: QuickReplyAction.send,
    message: suggestTicketsMessage,
    primary: true,
  ),
  QuickReplyChip(
    id: 'welcome-search',
    label: 'Tìm đuôi số',
    action: QuickReplyAction.send,
    message: searchSuffixMessage,
  ),
  QuickReplyChip(
    id: 'welcome-result',
    label: 'Kết quả',
    action: QuickReplyAction.send,
    message: 'SCHEDULE_SET_GOAL:RESULT',
  ),
];

List<QuickReplyChip> buildStaffOnlyQuickReplies() => const [
  QuickReplyChip(
    id: 'ai-disabled-staff',
    label: 'Gặp nhân viên',
    action: QuickReplyAction.staff,
    primary: true,
  ),
];

List<QuickReplyChip> resolveQuickReplies({
  required bool isAiEnabled,
  required bool hasCustomerMessages,
  required bool showWelcome,
}) {
  if (!isAiEnabled) {
    return buildStaffOnlyQuickReplies();
  }
  if (!hasCustomerMessages && showWelcome) {
    return buildWelcomeQuickReplies();
  }
  return buildHubActionChips();
}

String buildSuggestAgainMessage(List<int> excludeIds) {
  final unique = excludeIds.where((id) => id > 0).toSet().toList();
  if (unique.isEmpty) return suggestTicketsMessage;
  return '$suggestTicketsMessage|exclude=${unique.join(',')}';
}

List<QuickReplyChip> ticketSuggestFollowUpChips(List<int> excludeIds) => [
  QuickReplyChip(
    id: 'ticket-suggest-again',
    label: 'Gợi ý số khác',
    action: QuickReplyAction.send,
    message: buildSuggestAgainMessage(excludeIds),
    primary: true,
  ),
];

List<int> collectSuggestedTicketIds(List<UiChatMessage> messages) {
  final ids = <int>[];
  for (final message in messages) {
    if (message.variant != ChatMessageVariant.ticketSuggest) continue;
    for (final ticket in message.suggestedTickets) {
      ids.add(ticket.id);
    }
  }
  return ids;
}

enum ChatMessageVariant {
  bubble,
  divider,
  typing,
  ticketSuggest,
}

class UiChatMessage {
  const UiChatMessage({
    required this.id,
    required this.isUser,
    required this.text,
    required this.timeLabel,
    this.conversationId,
    this.fromStaff = false,
    this.isRead = false,
    this.variant = ChatMessageVariant.bubble,
    this.sentContent,
    this.suggestedTickets = const [],
    this.actions = const [],
  });

  final String id;
  final bool isUser;
  final String text;
  final String timeLabel;
  final int? conversationId;
  final bool fromStaff;
  final bool isRead;
  final ChatMessageVariant variant;
  final String? sentContent;
  final List<SuggestedTicketModel> suggestedTickets;
  final List<ChatMessageAction> actions;

  UiChatMessage copyWith({
    String? id,
    bool? isUser,
    String? text,
    String? timeLabel,
    int? conversationId,
    bool? fromStaff,
    bool? isRead,
    ChatMessageVariant? variant,
    String? sentContent,
    List<SuggestedTicketModel>? suggestedTickets,
    List<ChatMessageAction>? actions,
  }) {
    return UiChatMessage(
      id: id ?? this.id,
      isUser: isUser ?? this.isUser,
      text: text ?? this.text,
      timeLabel: timeLabel ?? this.timeLabel,
      conversationId: conversationId ?? this.conversationId,
      fromStaff: fromStaff ?? this.fromStaff,
      isRead: isRead ?? this.isRead,
      variant: variant ?? this.variant,
      sentContent: sentContent ?? this.sentContent,
      suggestedTickets: suggestedTickets ?? this.suggestedTickets,
      actions: actions ?? this.actions,
    );
  }
}

UiChatMessage welcomeMessage() {
  final now = DateTime.now();
  return UiChatMessage(
    id: 'welcome',
    isUser: false,
    text: welcomeMessageText,
    timeLabel: _formatTime(now),
  );
}

UiChatMessage typingMessage(String token) {
  return UiChatMessage(
    id: 'typing-$token',
    isUser: false,
    text: 'Đại Phát đang soạn tin...',
    timeLabel: _formatTime(DateTime.now()),
    variant: ChatMessageVariant.typing,
  );
}

String _formatTime(DateTime? value) {
  final date = value ?? DateTime.now();
  final hour = date.hour.toString().padLeft(2, '0');
  final minute = date.minute.toString().padLeft(2, '0');
  return '$hour:$minute';
}

String formatMessageTime(DateTime? value) => _formatTime(value);

String mapCustomerDisplayText(String rawContent) {
  final raw = rawContent.trim();
  if (raw == scheduleRestartToken) return 'Xem lịch xổ';
  if (raw.startsWith(scheduleSetGoalPrefix)) {
    final goal = raw.substring(scheduleSetGoalPrefix.length).trim();
    return switch (goal) {
      'SCHEDULE' => 'Xem lịch xổ',
      'RESULT' => 'Kết quả',
      'TICKET' => 'Gợi ý vé',
      _ => raw,
    };
  }
  if (raw.startsWith(scheduleShowPrefix)) {
    if (raw.contains('date=TODAY')) return 'Hôm nay';
    if (raw.contains('date=YESTERDAY')) return 'Hôm qua';
    if (raw.contains('date=TOMORROW')) return 'Ngày mai';
    if (raw.contains('day=2')) return 'Thứ 2';
    if (raw.contains('day=3')) return 'Thứ 3';
    if (raw.contains('day=4')) return 'Thứ 4';
    if (raw.contains('day=5')) return 'Thứ 5';
    if (raw.contains('day=6')) return 'Thứ 6';
    if (raw.contains('day=7')) return 'Thứ 7';
    if (raw.contains('day=CN') || raw.contains('day=8')) return 'Chủ nhật';
    if (raw.contains('station=')) {
      final match = RegExp(r'station=([^|&]+)').firstMatch(raw);
      if (match != null) {
        return Uri.decodeComponent(match.group(1)!);
      }
    }
    if (raw.contains('goal=SCHEDULE')) return 'Xem lịch xổ';
    if (raw.contains('goal=RESULT')) return 'Kết quả';
    if (raw.contains('goal=TICKET')) return 'Gợi ý vé';
  }
  if (raw == suggestTicketsMessage || raw.startsWith('$suggestTicketsMessage|')) {
    return raw.contains('|exclude=') ? 'Gợi ý số khác' : 'Gợi ý vé';
  }
  if (raw == searchSuffixMessage) return 'Tìm đuôi số';
  return raw;
}

UiChatMessage mapApiMessage(ChatMessageModel message) {
  final raw = message.content.trim();
  final isUser = message.senderType == ChatSenderType.customer;
  final fromStaff = message.senderType == ChatSenderType.operator;

  if (message.type == 'SYSTEM' ||
      message.senderType == ChatSenderType.system ||
      _isSystemNotice(raw)) {
    return UiChatMessage(
      id: message.id.toString(),
      isUser: false,
      text: raw,
      timeLabel: formatMessageTime(message.createdAt),
      conversationId: message.conversationId,
      isRead: message.isRead,
      variant: ChatMessageVariant.divider,
    );
  }

  final ticketSuggest = _parseTicketSuggest(raw);
  if (ticketSuggest != null) {
    return UiChatMessage(
      id: message.id.toString(),
      isUser: false,
      text: ticketSuggest.text,
      timeLabel: formatMessageTime(message.createdAt),
      conversationId: message.conversationId,
      fromStaff: fromStaff,
      isRead: message.isRead,
      variant: ticketSuggest.tickets.isEmpty
          ? ChatMessageVariant.bubble
          : ChatMessageVariant.ticketSuggest,
      suggestedTickets: ticketSuggest.tickets,
    );
  }

  if (!isUser &&
      (message.intent == 'WEB_SCHEDULE' ||
          raw.startsWith('SCHEDULE_') ||
          raw.contains('SCHEDULE_'))) {
    final schedule = _parseScheduleMessage(raw);
    return UiChatMessage(
      id: message.id.toString(),
      isUser: false,
      text: schedule.text,
      timeLabel: formatMessageTime(message.createdAt),
      conversationId: message.conversationId,
      fromStaff: fromStaff,
      isRead: message.isRead,
      actions: schedule.actions,
    );
  }

  var displayText = raw;
  String? sentContent;
  if (isUser) {
    final mapped = mapCustomerDisplayText(raw);
    displayText = mapped;
    if (mapped != raw) sentContent = raw;
  }

  return UiChatMessage(
    id: message.id.toString(),
    isUser: isUser,
    text: displayText.isEmpty ? '[Tin nhắn trống]' : displayText,
    timeLabel: formatMessageTime(message.createdAt),
    conversationId: message.conversationId,
    fromStaff: fromStaff,
    isRead: message.isRead,
    sentContent: sentContent,
  );
}

UiChatMessage mapSocketMessage(ChatSocketMessageEvent event) {
  return mapApiMessage(
    ChatMessageModel(
      id: event.id ?? DateTime.now().millisecondsSinceEpoch,
      conversationId: event.conversationId,
      senderType: event.senderType,
      type: event.type,
      content: event.content,
      intent: event.intent,
      createdAt: event.createdAt,
    ),
  );
}

class _ParsedTicketSuggest {
  const _ParsedTicketSuggest({required this.text, required this.tickets});

  final String text;
  final List<SuggestedTicketModel> tickets;
}

_ParsedTicketSuggest? _parseTicketSuggest(String content) {
  final index = content.indexOf(ticketSuggestPrefix);
  if (index < 0) return null;

  final intro = content.substring(0, index).trim();
  final payload = content.substring(index + ticketSuggestPrefix.length).trim();
  if (payload.isEmpty) {
    return _ParsedTicketSuggest(
      text: intro.isEmpty ? 'Gợi ý vé số cho bạn:' : intro,
      tickets: const [],
    );
  }

  try {
    final decoded = jsonDecode(payload);
    if (decoded is! List) {
      return _ParsedTicketSuggest(
        text: intro.isEmpty ? 'Gợi ý vé số cho bạn:' : intro,
        tickets: const [],
      );
    }
    final tickets = decoded
        .whereType<Map>()
        .map((item) => SuggestedTicketModel.fromJson(Map<String, dynamic>.from(item)))
        .where((ticket) => ticket.numbers.isNotEmpty)
        .toList();
    return _ParsedTicketSuggest(
      text: intro.isEmpty ? 'Gợi ý vé số cho bạn:' : intro,
      tickets: tickets,
    );
  } catch (_) {
    return _ParsedTicketSuggest(
      text: intro.isEmpty ? 'Gợi ý vé số cho bạn:' : intro,
      tickets: const [],
    );
  }
}

bool _isSystemNotice(String text) {
  final normalized = text.toLowerCase();
  return normalized.contains('phiên hỗ trợ') ||
      normalized.contains('đang chờ nhân viên') ||
      normalized.contains('nhân viên đã');
}

class _ParsedScheduleMessage {
  const _ParsedScheduleMessage({required this.text, this.actions = const []});

  final String text;
  final List<ChatMessageAction> actions;
}

_ParsedScheduleMessage _parseScheduleMessage(String raw) {
  final trimmed = raw.trim();

  if (trimmed.startsWith('SCHEDULE_ASK_DATE_MODE') ||
      trimmed == 'SCHEDULE_ASK_DATE') {
    final isResult = trimmed.contains('goal=RESULT');
    final isTicket = trimmed.contains('goal=TICKET');
    final goal = isResult
        ? 'RESULT'
        : (isTicket ? 'TICKET' : 'SCHEDULE');
    final text = isResult
        ? 'Bạn muốn xem kết quả ngày nào?'
        : (isTicket
            ? 'Bạn muốn xem vé ngày nào?'
            : 'Bạn muốn xem lịch ngày nào?');

    final actions = <ChatMessageAction>[
      ChatMessageAction(
        label: 'Hôm nay',
        payload: 'SCHEDULE_SHOW:date=TODAY|goal=$goal',
        primary: true,
      ),
      if (isResult)
        ChatMessageAction(
          label: 'Hôm qua',
          payload: 'SCHEDULE_SHOW:date=YESTERDAY|goal=$goal',
        )
      else
        ChatMessageAction(
          label: 'Ngày mai',
          payload: 'SCHEDULE_SHOW:date=TOMORROW|goal=$goal',
        ),
      ChatMessageAction(
        label: 'Thứ 2',
        payload: 'SCHEDULE_SHOW:day=2|goal=$goal',
      ),
      ChatMessageAction(
        label: 'Thứ 3',
        payload: 'SCHEDULE_SHOW:day=3|goal=$goal',
      ),
      ChatMessageAction(
        label: 'Thứ 4',
        payload: 'SCHEDULE_SHOW:day=4|goal=$goal',
      ),
      ChatMessageAction(
        label: 'Thứ 5',
        payload: 'SCHEDULE_SHOW:day=5|goal=$goal',
      ),
      ChatMessageAction(
        label: 'Thứ 6',
        payload: 'SCHEDULE_SHOW:day=6|goal=$goal',
      ),
      ChatMessageAction(
        label: 'Thứ 7',
        payload: 'SCHEDULE_SHOW:day=7|goal=$goal',
      ),
      ChatMessageAction(
        label: 'Chủ nhật',
        payload: 'SCHEDULE_SHOW:day=CN|goal=$goal',
      ),
    ];
    return _ParsedScheduleMessage(text: text, actions: actions);
  }

  if (trimmed == 'SCHEDULE_ASK_GOAL') {
    return const _ParsedScheduleMessage(
      text: 'Bạn muốn tra cứu lịch quay, kết quả xổ số hay xem vé ạ?',
      actions: [
        ChatMessageAction(
          label: 'Tra cứu kết quả',
          payload: 'SCHEDULE_SET_GOAL:RESULT',
          primary: true,
        ),
        ChatMessageAction(
          label: 'Xem lịch mở thưởng',
          payload: 'SCHEDULE_SET_GOAL:SCHEDULE',
        ),
        ChatMessageAction(
          label: 'Gợi ý vé số',
          payload: 'SCHEDULE_SET_GOAL:TICKET',
        ),
      ],
    );
  }

  if (trimmed.startsWith('SCHEDULE_CONFIRM_STATION:') ||
      trimmed.startsWith('SCHEDULE_PICK_STATION_LIST:') ||
      trimmed.startsWith('SCHEDULE_ASK_STATION:')) {
    final colonIdx = trimmed.indexOf(':');
    final payload =
        colonIdx >= 0 ? trimmed.substring(colonIdx + 1).trim() : '';
    const text = 'Chọn đài bạn muốn xem:';
    final actions = <ChatMessageAction>[];

    if (payload.isNotEmpty) {
      try {
        final decoded = jsonDecode(payload);
        if (decoded is List) {
          for (final item in decoded) {
            final name = item is Map
                ? (item['name'] ?? item['stationName'] ?? '').toString()
                : item.toString();
            if (name.isNotEmpty) {
              actions.add(
                ChatMessageAction(
                  label: name,
                  payload:
                      'SCHEDULE_SHOW:station=${Uri.encodeComponent(name)}',
                ),
              );
            }
          }
        }
      } catch (_) {
        final parts = payload.split(RegExp(r'[,|]'));
        for (final p in parts) {
          final clean = p.replaceAll(RegExp(r'^(station=)?'), '').trim();
          if (clean.isNotEmpty && !clean.contains('=')) {
            actions.add(
              ChatMessageAction(
                label: clean,
                payload:
                    'SCHEDULE_SHOW:station=${Uri.encodeComponent(clean)}',
              ),
            );
          }
        }
      }
    }

    return _ParsedScheduleMessage(text: text, actions: actions);
  }

  if (trimmed.startsWith('SCHEDULE_RESULT_SUMMARY:') ||
      trimmed.startsWith('SCHEDULE_RESULT:') ||
      trimmed.startsWith('SCHEDULE_SHOW:') ||
      trimmed.startsWith('SCHEDULE_STATION_BUNDLE:')) {
    final colonIdx = trimmed.indexOf(':');
    final payload =
        colonIdx >= 0 ? trimmed.substring(colonIdx + 1).trim() : '';
    String displayText;

    if (trimmed.startsWith('SCHEDULE_RESULT_SUMMARY:')) {
      displayText = payload.isNotEmpty
          ? payload
          : 'Kết quả xổ số theo yêu cầu của bạn:';
    } else if (trimmed.startsWith('SCHEDULE_STATION_BUNDLE:')) {
      displayText = payload.isNotEmpty
          ? payload
          : 'Dưới đây là lịch quay và kết quả gần nhất của đài:';
    } else {
      displayText = payload.isNotEmpty
          ? payload
          : 'Lịch mở thưởng theo yêu cầu của bạn:';
    }

    final actions = const [
      ChatMessageAction(
        label: 'Tra cứu kết quả khác',
        payload: 'SCHEDULE_SET_GOAL:RESULT',
      ),
      ChatMessageAction(
        label: 'Xem lịch mở thưởng',
        payload: 'SCHEDULE_SET_GOAL:SCHEDULE',
      ),
      ChatMessageAction(
        label: 'Gợi ý vé',
        payload: suggestTicketsMessage,
      ),
    ];

    return _ParsedScheduleMessage(text: displayText, actions: actions);
  }

  if (trimmed.contains('Mình chưa nhận ra khu vực') ||
      trimmed.contains('Mình chưa tìm thấy đài')) {
    return const _ParsedScheduleMessage(
      text: 'Bạn muốn xem lịch xổ — dùng nút bên dưới nhé.',
      actions: [
        ChatMessageAction(
          label: 'Xem lịch xổ',
          payload: 'SCHEDULE_SET_GOAL:SCHEDULE',
          primary: true,
        ),
        ChatMessageAction(
          label: 'Tra cứu kết quả',
          payload: 'SCHEDULE_SET_GOAL:RESULT',
        ),
      ],
    );
  }

  return _ParsedScheduleMessage(text: trimmed);
}

List<UiChatMessage> mergeTimelineWithOverlay({
  required List<UiChatMessage> timeline,
  required List<UiChatMessage> overlay,
}) {
  final merged = [...timeline];
  final timelineUsers = timeline.where((message) => message.isUser).toList();
  final claimed = <String>{};

  for (final extra in overlay) {
    if (extra.id.startsWith('optimistic-user-')) {
      final match = timelineUsers.where((message) {
        if (claimed.contains(message.id)) return false;
        return _customerMessagesMatch(message, extra);
      }).firstOrNull;
      if (match != null) {
        claimed.add(match.id);
        continue;
      }
      merged.add(extra);
      continue;
    }
    if (extra.variant == ChatMessageVariant.typing) {
      merged.add(extra);
      continue;
    }
    if (!merged.any((message) => message.id == extra.id)) {
      merged.add(extra);
    }
  }
  return merged;
}

bool _customerMessagesMatch(UiChatMessage timeline, UiChatMessage optimistic) {
  final timelineKey = timeline.sentContent ?? timeline.text;
  final optimisticKey = optimistic.sentContent ?? optimistic.text;
  return timelineKey.trim() == optimisticKey.trim();
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull {
    final iterator = this.iterator;
    if (!iterator.moveNext()) return null;
    return iterator.current;
  }
}
