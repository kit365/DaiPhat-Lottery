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
  scheduleResultSummary,
}

class ScheduleResultSummaryData {
  const ScheduleResultSummaryData({
    this.region,
    this.stationId,
    this.stationIds,
    this.drawDate,
    this.stationName,
  });

  final String? region;
  final int? stationId;
  final List<int>? stationIds;
  final String? drawDate;
  final String? stationName;
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
    this.scheduleResultSummary,
    this.createdAt,
    this.rawId,
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
  final ScheduleResultSummaryData? scheduleResultSummary;
  final DateTime? createdAt;
  final int? rawId;

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
    ScheduleResultSummaryData? scheduleResultSummary,
    DateTime? createdAt,
    int? rawId,
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
      scheduleResultSummary:
          scheduleResultSummary ?? this.scheduleResultSummary,
      createdAt: createdAt ?? this.createdAt,
      rawId: rawId ?? this.rawId,
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
    createdAt: DateTime.fromMillisecondsSinceEpoch(0),
  );
}

UiChatMessage typingMessage(String token) {
  final now = DateTime.now();
  return UiChatMessage(
    id: 'typing-$token',
    isUser: false,
    text: 'Đại Phát đang soạn tin...',
    timeLabel: _formatTime(now),
    variant: ChatMessageVariant.typing,
    createdAt: now,
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
  if (raw.startsWith('SCHEDULE_SELECT_STATION:')) {
    final match = RegExp(r'name=([^|&]+)').firstMatch(raw);
    if (match != null) {
      return match.group(1)!.trim();
    }
    return raw;
  }
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
      createdAt: message.createdAt,
      rawId: message.id,
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
      createdAt: message.createdAt,
      rawId: message.id,
    );
  }

  if (!isUser &&
      (message.intent == 'WEB_SCHEDULE' ||
          raw.startsWith('SCHEDULE_') ||
          raw.contains('SCHEDULE_') ||
          raw.startsWith('region=') ||
          raw.contains('goal=RESULT') ||
          raw.contains('goal=SCHEDULE'))) {
    final schedule = _parseScheduleMessage(raw);
    return UiChatMessage(
      id: message.id.toString(),
      isUser: false,
      text: schedule.text,
      timeLabel: formatMessageTime(message.createdAt),
      conversationId: message.conversationId,
      fromStaff: fromStaff,
      isRead: message.isRead,
      variant: schedule.variant,
      scheduleResultSummary: schedule.scheduleResultSummary,
      actions: schedule.actions,
      createdAt: message.createdAt,
      rawId: message.id,
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
    createdAt: message.createdAt,
    rawId: message.id,
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
      createdAt: event.createdAt ?? DateTime.now(),
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
  const _ParsedScheduleMessage({
    required this.text,
    this.actions = const [],
    this.variant = ChatMessageVariant.bubble,
    this.scheduleResultSummary,
  });

  final String text;
  final List<ChatMessageAction> actions;
  final ChatMessageVariant variant;
  final ScheduleResultSummaryData? scheduleResultSummary;
}

ScheduleResultSummaryData? parseScheduleResultSummaryToken(String content) {
  var raw = content.trim();
  if (raw.startsWith('SCHEDULE_RESULT_SUMMARY:')) {
    raw = raw.substring('SCHEDULE_RESULT_SUMMARY:'.length).trim();
  } else if (raw.startsWith('SCHEDULE_RESULT:')) {
    raw = raw.substring('SCHEDULE_RESULT:'.length).trim();
  } else if (raw.startsWith('SCHEDULE_STATION_BUNDLE:')) {
    raw = raw.substring('SCHEDULE_STATION_BUNDLE:'.length).trim();
  } else if (raw.startsWith('SCHEDULE_SHOW:')) {
    raw = raw.substring('SCHEDULE_SHOW:'.length).trim();
  } else if (!raw.startsWith('region=') &&
      !raw.startsWith('station=') &&
      !raw.contains('goal=RESULT')) {
    return null;
  }

  final parts = raw.split(RegExp(r'[:|]'));
  String? region;
  int? stationId;
  List<int>? stationIds;
  String? drawDate;
  String? stationName;

  for (final part in parts) {
    final eqIdx = part.indexOf('=');
    if (eqIdx < 0) continue;
    final key = part.substring(0, eqIdx).trim();
    final value = part.substring(eqIdx + 1).trim();

    if (key == 'region') {
      region = value;
    } else if (key == 'station') {
      stationId = int.tryParse(value);
    } else if (key == 'stations') {
      stationIds = value
          .split(',')
          .map((segment) => int.tryParse(segment.split(':')[0].trim()))
          .whereType<int>()
          .toList();
    } else if (key == 'date') {
      drawDate = value;
    } else if (key == 'stationName') {
      stationName = Uri.decodeComponent(value.replaceAll('+', ' '));
    }
  }

  if (region == null &&
      stationId == null &&
      stationIds == null &&
      drawDate == null &&
      stationName == null) {
    return null;
  }

  return ScheduleResultSummaryData(
    region: region,
    stationId: stationId,
    stationIds: stationIds,
    drawDate: drawDate,
    stationName: stationName,
  );
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

    final actions = isResult
        ? <ChatMessageAction>[
            const ChatMessageAction(
              label: 'Hôm nay',
              payload: 'Hôm nay',
              primary: true,
            ),
            const ChatMessageAction(
              label: 'Hôm qua',
              payload: 'Hôm qua',
            ),
            const ChatMessageAction(
              label: 'Chọn ngày khác',
              payload: 'ACTION_PICK_DATE:goal=RESULT',
            ),
          ]
        : <ChatMessageAction>[
            ChatMessageAction(
              label: 'Hôm nay',
              payload: 'Hôm nay',
              primary: true,
            ),
            ChatMessageAction(
              label: 'Ngày mai',
              payload: 'Ngày mai',
              primary: true,
            ),
            ChatMessageAction(
              label: 'Hôm qua',
              payload: 'Hôm qua',
            ),
            ChatMessageAction(
              label: 'Chọn thứ/ngày',
              payload: 'ACTION_PICK_DATE:goal=$goal',
            ),
            ChatMessageAction(
              label: 'Tất cả ngày',
              payload: 'Tất cả ngày',
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
    final isResultGoal = trimmed.contains('goal=RESULT');
    final dateMatch = RegExp(r'date=([^:|]+)').firstMatch(trimmed);
    final rawDate = dateMatch?.group(1);
    final dateLabel = rawDate != null && RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(rawDate)
        ? rawDate.split('-').reversed.join('/')
        : rawDate;

    final String text;
    if (isResultGoal && dateLabel != null && dateLabel.isNotEmpty) {
      text = 'Chọn đài muốn xem kết quả ngày $dateLabel:';
    } else if (trimmed.startsWith('SCHEDULE_CONFIRM_STATION:')) {
      text = 'Mình tìm thấy vài đài gần giống. Bạn chọn đài nào ạ?';
    } else {
      text = 'Chọn đài bạn muốn xem:';
    }

    final actions = <ChatMessageAction>[];

    final stationsIdx = trimmed.indexOf('stations=');
    if (stationsIdx >= 0) {
      var rawStations = trimmed.substring(stationsIdx + 'stations='.length);
      rawStations = rawStations.replaceAll(
        RegExp(r':(goal|hasNext|page|region|date)=.*$', caseSensitive: false),
        '',
      );

      for (final segment in rawStations.split(',')) {
        final colonIdx = segment.indexOf(':');
        if (colonIdx >= 0) {
          final idStr = segment.substring(0, colonIdx).trim();
          var nameStr = segment.substring(colonIdx + 1).trim();
          nameStr = nameStr.replaceAll(
            RegExp(r':(goal|hasNext|page|region|date)=.*$', caseSensitive: false),
            '',
          ).trim();
          final id = int.tryParse(idStr);
          if (id != null && nameStr.isNotEmpty) {
            actions.add(
              ChatMessageAction(
                label: nameStr,
                payload: 'SCHEDULE_SELECT_STATION:id=$id:name=$nameStr',
                primary: true,
              ),
            );
          }
        } else {
          final clean = segment.trim();
          if (clean.isNotEmpty && !clean.contains('=')) {
            actions.add(
              ChatMessageAction(
                label: clean,
                payload: 'SCHEDULE_SHOW:station=${Uri.encodeComponent(clean)}',
                primary: true,
              ),
            );
          }
        }
      }
    } else {
      final colonIdx = trimmed.indexOf(':');
      final payload =
          colonIdx >= 0 ? trimmed.substring(colonIdx + 1).trim() : '';

      if (payload.isNotEmpty) {
        try {
          final decoded = jsonDecode(payload);
          if (decoded is List) {
            for (final item in decoded) {
              final name = item is Map
                  ? (item['name'] ?? item['stationName'] ?? '').toString()
                  : item.toString();
              final id = item is Map ? (item['id'] as int?) : null;
              if (name.isNotEmpty) {
                actions.add(
                  ChatMessageAction(
                    label: name,
                    payload: id != null && id > 0
                        ? 'SCHEDULE_SELECT_STATION:id=$id:name=$name'
                        : 'SCHEDULE_SHOW:station=${Uri.encodeComponent(name)}',
                    primary: true,
                  ),
                );
              }
            }
          }
        } catch (_) {
          final parts = payload.split(RegExp(r'[,|]'));
          for (final p in parts) {
            final clean = p.replaceAll(RegExp(r'^(station=|stations=)?'), '').trim();
            if (clean.isNotEmpty && !clean.contains('=')) {
              final colon = clean.indexOf(':');
              final nameOnly = colon >= 0 ? clean.substring(colon + 1).trim() : clean;
              final id = colon >= 0 ? int.tryParse(clean.substring(0, colon).trim()) : null;
              actions.add(
                ChatMessageAction(
                  label: nameOnly,
                  payload: id != null && id > 0
                      ? 'SCHEDULE_SELECT_STATION:id=$id:name=$nameOnly'
                      : 'SCHEDULE_SHOW:station=${Uri.encodeComponent(nameOnly)}',
                  primary: true,
                ),
              );
            }
          }
        }
      }
    }

    return _ParsedScheduleMessage(text: text, actions: actions);
  }

  final resultSummary = parseScheduleResultSummaryToken(trimmed);
  if (resultSummary != null &&
      (trimmed.startsWith('SCHEDULE_RESULT_SUMMARY:') ||
          trimmed.startsWith('region=') ||
          trimmed.startsWith('SCHEDULE_STATION_BUNDLE:') ||
          (trimmed.startsWith('SCHEDULE_RESULT:') &&
              trimmed.contains('goal=RESULT')) ||
          (trimmed.contains('goal=RESULT') &&
              (resultSummary.drawDate != null ||
                  resultSummary.region != null)))) {
    final dateLabel = resultSummary.drawDate != null &&
            RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(resultSummary.drawDate!)
        ? resultSummary.drawDate!.split('-').reversed.join('/')
        : resultSummary.drawDate;
    final stationLabel = resultSummary.stationName;

    final String displayText;
    if (trimmed.startsWith('SCHEDULE_STATION_BUNDLE:') &&
        stationLabel != null) {
      displayText =
          'Dạ, dưới đây là lịch quay và kết quả gần nhất của đài $stationLabel${dateLabel != null ? ' (ngày $dateLabel)' : ''} ạ:';
    } else {
      displayText = 'Kết quả xổ số theo yêu cầu của bạn:';
    }

    return _ParsedScheduleMessage(
      text: displayText,
      variant: ChatMessageVariant.scheduleResultSummary,
      scheduleResultSummary: resultSummary,
      actions: const [],
    );
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

    final isResult = trimmed.startsWith('SCHEDULE_RESULT_SUMMARY:') ||
        trimmed.startsWith('SCHEDULE_RESULT:') ||
        trimmed.contains('goal=RESULT');

    final actions = isResult
        ? const <ChatMessageAction>[]
        : const [
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

int compareChatMessages(UiChatMessage a, UiChatMessage b) {
  if (identical(a, b) || a.id == b.id) return 0;
  if (a.id == 'welcome') return -1;
  if (b.id == 'welcome') return 1;
  if (a.variant == ChatMessageVariant.typing) return 1;
  if (b.variant == ChatMessageVariant.typing) return -1;

  final aTime = a.createdAt;
  final bTime = b.createdAt;
  if (aTime != null && bTime != null) {
    final diff = aTime.compareTo(bTime);
    if (diff != 0) return diff;
  } else if (aTime != null) {
    return -1;
  } else if (bTime != null) {
    return 1;
  }

  final aId = a.rawId ?? int.tryParse(a.id);
  final bId = b.rawId ?? int.tryParse(b.id);
  if (aId != null && bId != null) {
    final diff = aId.compareTo(bId);
    if (diff != 0) return diff;
  }

  // If one is user message and one is bot reply at same time:
  // User question always precedes bot answer!
  if (a.isUser && !b.isUser) return -1;
  if (!a.isUser && b.isUser) return 1;

  return 0;
}

bool isCountableBotReply(UiChatMessage message) =>
    !message.isUser &&
    !message.fromStaff &&
    message.variant != ChatMessageVariant.divider &&
    message.variant != ChatMessageVariant.typing &&
    message.id != 'welcome';

int countBotReplies(List<UiChatMessage> messages) =>
    messages.where(isCountableBotReply).length;

bool customerMessagesMatch(UiChatMessage timeline, UiChatMessage optimistic) {
  if (!timeline.isUser || !optimistic.isUser) return false;
  if (timeline.id == optimistic.id) return true;

  final timelineKey = timeline.sentContent ?? timeline.text;
  final optimisticKey = optimistic.sentContent ?? optimistic.text;
  if (timelineKey.trim() == optimisticKey.trim()) return true;

  if (timeline.text.trim() == optimistic.text.trim()) {
    if (optimistic.sentContent != null) {
      return timeline.sentContent?.trim() == optimistic.sentContent?.trim();
    }
    return timeline.sentContent == null;
  }

  final timelineMapped = mapCustomerDisplayText(timeline.text);
  final optimisticMapped = mapCustomerDisplayText(optimistic.text);
  if (timelineMapped == optimisticMapped) return true;

  if (optimistic.sentContent != null) {
    final sent = optimistic.sentContent!.trim();
    return timeline.sentContent?.trim() == sent ||
        timeline.text.trim() == sent ||
        timelineMapped == sent;
  }
  return false;
}

List<UiChatMessage> pruneOverlayMessages(
  List<UiChatMessage> overlay,
  List<UiChatMessage> timeline,
) {
  final timelineUsers = timeline.where((m) => m.isUser).toList();
  final claimed = <String>{};

  return overlay.where((extra) {
    if (extra.id.startsWith('optimistic-user-')) {
      final match = timelineUsers.where((timelineMessage) {
        if (claimed.contains(timelineMessage.id)) return false;
        return customerMessagesMatch(timelineMessage, extra);
      }).firstOrNull;
      if (match != null) {
        claimed.add(match.id);
        return false;
      }
      return true;
    }
    if (extra.variant == ChatMessageVariant.typing) return true;
    if (extra.id.startsWith('local-')) {
      return !timeline.any((m) => m.id == extra.id);
    }
    return true;
  }).toList();
}

List<UiChatMessage> mergeTimelineWithOverlay({
  required List<UiChatMessage> timeline,
  required List<UiChatMessage> overlay,
  int botReplyCountAtSend = 0,
  bool awaitingBotReply = false,
  bool holdTypingReveal = false,
}) {
  final base = [...timeline]..sort(compareChatMessages);
  var prunedOverlay = pruneOverlayMessages(overlay, base);

  if (!awaitingBotReply && !holdTypingReveal) {
    prunedOverlay = prunedOverlay
        .where((m) => m.variant != ChatMessageVariant.typing)
        .toList();
  }

  final optimisticUsers = prunedOverlay
      .where((m) => m.id.startsWith('optimistic-user-'))
      .toList();
  final typing = prunedOverlay
      .where((m) => m.variant == ChatMessageVariant.typing)
      .toList();
  final restOverlay = prunedOverlay
      .where((m) =>
          !m.id.startsWith('optimistic-user-') &&
          m.variant != ChatMessageVariant.typing)
      .toList();

  final hideBotRepliesAfterSend =
      holdTypingReveal || typing.isNotEmpty || awaitingBotReply;

  final pendingOptimistic =
      optimisticUsers.isNotEmpty ? optimisticUsers.last : null;
  final settledOptimistics = pendingOptimistic != null
      ? optimisticUsers.where((m) => m.id != pendingOptimistic.id).toList()
      : optimisticUsers;

  if (!hideBotRepliesAfterSend && pendingOptimistic == null) {
    return [...base, ...settledOptimistics, ...restOverlay];
  }

  var seenBotReplies = 0;
  final beforeSend = <UiChatMessage>[];
  final botRepliesAfterSend = <UiChatMessage>[];

  for (final message in base) {
    if (pendingOptimistic != null &&
        customerMessagesMatch(message, pendingOptimistic)) {
      continue;
    }
    if (isCountableBotReply(message)) {
      seenBotReplies++;
      if (seenBotReplies > botReplyCountAtSend) {
        botRepliesAfterSend.add(message);
        continue;
      }
    }
    beforeSend.add(message);
  }

  if (hideBotRepliesAfterSend && pendingOptimistic == null) {
    var lastUserIndex = -1;
    for (var i = base.length - 1; i >= 0; i--) {
      if (base[i].isUser) {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex >= 0) {
      beforeSend.clear();
      botRepliesAfterSend.clear();
      for (var i = 0; i < base.length; i++) {
        final message = base[i];
        if (i <= lastUserIndex) {
          beforeSend.add(message);
        } else if (isCountableBotReply(message)) {
          botRepliesAfterSend.add(message);
        } else {
          beforeSend.add(message);
        }
      }
    }
  }

  return [
    ...beforeSend,
    ...settledOptimistics,
    ?pendingOptimistic,
    ...typing,
    if (!hideBotRepliesAfterSend) ...botRepliesAfterSend,
    ...restOverlay,
  ];
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull {
    final iterator = this.iterator;
    if (!iterator.moveNext()) return null;
    return iterator.current;
  }
}
