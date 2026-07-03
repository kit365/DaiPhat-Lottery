import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, X, Minus, Send } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AppToast } from '../../../utils/toast.util';
import { useAuth } from '../../hooks/useAuth';
import { useChatConversation } from '../../hooks/useChatConversation';
import { getCustomerChatTimelineKey, useMyChatTimeline } from '../../../hooks/useCustomerChatTimeline';
import {
  countUnreadInboundMessages,
  flattenTimelineItems,
  formatSessionStartedLabel,
  getUnreadConversationIds,
  markCustomerTimelineAsRead,
  mergeCustomerTimelineMessage,
} from '../../../utils/chatTimeline.util';
import {
  ChatMessageResponse,
  ConversationDetailResponse,
  ConversationStatus,
  CustomerChatTimelineResponse,
  ChatConversationSocketEvent,
  BACKEND_HANDOFF_ESCALATION_REASONS,
} from '../../../types/chat.type';
import { ChatSocketMessageEvent } from '../../../types/websocket.type';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  variant?: 'bubble' | 'divider' | 'date';
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

/**
 * Case B signals: handoff / unavailable / real bot reply.
 * Welcome, session dividers, and AI-disabled notice do not count.
 */
const hasAiAssistanceActivity = (messages: Message[]): boolean =>
  messages.some((message) => {
    if (message.sender !== 'bot' || message.id === 'welcome') {
      return false;
    }
    if (isStrictAiDisabledNoticeText(message.text) || isSessionDividerText(message.text)) {
      return false;
    }
    if (isAiHandoffErrorText(message.text)) {
      return true;
    }
    return message.variant !== 'divider' && message.variant !== 'date';
  });

const isSystemNoticeText = (text: string): boolean => {
  const normalized = text.toLowerCase();
  return (
    isSessionDividerText(text) ||
    isAiDisabledNoticeText(text) ||
    isAiHandoffErrorText(text) ||
    normalized.includes('đã tiếp nhận') ||
    normalized.includes('đang chờ nhân viên tiếp nhận') ||
    normalized.includes('yêu cầu của bạn đang chờ')
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

const prepareDisplayMessages = (messages: Message[]): Message[] =>
  compactHandoffBotMessages(messages);

const resolveMessageVariant = (
  message: ChatMessageResponse
): Message['variant'] => {
  const text = message.content?.trim() || '';
  if (
    message.type === 'SYSTEM' ||
    message.senderType === 'AI_SYSTEM' ||
    isSystemNoticeText(text)
  ) {
    return 'divider';
  }
  return 'bubble';
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

const toUiMessage = (message: ChatMessageResponse): Message => ({
  id: String(message.id),
  sender: message.senderType === 'CUSTOMER' ? 'user' : 'bot',
  text: message.content?.trim() || '[Tin nhắn trống]',
  timestamp: formatTime(message.createdAt),
  variant: resolveMessageVariant(message),
});

const mapSocketMessage = (payload: ChatSocketMessageEvent, currentUserId?: string | null): Message => {
  const text = payload.content?.trim() || '[Tin nhắn trống]';
  const senderType = payload.senderType;
  const variant: Message['variant'] =
    payload.type === 'SYSTEM' || senderType === 'AI_SYSTEM' || isSystemNoticeText(text)
      ? 'divider'
      : 'bubble';

  return {
    id: payload.id != null ? String(payload.id) : `ws-${payload.createdAt}-${payload.senderId}`,
    sender:
      senderType === 'CUSTOMER' || (currentUserId != null && payload.senderId === currentUserId)
        ? 'user'
        : 'bot',
    text,
    timestamp: formatTime(payload.createdAt),
    variant,
  };
};

const mergeIncomingMessage = (prev: Message[], incoming: Message): Message[] => [...prev, incoming];

const hasBackendHandoffMessage = (detail: ConversationDetailResponse): boolean =>
  detail.messages.some(
    (message) => message.senderType === 'AI_SYSTEM' || message.type === 'SYSTEM'
  );

const CHAT_LAST_CONVERSATION_KEY = 'chat:lastConversationId';

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

const isTransientMessage = (message: Message): boolean =>
  message.id.startsWith('local-') || message.id.startsWith('system-');

const pruneOverlayMessages = (overlay: Message[], timelineMessages: Message[]): Message[] =>
  overlay.filter((extra) => {
    if (extra.id.startsWith('local-')) {
      return !timelineMessages.some((timelineMessage) => timelineMessage.id === extra.id);
    }

    if (extra.id.startsWith('system-')) {
      return !timelineMessages.some(
        (timelineMessage) => timelineMessage.variant === 'divider' && timelineMessage.text === extra.text
      );
    }

    return true;
  });

export const ChatbotPopup = () => {
  const token = useAuthStore((state) => state.token);
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const timelineUserKey = userId ?? '';
  const queryClient = useQueryClient();
  const {
    initConversation,
    loadOpenConversation,
    loadConversationDetail,
    escalateConversation,
    markConversationAsRead,
    sendRealtimeMessage,
    subscribeToCustomerInbox,
    subscribeToConversation,
    isInitializing,
    isLoadingOpen,
  } = useChatConversation();
  const timelineQuery = useMyChatTimeline(userId, token);
  const { fetchPreviousPage, refetch: refetchTimeline } = timelineQuery;
  const timelineRefreshingRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus | null>(null);
  const [hasAssignedOperator, setHasAssignedOperator] = useState(false);
  const [assignedOperatorName, setAssignedOperatorName] = useState<string | null>(null);
  const [isEscalating, setIsEscalating] = useState(false);
  const [overlayMessages, setOverlayMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const pendingScrollRestore = useRef(0);
  const shouldStickToBottom = useRef(true);
  const wasAtBottomRef = useRef(true);
  const wasOpenRef = useRef(false);
  const timelinePrefetchLockRef = useRef(false);
  const lastMessageIdRef = useRef<string | null>(null);
  const lastReadAckKeyRef = useRef<string | null>(null);
  const initialTimelineScrollDoneRef = useRef(false);
  const handleIncomingMessageRef = useRef<(payload: ChatSocketMessageEvent) => void>(() => undefined);
  const handleConversationEventRef = useRef<(event: ChatConversationSocketEvent) => void>(() => undefined);

  const timelineMessages = useMemo(
    () => buildMessagesFromTimeline(timelineQuery.data?.pages ?? []),
    [timelineQuery.data?.pages]
  );

  const messages = useMemo(() => {
    const base = timelineMessages.length > 0
      ? timelineMessages
      : [WELCOME_MESSAGE, ...timelineMessages];
    return [...base, ...overlayMessages];
  }, [timelineMessages, overlayMessages]);

  const displayMessages = useMemo(() => prepareDisplayMessages(messages), [messages]);
  const isAuthReady = Boolean(token && userId);

  const hasUnreadMessages = useMemo(() => {
    if (isOpen) {
      return false;
    }
    return countUnreadInboundMessages(timelineQuery.data?.pages ?? []) > 0;
  }, [isOpen, timelineQuery.data?.pages]);

  const handleOpenChat = useCallback(() => {
    setIsOpen(true);
  }, []);

  const subscribedConversationIds = useMemo(() => {
    const ids = new Set<number>();
    if (conversationId) {
      ids.add(conversationId);
    }
    for (const page of timelineQuery.data?.pages ?? []) {
      for (const item of page.items) {
        if (item.message.conversationId) {
          ids.add(item.message.conversationId);
        }
      }
    }
    return Array.from(ids).sort((left, right) => left - right);
  }, [conversationId, timelineQuery.data?.pages]);

  const conversationSubscriptionKey = subscribedConversationIds.join(',');

  const hasCustomerMessages = useMemo(
    () => messages.some((message) => message.sender === 'user'),
    [messages]
  );

  // Both Case A and Case B: bot-only OPEN thread after customer messaged.
  const showStaffCta = hasCustomerMessages && isOpenBotThread(conversationStatus);

  // Case A only: AI disabled — show notice unless already in timeline (strict match).
  // Case B (handoff / AI reply present): staff CTA only, no AI-disabled line.
  const showAiDisabledNotice =
    showStaffCta &&
    !hasAiDisabledNoticeInTimeline(displayMessages) &&
    !hasAiAssistanceActivity(displayMessages);

  const showWaitingForStaff =
    hasCustomerMessages && conversationStatus === 'WAITING_FOR_OPERATOR';

  const quickReplies = [
    'Tôi cần hỗ trợ đơn hàng',
    'Tôi muốn hỏi kết quả xổ số',
    'Tôi cần hỗ trợ thanh toán',
  ];

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
    setHasAssignedOperator(Boolean(detail.conversation.assignedOperatorId));
    setAssignedOperatorName(detail.conversation.assignedOperatorName ?? null);
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

  const handleLoadOlderMessages = useCallback(() => {
    if (!timelineQuery.hasPreviousPage || timelineQuery.isFetchingPreviousPage || !messagesContainerRef.current) {
      return;
    }
    pendingScrollRestore.current = messagesContainerRef.current.scrollHeight;
    shouldStickToBottom.current = false;
    wasAtBottomRef.current = false;
    void fetchPreviousPage();
  }, [fetchPreviousPage, timelineQuery.hasPreviousPage, timelineQuery.isFetchingPreviousPage]);

  useEffect(() => {
    setOverlayMessages((prev) => pruneOverlayMessages(prev, timelineMessages));
  }, [timelineMessages]);

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
        if (
          entries[0]?.isIntersecting &&
          timelineQuery.hasPreviousPage &&
          !timelineQuery.isFetchingPreviousPage &&
          !timelinePrefetchLockRef.current
        ) {
          handleLoadOlderMessages();
        }
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
      shouldStickToBottom.current &&
      isNearBottom(container)
    ) {
      container.scrollTop = container.scrollHeight;
      shouldStickToBottom.current = true;
      wasAtBottomRef.current = true;
    }
  }, [
    displayMessages,
    isMinimized,
    isOpen,
    timelineQuery.isFetchingPreviousPage,
  ]);

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
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
    shouldStickToBottom.current = true;
    wasAtBottomRef.current = true;
    initialTimelineScrollDoneRef.current = true;
  }, [
    isAuthReady,
    isMinimized,
    isOpen,
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
    if (!token) {
      setConversationId(null);
      setConversationStatus(null);
      setHasAssignedOperator(false);
      setAssignedOperatorName(null);
      setOverlayMessages([]);
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
        return;
      }

      const lastConversationId = sessionStorage.getItem(CHAT_LAST_CONVERSATION_KEY);
      if (!lastConversationId) {
        return;
      }

      const closedDetail = await loadConversationDetail(Number(lastConversationId));
      if (cancelled || !closedDetail) {
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
    if (!timelineUserKey) {
      return;
    }

    const pages =
      queryClient.getQueryData<InfiniteData<CustomerChatTimelineResponse>>(
        getCustomerChatTimelineKey('client', timelineUserKey)
      )?.pages ??
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
    timelineUserKey,
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
      if (payload.conversationId == null || !timelineUserKey) {
        return;
      }

      queryClient.setQueryData(
        getCustomerChatTimelineKey('client', timelineUserKey),
        (prev) =>
          mergeCustomerTimelineMessage(prev, {
            id: payload.id ?? Date.now(),
            conversationId: payload.conversationId,
            senderId: payload.senderId ?? null,
            senderType: payload.senderType ?? 'CUSTOMER',
            content: payload.content?.trim() || '',
            type: payload.type ?? 'TEXT',
            createdAt: payload.createdAt || new Date().toISOString(),
            isRead: false,
          })
      );
    },
    [queryClient, timelineUserKey]
  );

  const handleIncomingMessage = useCallback((payload: ChatSocketMessageEvent) => {
    mergeSocketMessageToTimeline(payload);

    const incoming = mapSocketMessage(payload, userId);
    setOverlayMessages((prev) => mergeIncomingMessage(prev, incoming).filter(isTransientMessage));

    if (payload.conversationId && payload.conversationId !== conversationId) {
      setConversationId(payload.conversationId);
      sessionStorage.setItem(CHAT_LAST_CONVERSATION_KEY, String(payload.conversationId));
    }

    const activeConversationId = payload.conversationId ?? conversationId ?? null;
    if (!activeConversationId || !isOpen || isMinimized) {
      return;
    }

    const isFromStaff =
      payload.senderType === 'OPERATOR' || payload.senderType === 'AI_SYSTEM';
    if (isFromStaff && payload.senderType === 'OPERATOR') {
      if (timelineUserKey) {
        queryClient.setQueryData(
          getCustomerChatTimelineKey('client', timelineUserKey),
          (prev) => markCustomerTimelineAsRead(prev)
        );
      }
      void markConversationAsRead(activeConversationId);
    }
  }, [conversationId, isMinimized, isOpen, markConversationAsRead, mergeSocketMessageToTimeline, queryClient, timelineUserKey, userId]);

  const syncConversationFromEvent = useCallback(
    (event: ChatConversationSocketEvent) => {
      if (event.conversationId) {
        setConversationId(event.conversationId);
        sessionStorage.setItem(CHAT_LAST_CONVERSATION_KEY, String(event.conversationId));
      }
      setConversationStatus(event.status);
      setHasAssignedOperator(Boolean(event.assignedOperatorId));
      if (!event.assignedOperatorId) {
        setAssignedOperatorName(null);
      }
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

    if (event.eventType === 'CONVERSATION_TAKEN' || event.eventType === 'CONVERSATION_ASSIGNED') {
      void loadConversationDetail(event.conversationId).then((detail) => {
        if (!detail) {
          void refreshTimelineMessages();
          return;
        }
        setAssignedOperatorName(detail.conversation.assignedOperatorName ?? null);
        void refreshTimelineMessages();
      });
      return;
    }

    if (event.eventType === 'CONVERSATION_CLOSED') {
      setHasAssignedOperator(false);
      setAssignedOperatorName(null);
      void refreshTimelineMessages();
      void loadOpenConversation().then((openDetail) => {
        if (!openDetail) {
          return;
        }
        setConversationId(openDetail.conversation.id);
        setConversationStatus(openDetail.conversation.status);
        setHasAssignedOperator(Boolean(openDetail.conversation.assignedOperatorId));
        setAssignedOperatorName(openDetail.conversation.assignedOperatorName ?? null);
        sessionStorage.setItem(CHAT_LAST_CONVERSATION_KEY, String(openDetail.conversation.id));
      });
      return;
    }

    void refreshTimelineMessages();
  }, [
    loadConversationDetail,
    loadOpenConversation,
    refreshTimelineMessages,
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

        await Promise.all(
          subscribedConversationIds.map(async (id) => {
            const conversationSubscription = await subscribeToConversation(id, {
              onMessage: (payload) => handleIncomingMessageRef.current(payload),
              onConversationEvent: (event) => handleConversationEventRef.current(event),
            });
            if (cancelled) {
              conversationSubscription.unsubscribe();
              return;
            }
            subscriptions.push(conversationSubscription);
          })
        );
      } catch {
        // Best-effort realtime; HTTP refresh remains fallback.
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
    conversationSubscriptionKey,
    subscribeToCustomerInbox,
    subscribeToConversation,
    subscribedConversationIds,
  ]);

  const handleSend = async (text: string) => {
    const normalizedText = text.trim();
    if (!normalizedText) return;

    if (!token) {
      AppToast.info('Vui lòng đăng nhập để bắt đầu cuộc trò chuyện hỗ trợ.');
      return;
    }

    setInputValue('');
    shouldStickToBottom.current = true;
    wasAtBottomRef.current = true;
    const wantsStaff = isExplicitStaffRequestText(normalizedText);

    // Case 1: gõ muốn gặp NV — gửi bubble + escalate.
    if (conversationStatus === 'CLOSED' || !conversationId) {
      const detail = await initConversation({
        title: wantsStaff ? 'Yêu cầu gặp nhân viên' : 'Yêu cầu hỗ trợ từ khách hàng',
        content: normalizedText,
        requestStaff: wantsStaff,
      });

      if (!detail) {
        return;
      }

      if (wantsStaff) {
        applyStaffRequestResult(detail, detail.conversation.id);
      } else {
        applyConversationDetail(detail);
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
          return;
        }
      }

      const detail = await loadConversationDetail(conversationId);
      if (detail) {
        applyConversationState(detail);
      }
    } catch (error) {
      AppToast.error('Không thể gửi tin nhắn realtime lúc này.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleSend(inputValue);
    }
  };

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
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#df1b1c] rounded-full"></div>
          </div>
          <div>
            <h3 className="font-semibold text-base leading-tight">Chat với Đại Phát</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-white/90 font-medium">Đang hoạt động</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(!isMinimized)} 
            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <Minus className="w-5 h-5 text-white" />
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
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 bg-[#f8f9fa] scrollbar-thin scrollbar-thumb-gray-200">
            <div className="flex min-h-full flex-col justify-end gap-3 mx-auto w-full max-w-md px-1">
              <div ref={topSentinelRef} className="h-px w-full shrink-0" aria-hidden />

              {timelineQuery.isFetchingPreviousPage && (
                <div className="text-center py-1">
                  <p className="text-xs text-gray-400">Đang tải tin nhắn cũ hơn...</p>
                </div>
              )}

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

              {!timelineQuery.isLoading &&
                !timelineQuery.isError &&
                timelineMessages.length === 0 &&
                overlayMessages.length === 0 && (
                  <div className="text-center text-sm text-gray-400 py-4">Chưa có tin nhắn.</div>
                )}
              
              {displayMessages.map((msg) =>
                msg.variant === 'date' ? (
                  <div key={msg.id} className="flex justify-center py-2">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100/90 px-3 py-1 rounded-full">
                      {msg.text}
                    </span>
                  </div>
                ) : msg.variant === 'divider' ? (
                  <p
                    key={msg.id}
                    className="text-center text-[13px] text-gray-500 leading-relaxed px-4 py-1"
                  >
                    {msg.text}
                  </p>
                ) : (
                  <div key={msg.id} className={`flex w-full ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'}`}>
                    {msg.sender === 'bot' && (
                      <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                        <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                      </div>
                    )}
                    <div className={`max-w-[85%] min-w-0 ${msg.sender === 'bot' ? 'items-start' : 'items-end'} flex flex-col`}>
                      <div
                        className={`px-4 py-2.5 text-[15px] whitespace-pre-wrap ${
                          msg.sender === 'bot'
                            ? 'bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100'
                            : 'bg-gradient-to-r from-[#df1b1c] to-[#ff4b4b] text-white rounded-2xl rounded-br-sm shadow-md'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[11px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  </div>
                )
              )}

              {showAiDisabledNotice && (
                <p className="text-center text-[13px] text-gray-500 leading-relaxed px-4 py-1">
                  {AI_DISABLED_FALLBACK_NOTICE}
                </p>
              )}

              {showStaffCta && (
                <p className="text-center text-[13px] text-gray-500 leading-relaxed px-2 pb-1">
                  Bạn cần thêm trợ giúp?{' '}
                  <button
                    type="button"
                    onClick={() => void handleRequestStaff()}
                    disabled={isEscalating || isInitializing || isLoadingOpen}
                    className="font-medium text-[#2563eb] hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isEscalating ? 'Đang chuyển...' : 'Trò chuyện với nhân viên hỗ trợ'}
                  </button>
                </p>
              )}

              {showWaitingForStaff && (
                <p className="flex items-center justify-center text-center text-[13px] text-gray-500 px-2 pb-1">
                  Đang chờ nhân viên tiếp nhận
                  <span className="inline-flex ml-0.5">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                </p>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="px-4 py-3 bg-white border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => void handleSend(reply)}
                  disabled={isEscalating}
                  className="px-3 py-1.5 text-[13px] font-medium text-[#df1b1c] bg-red-50 border border-red-200 rounded-full hover:bg-[#df1b1c] hover:text-white transition-colors disabled:opacity-60"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2 bg-[#f8f9fa] rounded-full border border-gray-200 p-1.5 focus-within:border-red-300 focus-within:ring-1 focus-within:ring-red-100 transition-all pl-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Nhập nội dung cần hỗ trợ..."
                className="flex-1 bg-transparent border-none focus:outline-none text-[15px] text-gray-700 placeholder-gray-400 py-2"
              />
              <button 
                onClick={() => void handleSend(inputValue)}
                disabled={!inputValue.trim() || isInitializing || isLoadingOpen}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  inputValue.trim() && !isInitializing && !isLoadingOpen
                    ? 'bg-[#df1b1c] text-white shadow-md hover:bg-red-700' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
