import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Minus, Maximize2, Send, Headphones, PhoneOff, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AppToast } from '../../../utils/toast.util';
import { useAuth } from '../../hooks/useAuth';
import { useChatConversation } from '../../hooks/useChatConversation';
import { useChatAiStatus } from '../../hooks/useChatAiStatus';
import { getCustomerChatTimelineKey, CLIENT_TIMELINE_USER_KEY, useMyChatTimeline } from '../../../hooks/useCustomerChatTimeline';
import {
  countUnreadInboundMessages,
  flattenTimelineItems,
  formatSessionStartedLabel,
  getUnreadConversationIds,
  markCustomerTimelineAsRead,
  mergeCustomerTimelineMessage,
  buildTimelineInfiniteDataFromMessages,
} from '../../../utils/chatTimeline.util';
import {
  ChatMessageResponse,
  ConversationDetailResponse,
  ConversationStatus,
  CustomerChatTimelineResponse,
  ChatConversationSocketEvent,
  BACKEND_HANDOFF_ESCALATION_REASONS,
  MessageSenderRole,
} from '../../../types/chat.type';
import { ChatSocketMessageEvent } from '../../../types/websocket.type';
import { ChatLotterySchedule } from './ChatLotterySchedule';
import { ChatLotteryResultSummary } from './ChatLotteryResultSummary';
import { ChatScheduleDatePick } from './ChatScheduleDatePick';
import { ChatTicketSuggestCards } from './ChatTicketSuggestCards';
import {
  parseConfirmStationToken,
  parsePickStationListMeta,
  parsePickStationListRegion,
  parsePickStationListToken,
  parseScheduleResultSummaryToken,
  parseScheduleResultToken,
  parseScheduleStationBundleToken,
  parseStationReadyToken,
  buildBuyTicketPath,
  buildLotteryResultsPath,
  buildPickStationPageMessage,
  buildSelectStationMessage,
  buildSetGoalMessage,
  isSelectStationMessage,
  resolveSelectStationDisplayLabel,
  SCHEDULE_TOKEN_ASK_DATE,
  SCHEDULE_TOKEN_ASK_DATE_MODE,
  SCHEDULE_TOKEN_ASK_GOAL,
  SCHEDULE_TOKEN_ASK_LOCATION,
  SCHEDULE_TOKEN_ASK_STATION_PREFIX,
  SCHEDULE_TOKEN_CONFIRM_STATION_PREFIX,
  SCHEDULE_TOKEN_PICK_STATION_LIST_PREFIX,
  SCHEDULE_TOKEN_REGION_CHOICE_PREFIX,
  SCHEDULE_TOKEN_SET_GOAL_PREFIX,
  SCHEDULE_TOKEN_SHOW_PREFIX,
  SCHEDULE_TOKEN_RESTART,
  type ConfirmStationOption,
} from '../../utils/scheduleToken.util';
import {
  type QuickReplyChip,
  resolveContextualQuickReplies,
  ticketSuggestFollowUpChips,
  collectSuggestedTicketIds,
  SUGGEST_TICKETS_MESSAGE,
  SEARCH_SUFFIX_MESSAGE,
  isSuggestTicketsMessage,
  shouldShowContextualQuickReplies,
} from '../../utils/chatQuickReplies.util';
import {
  parseTicketSuggestToken,
  stripTicketSuggestToken,
  splitTicketSuggestText,
  type ChatSuggestedTicket,
} from '../../utils/ticketSuggestToken.util';
import {
  claimPendingCustomerSends,
  countBotReplies,
  mergeTimelineWithOverlay,
  pruneOverlayMessages,
} from '../../utils/chatTimelineMerge.util';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  intent?: string | null;
  fromStaff?: boolean;
  variant?: 'bubble' | 'divider' | 'date' | 'schedule' | 'schedule-options' | 'schedule-ask-location' | 'schedule-ask-station' | 'schedule-pick-station-list' | 'schedule-ask-date' | 'schedule-ask-date-mode' | 'schedule-confirm-station' | 'schedule-station-ready' | 'schedule-ask-goal' | 'schedule-region-choice' | 'schedule-result' | 'schedule-result-summary' | 'schedule-station-bundle' | 'ticket-suggest' | 'typing';
  scheduleRegion?: string;
  scheduleStationId?: number;
  scheduleStationIds?: number[];
  scheduleHighlightDate?: string;
  scheduleStationName?: string;
  scheduleGoal?: 'SCHEDULE' | 'RESULT' | 'TICKET';
  pickStationListPage?: number;
  pickStationListHasNext?: boolean;
  confirmStationOptions?: ConfirmStationOption[];
  suggestedTickets?: ChatSuggestedTicket[];
  ticketSuggestEmptyMatch?: boolean;
  /** Nội dung thật gửi lên server (khi bubble hiển thị label khác token). */
  sentContent?: string;
}

const SESSION_DIVIDER_PATTERNS = [
  'phiên hỗ trợ mới bắt đầu',
  'phiên hỗ trợ đã kết thúc',
  'phiên hỗ trợ với',
  'đã kết thúc. lần sau bạn có thể',
];

const isSessionDividerText = (text: string): boolean => {
  const normalized = text.toLowerCase();
  return SESSION_DIVIDER_PATTERNS.some((pattern) => normalized.includes(pattern));
};

const STAFF_REQUEST_MESSAGE = 'Tôi muốn gặp nhân viên hỗ trợ.';
const CHAT_SCROLL_BOTTOM_THRESHOLD_PX = 80;
/** Minimum time to show bot typing dots before revealing the reply. */
const MIN_BOT_TYPING_MS = 1500;

const getDistanceFromBottom = (container: HTMLElement): number =>
  container.scrollHeight - container.scrollTop - container.clientHeight;

const isNearBottom = (container: HTMLElement): boolean =>
  getDistanceFromBottom(container) < CHAT_SCROLL_BOTTOM_THRESHOLD_PX;

const AI_DISABLED_FALLBACK_NOTICE =
  'Trợ lý AI hiện chưa được kích hoạt. Tin nhắn của bạn đã được ghi nhận.';

/** Case 1: khách tự gõ muốn gặp NV — gửi bubble + escalate. */
const isExplicitStaffRequestText = (text: string): boolean => {
  const normalized = text.toLowerCase().trim();
  return (
    text.trim() === STAFF_REQUEST_MESSAGE ||
    normalized.includes('gặp nhân viên') ||
    normalized.includes('nói chuyện với nhân viên') ||
    normalized.includes('trò chuyện với nhân viên')
  );
};

/** Strict Case A copy — only this phrase counts as AI-disabled notice. */
const isStrictAiDisabledNoticeText = (text: string): boolean =>
  text.toLowerCase().includes('trợ lý ai hiện chưa được kích hoạt');

const isAiDisabledNoticeText = (text: string): boolean => {
  const normalized = text.toLowerCase();
  return (
    isStrictAiDisabledNoticeText(text) ||
    normalized.includes('hệ thống đã ghi nhận tin nhắn')
  );
};

/** Case B: AI on but stuck / handoff — must NOT match AI-disabled notice. */
const isAiHandoffErrorText = (text: string): boolean => {
  if (isStrictAiDisabledNoticeText(text)) {
    return false;
  }
  const normalized = text.toLowerCase();
  return (
    normalized.includes('ai tạm thời không khả dụng') ||
    normalized.includes('chưa thể xử lý') ||
    normalized.includes('đang chuyển tiếp cho nhân viên') ||
    normalized.includes('đang chuyển cho nhân viên') ||
    normalized.includes('đang kết nối bạn với nhân viên') ||
    normalized.includes('chưa có nhân viên trực tuyến') ||
    normalized.includes('hiện chưa có nhân viên')
  );
};

const hasAiDisabledNoticeInTimeline = (messages: Message[]): boolean =>
  messages.some((message) => isStrictAiDisabledNoticeText(message.text));

const hasAiAssistanceActivity = (messages: Message[]): boolean =>
  messages.some((message) => {
    if (message.sender !== 'bot' || message.id === 'welcome') {
      return false;
    }
    if (isStrictAiDisabledNoticeText(message.text) || isSessionDividerText(message.text)) {
      return false;
    }
    return message.variant !== 'divider' && message.variant !== 'date';
  });

const isStaffConnectingNoticeText = (text: string): boolean =>
  text.toLowerCase().includes('đang kết nối bạn với nhân viên hỗ trợ');

const isSystemNoticeText = (text: string): boolean => {
  const normalized = text.toLowerCase();
  return (
    isSessionDividerText(text) ||
    isAiDisabledNoticeText(text) ||
    isAiHandoffErrorText(text) ||
    normalized.includes('đã tiếp nhận') ||
    normalized.includes('đang chờ nhân viên tiếp nhận') ||
    normalized.includes('yêu cầu của bạn đang chờ') ||
    normalized.includes('huỷ yêu cầu gặp nhân viên') ||
    normalized.includes('ngắt kết nối với nhân viên')
  );
};

/** Client copy — bỏ phần "lần sau nhân viên khác", không hiện gap thời gian. */
const getClientSystemNoticeText = (content: string): string => {
  const text = content?.trim() || '';
  if (!text) {
    return text;
  }
  if (text.toLowerCase().includes('lần sau bạn có thể được hỗ trợ')) {
    return text.replace(/\s*Lần sau bạn có thể được hỗ trợ bởi nhân viên khác\./i, '').trim();
  }
  return text;
};

const compactHandoffBotMessages = (messages: Message[]): Message[] => {
  const compacted: Message[] = [];

  for (const message of messages) {
    if (message.variant === 'divider' || message.variant === 'date') {
      compacted.push(message);
      continue;
    }

    const previous = compacted[compacted.length - 1];
    if (
      message.sender === 'bot' &&
      isAiHandoffErrorText(message.text) &&
      previous?.sender === 'bot' &&
      previous.variant !== 'divider' &&
      isAiHandoffErrorText(previous.text)
    ) {
      compacted[compacted.length - 1] = {
        ...previous,
        text: `${previous.text}\n${message.text}`,
      };
      continue;
    }

    compacted.push(message);
  }

  return compacted;
};

const isOpenBotThread = (status: ConversationStatus | null): boolean =>
  status === 'OPEN' || status === null;

const prepareDisplayMessages = (messages: Message[], isAiEnabled: boolean): Message[] =>
  compactHandoffBotMessages(
    messages.filter((message) => {
      // Never drop real staff replies — only suppress auto handoff copy when AI is off.
      if (message.fromStaff || message.sender === 'user') {
        return true;
      }
      if (!message.text?.trim() && message.variant === 'bubble') {
        return false;
      }
      if (!isAiEnabled && isStaffConnectingNoticeText(message.text)) {
        return false;
      }
      if (!isAiEnabled && isAiHandoffErrorText(message.text)) {
        return false;
      }
      return true;
    })
  );

const SCHEDULE_OPTIONS_CONTENT = 'SCHEDULE_OPTIONS';
const SCHEDULE_REGION_CODES = new Set(['MIEN_NAM', 'MIEN_TRUNG', 'MIEN_BAC']);

const REGION_DISPLAY_LABELS: Record<string, string> = {
  MIEN_NAM: 'Miền Nam',
  MIEN_TRUNG: 'Miền Trung',
  MIEN_BAC: 'Miền Bắc',
};

const resolveMessageVariant = (
  message: ChatMessageResponse
): Pick<
  Message,
  | 'variant'
  | 'text'
  | 'scheduleRegion'
  | 'scheduleStationId'
  | 'scheduleStationIds'
  | 'scheduleHighlightDate'
  | 'scheduleStationName'
  | 'scheduleGoal'
  | 'pickStationListPage'
  | 'pickStationListHasNext'
  | 'confirmStationOptions'
  | 'suggestedTickets'
  | 'ticketSuggestEmptyMatch'
> => {
  const text = message.content?.trim() || '';

  if (message.intent === 'WEB_SCHEDULE') {
    if (text.includes('Mình chưa nhận ra khu vực này') || text.includes('Mình chưa tìm thấy đài này')) {
      return { variant: 'bubble', text };
    }
    if (text.includes('Mình chưa nhận ra ngày/thứ này')) {
      return { variant: 'schedule-ask-date-mode', text };
    }
    if (text === SCHEDULE_OPTIONS_CONTENT
        || text === SCHEDULE_TOKEN_ASK_LOCATION
        || text.startsWith(SCHEDULE_TOKEN_REGION_CHOICE_PREFIX)) {
      // Legacy location-choice menu removed — ignore token bubbles from old turns.
      return { variant: 'bubble', text: '' };
    }
    if (text === SCHEDULE_TOKEN_ASK_DATE_MODE || text.startsWith(`${SCHEDULE_TOKEN_ASK_DATE_MODE}:`)) {
      const isResultGoal = text.includes('goal=RESULT');
      return {
        variant: 'schedule-ask-date-mode',
        text: isResultGoal
          ? 'Bạn muốn xem kết quả ngày nào?'
          : 'Bạn muốn xem lịch ngày nào?',
        scheduleGoal: isResultGoal ? 'RESULT' : 'SCHEDULE',
      };
    }
    if (text === SCHEDULE_TOKEN_ASK_DATE) {
      return { variant: 'schedule-ask-date', text: 'Bạn muốn xem lịch ngày/thứ nào? (vd: hôm nay, thứ 7)' };
    }
    if (text.startsWith(SCHEDULE_TOKEN_CONFIRM_STATION_PREFIX)) {
      const options = parseConfirmStationToken(text) ?? [];
      return {
        variant: 'schedule-confirm-station',
        text: 'Mình tìm thấy vài đài gần giống. Bạn chọn đài nào ạ?',
        confirmStationOptions: options,
      };
    }
    if (text === SCHEDULE_TOKEN_ASK_GOAL) {
      return {
        variant: 'schedule-ask-goal',
        text: 'Bạn muốn tra cứu lịch quay, kết quả xổ số hay xem vé ạ?',
      };
    }
    const stationReady = parseStationReadyToken(text);
    if (stationReady) {
      return {
        variant: 'schedule-station-ready',
        text: stationReady.stationName
          ? `Bạn đã chọn đài ${stationReady.stationName}. Bấm nút bên dưới để xem lịch, kết quả hoặc vé nhé.`
          : 'Bạn đã chọn đài. Bấm nút bên dưới để xem lịch, kết quả hoặc vé nhé.',
        scheduleRegion: stationReady.region,
        scheduleStationId: stationReady.stationId,
        scheduleStationName: stationReady.stationName,
      };
    }
        if (text.startsWith(SCHEDULE_TOKEN_PICK_STATION_LIST_PREFIX)) {
      const options = parsePickStationListToken(text) ?? [];
      const meta = parsePickStationListMeta(text);
      const region = parsePickStationListRegion(text);
      const isResultGoal = text.includes('goal=RESULT');
      const datePart = text
        .slice(SCHEDULE_TOKEN_PICK_STATION_LIST_PREFIX.length)
        .split(':')
        .find((part) => part.startsWith('date='));
      const drawDate = datePart?.slice('date='.length);
      const dateLabel = drawDate && /^\d{4}-\d{2}-\d{2}$/.test(drawDate)
        ? drawDate.split('-').reverse().join('/')
        : drawDate;
      return {
        variant: 'schedule-pick-station-list',
        text: isResultGoal && dateLabel
          ? `Chọn đài muốn xem kết quả ngày ${dateLabel}:`
          : 'Chọn đài bạn muốn xem:',
        confirmStationOptions: options,
        scheduleRegion: region,
        scheduleHighlightDate: drawDate,
        scheduleGoal: isResultGoal ? 'RESULT' : undefined,
        pickStationListPage: meta?.page ?? 0,
        pickStationListHasNext: meta?.hasNext,
      };
    }
    if (text.startsWith(SCHEDULE_TOKEN_ASK_STATION_PREFIX)) {
      const region = text.slice(SCHEDULE_TOKEN_ASK_STATION_PREFIX.length) || 'MIEN_NAM';
      const regionLabel = REGION_DISPLAY_LABELS[region] ?? 'Miền Nam';
      return {
        variant: 'schedule-ask-station',
        text: `Bạn muốn xem đài nào ở ${regionLabel} ạ? (vd: Bến Tre, TP.HCM)`,
        scheduleRegion: region,
      };
    }
    const scheduleResultSummary = parseScheduleResultSummaryToken(text);
    if (scheduleResultSummary) {
      return {
        variant: 'schedule-result-summary',
        text: 'Kết quả xổ số theo yêu cầu của bạn:',
        scheduleRegion: scheduleResultSummary.region,
        scheduleStationId: scheduleResultSummary.stationId,
        scheduleStationIds: scheduleResultSummary.stationIds,
        scheduleHighlightDate: scheduleResultSummary.highlightDate,
        scheduleStationName: scheduleResultSummary.stationName,
      };
    }
    const scheduleStationBundle = parseScheduleStationBundleToken(text);
    if (scheduleStationBundle) {
      const dateLabel = scheduleStationBundle.highlightDate && /^\d{4}-\d{2}-\d{2}$/.test(scheduleStationBundle.highlightDate)
        ? scheduleStationBundle.highlightDate.split('-').reverse().join('/')
        : scheduleStationBundle.highlightDate;
      const stationLabel = scheduleStationBundle.stationName ?? 'bạn chọn';
      return {
        variant: 'schedule-station-bundle',
        text: `Dạ, dưới đây là lịch quay và kết quả gần nhất của đài ${stationLabel}${dateLabel ? ` (ngày ${dateLabel})` : ''} ạ:`,
        scheduleRegion: scheduleStationBundle.region,
        scheduleStationId: scheduleStationBundle.stationId,
        scheduleHighlightDate: scheduleStationBundle.highlightDate,
        scheduleStationName: scheduleStationBundle.stationName,
      };
    }
    const scheduleResult = parseScheduleResultToken(text);
    if (scheduleResult) {
      return {
        variant: 'schedule-result',
        text: 'Lịch mở thưởng theo yêu cầu của bạn:',
        scheduleRegion: scheduleResult.nationAll ? undefined : scheduleResult.region,
        scheduleStationId: scheduleResult.stationId,
        scheduleStationIds: scheduleResult.stationIds,
        scheduleHighlightDate: scheduleResult.highlightDate,
      };
    }
    if (SCHEDULE_REGION_CODES.has(text)) {
      return { variant: 'schedule', text, scheduleRegion: text };
    }
  }

  const ticketSuggest = parseTicketSuggestToken(text);
  if (ticketSuggest) {
    if (ticketSuggest.tickets.length > 0) {
      return {
        variant: 'ticket-suggest',
        text: ticketSuggest.text,
        suggestedTickets: ticketSuggest.tickets,
        ticketSuggestEmptyMatch: ticketSuggest.isEmptyMatch,
      };
    }
    return { variant: 'bubble', text: ticketSuggest.text };
  }

  if (text.includes('TICKET_SUGGEST:')) {
    return { variant: 'bubble', text: stripTicketSuggestToken(text) };
  }

  // AI_SYSTEM replies are normal bot bubbles; only SYSTEM / notice texts are dividers.
  if (message.type === 'SYSTEM' || isSystemNoticeText(text)) {
    return { variant: 'divider', text };
  }
  return { variant: 'bubble', text: text || '[Tin nhắn trống]' };
};

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  sender: 'bot',
  text: 'Xin chào! 👋\nBạn cần Đại Phát hỗ trợ điều gì? Hãy để lại lời nhắn, đội ngũ sẽ phản hồi sớm nhất.',
  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
};

const formatTime = (value?: string | null) => {
  if (!value) {
    return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const toUiMessage = (message: ChatMessageResponse): Message => {
  const resolved = resolveMessageVariant(message);
  const rawContent = message.content?.trim() ?? '';
  let displayText = resolved.text;
  if (message.senderType === 'CUSTOMER') {
    if (rawContent === SCHEDULE_TOKEN_RESTART) {
      // Legacy bubble — restart chip removed; show schedule label instead of raw token.
      displayText = 'Xem lịch xổ';
    } else if (isSelectStationMessage(rawContent)) {
      displayText = resolveSelectStationDisplayLabel(rawContent, resolved.confirmStationOptions)
        ?? resolved.text;
    } else if (rawContent.startsWith(SCHEDULE_TOKEN_SET_GOAL_PREFIX)) {
      const goal = rawContent.slice(SCHEDULE_TOKEN_SET_GOAL_PREFIX.length).trim();
      displayText =
        goal === 'SCHEDULE' ? 'Xem lịch xổ'
        : goal === 'RESULT' ? 'Kết quả'
        : goal === 'TICKET' ? 'Gợi ý vé'
        : resolved.text;
    } else if (rawContent.startsWith(SCHEDULE_TOKEN_SHOW_PREFIX)) {
      const payload = rawContent.slice(SCHEDULE_TOKEN_SHOW_PREFIX.length);
      const parts = payload.split(':');
      const goal = parts.find((part) => part.startsWith('goal='))?.slice('goal='.length);
      if (goal === 'SCHEDULE') {
        displayText = 'Xem lịch xổ';
      } else if (goal === 'RESULT') {
        displayText = 'Kết quả';
      } else if (goal === 'TICKET') {
        displayText = 'Gợi ý vé';
      }
    } else if (isSuggestTicketsMessage(rawContent)) {
      displayText = rawContent.includes('|exclude=') ? 'Gợi ý số khác' : 'Gợi ý vé';
    } else if (rawContent === SEARCH_SUFFIX_MESSAGE) {
      displayText = 'Tìm đuôi số';
    }
  }

  return {
    id: String(message.id),
    sender: message.senderType === 'CUSTOMER' ? 'user' : 'bot',
    text: displayText,
    timestamp: formatTime(message.createdAt),
    intent: message.intent,
    fromStaff: message.senderType === 'OPERATOR',
    variant: resolved.variant,
    sentContent:
      message.senderType === 'CUSTOMER' && displayText !== rawContent && rawContent
        ? rawContent
        : undefined,
    scheduleRegion: resolved.scheduleRegion,
    scheduleStationId: resolved.scheduleStationId,
    scheduleStationIds: resolved.scheduleStationIds,
    scheduleHighlightDate: resolved.scheduleHighlightDate,
    scheduleStationName: resolved.scheduleStationName,
    scheduleGoal: resolved.scheduleGoal,
    pickStationListPage: resolved.pickStationListPage,
    pickStationListHasNext: resolved.pickStationListHasNext,
    confirmStationOptions: resolved.confirmStationOptions,
    suggestedTickets: resolved.suggestedTickets,
    ticketSuggestEmptyMatch: resolved.ticketSuggestEmptyMatch,
  };
};

const hasBackendHandoffMessage = (detail: ConversationDetailResponse): boolean =>
  detail.messages.some(
    (message) => message.senderType === 'AI_SYSTEM' || message.type === 'SYSTEM'
  );

const CHAT_LAST_CONVERSATION_KEY = 'chat:lastConversationId';
const clientTimelineKey = () => getCustomerChatTimelineKey('client', CLIENT_TIMELINE_USER_KEY);

const buildStatusMessage = (
  status: ConversationStatus,
  hasOperator: boolean,
  operatorName?: string | null
): string | null => {
  if (status === 'WAITING_FOR_OPERATOR') {
    return 'Đang chờ nhân viên tiếp nhận. Vui lòng đợi trong giây lát.';
  }
  if (status === 'ACTIVE' && hasOperator) {
    if (operatorName) {
      return `${operatorName} đã tiếp nhận và sẽ hỗ trợ bạn ngay.`;
    }
    return 'Nhân viên đã tiếp nhận và sẽ hỗ trợ bạn ngay.';
  }
  return null;
};

const buildMessagesFromTimeline = (pages: CustomerChatTimelineResponse[]): Message[] => {
  const items = flattenTimelineItems(pages);
  const result: Message[] = [];
  const insertedSessionDates = new Set<number>();

  for (const item of items) {
    const conversationId = item.sessionBoundary?.conversationId;
    const sessionLabel = formatSessionStartedLabel(item.sessionBoundary?.sessionStartedAt);
    if (sessionLabel && conversationId != null && !insertedSessionDates.has(conversationId)) {
      insertedSessionDates.add(conversationId);
      result.push({
        id: `session-date-${conversationId}`,
        sender: 'bot',
        text: sessionLabel,
        timestamp: '',
        variant: 'date',
      });
    }

    if (item.message.type !== 'TEXT' && item.message.type !== 'SYSTEM') {
      continue;
    }

    const uiMessage = toUiMessage(item.message);
    if (uiMessage.variant === 'divider') {
      if (isSessionDividerText(uiMessage.text)) {
        continue;
      }
      uiMessage.text = getClientSystemNoticeText(uiMessage.text);
    }
    result.push(uiMessage);
  }

  return result;
};

/** Token nội bộ → nhãn hiển thị (tránh lộ token thô trên bubble). */
const resolveCustomerSendDisplayLabel = (raw: string): string | undefined => {
  const trimmed = raw.trim();
  if (trimmed === SCHEDULE_TOKEN_RESTART) {
    return 'Xem lịch xổ';
  }
  return undefined;
};

const formatNowTime = () =>
  new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export const ChatbotPopup = () => {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const {
    initConversation,
    loadOpenConversation,
    loadConversationDetail,
    escalateConversation,
    cancelStaffRequest,
    disconnectStaff,
    markConversationAsRead,
    sendRealtimeMessage,
    subscribeToCustomerInbox,
    subscribeToConversation,
    isInitializing,
    isLoadingOpen,
  } = useChatConversation();
  const timelineQuery = useMyChatTimeline(token);
  const aiStatusQuery = useChatAiStatus(Boolean(token && userId));
  const isAiEnabled = aiStatusQuery.data?.enabled !== false;
  const { fetchPreviousPage, refetch: refetchTimeline } = timelineQuery;
  const timelineRefreshingRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus | null>(null);
  const [isEscalating, setIsEscalating] = useState(false);
  const [isCancellingStaff, setIsCancellingStaff] = useState(false);
  const [isDisconnectingStaff, setIsDisconnectingStaff] = useState(false);
  const [overlayMessages, setOverlayMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSendingUi, setIsSendingUi] = useState(false);
  const [expandedDatePickerMessageId, setExpandedDatePickerMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesContentRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const pendingScrollRestore = useRef(0);
  const shouldStickToBottom = useRef(true);
  const wasAtBottomRef = useRef(true);
  const wasOpenRef = useRef(false);
  const wasAuthReadyRef = useRef(false);
  const wasMinimizedRef = useRef(false);
  const timelinePrefetchLockRef = useRef(false);
  const lastMessageIdRef = useRef<string | null>(null);
  const lastReadAckKeyRef = useRef<string | null>(null);
  const initialTimelineScrollDoneRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const awaitingBotReplyRef = useRef(false);
  const botReplyCountAtSendRef = useRef(0);
  const botReplyReadyRef = useRef(false);
  const typingHoldActiveRef = useRef(false);
  const typingMinElapsedRef = useRef(false);
  const typingRevealTimeoutRef = useRef<number | null>(null);
  const [typingHoldActive, setTypingHoldActive] = useState(false);
  /** State mirror of awaitingBotReplyRef so merge re-runs before overlay commits. */
  const [awaitingBotReply, setAwaitingBotReply] = useState(false);
  /** Blocks duplicate send while Vietnamese/CJK IME finishes composition after Enter. */
  const isSendingRef = useRef(false);
  const sendStartedAtRef = useRef(0);
  /** Discard IME leftover syllables that get re-inserted into a cleared input. */
  const suppressInputAfterSendRef = useRef(false);
  const sendLockTimeoutRef = useRef<number | null>(null);
  const botReplyTimeoutRef = useRef<number | null>(null);
  const releaseSendLockRef = useRef<(options?: { immediate?: boolean }) => void>(() => undefined);
  const handleIncomingMessageRef = useRef<(payload: ChatSocketMessageEvent) => void>(() => undefined);
  const handleConversationEventRef = useRef<(event: ChatConversationSocketEvent) => void>(() => undefined);
  const pendingCustomerSendsRef = useRef<Array<{ sendToken: string; label: string; raw: string }>>([]);

  const timelineMessages = useMemo(
    () => buildMessagesFromTimeline(timelineQuery.data?.pages ?? []),
    [timelineQuery.data?.pages]
  );
  const timelineMessagesRef = useRef(timelineMessages);
  timelineMessagesRef.current = timelineMessages;

  const messages = useMemo(() => {
    return mergeTimelineWithOverlay(timelineMessages, overlayMessages, {
      awaitingBotReply,
      botReplyCountAtSend: botReplyCountAtSendRef.current,
      holdTypingReveal: typingHoldActive,
      welcomeMessage: WELCOME_MESSAGE,
    });
  }, [timelineMessages, overlayMessages, typingHoldActive, awaitingBotReply]);

  const displayMessages = useMemo(
    () => prepareDisplayMessages(messages as any, isAiEnabled),
    [isAiEnabled, messages]
  );
  const suggestedTicketExcludeIds = useMemo(
    () => collectSuggestedTicketIds(displayMessages as any),
    [displayMessages]
  );
  const isAuthReady = Boolean(token && userId);

  useEffect(() => {
    return () => {
      if (sendLockTimeoutRef.current != null) {
        window.clearTimeout(sendLockTimeoutRef.current);
      }
      if (botReplyTimeoutRef.current != null) {
        window.clearTimeout(botReplyTimeoutRef.current);
      }
      if (typingRevealTimeoutRef.current != null) {
        window.clearTimeout(typingRevealTimeoutRef.current);
      }
    };
  }, []);

  const seedTimelineFromDetail = useCallback(
    (detail: ConversationDetailResponse) => {
      if (!detail.messages?.length) {
        return;
      }

      const sortedMessages = [...detail.messages].sort((left, right) => {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        if (leftTime !== rightTime) {
          return leftTime - rightTime;
        }
        return left.id - right.id;
      });

      queryClient.setQueryData<InfiniteData<CustomerChatTimelineResponse>>(
        clientTimelineKey(),
        (prev) => {
          if (!prev?.pages?.length) {
            return buildTimelineInfiniteDataFromMessages(sortedMessages);
          }

          return sortedMessages.reduce(
            (data, message) => mergeCustomerTimelineMessage(data, message),
            prev
          );
        }
      );
    },
    [queryClient]
  );

  const hasUnreadMessages = useMemo(() => {
    if (isOpen) {
      return false;
    }
    return countUnreadInboundMessages(timelineQuery.data?.pages ?? []) > 0;
  }, [isOpen, timelineQuery.data?.pages]);

  const handleOpenChat = useCallback(() => {
    setIsOpen(true);
  }, []);

  const hasCustomerMessages = useMemo(
    () => messages.some((message) => message.sender === 'user'),
    [messages]
  );

  const showAiDisabledNotice =
    aiStatusQuery.isSuccess &&
    !isAiEnabled &&
    hasCustomerMessages &&
    isOpenBotThread(conversationStatus) &&
    !hasAiDisabledNoticeInTimeline(displayMessages) &&
    !hasAiAssistanceActivity(displayMessages);

  const showWaitingForStaff =
    hasCustomerMessages && conversationStatus === 'WAITING_FOR_OPERATOR';

  const showChattingWithStaff =
    hasCustomerMessages &&
    (conversationStatus === 'ACTIVE' || conversationStatus === 'WAITING_FOR_CUSTOMER');

  /**
   * Ngữ cảnh cho quick replies = tin nhắn bot có nội dung gần nhất.
   * Bỏ qua divider hệ thống (kết nối/huỷ gặp nhân viên), typing indicator và tin của khách
   * để hàng chip không biến mất giữa các bước gửi tin / escalate.
   */
  const quickReplyContextMessage = useMemo(() => {
    for (let index = displayMessages.length - 1; index >= 0; index -= 1) {
      const message = displayMessages[index];
      if (
        message.variant === 'divider' ||
        message.variant === 'date' ||
        message.variant === 'typing' ||
        message.sender !== 'bot'
      ) {
        continue;
      }
      return message;
    }
    return null;
  }, [displayMessages]);

  const contextualReplies = useMemo(
    () =>
      resolveContextualQuickReplies(quickReplyContextMessage, {
        hasCustomerMessages,
        isAiEnabled,
      }),
    [hasCustomerMessages, isAiEnabled, quickReplyContextMessage]
  );

  const navigateToLotteryResults = useCallback(
    (options: Parameters<typeof buildLotteryResultsPath>[0]) => {
      const path = buildLotteryResultsPath(options);
      setIsMinimized(true);
      navigate(path);
      const scrollTop = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      };
      scrollTop();
      requestAnimationFrame(scrollTop);
      window.setTimeout(scrollTop, 50);
      window.setTimeout(scrollTop, 200);
      window.setTimeout(scrollTop, 500);
    },
    [navigate]
  );

  const appendSystemMessage = (id: string, text: string) => {
    setOverlayMessages((prev) => {
      if (prev.some((message) => message.id === id)) {
        return prev;
      }
      return [
        ...prev,
        {
          id,
          sender: 'bot' as const,
          text,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          variant: isSystemNoticeText(text) ? 'divider' : 'bubble',
        },
      ];
    });
  };

  const appendStatusFromDetail = (detail: ConversationDetailResponse) => {
    if (hasBackendHandoffMessage(detail)) {
      return;
    }

    const statusMessage = buildStatusMessage(
      detail.conversation.status,
      Boolean(detail.conversation.assignedOperatorId),
      detail.conversation.assignedOperatorName
    );

    if (statusMessage) {
      appendSystemMessage(
        `system-${detail.conversation.id}-${detail.conversation.status}`,
        statusMessage
      );
    }
  };

  const applyConversationState = (detail: ConversationDetailResponse) => {
    setConversationId(detail.conversation.id);
    setConversationStatus(detail.conversation.status);
    sessionStorage.setItem(CHAT_LAST_CONVERSATION_KEY, String(detail.conversation.id));
  };

  const refreshTimelineMessages = useCallback(async () => {
    if (!userId || timelineRefreshingRef.current || timelinePrefetchLockRef.current) {
      return;
    }

    timelineRefreshingRef.current = true;
    try {
      await refetchTimeline();
    } finally {
      timelineRefreshingRef.current = false;
    }
  }, [refetchTimeline, userId]);

  const applyConversationDetail = (detail: ConversationDetailResponse, options?: { refreshTimeline?: boolean }) => {
    applyConversationState(detail);
    appendStatusFromDetail(detail);
    seedTimelineFromDetail(detail);

    if (options?.refreshTimeline !== false) {
      void refreshTimelineMessages();
    }
  };

  const hydrateTimelineFromDetail = useCallback(() => {
    void refetchTimeline();
  }, [refetchTimeline]);

  const applyStaffRequestResult = (
    detail: ConversationDetailResponse,
    conversationKey: number,
    options?: { refreshTimeline?: boolean }
  ) => {
    applyConversationDetail(detail, options);

    if (hasBackendHandoffMessage(detail)) {
      return;
    }

    if (detail.conversation.status === 'WAITING_FOR_OPERATOR') {
      appendSystemMessage(
        `system-waiting-${conversationKey}`,
        'Đang chờ nhân viên tiếp nhận. Vui lòng đợi trong giây lát.'
      );
      return;
    }

    if (detail.conversation.status === 'ACTIVE') {
      appendSystemMessage(
        `system-active-${conversationKey}`,
        detail.conversation.assignedOperatorName
          ? `${detail.conversation.assignedOperatorName} đã tiếp nhận và sẽ hỗ trợ bạn ngay.`
          : 'Nhân viên đã tiếp nhận và sẽ hỗ trợ bạn ngay.'
      );
    }
  };

  /** Case 2: bấm link — chỉ escalate, không tự gửi bubble "Tôi muốn gặp nhân viên...". */
  const handleRequestStaff = async () => {
    if (isEscalating) {
      return;
    }

    if (!token) {
      AppToast.info('Vui lòng đăng nhập để gặp nhân viên hỗ trợ.');
      return;
    }

    if (conversationStatus === 'WAITING_FOR_OPERATOR') {
      appendSystemMessage(
        `system-waiting-${conversationId ?? 'pending'}`,
        'Yêu cầu của bạn đang chờ nhân viên tiếp nhận.'
      );
      return;
    }

    if (conversationStatus === 'ACTIVE') {
      appendSystemMessage(
        `system-active-${conversationId ?? 'pending'}`,
        'Nhân viên đã tiếp nhận và đang hỗ trợ bạn.'
      );
      return;
    }

    setIsEscalating(true);

    try {
      if (!conversationId || conversationStatus === 'CLOSED') {
        const created = await initConversation({
          title: 'Yêu cầu gặp nhân viên',
          requestStaff: true,
        });
        if (!created) {
          return;
        }
        hydrateTimelineFromDetail();
        applyStaffRequestResult(created, created.conversation.id, { refreshTimeline: false });
        return;
      }

      const detail = await escalateConversation(conversationId, 'CUSTOMER_REQUEST');
      if (!detail) {
        return;
      }

      hydrateTimelineFromDetail();
      applyStaffRequestResult(detail, conversationId, { refreshTimeline: false });
    } finally {
      setIsEscalating(false);
    }
  };

  const handleCancelStaffRequest = async () => {
    if (isCancellingStaff || isEscalating || !conversationId) {
      return;
    }

    if (conversationStatus !== 'WAITING_FOR_OPERATOR') {
      return;
    }

    setIsCancellingStaff(true);
    try {
      const detail = await cancelStaffRequest(conversationId);
      if (!detail) {
        return;
      }
      applyConversationDetail(detail);
    } finally {
      setIsCancellingStaff(false);
    }
  };

  const handleDisconnectStaff = async () => {
    if (isDisconnectingStaff || isEscalating || !conversationId || !showChattingWithStaff) {
      return;
    }

    setIsDisconnectingStaff(true);
    try {
      const detail = await disconnectStaff(conversationId);
      if (!detail) {
        return;
      }
      applyConversationDetail(detail);
    } finally {
      setIsDisconnectingStaff(false);
    }
  };

  const handleLoadOlderMessages = useCallback(() => {
    if (!timelineQuery.hasPreviousPage || timelineQuery.isFetchingPreviousPage || !messagesContainerRef.current) {
      return;
    }
    // Avoid prefetch while the panel is still settling on the latest message.
    if (!initialTimelineScrollDoneRef.current) {
      return;
    }
    pendingScrollRestore.current = messagesContainerRef.current.scrollHeight;
    shouldStickToBottom.current = false;
    wasAtBottomRef.current = false;
    void fetchPreviousPage();
  }, [fetchPreviousPage, timelineQuery.hasPreviousPage, timelineQuery.isFetchingPreviousPage]);

  const pinScrollToBottom = useCallback((force = false, behavior: ScrollBehavior = 'auto') => {
    const container = messagesContainerRef.current;
    if (!container || !isOpen || isMinimized) {
      return;
    }
    if (!force && !shouldStickToBottom.current && !wasAtBottomRef.current) {
      return;
    }

    if (scrollRafRef.current != null) {
      window.cancelAnimationFrame(scrollRafRef.current);
    }

    // Single frame pin — double-rAF stacked with ResizeObserver felt like scroll stutter.
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const top = container.scrollHeight;
      if (behavior === 'smooth' && typeof container.scrollTo === 'function') {
        container.scrollTo({ top, behavior: 'smooth' });
      } else {
        container.scrollTop = top;
      }
      shouldStickToBottom.current = true;
      wasAtBottomRef.current = true;
    });
  }, [isMinimized, isOpen]);

  const clearTypingHoldTimer = useCallback(() => {
    if (typingRevealTimeoutRef.current != null) {
      window.clearTimeout(typingRevealTimeoutRef.current);
      typingRevealTimeoutRef.current = null;
    }
  }, []);

  const endTypingHold = useCallback(() => {
    clearTypingHoldTimer();
    typingHoldActiveRef.current = false;
    typingMinElapsedRef.current = false;
    setTypingHoldActive(false);
  }, [clearTypingHoldTimer]);

  /**
   * Single-commit reveal: drop "..." and end hold together so bots appear
   * without an empty gap frame.
   */
  const revealBotReplyAfterTypingHold = useCallback(() => {
    clearTypingHoldTimer();
    shouldStickToBottom.current = true;
    wasAtBottomRef.current = true;
    // releaseSendLock clears typing overlay + hold + send lock in one batch.
    releaseSendLockRef.current();
    pinScrollToBottom(true, 'auto');
  }, [clearTypingHoldTimer, pinScrollToBottom]);

  const tryRevealBotReply = useCallback(() => {
    const botArrived =
      botReplyReadyRef.current ||
      countBotReplies(timelineMessagesRef.current) > botReplyCountAtSendRef.current;
    if (!typingHoldActiveRef.current) {
      return;
    }
    if (!typingMinElapsedRef.current) {
      return;
    }
    if (!botArrived && awaitingBotReplyRef.current) {
      return;
    }
    revealBotReplyAfterTypingHold();
  }, [revealBotReplyAfterTypingHold]);

  useEffect(() => {
    pendingCustomerSendsRef.current = claimPendingCustomerSends(
      pendingCustomerSendsRef.current,
      timelineMessages
    );
    setOverlayMessages((prev) => {
      const pruned = pruneOverlayMessages(prev, timelineMessages);
      if (!awaitingBotReplyRef.current && !typingHoldActiveRef.current) {
        return pruned.filter((message) => !message.id.startsWith('typing-'));
      }

      const botCount = countBotReplies(timelineMessages);
      if (botCount > botReplyCountAtSendRef.current) {
        botReplyReadyRef.current = true;
        // Bot landed — keep "..." until min delay elapses, then single-commit reveal.
        if (typingHoldActiveRef.current) {
          if (typingMinElapsedRef.current) {
            // Schedule reveal outside setState updater.
            window.setTimeout(() => tryRevealBotReply(), 0);
          }
          return pruned;
        }
        awaitingBotReplyRef.current = false;
        releaseSendLockRef.current();
        return pruned.filter((message) => !message.id.startsWith('typing-'));
      }
      return pruned;
    });
  }, [timelineMessages, tryRevealBotReply]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    const sentinel = topSentinelRef.current;
    if (!container || !sentinel || !isOpen || isMinimized) {
      return;
    }

    const handleScroll = () => {
      const atBottom = isNearBottom(container);
      shouldStickToBottom.current = atBottom;
      wasAtBottomRef.current = atBottom;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const containerEl = messagesContainerRef.current;
        if (
          !entries[0]?.isIntersecting ||
          !initialTimelineScrollDoneRef.current ||
          !timelineQuery.hasPreviousPage ||
          timelineQuery.isFetchingPreviousPage ||
          timelinePrefetchLockRef.current ||
          !containerEl
        ) {
          return;
        }
        // Short threads: top sentinel is always visible — do not treat that as "user scrolled up".
        if (containerEl.scrollHeight <= containerEl.clientHeight + 8) {
          return;
        }
        // Only prefetch when the user is actually near the top of a long thread.
        if (containerEl.scrollTop > 96) {
          return;
        }
        handleLoadOlderMessages();
      },
      { root: container, threshold: 0, rootMargin: '120px 0px 0px 0px' }
    );

    container.addEventListener('scroll', handleScroll, { passive: true });
    observer.observe(sentinel);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [
    handleLoadOlderMessages,
    isMinimized,
    isOpen,
    timelineQuery.hasPreviousPage,
    timelineQuery.isFetchingPreviousPage,
  ]);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !isOpen || isMinimized) {
      return;
    }

    if (pendingScrollRestore.current > 0 && !timelineQuery.isFetchingPreviousPage) {
      const diff = container.scrollHeight - pendingScrollRestore.current;
      container.scrollTop += diff;
      pendingScrollRestore.current = 0;
    }
  }, [isMinimized, isOpen, timelineQuery.data?.pages.length, timelineQuery.isFetchingPreviousPage]);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !isOpen || isMinimized) {
      return;
    }
    if (pendingScrollRestore.current > 0 || timelineQuery.isFetchingPreviousPage) {
      return;
    }

    const lastMessageId = displayMessages[displayMessages.length - 1]?.id ?? null;
    const hasNewTailMessage = lastMessageId !== lastMessageIdRef.current;
    lastMessageIdRef.current = lastMessageId;

    if (
      hasNewTailMessage &&
      !timelineQuery.isFetchingPreviousPage &&
      pendingScrollRestore.current <= 0
    ) {
      // Always follow the latest bubble after send / bot reply / typing.
      pinScrollToBottom(true, 'auto');
    }
  }, [
    displayMessages,
    isMinimized,
    isOpen,
    pinScrollToBottom,
    timelineQuery.isFetchingPreviousPage,
  ]);

  // Keep the latest message visible when rich cards expand — coalesce resize spikes.
  useEffect(() => {
    const content = messagesContentRef.current;
    if (!content || !isOpen || isMinimized) {
      return;
    }

    let resizeTimer: number | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (
        pendingScrollRestore.current > 0 ||
        timelineQuery.isFetchingPreviousPage
      ) {
        return;
      }
      // Follow content growth while stickied, waiting for bot, or showing typing.
      if (
        !(
          shouldStickToBottom.current ||
          wasAtBottomRef.current ||
          awaitingBotReplyRef.current ||
          typingHoldActiveRef.current
        )
      ) {
        return;
      }
      const container = messagesContainerRef.current;
      // Already glued to bottom — skip to avoid scroll thrash on tiny layout ticks.
      if (container && getDistanceFromBottom(container) < 8) {
        return;
      }
      if (resizeTimer != null) {
        window.clearTimeout(resizeTimer);
      }
      resizeTimer = window.setTimeout(() => {
        pinScrollToBottom(true, 'auto');
      }, 32);
    });
    resizeObserver.observe(content);

    return () => {
      if (resizeTimer != null) {
        window.clearTimeout(resizeTimer);
      }
      resizeObserver.disconnect();
    };
  }, [isMinimized, isOpen, pinScrollToBottom, timelineQuery.isFetchingPreviousPage]);

  useEffect(() => {
    if (!isOpen || isMinimized || !isAuthReady) {
      return;
    }
    if (!timelineQuery.data?.pages.length || timelineQuery.isLoading) {
      return;
    }
    if (
      timelineQuery.isFetchingPreviousPage ||
      pendingScrollRestore.current > 0 ||
      initialTimelineScrollDoneRef.current
    ) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      pinScrollToBottom(true);
      // Second pass after paint — schedule/ticket cards may still be measuring.
      window.requestAnimationFrame(() => {
        pinScrollToBottom(true);
        initialTimelineScrollDoneRef.current = true;
      });
    });

    const retryTimer = window.setTimeout(() => {
      pinScrollToBottom(true);
      initialTimelineScrollDoneRef.current = true;
    }, 250);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retryTimer);
    };
  }, [
    isAuthReady,
    isMinimized,
    isOpen,
    pinScrollToBottom,
    timelineQuery.data?.pages.length,
    timelineQuery.isFetchingPreviousPage,
    timelineQuery.isLoading,
  ]);

  useEffect(() => {
    const isOpening = isOpen && !wasOpenRef.current;
    if (isOpening) {
      shouldStickToBottom.current = true;
      wasAtBottomRef.current = true;
      initialTimelineScrollDoneRef.current = false;
    }
    if (!isOpen) {
      initialTimelineScrollDoneRef.current = false;
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const unminimized = wasMinimizedRef.current && !isMinimized && isOpen;
    wasMinimizedRef.current = isMinimized;
    if (!unminimized) {
      return;
    }
    shouldStickToBottom.current = true;
    wasAtBottomRef.current = true;
    initialTimelineScrollDoneRef.current = false;
  }, [isMinimized, isOpen]);

  // After login while chat is already open, re-pin once timeline is ready.
  useEffect(() => {
    const becameReady = isAuthReady && !wasAuthReadyRef.current;
    wasAuthReadyRef.current = isAuthReady;
    if (!becameReady || !isOpen || isMinimized) {
      return;
    }
    shouldStickToBottom.current = true;
    wasAtBottomRef.current = true;
    initialTimelineScrollDoneRef.current = false;
  }, [isAuthReady, isMinimized, isOpen]);

  useEffect(() => {
    if (!token) {
      setConversationId(null);
      setConversationStatus(null);
      setOverlayMessages([]);
      sessionStorage.removeItem(CHAT_LAST_CONVERSATION_KEY);
      return;
    }

    if (!userId) {
      return;
    }

    let cancelled = false;

    const hydrateConversation = async () => {
      const openDetail = await loadOpenConversation();
      if (cancelled) {
        return;
      }

      if (openDetail) {
        applyConversationState(openDetail);
        appendStatusFromDetail(openDetail);
        seedTimelineFromDetail(openDetail);
        void refreshTimelineMessages();
        return;
      }

      const lastConversationId = sessionStorage.getItem(CHAT_LAST_CONVERSATION_KEY);
      if (!lastConversationId) {
        return;
      }

      const closedDetail = await loadConversationDetail(Number(lastConversationId));
      if (cancelled) {
        return;
      }

      if (!closedDetail) {
        sessionStorage.removeItem(CHAT_LAST_CONVERSATION_KEY);
        return;
      }

      applyConversationState(closedDetail);
    };

    void hydrateConversation();

    return () => {
      cancelled = true;
    };
  }, [token, userId, loadOpenConversation, loadConversationDetail]);

  const acknowledgeChatAsRead = useCallback(async () => {
    if (!userId) {
      return;
    }

    const pages =
      queryClient.getQueryData<InfiniteData<CustomerChatTimelineResponse>>(clientTimelineKey())?.pages ??
      timelineQuery.data?.pages ??
      [];

    const unreadMessageKey = flattenTimelineItems(pages)
      .filter((item) => item.message.senderType === 'OPERATOR' && !item.message.isRead)
      .map((item) => item.message.id)
      .sort((left, right) => left - right)
      .join(',');

    if (!unreadMessageKey) {
      return;
    }

    if (lastReadAckKeyRef.current === unreadMessageKey) {
      return;
    }

    const unreadConversationIds = getUnreadConversationIds(pages);
    if (!unreadConversationIds.length) {
      return;
    }

    lastReadAckKeyRef.current = unreadMessageKey;

    await Promise.all(unreadConversationIds.map((id) => markConversationAsRead(id)));
    await refetchTimeline();
  }, [
    markConversationAsRead,
    queryClient,
    refetchTimeline,
    timelineQuery.data?.pages,
    userId,
  ]);

  useEffect(() => {
    if (!isOpen) {
      lastReadAckKeyRef.current = null;
      return;
    }
    if (isMinimized || !isAuthReady) {
      return;
    }
    void acknowledgeChatAsRead();
  }, [acknowledgeChatAsRead, isAuthReady, isMinimized, isOpen, timelineQuery.data?.pages]);

  const mergeSocketMessageToTimeline = useCallback(
    (payload: ChatSocketMessageEvent) => {
      if (payload.conversationId == null) {
        return;
      }

      queryClient.setQueryData<InfiniteData<CustomerChatTimelineResponse>>(
        clientTimelineKey(),
        (prev) =>
          mergeCustomerTimelineMessage(prev, {
            id: payload.id ?? Date.now(),
            conversationId: payload.conversationId,
            senderId: payload.senderId ?? null,
            senderType: payload.senderType ?? MessageSenderRole.CUSTOMER,
            content: payload.content?.trim() || '',
            type: payload.type ?? 'TEXT',
            intent: payload.intent ?? null,
            createdAt: payload.createdAt || new Date().toISOString(),
            isRead: false,
            isEdited: false,
            readerCount: 0,
            isDeleted: false,
          })
      );
    },
    [queryClient]
  );

  const handleIncomingMessage = useCallback((payload: ChatSocketMessageEvent) => {
    mergeSocketMessageToTimeline(payload);
    shouldStickToBottom.current = true;
    wasAtBottomRef.current = true;

    if (payload.conversationId && payload.conversationId !== conversationId) {
      setConversationId(payload.conversationId);
      sessionStorage.setItem(CHAT_LAST_CONVERSATION_KEY, String(payload.conversationId));
    }

    const activeConversationId = payload.conversationId ?? conversationId ?? null;
    const isFromStaff =
      payload.senderType === 'OPERATOR' || payload.senderType === 'AI_SYSTEM';

    if (payload.senderType === 'AI_SYSTEM' && awaitingBotReplyRef.current) {
      botReplyReadyRef.current = true;
      shouldStickToBottom.current = true;
      wasAtBottomRef.current = true;
      if (typingHoldActiveRef.current) {
        // Don't pin-scroll while holding — reveal will pin once at the end.
        tryRevealBotReply();
      } else {
        awaitingBotReplyRef.current = false;
        releaseSendLockRef.current();
        pinScrollToBottom(true, 'auto');
      }
    }

    // Staff replies must always land in the customer timeline even if a socket
    // payload was partially lost — refresh as a reliable fallback.
    if (payload.senderType === 'OPERATOR') {
      void refreshTimelineMessages();
    }

    if (!activeConversationId || !isOpen || isMinimized) {
      return;
    }

    if (isFromStaff && payload.senderType === 'OPERATOR') {
      queryClient.setQueryData<InfiniteData<CustomerChatTimelineResponse>>(
        clientTimelineKey(),
        (prev) => markCustomerTimelineAsRead(prev)
      );
      void markConversationAsRead(activeConversationId);
    }
  }, [
    conversationId,
    isMinimized,
    isOpen,
    markConversationAsRead,
    mergeSocketMessageToTimeline,
    pinScrollToBottom,
    queryClient,
    refreshTimelineMessages,
    tryRevealBotReply,
  ]);

  const syncConversationFromEvent = useCallback(
    (event: ChatConversationSocketEvent) => {
      if (event.conversationId) {
        setConversationId(event.conversationId);
        sessionStorage.setItem(CHAT_LAST_CONVERSATION_KEY, String(event.conversationId));
      }
      setConversationStatus(event.status);
    },
    []
  );

  const handleConversationEvent = useCallback((event: ChatConversationSocketEvent) => {
    syncConversationFromEvent(event);

    if (event.eventType === 'CONVERSATION_ESCALATED') {
      if (event.reason && BACKEND_HANDOFF_ESCALATION_REASONS.includes(event.reason)) {
        void refreshTimelineMessages();
        return;
      }
      appendSystemMessage(
        `system-waiting-${event.conversationId}`,
        'Đang chờ nhân viên tiếp nhận. Vui lòng đợi trong giây lát.'
      );
      void refreshTimelineMessages();
      return;
    }

    if (event.eventType === 'CONVERSATION_STAFF_REQUEST_CANCELLED') {
      void loadConversationDetail(event.conversationId).then((detail) => {
        if (detail) {
          applyConversationState(detail);
        } else {
          setConversationStatus(event.status);
        }
        void refreshTimelineMessages();
      });
      return;
    }

    if (event.eventType === 'CONVERSATION_TAKEN' || event.eventType === 'CONVERSATION_ASSIGNED') {
      void loadConversationDetail(event.conversationId).then((detail) => {
        if (!detail) {
          void refreshTimelineMessages();
          return;
        }
        applyConversationState({
          ...detail,
          conversation: {
            ...detail.conversation,
            status: event.status,
            assignedOperatorId: event.assignedOperatorId ?? detail.conversation.assignedOperatorId,
          },
        });
        seedTimelineFromDetail(detail);
        shouldStickToBottom.current = true;
        void refreshTimelineMessages();
      });
      return;
    }

    if (event.eventType === 'CONVERSATION_CLOSED') {
      void refreshTimelineMessages();
      void loadOpenConversation().then((openDetail) => {
        if (!openDetail) {
          return;
        }
        applyConversationState(openDetail);
      });
      return;
    }

    void refreshTimelineMessages();
  }, [
    loadConversationDetail,
    loadOpenConversation,
    refreshTimelineMessages,
    seedTimelineFromDetail,
    syncConversationFromEvent,
  ]);

  useEffect(() => {
    handleIncomingMessageRef.current = handleIncomingMessage;
  }, [handleIncomingMessage]);

  useEffect(() => {
    handleConversationEventRef.current = handleConversationEvent;
  }, [handleConversationEvent]);

  useEffect(() => {
    if (!token || !userId) {
      return;
    }

    const subscriptions: Array<{ unsubscribe: () => void }> = [];
    let cancelled = false;

    const attachSubscriptions = async () => {
      try {
        const inboxSubscription = await subscribeToCustomerInbox({
          onMessage: (payload) => handleIncomingMessageRef.current(payload),
          onConversationEvent: (event) => handleConversationEventRef.current(event),
        });
        if (cancelled) {
          inboxSubscription.unsubscribe();
          return;
        }
        subscriptions.push(inboxSubscription);

        if (conversationId != null) {
          const conversationSubscription = await subscribeToConversation(conversationId, {
            onMessage: (payload) => handleIncomingMessageRef.current(payload),
            onConversationEvent: (event) => handleConversationEventRef.current(event),
          });
          if (cancelled) {
            conversationSubscription.unsubscribe();
            return;
          }
          subscriptions.push(conversationSubscription);
        }
      } catch (error) {
        console.warn('Chat realtime subscription failed:', error);
      }
    };

    void attachSubscriptions();

    return () => {
      cancelled = true;
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    };
  }, [
    token,
    userId,
    conversationId,
    subscribeToCustomerInbox,
    subscribeToConversation,
  ]);

  /**
   * Mở khóa gửi tin ngay lập tức (ref) — không để hub/button bị kẹt.
   * Chỉ giữ suppress input ngắn để IME không gõ lại chữ cuối.
   */
  const releaseSendLock = useCallback((options?: { immediate?: boolean }) => {
    if (sendLockTimeoutRef.current != null) {
      window.clearTimeout(sendLockTimeoutRef.current);
      sendLockTimeoutRef.current = null;
    }
    if (botReplyTimeoutRef.current != null) {
      window.clearTimeout(botReplyTimeoutRef.current);
      botReplyTimeoutRef.current = null;
    }
    if (typingRevealTimeoutRef.current != null) {
      window.clearTimeout(typingRevealTimeoutRef.current);
      typingRevealTimeoutRef.current = null;
    }
    typingHoldActiveRef.current = false;
    typingMinElapsedRef.current = false;
    awaitingBotReplyRef.current = false;
    botReplyReadyRef.current = false;
    setTypingHoldActive(false);
    setAwaitingBotReply(false);
    setOverlayMessages((prev) => prev.filter((message) => !message.id.startsWith('typing-')));

    // Ref phải clear ngay — nếu đợi timeout, lần bấm hub tiếp theo bị nuốt im lặng.
    isSendingRef.current = false;
    setIsSendingUi(false);

    const clearSuppress = () => {
      suppressInputAfterSendRef.current = false;
      setInputValue((current) => (current.trim() ? '' : current));
    };

    if (options?.immediate) {
      clearSuppress();
      return;
    }

    const elapsed = Date.now() - sendStartedAtRef.current;
    const releaseDelay = Math.max(150, 400 - elapsed);
    sendLockTimeoutRef.current = window.setTimeout(() => {
      clearSuppress();
      sendLockTimeoutRef.current = null;
    }, releaseDelay);
  }, []);

  releaseSendLockRef.current = releaseSendLock;

  const handleSend = async (text: string, displayText?: string) => {
    const normalizedText = text.trim();
    if (!normalizedText) return;

    if (!token) {
      AppToast.info('Vui lòng đăng nhập để bắt đầu cuộc trò chuyện hỗ trợ.');
      return;
    }

    // Anti-spam: ignore extra hub/send while typing hold or awaiting bot reply.
    if (
      isSendingRef.current ||
      awaitingBotReplyRef.current ||
      typingHoldActiveRef.current
    ) {
      return;
    }

    isSendingRef.current = true;
    sendStartedAtRef.current = Date.now();
    suppressInputAfterSendRef.current = true;
    shouldStickToBottom.current = true;
    wasAtBottomRef.current = true;

    const sendToken = `${Date.now()}`;
    const optimisticLabel =
      displayText?.trim()
      || resolveCustomerSendDisplayLabel(normalizedText)
      || normalizedText;
    const isStaffThread =
      conversationStatus === 'ACTIVE' ||
      conversationStatus === 'WAITING_FOR_CUSTOMER' ||
      conversationStatus === 'WAITING_FOR_OPERATOR';
    botReplyCountAtSendRef.current = countBotReplies(timelineMessages);
    botReplyReadyRef.current = false;
    awaitingBotReplyRef.current = !isStaffThread;
    pendingCustomerSendsRef.current.push({
      sendToken,
      label: optimisticLabel,
      raw: normalizedText,
    });

    const optimisticUserMessage = {
      id: `optimistic-user-${sendToken}`,
      sender: 'user' as const,
      text: optimisticLabel,
      timestamp: formatNowTime(),
      variant: 'bubble' as const,
      sentContent: normalizedText !== optimisticLabel ? normalizedText : undefined,
    };
    const typingMessage = {
      id: `typing-${sendToken}`,
      sender: 'bot' as const,
      text: '',
      timestamp: formatNowTime(),
      variant: 'typing' as const,
    };

    // Paint "..." BEFORE any WS/timeline update can show the AI result for a frame.
    flushSync(() => {
      setIsSendingUi(true);
      setInputValue('');
      setAwaitingBotReply(!isStaffThread);
      setOverlayMessages((prev) => [
        ...prev.filter((message) => !message.id.startsWith('typing-')),
        optimisticUserMessage,
        ...(isStaffThread ? [] : [typingMessage]),
      ]);
      if (!isStaffThread) {
        typingHoldActiveRef.current = true;
        typingMinElapsedRef.current = false;
        setTypingHoldActive(true);
      } else {
        typingHoldActiveRef.current = false;
        typingMinElapsedRef.current = false;
        setTypingHoldActive(false);
      }
    });

    if (!isStaffThread) {
      // Timer only — hold UI already committed via flushSync above.
      if (typingRevealTimeoutRef.current != null) {
        window.clearTimeout(typingRevealTimeoutRef.current);
      }
      typingRevealTimeoutRef.current = window.setTimeout(() => {
        typingRevealTimeoutRef.current = null;
        typingMinElapsedRef.current = true;
        tryRevealBotReply();
      }, MIN_BOT_TYPING_MS);
    } else {
      endTypingHold();
    }
    pinScrollToBottom(true, 'auto');

    if (!isStaffThread) {
      if (botReplyTimeoutRef.current != null) {
        window.clearTimeout(botReplyTimeoutRef.current);
      }
      // Watchdog: unlock if bot/socket hangs (does not define the happy-path reveal).
      botReplyTimeoutRef.current = window.setTimeout(() => {
        setOverlayMessages((prev) =>
          prev.filter((message) => !message.id.startsWith(`typing-${sendToken}`))
        );
        releaseSendLockRef.current({ immediate: true });
        void refreshTimelineMessages();
      }, 6_000);
    }

    const wantsStaff = isExplicitStaffRequestText(normalizedText);

    // Case 1: gõ muốn gặp NV — gửi bubble + escalate.
    if (conversationStatus === 'CLOSED' || !conversationId) {
      try {
        const detail = await initConversation({
          title: wantsStaff ? 'Yêu cầu gặp nhân viên' : 'Yêu cầu hỗ trợ từ khách hàng',
          content: normalizedText,
          requestStaff: wantsStaff,
        });

        if (!detail) {
          pendingCustomerSendsRef.current = pendingCustomerSendsRef.current.filter(
            (pending) => pending.sendToken !== sendToken
          );
          setOverlayMessages((prev) =>
            prev.filter(
              (message) =>
                message.id !== `optimistic-user-${sendToken}` &&
                !message.id.startsWith(`typing-${sendToken}`)
            )
          );
          AppToast.error('Không thể bắt đầu cuộc trò chuyện. Vui lòng thử lại.');
          return;
        }

        if (wantsStaff) {
          applyStaffRequestResult(detail, detail.conversation.id);
        } else {
          applyConversationDetail(detail);
        }
      } catch {
        pendingCustomerSendsRef.current = pendingCustomerSendsRef.current.filter(
          (pending) => pending.sendToken !== sendToken
        );
        setOverlayMessages((prev) =>
          prev.filter(
            (message) =>
              message.id !== `optimistic-user-${sendToken}` &&
              !message.id.startsWith(`typing-${sendToken}`)
          )
        );
        AppToast.error('Không thể bắt đầu cuộc trò chuyện. Vui lòng thử lại.');
      } finally {
        releaseSendLock({ immediate: true });
      }
      return;
    }

    try {
      await sendRealtimeMessage(conversationId, normalizedText);

      if (wantsStaff && isOpenBotThread(conversationStatus)) {
        const escalated = await escalateConversation(conversationId, 'CUSTOMER_REQUEST');
        if (escalated) {
          hydrateTimelineFromDetail();
          applyStaffRequestResult(escalated, conversationId, { refreshTimeline: false });
          releaseSendLock({ immediate: true });
          return;
        }
      }

      // Đồng bộ dự phòng: bình thường websocket tự đưa tin nhắn về và merge vào timeline.
      // Chỉ khi sau 1.2s tin của khách vẫn chưa xuất hiện (socket lỗi) mới reload chi tiết
      // + refetch — tránh refetch toàn bộ timeline ngay giữa lúc bot trả lời (gây giật).
      window.setTimeout(() => {
        const stillPending = pendingCustomerSendsRef.current.some(
          (pending) => pending.sendToken === sendToken
        );
        if (!stillPending) {
          return;
        }
        void loadConversationDetail(conversationId).then((detail) => {
          if (detail) {
            applyConversationState(detail);
            seedTimelineFromDetail(detail);
          }
          void refreshTimelineMessages();
        });
      }, 1200);
    } catch {
      pendingCustomerSendsRef.current = pendingCustomerSendsRef.current.filter(
        (pending) => pending.sendToken !== sendToken
      );
      setOverlayMessages((prev) =>
        prev.filter(
          (message) =>
            message.id !== `optimistic-user-${sendToken}` && message.id !== `typing-${sendToken}`
        )
      );
      AppToast.error('Không thể gửi tin nhắn realtime lúc này.');
      releaseSendLock({ immediate: true });
    } finally {
      if (isStaffThread) {
        releaseSendLock({ immediate: true });
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    // Vietnamese/CJK IME: Enter often confirms composition; ignore until composition ends.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    void handleSend(inputValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (suppressInputAfterSendRef.current) {
      // Drop IME leftover (often only the last word) after a successful send+clear.
      setInputValue('');
      return;
    }
    setInputValue(e.target.value);
  };

  const showContextualQuickReplies = shouldShowContextualQuickReplies({
    lastMessage: quickReplyContextMessage,
    inputValue,
    isInteractive: isOpenBotThread(conversationStatus) && !isEscalating && conversationStatus !== 'WAITING_FOR_OPERATOR',
    replies: contextualReplies,
  });
  const isBotReplyPending = isSendingUi || typingHoldActive;
  const quickReplyDisabled =
    isEscalating || isInitializing || isLoadingOpen || isBotReplyPending;

  const handleQuickReply = async (chip: QuickReplyChip) => {
    if (isBotReplyPending) {
      return;
    }
    if (chip.action === 'staff') {
      await handleRequestStaff();
      return;
    }
    if (chip.message) {
      await handleSend(chip.message, chip.label);
    }
  };

  const handleBuySuggestedTicket = (ticket: ChatSuggestedTicket) => {
    const path = buildBuyTicketPath({
      ticketId: ticket.id,
      stationId: ticket.stationId,
      highlightDate: ticket.drawDate,
      search: ticket.numbers,
    });
    navigate(path);
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleSelectStation = (option: ConfirmStationOption) => {
    void handleSend(buildSelectStationMessage(option.id, option.name), option.name);
  };

  // primary = 1 CTA chính/lượt (màu đỏ); secondary = gợi ý phụ (xám nhạt)
  const quickReplyChipClass = (primary?: boolean) =>
    primary
      ? 'px-3 py-1.5 text-[13px] font-medium text-white bg-[#ee1314] border border-[#ee1314] rounded-2xl hover:bg-red-700 transition-colors whitespace-nowrap'
      : 'px-3 py-1.5 text-[13px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-colors whitespace-nowrap';

  if (!token) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={handleOpenChat}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-[#df1b1c] to-[#ff4b4b] rounded-full flex items-center justify-center shadow-2xl hover:shadow-[#df1b1c]/50 hover:scale-110 transition-all duration-300 z-50 group"
        aria-label="Open chat"
      >
        <MessageCircle className="w-7 h-7 text-white group-hover:animate-pulse" />
        {hasUnreadMessages && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
          </span>
        )}
      </button>
    );
  }

  return (
    <div 
      className={`fixed right-6 bottom-6 z-50 flex flex-col bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-300 ease-in-out border border-gray-100 ${
        isMinimized ? 'h-16 w-[360px]' : 'h-[600px] w-[380px]'
      }`}
    >
      <div className="h-16 bg-gradient-to-r from-[#df1b1c] to-[#ff4b4b] flex items-center justify-between px-4 text-white shrink-0 shadow-sm relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-white/20">
              <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Đại Phát" className="w-full h-full object-contain" />
            </div>
            <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#df1b1c] rounded-full ${showWaitingForStaff ? 'bg-amber-400' : 'bg-green-400'}`}></div>
          </div>
          <div>
            <h3 className="font-semibold text-base leading-tight">
              {showChattingWithStaff ? 'Hỗ trợ bởi Nhân viên' : showWaitingForStaff ? 'Đang chờ Nhân viên' : 'Chat với Đại Phát'}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${showWaitingForStaff ? 'bg-amber-300 animate-ping' : 'bg-green-400 animate-pulse'}`}></div>
              <span className="text-xs text-white/90 font-medium">
                {showChattingWithStaff ? 'Trò chuyện trực tiếp' : showWaitingForStaff ? 'Vui lòng chờ tiếp nhận...' : 'Đang hoạt động'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label={isMinimized ? 'Mở rộng cửa sổ chat' : 'Thu nhỏ cửa sổ chat'}
          >
            {isMinimized ? (
              <Maximize2 className="w-5 h-5 text-white" />
            ) : (
              <Minus className="w-5 h-5 text-white" />
            )}
          </button>
          <button 
            onClick={() => setIsOpen(false)} 
            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {showWaitingForStaff && (
            <div className="bg-amber-50/95 border-b border-amber-200/80 px-3.5 py-2.5 flex items-center justify-between shadow-2xs z-20 shrink-0 animate-fade-in transition-all">
              <div className="flex items-center gap-2 text-[12.5px] font-medium text-amber-900">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="truncate">Đang kết nối nhân viên...</span>
              </div>
              <button
                type="button"
                onClick={() => void handleCancelStaffRequest()}
                disabled={isCancellingStaff || isEscalating}
                className="px-2.5 py-1 text-[12px] font-semibold text-red-600 hover:text-white bg-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition-all shadow-2xs shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCancellingStaff ? 'Đang huỷ...' : 'Huỷ gặp nhân viên'}
              </button>
            </div>
          )}

          {showChattingWithStaff && (
            <div className="bg-emerald-50/95 border-b border-emerald-200/80 px-3.5 py-2.5 flex items-center justify-between shadow-2xs z-20 shrink-0 animate-fade-in transition-all">
              <div className="flex items-center gap-2 text-[12.5px] font-semibold text-emerald-900">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="truncate flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />
                  Đang chat với Nhân viên
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleDisconnectStaff()}
                disabled={isDisconnectingStaff || isEscalating}
                className="px-2.5 py-1 text-[12px] font-semibold text-red-600 hover:text-white bg-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition-all shadow-2xs flex items-center gap-1 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDisconnectingStaff ? (
                  'Đang ngắt...'
                ) : (
                  <>
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span>Ngắt kết nối</span>
                  </>
                )}
              </button>
            </div>
          )}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 bg-[#f8f9fa] scrollbar-thin scrollbar-thumb-gray-200">
            {/*
              mt-auto (not justify-end on the scroll content) keeps short threads at the bottom
              without resetting scrollTop when message height changes — that jump caused the
              "fly to top then scroll down" feel on every chip click.
            */}
            <div ref={messagesContentRef} className="flex min-h-full flex-col mx-auto w-full max-w-md px-1">
              <div ref={topSentinelRef} className="h-px w-full shrink-0" aria-hidden />

              {timelineQuery.isFetchingPreviousPage && (
                <div className="text-center py-1">
                  <p className="text-xs text-gray-400">Đang tải tin nhắn cũ hơn...</p>
                </div>
              )}

              <div className="mt-auto flex flex-col gap-3">
              <div className="text-center text-xs text-gray-400 my-2">Hôm nay</div>

              {timelineQuery.isError && (
                <div className="text-center py-2">
                  <p className="text-sm text-red-500">Không thể tải lịch sử hội thoại.</p>
                  <button
                    type="button"
                    onClick={() => void refreshTimelineMessages()}
                    className="mt-1 text-sm font-medium text-[#2563eb] hover:underline"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {(!isAuthReady || isLoadingOpen || timelineQuery.isLoading) && displayMessages.length <= 1 && !timelineQuery.isError && (
                <div className="text-center text-sm text-gray-400 py-4">Đang tải hội thoại...</div>
              )}


              
              {displayMessages.map((msg) => (
                <div key={msg.id}>
                {msg.variant === 'date' ? (
                  <div className="flex justify-center py-2">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100/90 px-3 py-1 rounded-full">
                      {msg.text}
                    </span>
                  </div>
                ) : msg.variant === 'schedule-ask-station' ? (
                  <div className="flex w-full justify-start">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                      <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                    </div>
                    <div className="max-w-[85%] min-w-0 items-start flex flex-col">
                      <div className="bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 px-4 py-2.5 text-[15px]">
                        {msg.text}
                      </div>
                      <span className="text-[11px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  </div>
                ) : msg.variant === 'schedule-pick-station-list' ? (
                  <div className="flex w-full justify-start">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                      <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                    </div>
                    <div className="max-w-[85%] min-w-0 items-start flex flex-col">
                      <div className="bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 px-4 py-2.5 text-[15px]">
                        {msg.text}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {(msg.confirmStationOptions ?? []).map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => handleSelectStation(option)}
                              className="px-3 py-1.5 text-[13px] font-medium text-[#ee1314] bg-red-50 border border-red-200 rounded-xl hover:bg-[#ee1314] hover:text-white transition-colors"
                            >
                              {option.name}
                            </button>
                          ))}
                        </div>
                        {(msg.pickStationListPage ?? 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => void handleSend(buildPickStationPageMessage((msg.pickStationListPage ?? 0)))}
                            className="mt-3 px-3 py-1.5 text-[13px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors w-full"
                          >
                            ← Trang trước
                          </button>
                        )}
                        {msg.pickStationListHasNext && (
                          <button
                            type="button"
                            onClick={() => void handleSend(buildPickStationPageMessage((msg.pickStationListPage ?? 0) + 2))}
                            className="mt-2 px-3 py-1.5 text-[13px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors w-full"
                          >
                            Xem thêm đài →
                          </button>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  </div>
                ) : msg.variant === 'schedule-ask-date-mode' ? (
                  <div className="flex w-full justify-start">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                      <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                    </div>
                    <div className="max-w-[85%] min-w-0 items-start flex flex-col">
                      <div className="bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 px-4 py-2.5 text-[15px]">
                        {msg.text}
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button type="button" onClick={() => void handleSend('Hôm nay')} className="px-3 py-1.5 text-[13px] font-medium text-[#ee1314] bg-red-50 border border-red-200 rounded-xl hover:bg-[#ee1314] hover:text-white transition-colors">Hôm nay</button>
                          {msg.scheduleGoal !== 'RESULT' && (
                            <button type="button" onClick={() => void handleSend('Ngày mai')} className="px-3 py-1.5 text-[13px] font-medium text-[#ee1314] bg-red-50 border border-red-200 rounded-xl hover:bg-[#ee1314] hover:text-white transition-colors">Ngày mai</button>
                          )}
                          <button type="button" onClick={() => void handleSend('Hôm qua')} className="px-3 py-1.5 text-[13px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">Hôm qua</button>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDatePickerMessageId((current) =>
                                current === msg.id ? null : msg.id
                              )
                            }
                            className="px-3 py-1.5 text-[13px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                          >
                            {msg.scheduleGoal === 'RESULT' ? 'Chọn ngày khác' : 'Chọn thứ/ngày'}
                          </button>
                          {msg.scheduleGoal !== 'RESULT' && (
                            <button type="button" onClick={() => void handleSend('Tất cả ngày')} className="px-3 py-1.5 text-[13px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">Tất cả ngày</button>
                          )}
                        </div>
                        {expandedDatePickerMessageId === msg.id && (
                          <ChatScheduleDatePick
                            onSelect={(displayDate) => {
                              setExpandedDatePickerMessageId(null);
                              void handleSend(displayDate);
                            }}
                          />
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  </div>
                ) : msg.variant === 'schedule-confirm-station' ? (
                  <div className="flex w-full justify-start">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                      <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                    </div>
                    <div className="max-w-[85%] min-w-0 items-start flex flex-col">
                      <div className="bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 px-4 py-2.5 text-[15px]">
                        {msg.text}
                        <div className="flex flex-col gap-2 mt-3">
                          {(msg.confirmStationOptions ?? []).map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => handleSelectStation(option)}
                              className="px-3 py-1.5 text-[13px] font-medium text-[#ee1314] bg-red-50 border border-red-200 rounded-xl hover:bg-[#ee1314] hover:text-white transition-colors w-full text-center"
                            >
                              {option.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <span className="text-[11px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  </div>
                ) : msg.variant === 'schedule-station-ready' ? (
                  <div className="flex w-full justify-start">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                      <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                    </div>
                    <div className="max-w-[85%] min-w-0 items-start flex flex-col">
                      <div className="bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 px-4 py-2.5 text-[15px]">
                        {msg.text}
                      </div>
                      <span className="text-[11px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  </div>
                ) : msg.variant === 'schedule-ask-goal' ? (
                  <div className="flex w-full justify-start">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                      <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                    </div>
                    <div className="max-w-[85%] min-w-0 items-start flex flex-col">
                      <div className="bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 px-4 py-2.5 text-[15px]">
                        {msg.text}
                        <div className="flex flex-col gap-2 mt-3">
                          <button type="button" onClick={() => void handleSend(buildSetGoalMessage('SCHEDULE'), 'Lịch quay')} className="px-3 py-1.5 text-[13px] font-medium text-[#ee1314] bg-red-50 border border-red-200 rounded-xl hover:bg-[#ee1314] hover:text-white transition-colors w-full text-center">Lịch quay</button>
                          <button type="button" onClick={() => void handleSend(buildSetGoalMessage('RESULT'), 'Kết quả xổ số')} className="px-3 py-1.5 text-[13px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors w-full text-center">Kết quả xổ số</button>
                          <button type="button" onClick={() => void handleSend(SUGGEST_TICKETS_MESSAGE, 'Gợi ý vé')} className="px-3 py-1.5 text-[13px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors w-full text-center">Gợi ý vé</button>
                        </div>
                      </div>
                      <span className="text-[11px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  </div>
                ) : msg.variant === 'schedule-ask-date' ? (
                  <div className="flex w-full justify-start">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                      <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                    </div>
                    <div className="max-w-[85%] min-w-0 items-start flex flex-col">
                      <div className="bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 px-4 py-2.5 text-[15px]">
                        {msg.text}
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button type="button" onClick={() => void handleSend('Hôm nay')} className="px-3 py-1.5 text-[13px] font-medium text-[#ee1314] bg-red-50 border border-red-200 rounded-xl hover:bg-[#ee1314] hover:text-white transition-colors">Hôm nay</button>
                          <button type="button" onClick={() => void handleSend('Ngày mai')} className="px-3 py-1.5 text-[13px] font-medium text-[#ee1314] bg-red-50 border border-red-200 rounded-xl hover:bg-[#ee1314] hover:text-white transition-colors">Ngày mai</button>
                          <button type="button" onClick={() => void handleSend('Hôm qua')} className="px-3 py-1.5 text-[13px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">Hôm qua</button>
                        </div>
                        <ChatScheduleDatePick
                          onSelect={(displayDate) => {
                            void handleSend(displayDate);
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  </div>
                ) : msg.variant === 'schedule-region-choice' ? (
                  <div className="flex w-full justify-start">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                      <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                    </div>
                    <div className="max-w-[85%] min-w-0 items-start flex flex-col">
                      <div className="bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 px-4 py-2.5 text-[15px]">
                        {msg.text || 'Bạn có thể dùng nút Xem lịch xổ / Kết quả bên dưới.'}
                      </div>
                      <span className="text-[11px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  </div>
                ) : msg.variant === 'schedule-result-summary' ? (
                  <div className="flex w-full justify-start">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                      <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                    </div>
                    <div className="w-full max-w-[95%] min-w-0 items-start flex flex-col">
                      {isAiEnabled && (
                        <p className="text-[14px] text-gray-700 mb-2 px-1">{msg.text}</p>
                      )}
                      <div className="bg-white rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 overflow-hidden w-full">
                        <ChatLotteryResultSummary
                          region={msg.scheduleRegion}
                          stationId={msg.scheduleStationId}
                          stationIds={msg.scheduleStationIds}
                          drawDate={msg.scheduleHighlightDate}
                        />
                      </div>
                      <div className="flex gap-2 mt-2 w-full max-w-[95%] overflow-x-auto flex-nowrap pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <button
                          type="button"
                          onClick={() =>
                            navigateToLotteryResults({
                              stationId: msg.scheduleStationId,
                              stationIds: msg.scheduleStationIds,
                              drawDate: msg.scheduleHighlightDate,
                              region:
                                msg.scheduleStationId == null && !msg.scheduleStationIds?.length
                                  ? msg.scheduleRegion
                                  : undefined,
                            })
                          }
                          disabled={isEscalating || isInitializing || isLoadingOpen}
                          className="px-3 py-1.5 text-[13px] font-medium text-white bg-[#ee1314] border border-[#ee1314] rounded-xl hover:bg-red-700 transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Xem chi tiết
                        </button>
                      </div>
                      <span className="text-[11px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  </div>
                ) : msg.variant === 'schedule-station-bundle' ? (
                  <div className="flex w-full justify-start">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                      <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                    </div>
                    <div className="w-full max-w-[95%] min-w-0 items-start flex flex-col gap-3">
                      {isAiEnabled && (
                        <p className="text-[14px] text-gray-700 px-1 whitespace-pre-wrap">{msg.text}</p>
                      )}
                      <div className="bg-white rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 overflow-hidden w-full">
                        <p className="text-[13px] font-semibold text-gray-800 px-4 pt-3 pb-1">Lịch quay</p>
                        <ChatLotterySchedule
                          region={msg.scheduleRegion}
                          stationId={msg.scheduleStationId}
                          stationIds={msg.scheduleStationIds}
                          highlightDate={msg.scheduleHighlightDate}
                        />
                      </div>
                      <div className="bg-white rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 overflow-hidden w-full">
                        <p className="text-[13px] font-semibold text-gray-800 px-4 pt-3 pb-1">Kết quả xổ số</p>
                        <ChatLotteryResultSummary
                          region={msg.scheduleRegion}
                          stationId={msg.scheduleStationId}
                          stationIds={msg.scheduleStationIds}
                          drawDate={msg.scheduleHighlightDate}
                        />
                      </div>
                      <div className="flex gap-2 w-full max-w-[95%] overflow-x-auto flex-nowrap pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <button
                          type="button"
                          onClick={() =>
                            navigateToLotteryResults({
                              stationId: msg.scheduleStationId,
                              drawDate: msg.scheduleHighlightDate,
                            })
                          }
                          disabled={isEscalating || isInitializing || isLoadingOpen}
                          className="px-3 py-1.5 text-[13px] font-medium text-white bg-[#ee1314] border border-[#ee1314] rounded-xl hover:bg-red-700 transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Xem chi tiết
                        </button>
                      </div>
                      <span className="text-[11px] text-gray-400 px-1">{msg.timestamp}</span>
                    </div>
                  </div>
                ) : msg.variant === 'schedule' || msg.variant === 'schedule-result' ? (
                  <div className="flex w-full justify-start">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                      <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                    </div>
                    <div className="w-full max-w-[95%] min-w-0 items-start flex flex-col">
                      {isAiEnabled && msg.variant === 'schedule-result' && (
                        <p className="text-[14px] text-gray-700 mb-2 px-1">{msg.text}</p>
                      )}
                      <div className="bg-white rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 overflow-hidden w-full">
                        <ChatLotterySchedule
                          region={msg.scheduleRegion ?? (msg.variant === 'schedule' ? msg.text : undefined)}
                          stationId={msg.scheduleStationId}
                          stationIds={msg.scheduleStationIds}
                          highlightDate={msg.scheduleHighlightDate}
                        />
                      </div>
                      <span className="text-[11px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  </div>
                ) : msg.variant === 'typing' ? (
                  <div className="flex w-full justify-start">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                      <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                    </div>
                    <div className="bg-white text-gray-500 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 px-4 py-3">
                      <span className="inline-flex gap-1 items-center" aria-label="Đang soạn trả lời">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '120ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '240ms' }} />
                      </span>
                    </div>
                  </div>
                ) : msg.variant === 'ticket-suggest' ? (
                  (() => {
                    const { reply, caption } = splitTicketSuggestText(msg.text);
                    return (
                      <motion.div
                        className="flex w-full flex-col gap-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, ease: 'easeOut' }}
                      >
                        {reply ? (
                          <div className="flex w-full justify-start">
                            <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                              <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                            </div>
                            <div className="max-w-[85%] min-w-0 items-start flex flex-col">
                              <div className="bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 px-4 py-2.5 text-[15px] whitespace-pre-wrap">
                                {reply}
                              </div>
                            </div>
                          </div>
                        ) : null}
                        <div className="flex w-full justify-start">
                          <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                            <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                          </div>
                          <div className="w-full max-w-[95%] min-w-0 items-start flex flex-col">
                            {caption ? (
                              <p className="text-[14px] text-gray-700 mb-2 px-1 whitespace-pre-wrap">{caption}</p>
                            ) : null}
                            <ChatTicketSuggestCards
                              tickets={msg.suggestedTickets ?? []}
                              onBuy={handleBuySuggestedTicket}
                              disabled={quickReplyDisabled}
                            />
                            {isAiEnabled ? (
                              <div className="flex gap-2 mt-2 w-full max-w-[95%] overflow-x-auto flex-nowrap pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {ticketSuggestFollowUpChips(suggestedTicketExcludeIds).map((chip) => (
                                  <button
                                    key={chip.id}
                                    type="button"
                                    onClick={() => void handleQuickReply(chip)}
                                    disabled={quickReplyDisabled}
                                    className={`${quickReplyChipClass(chip.primary)} shrink-0 disabled:opacity-60 disabled:cursor-not-allowed`}
                                  >
                                    {chip.label}
                                  </button>
                                ))}
                              </div>
                            ) : isOpenBotThread(conversationStatus) ? (
                              <div className="flex gap-2 mt-2 w-full max-w-[95%] overflow-x-auto flex-nowrap pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                <button
                                  type="button"
                                  onClick={() => void handleRequestStaff()}
                                  disabled={quickReplyDisabled}
                                  className={`${quickReplyChipClass(true)} shrink-0 disabled:opacity-60 disabled:cursor-not-allowed`}
                                >
                                  Gặp nhân viên
                                </button>
                              </div>
                            ) : null}
                            <span className="text-[11px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()
                ) : msg.variant === 'divider' ? (
                  <div className="flex justify-center py-2 px-3">
                    <span className="text-[12px] font-medium text-slate-600 bg-white/95 border border-slate-200/80 shadow-2xs px-3.5 py-1.5 rounded-full text-center leading-snug flex items-center justify-center gap-1.5 max-w-[90%]">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 inline" />
                      <span>{msg.text}</span>
                    </span>
                  </div>
                ) : (
                  <div className={`flex w-full ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'}`}>
                    {msg.sender === 'bot' && (
                      <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                        <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                      </div>
                    )}
                    <div className={`max-w-[85%] min-w-0 ${msg.sender === 'bot' ? 'items-start' : 'items-end'} flex flex-col`}>
                      {msg.fromStaff && (
                        <span className="text-[11px] font-semibold text-emerald-700 mb-1 px-1 flex items-center gap-1">
                          <Headphones className="w-3 h-3 text-emerald-600 inline" /> Nhân viên hỗ trợ
                        </span>
                      )}
                      <div
                        className={`px-4 py-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap ${
                          msg.sender === 'bot'
                            ? msg.fromStaff
                              ? 'bg-emerald-50/90 text-slate-800 rounded-2xl rounded-bl-sm shadow-2xs border border-emerald-200/80'
                              : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100'
                            : 'bg-gradient-to-r from-[#df1b1c] to-[#e52d2e] text-white rounded-2xl rounded-br-sm shadow-md'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[11px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  </div>
                )}
                </div>
              ))}

              {showAiDisabledNotice && (
                <div className="flex justify-center py-2 px-3">
                  <span className="text-[12px] font-medium text-slate-600 bg-white/95 border border-slate-200/80 shadow-2xs px-3.5 py-1.5 rounded-full text-center leading-relaxed max-w-[90%]">
                    {AI_DISABLED_FALLBACK_NOTICE}
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          <div className={`bg-white ${showContextualQuickReplies ? 'border-t border-gray-100' : ''}`}>
            {showContextualQuickReplies && (
              <div className="px-3 pt-2 pb-1">
                {contextualReplies.hint && (
                  <p className="text-[12px] text-gray-500 mb-2 leading-snug">{contextualReplies.hint}</p>
                )}
                <div className="flex gap-2 overflow-x-auto flex-nowrap pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {contextualReplies.chips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => void handleQuickReply(chip)}
                      disabled={quickReplyDisabled}
                      className={`${quickReplyChipClass(chip.primary)} shrink-0 disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={`p-3 ${showContextualQuickReplies ? '' : 'border-t border-gray-100'}`}>
              <div className="flex items-center gap-2 bg-[#f8f9fa] rounded-full border border-gray-200 p-1.5 focus-within:border-red-300 focus-within:ring-1 focus-within:ring-red-100 transition-all pl-4">
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onCompositionEnd={() => {
                    if (suppressInputAfterSendRef.current) {
                      setInputValue('');
                    }
                  }}
                  onKeyDown={handleKeyPress}
                  placeholder="Nhập nội dung cần hỗ trợ..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-[15px] text-gray-700 placeholder-gray-400 py-2"
                />
                <button
                  type="button"
                  onClick={() => void handleSend(inputValue)}
                  disabled={!inputValue.trim() || isInitializing || isLoadingOpen || isBotReplyPending}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    inputValue.trim() && !isInitializing && !isLoadingOpen && !isBotReplyPending
                      ? 'bg-[#df1b1c] text-white shadow-md hover:bg-red-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
