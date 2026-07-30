import { SCHEDULE_TOKEN_RESTART } from './scheduleToken.util';

/** Minimal message shape for overlay/timeline merge (chatbot). */
export interface ChatTimelineMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  variant?: string;
  sentContent?: string;
}

export const customerMessageKey = (
  message: Pick<ChatTimelineMessage, 'sender' | 'text' | 'sentContent'>
): string | null => {
  if (message.sender !== 'user') {
    return null;
  }
  return (message.sentContent ?? message.text).trim();
};

/** Match timeline customer bubble to an optimistic send (label + optional raw token). */
export const customerMessagesMatch = (
  timeline: ChatTimelineMessage,
  optimistic: ChatTimelineMessage
): boolean => {
  if (timeline.sender !== 'user' || optimistic.sender !== 'user') {
    return false;
  }
  const timelineKey = customerMessageKey(timeline);
  const optimisticSent = optimistic.sentContent?.trim();
  const optimisticText = optimistic.text.trim();
  if (!timelineKey) {
    return false;
  }
  if (optimisticSent && timelineKey === optimisticSent) {
    return true;
  }
  if (timelineKey === optimisticText) {
    return true;
  }
  if (timeline.text.trim() === optimisticText) {
    if (optimisticSent) {
      return timeline.sentContent?.trim() === optimisticSent;
    }
    return !timeline.sentContent;
  }

  const resolveLegacyLabel = (raw: string): string =>
    raw.trim() === SCHEDULE_TOKEN_RESTART ? 'Xem lịch xổ' : raw.trim();
  const optimisticMapped = resolveLegacyLabel(optimisticText);
  const messageMapped = resolveLegacyLabel(timeline.text.trim());
  if (optimisticMapped === messageMapped) {
    return true;
  }
  if (!optimisticSent) {
    return false;
  }
  const sent = optimisticSent;
  return (
    timeline.sentContent?.trim() === sent ||
    timeline.text.trim() === sent ||
    messageMapped === sent
  );
};

export interface PendingCustomerSend {
  sendToken: string;
  label: string;
  raw: string;
}

const pendingSendShape = (pending: PendingCustomerSend): ChatTimelineMessage => ({
  id: '',
  sender: 'user',
  text: pending.label,
  sentContent: pending.raw !== pending.label ? pending.raw : undefined,
});

/** Drop pending sends once a matching customer row exists on the timeline (FIFO). */
export const claimPendingCustomerSends = (
  pending: PendingCustomerSend[],
  timelineMessages: ChatTimelineMessage[]
): PendingCustomerSend[] => {
  const timelineUsers = timelineMessages.filter((message) => message.sender === 'user');
  const claimedTimelineIds = new Set<string>();

  return pending.filter((send) => {
    const match = timelineUsers.find((timelineMessage) => {
      if (claimedTimelineIds.has(timelineMessage.id)) {
        return false;
      }
      return customerMessagesMatch(timelineMessage, pendingSendShape(send));
    });
    if (match) {
      claimedTimelineIds.add(match.id);
      return false;
    }
    return true;
  });
};

export const isCountableBotReply = (message: ChatTimelineMessage): boolean =>
  message.sender === 'bot' &&
  message.variant !== 'divider' &&
  message.variant !== 'date' &&
  message.variant !== 'typing' &&
  message.id !== 'welcome';

export const countBotReplies = (messages: ChatTimelineMessage[]): number =>
  messages.filter((message) => isCountableBotReply(message)).length;

/**
 * Remove optimistic user bubbles once a matching timeline customer message exists.
 * FIFO claim — repeat identical sends each pair with one timeline row.
 */
export const pruneOverlayMessages = (
  overlay: ChatTimelineMessage[],
  timelineMessages: ChatTimelineMessage[]
): ChatTimelineMessage[] => {
  const timelineUsers = timelineMessages.filter((message) => message.sender === 'user');
  const claimedTimelineIds = new Set<string>();

  return overlay.filter((extra) => {
    if (extra.id.startsWith('optimistic-user-')) {
      const match = timelineUsers.find((timelineMessage) => {
        if (claimedTimelineIds.has(timelineMessage.id)) {
          return false;
        }
        return customerMessagesMatch(timelineMessage, extra);
      });
      if (match) {
        claimedTimelineIds.add(match.id);
        return false;
      }
      return true;
    }

    if (extra.id.startsWith('typing-')) {
      return true;
    }

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
};

export interface MergeTimelineOptions {
  awaitingBotReply: boolean;
  botReplyCountAtSend: number;
  welcomeMessage?: ChatTimelineMessage;
}

/**
 * Merge server timeline with optimistic overlay.
 * - Keeps every unclaimed optimistic user bubble (repeat hub clicks).
 * - Reorders only the in-flight bot reply ahead of the latest optimistic user.
 */
export const mergeTimelineWithOverlay = (
  timelineMessages: ChatTimelineMessage[],
  overlayMessages: ChatTimelineMessage[],
  options: MergeTimelineOptions
): ChatTimelineMessage[] => {
  const welcome = options.welcomeMessage;
  const base =
    timelineMessages.length > 0
      ? timelineMessages
      : welcome
        ? [welcome, ...timelineMessages]
        : timelineMessages;

  let overlay = pruneOverlayMessages(overlayMessages, timelineMessages);
  const stillAwaitingReply =
    options.awaitingBotReply &&
    countBotReplies(timelineMessages) <= options.botReplyCountAtSend;

  if (!stillAwaitingReply) {
    overlay = overlay.filter((message) => !message.id.startsWith('typing-'));
  }

  const optimisticUsers = overlay.filter((message) => message.id.startsWith('optimistic-user-'));
  const typing = overlay.filter((message) => message.id.startsWith('typing-'));
  const restOverlay = overlay.filter(
    (message) => !message.id.startsWith('optimistic-user-') && !message.id.startsWith('typing-')
  );

  const pendingOptimistic = stillAwaitingReply
    ? optimisticUsers[optimisticUsers.length - 1]
    : undefined;
  const settledOptimistics = pendingOptimistic
    ? optimisticUsers.filter((message) => message.id !== pendingOptimistic.id)
    : optimisticUsers;

  if (!pendingOptimistic) {
    return [...base, ...settledOptimistics, ...typing, ...restOverlay];
  }

  let seenBotReplies = 0;
  const beforeSend: ChatTimelineMessage[] = [];
  const botRepliesAfterSend: ChatTimelineMessage[] = [];

  for (const message of base) {
    if (isCountableBotReply(message)) {
      seenBotReplies += 1;
      if (seenBotReplies > options.botReplyCountAtSend) {
        botRepliesAfterSend.push(message);
        continue;
      }
    }
    if (customerMessagesMatch(message, pendingOptimistic)) {
      continue;
    }
    beforeSend.push(message);
  }

  return [
    ...beforeSend,
    ...settledOptimistics,
    pendingOptimistic,
    ...typing,
    ...botRepliesAfterSend,
    ...restOverlay,
  ];
};
