import {
  buildSetGoalMessage,
  buildShowScheduleMessage,
  SCHEDULE_TOKEN_RESTART,
} from './scheduleToken.util';

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

const REGION_LABELS: Record<string, string> = {
  MIEN_NAM: 'Miền Nam',
  MIEN_TRUNG: 'Miền Trung',
  MIEN_BAC: 'Miền Bắc',
};

/** Token gửi lên backend — restart WEB_SCHEDULE, không phụ thuộc classify. */
export const SCHEDULE_RESTART_MESSAGE = SCHEDULE_TOKEN_RESTART;

/** Nhãn hiển thị khi user bấm chip restart. */
export const SCHEDULE_RESTART_DISPLAY_LABEL = 'Tra cứu lịch khác';

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

const stationLabel = (message: ChatQuickReplyMessageContext): string | undefined =>
  message.scheduleStationName
  ?? (message.scheduleStationId != null ? `đài ${message.scheduleStationId}` : undefined);

const regionLabel = (message: ChatQuickReplyMessageContext): string =>
  REGION_LABELS[message.scheduleRegion ?? ''] ?? message.scheduleRegion ?? 'Miền Nam';

/**
 * Hub actions cố định ở footer — luôn cùng bộ nút, chỉ đổi nhãn theo đài đã chọn.
 * Mọi action (trừ staff) gửi tin trong chat, không navigate ra trang khác.
 */
export const buildHubActionChips = (
  message: ChatQuickReplyMessageContext | null | undefined = null
): QuickReplyChip[] => {
  const ctx = message ?? { id: 'hub', sender: 'bot' as const };
  const stationName = stationLabel(ctx);

  const scheduleLabel = stationName
    ? `Lịch ${stationName}`
    : `Lịch ${regionLabel(ctx)}`;
  const resultLabel = stationName ? `Kết quả ${stationName}` : 'Kết quả';
  const ticketLabel = stationName ? `Vé ${stationName}` : 'Gợi ý vé';

  const region = ctx.scheduleRegion ?? 'MIEN_NAM';
  const stationId = ctx.scheduleStationId;

  return [
    {
      id: 'hub-schedule',
      label: scheduleLabel,
      action: 'send',
      message: buildShowScheduleMessage({
        goal: 'SCHEDULE',
        region,
        stationId,
        scope: 'all',
      }),
      primary: true,
    },
    {
      id: 'hub-results',
      label: resultLabel,
      action: 'send',
      message: buildSetGoalMessage('RESULT'),
      primary: true,
    },
    {
      id: 'hub-ticket',
      label: ticketLabel,
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
};

const welcomeQuickReplies = (): ContextualQuickReplies => ({
  chips: [
    {
      id: 'welcome-schedule',
      label: 'Tra cứu lịch quay',
      action: 'send',
      message: buildSetGoalMessage('SCHEDULE'),
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
    {
      id: 'welcome-order',
      label: 'Hỗ trợ đơn hàng',
      action: 'send',
      message: 'Tôi cần hỗ trợ đơn hàng',
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

/** Inline dưới schedule-result: chỉ restart — hub nằm ở footer. */
export const scheduleResultFollowUpChips = (
  _message?: ChatQuickReplyMessageContext
): QuickReplyChip[] => [
  {
    id: 'schedule-again',
    label: SCHEDULE_RESTART_DISPLAY_LABEL,
    action: 'send',
    message: SCHEDULE_RESTART_MESSAGE,
    primary: true,
  },
];

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
 * Sau khi đã hiện lịch đầy đủ: bỏ chip "Lịch …" trùng (đã xem rồi) → thay bằng "Tra cứu lịch khác".
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

  const chips = buildHubActionChips(lastBotMessage);
  if (isScheduleAlreadyShown(lastBotMessage)) {
    return {
      chips: chips.map((chip) =>
        chip.id === 'hub-schedule'
          ? {
              id: 'hub-schedule-restart',
              label: SCHEDULE_RESTART_DISPLAY_LABEL,
              action: 'send' as const,
              message: SCHEDULE_RESTART_MESSAGE,
              primary: true,
            }
          : chip
      ),
    };
  }

  return { chips };
};

const isScheduleAlreadyShown = (
  message: ChatQuickReplyMessageContext | null | undefined
): boolean => {
  if (!message || message.sender !== 'bot') {
    return false;
  }
  return message.variant === 'schedule-result' || message.variant === 'schedule';
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
export const resolveBuyTicketPathFromChip = (_chip: QuickReplyChip): string => '/buy-ticket';

export const resolveQuickReplyNavigatePath = (_chip: QuickReplyChip): string => '/';
