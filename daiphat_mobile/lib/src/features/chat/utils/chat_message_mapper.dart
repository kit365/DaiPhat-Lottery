import 'dart:convert';

import '../data/models/chat_models.dart';
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
    id: 'hub-schedule',
    label: 'Xem lịch xổ',
    action: QuickReplyAction.send,
    message: 'SCHEDULE_SHOW:goal=SCHEDULE:region=MIEN_NAM:scope=all',
    primary: true,
  ),
  QuickReplyChip(
    id: 'hub-results',
    label: 'Kết quả',
    action: QuickReplyAction.send,
    message: 'SCHEDULE_SET_GOAL:RESULT',
    primary: true,
  ),
  QuickReplyChip(
    id: 'hub-ticket',
    label: 'Gợi ý vé',
    action: QuickReplyAction.send,
    message: suggestTicketsMessage,
  ),
  QuickReplyChip(
    id: 'hub-search',
    label: 'Tìm đuôi số',
    action: QuickReplyAction.send,
    message: searchSuffixMessage,
  ),
  QuickReplyChip(
    id: 'hub-staff',
    label: 'Gặp nhân viên',
    action: QuickReplyAction.staff,
  ),
];

List<QuickReplyChip> buildWelcomeQuickReplies() => const [
  QuickReplyChip(
    id: 'welcome-schedule',
    label: 'Xem lịch xổ',
    action: QuickReplyAction.send,
    message: 'SCHEDULE_SHOW:goal=SCHEDULE:region=MIEN_NAM:scope=all',
    primary: true,
  ),
  QuickReplyChip(
    id: 'welcome-result',
    label: 'Tra cứu kết quả',
    action: QuickReplyAction.send,
    message: 'SCHEDULE_SET_GOAL:RESULT',
  ),
  QuickReplyChip(
    id: 'welcome-ticket',
    label: 'Gợi ý vé',
    action: QuickReplyAction.send,
    message: suggestTicketsMessage,
  ),
  QuickReplyChip(
    id: 'welcome-order',
    label: 'Hỗ trợ đơn hàng',
    action: QuickReplyAction.send,
    message: 'Tôi cần hỗ trợ đơn hàng',
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
    this.fromStaff = false,
    this.variant = ChatMessageVariant.bubble,
    this.sentContent,
    this.suggestedTickets = const [],
  });

  final String id;
  final bool isUser;
  final String text;
  final String timeLabel;
  final bool fromStaff;
  final ChatMessageVariant variant;
  final String? sentContent;
  final List<SuggestedTicketModel> suggestedTickets;

  UiChatMessage copyWith({
    String? id,
    bool? isUser,
    String? text,
    String? timeLabel,
    bool? fromStaff,
    ChatMessageVariant? variant,
    String? sentContent,
    List<SuggestedTicketModel>? suggestedTickets,
  }) {
    return UiChatMessage(
      id: id ?? this.id,
      isUser: isUser ?? this.isUser,
      text: text ?? this.text,
      timeLabel: timeLabel ?? this.timeLabel,
      fromStaff: fromStaff ?? this.fromStaff,
      variant: variant ?? this.variant,
      sentContent: sentContent ?? this.sentContent,
      suggestedTickets: suggestedTickets ?? this.suggestedTickets,
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
      fromStaff: fromStaff,
      variant: ticketSuggest.tickets.isEmpty
          ? ChatMessageVariant.bubble
          : ChatMessageVariant.ticketSuggest,
      suggestedTickets: ticketSuggest.tickets,
    );
  }

  var displayText = raw;
  String? sentContent;
  if (isUser) {
    final mapped = mapCustomerDisplayText(raw);
    displayText = mapped;
    if (mapped != raw) sentContent = raw;
  } else if (message.intent == 'WEB_SCHEDULE') {
    displayText = _resolveScheduleDisplayText(raw);
  }

  return UiChatMessage(
    id: message.id.toString(),
    isUser: isUser,
    text: displayText.isEmpty ? '[Tin nhắn trống]' : displayText,
    timeLabel: formatMessageTime(message.createdAt),
    fromStaff: fromStaff,
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

String _resolveScheduleDisplayText(String raw) {
  if (raw.contains('Mình chưa nhận ra khu vực') ||
      raw.contains('Mình chưa tìm thấy đài')) {
    return 'Bạn muốn xem đài quay hôm nay, lịch cả tuần hay chọn một đài cụ thể?';
  }
  if (raw.contains('Mình chưa nhận ra ngày/thứ')) return raw;
  if (raw.startsWith('SCHEDULE_ASK_DATE_MODE')) {
    return raw.contains('goal=RESULT')
        ? 'Bạn muốn xem kết quả ngày nào?'
        : 'Bạn muốn xem lịch ngày nào?';
  }
  if (raw == 'SCHEDULE_ASK_DATE') {
    return 'Bạn muốn xem lịch ngày/thứ nào? (vd: hôm nay, thứ 7)';
  }
  if (raw == 'SCHEDULE_ASK_GOAL') {
    return 'Bạn muốn tra cứu lịch quay, kết quả xổ số hay xem vé ạ?';
  }
  if (raw.startsWith('SCHEDULE_RESULT_SUMMARY:')) {
    return 'Kết quả xổ số theo yêu cầu của bạn:';
  }
  if (raw.startsWith('SCHEDULE_RESULT:') || raw.startsWith('SCHEDULE_SHOW:')) {
    return 'Lịch mở thưởng theo yêu cầu của bạn:';
  }
  if (raw.startsWith('SCHEDULE_STATION_BUNDLE:')) {
    return 'Dưới đây là lịch quay và kết quả gần nhất của đài bạn chọn:';
  }
  if (raw.startsWith('SCHEDULE_CONFIRM_STATION:') ||
      raw.startsWith('SCHEDULE_PICK_STATION_LIST:')) {
    return 'Chọn đài bạn muốn xem:';
  }
  if (raw.startsWith('SCHEDULE_ASK_STATION:')) {
    return 'Bạn muốn xem đài nào ạ?';
  }
  return raw;
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
