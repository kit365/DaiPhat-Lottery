import {
  buildSetGoalMessage,
  buildShowScheduleMessage,
} from './scheduleToken.util';
import { ROUTES } from '@/admin/constants/routes';

export type QuickReplyAction = 'send' | 'staff';

export interface QuickReplyChip {
  id: string;
  label: string;
  action: QuickReplyAction;
  message?: string;
  primary?: boolean;
}

export interface ChatQuickReplyMessageContext {
  id: string;
  sender: 'bot' | 'user';
  variant?: string;
  text?: string;
  intent?: string | null;
  scheduleRegion?: string;
  scheduleStationId?: number;
  scheduleStationIds?: number[];
  scheduleHighlightDate?: string;
  scheduleStationName?: string;
  scheduleGoal?: 'SCHEDULE' | 'RESULT' | 'TICKET';
}

export interface ResolveContextualQuickRepliesOptions {
  hasCustomerMessages: boolean;
  isAiEnabled?: boolean;
}

export interface ContextualQuickReplies {
  hint?: string;
  chips: QuickReplyChip[];
}

export const SUGGEST_TICKETS_MESSAGE = 'gợi ý vé số cho tôi';
export const SEARCH_SUFFIX_MESSAGE = 'tìm vé đuôi số';

/** Message gửi khi bấm "Gợi ý số khác" — BE loại trừ các id đã hiện. */
export const buildSuggestAgainMessage = (excludeIds: number[]): string => {
  const unique = Array.from(
    new Set(
      excludeIds.filter((id) => typeof id === 'number' && Number.isFinite(id) && id > 0)
    )
  );
  if (unique.length === 0) {
    return SUGGEST_TICKETS_MESSAGE;
  }
  return `${SUGGEST_TICKETS_MESSAGE}|exclude=${unique.join(',')}`;
};

export const isSuggestTicketsMessage = (raw: string | null | undefined): boolean => {
  if (!raw) {
    return false;
  }
  return raw === SUGGEST_TICKETS_MESSAGE || raw.startsWith(`${SUGGEST_TICKETS_MESSAGE}|exclude=`);
};

/**
 * Hub actions cố định ở footer — luôn cùng nhãn mặc định, không đổi theo đài.
 * Mọi action (trừ staff) gửi tin trong chat, không navigate ra trang khác.
 */
export const buildHubActionChips = (
  _message: ChatQuickReplyMessageContext | null | undefined = null
): QuickReplyChip[] => [
  {
    id: 'hub-schedule',
    label: 'Xem lịch xổ',
    action: 'send',
    message: buildShowScheduleMessage({
      goal: 'SCHEDULE',
      region: 'MIEN_NAM',
      scope: 'all',
    }),
    primary: true,
  },
  {
    id: 'hub-results',
    label: 'Kết quả',
    action: 'send',
    message: buildSetGoalMessage('RESULT'),
    primary: true,
  },
  {
    id: 'hub-ticket',
    label: 'Gợi ý vé',
    action: 'send',
    message: SUGGEST_TICKETS_MESSAGE,
  },
  {
    id: 'hub-search',
    label: 'Tìm đuôi số',
    action: 'send',
    message: SEARCH_SUFFIX_MESSAGE,
  },
  {
    id: 'hub-staff',
    label: 'Gặp nhân viên',
    action: 'staff',
  },
];

const welcomeQuickReplies = (): ContextualQuickReplies => ({
  chips: [
    {
      id: 'welcome-schedule',
      label: 'Xem lịch xổ',
      action: 'send',
      message: buildShowScheduleMessage({
        goal: 'SCHEDULE',
        region: 'MIEN_NAM',
        scope: 'all',
      }),
      primary: true,
    },
    {
      id: 'welcome-result',
      label: 'Tra cứu kết quả',
      action: 'send',
      message: buildSetGoalMessage('RESULT'),
    },
    {
      id: 'welcome-ticket',
      label: 'Gợi ý vé',
      action: 'send',
      message: SUGGEST_TICKETS_MESSAGE,
    },
  ],
});

const staffOnlyQuickReplies = (): ContextualQuickReplies => ({
  chips: [
    {
      id: 'ai-disabled-staff',
      label: 'Gặp nhân viên',
      action: 'staff',
      primary: true,
    },
  ],
});

/** Thu thập id vé đã gợi ý trong timeline — dùng cho "Gợi ý số khác". */
export const collectSuggestedTicketIds = (
  messages: Array<{ variant?: string; suggestedTickets?: Array<{ id?: number }> }>
): number[] => {
  const ids: number[] = [];
  for (const message of messages) {
    if (message.variant !== 'ticket-suggest' || !message.suggestedTickets) {
      continue;
    }
    for (const ticket of message.suggestedTickets) {
      if (typeof ticket.id === 'number' && Number.isFinite(ticket.id) && ticket.id > 0) {
        ids.push(ticket.id);
      }
    }
  }
  return ids;
};

/** Inline dưới ticket card: chỉ gợi ý khác — hub nằm ở footer. */
export const ticketSuggestFollowUpChips = (
  excludeTicketIds: number[] = []
): QuickReplyChip[] => [
  {
    id: 'ticket-suggest-again',
    label: 'Gợi ý số khác',
    action: 'send',
    message: buildSuggestAgainMessage(excludeTicketIds),
    primary: true,
  },
];

/**
 * Footer chips: hub luôn hiện (trừ AI tắt / welcome lần đầu).
 * Chip lịch luôn là "Xem lịch xổ" (logic lịch miền nam) — không thay bằng restart.
 */
export const resolveContextualQuickReplies = (
  lastBotMessage: ChatQuickReplyMessageContext | null | undefined,
  options: ResolveContextualQuickRepliesOptions
): ContextualQuickReplies => {
  if (options.isAiEnabled === false) {
    return staffOnlyQuickReplies();
  }

  if (
    !options.hasCustomerMessages &&
    lastBotMessage?.id === 'welcome' &&
    lastBotMessage.sender === 'bot'
  ) {
    return welcomeQuickReplies();
  }

  return { chips: buildHubActionChips(lastBotMessage) };
};

export const shouldShowContextualQuickReplies = (options: {
  lastMessage?: ChatQuickReplyMessageContext | null;
  inputValue: string;
  isInteractive: boolean;
  replies: ContextualQuickReplies;
}): boolean => {
  // Chỉ ẩn khi user đang gõ dở — focus trống vẫn giữ hub.
  if (!options.isInteractive || options.inputValue.trim()) {
    return false;
  }
  return options.replies.chips.length > 0;
};

/** @deprecated Navigate paths removed — hub stays in-chat. Kept for call-site compat. */
export const resolveBuyTicketPathFromChip = (_chip: QuickReplyChip): string => ROUTES.PUBLIC.TICKETS;

export const resolveQuickReplyNavigatePath = (_chip: QuickReplyChip): string => '/';
