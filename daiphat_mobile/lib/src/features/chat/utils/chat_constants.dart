import '../data/models/chat_models.dart';

class ChatWsConstants {
  const ChatWsConstants._();

  static const sendDestination = '/app/chat/send';
  static const inboxQueue = '/user/queue/chat/inbox';
  static const reconnectDelayMs = 5000;
  static const heartbeatMs = 10000;
  static const typingTimeoutMs = 6000;

  static String conversationTopic(int conversationId) =>
      '/topic/chat/conversations/$conversationId';

  static String wsUrl(String baseUrl, String token) {
    final normalized = baseUrl.endsWith('/')
        ? baseUrl.substring(0, baseUrl.length - 1)
        : baseUrl;
    return '$normalized/api/v1/ws?token=$token';
  }
}

const chatLastConversationKey = 'chat:lastConversationId';

const welcomeMessageText =
    'Xin chào! 👋\nBạn cần Đại Phát hỗ trợ điều gì? Hãy để lại lời nhắn, đội ngũ sẽ phản hồi sớm nhất.';

const suggestTicketsMessage = 'gợi ý vé số cho tôi';
const searchSuffixMessage = 'tìm vé đuôi số';
const scheduleRestartToken = 'SCHEDULE_RESTART';
const scheduleShowPrefix = 'SCHEDULE_SHOW:';
const scheduleSetGoalPrefix = 'SCHEDULE_SET_GOAL:';
const ticketSuggestPrefix = 'TICKET_SUGGEST:';

const staffRequestPhrases = [
  'gặp nhân viên',
  'nói chuyện với nhân viên',
  'Tôi muốn gặp nhân viên hỗ trợ.',
];

const backendHandoffReasons = {
  'CUSTOMER_REQUEST',
  'AI_DISABLED',
  'AI_SERVICE_UNAVAILABLE',
  'BOT_LOW_CONFIDENCE',
};

bool isStaffRequestText(String text) {
  final normalized = text.trim().toLowerCase();
  return staffRequestPhrases.any(
    (phrase) => normalized.contains(phrase.toLowerCase()),
  );
}

bool isOpenBotThread(ConversationStatus? status) =>
    status == null || status == ConversationStatus.open;

bool isStaffThread(ConversationStatus? status) =>
    status == ConversationStatus.active ||
    status == ConversationStatus.waitingForCustomer ||
    status == ConversationStatus.waitingForOperator;
