import { buildBuyTicketPath, SCHEDULE_TOKEN_RESTART, type BuildBuyTicketPathOptions } from './scheduleToken.util';

export type QuickReplyAction = 'send' | 'buy-ticket' | 'staff';

export interface QuickReplyChip {
  id: string;
  label: string;
  action: QuickReplyAction;
  message?: string;
  buyTicket?: BuildBuyTicketPathOptions;
  primary?: boolean;
}

export interface ChatQuickReplyMessageContext {
  id: string;
  sender: 'bot' | 'user';
  variant?: string;
  text?: string;
  scheduleRegion?: string;
  scheduleStationId?: number;
  scheduleStationIds?: number[];
  scheduleHighlightDate?: string;
}

export interface ResolveContextualQuickRepliesOptions {
  hasCustomerMessages: boolean;
  showStaffEscalation?: boolean;
}

export interface ContextualQuickReplies {
  hint?: string;
  chips: QuickReplyChip[];
}

const INLINE_ACTION_VARIANTS = new Set([
  'schedule-ask-location',
  'schedule-options',
  'schedule-ask-station',
  'schedule-ask-date',
  'schedule-ask-date-mode',
  'schedule-confirm-station',
  'schedule-region-choice',
  'schedule-result',
]);

const REGION_LABELS: Record<string, string> = {
  MIEN_NAM: 'Miền Nam',
  MIEN_TRUNG: 'Miền Trung',
  MIEN_BAC: 'Miền Bắc',
};

/** Token gửi lên backend — restart WEB_SCHEDULE, không phụ thuộc classify. */
export const SCHEDULE_RESTART_MESSAGE = SCHEDULE_TOKEN_RESTART;

/** Nhãn hiển thị khi user bấm chip restart. */
export const SCHEDULE_RESTART_DISPLAY_LABEL = 'Tra cứu lịch khác';

const buildBuyTicketChipLabel = (
  message: Pick<ChatQuickReplyMessageContext, 'scheduleRegion' | 'scheduleStationId' | 'scheduleStationIds'>
): string => {
  if (message.scheduleStationId != null || message.scheduleStationIds?.length === 1) {
    return 'Xem vé đài này';
  }
  if (message.scheduleRegion) {
    const regionLabel = REGION_LABELS[message.scheduleRegion] ?? message.scheduleRegion;
    return `Xem vé ${regionLabel}`;
  }
  return 'Xem vé đang bán';
};

const welcomeQuickReplies = (): ContextualQuickReplies => ({
  chips: [
    { id: 'welcome-schedule', label: 'Tra cứu lịch quay', action: 'send', message: 'tra cứu lịch quay', primary: true },
    { id: 'welcome-result', label: 'Tra cứu kết quả', action: 'send', message: 'tra cứu kết quả xổ số' },
    { id: 'welcome-order', label: 'Hỗ trợ đơn hàng', action: 'send', message: 'Tôi cần hỗ trợ đơn hàng' },
  ],
});

/** Gợi ý gắn inline trong bubble schedule-result (không dùng footer). */
export const scheduleResultFollowUpChips = (message: ChatQuickReplyMessageContext): QuickReplyChip[] => [
  {
    id: 'schedule-buy-ticket',
    label: buildBuyTicketChipLabel(message),
    action: 'buy-ticket',
    primary: true,
    buyTicket: {
      region: message.scheduleRegion,
      stationId: message.scheduleStationId,
      stationIds: message.scheduleStationIds,
      highlightDate: message.scheduleHighlightDate,
    },
  },
  {
    id: 'schedule-again',
    label: SCHEDULE_RESTART_DISPLAY_LABEL,
    action: 'send',
    message: SCHEDULE_RESTART_MESSAGE,
  },
];

const staffEscalationQuickReplies = (): ContextualQuickReplies => ({
  hint: 'Bạn cần thêm trợ giúp?',
  chips: [{ id: 'staff-escalation', label: 'Gặp nhân viên hỗ trợ', action: 'staff', primary: true }],
});

export const resolveContextualQuickReplies = (
  lastBotMessage: ChatQuickReplyMessageContext | null | undefined,
  options: ResolveContextualQuickRepliesOptions
): ContextualQuickReplies => {
  if (!lastBotMessage || lastBotMessage.sender !== 'bot') {
    return { chips: [] };
  }

  if (options.showStaffEscalation) {
    return staffEscalationQuickReplies();
  }

  const variant = lastBotMessage.variant ?? 'bubble';

  if (INLINE_ACTION_VARIANTS.has(variant)) {
    return { chips: [] };
  }

  if (!options.hasCustomerMessages && lastBotMessage.id === 'welcome') {
    return welcomeQuickReplies();
  }

  if (variant === 'bubble') {
    const normalized = (lastBotMessage.text ?? '').toLowerCase();
    if (normalized.includes('đơn hàng') || normalized.includes('mua vé')) {
      return {
        chips: [
          { id: 'order-again', label: 'Xem đơn mới nhất', action: 'send', message: 'cho em xem đơn hàng', primary: true },
          { id: 'order-schedule', label: 'Tra cứu lịch quay', action: 'send', message: 'tra cứu lịch quay' },
        ],
      };
    }
    if (normalized.includes('kết quả') || normalized.includes('trúng')) {
      return {
        chips: [
          { id: 'result-schedule', label: 'Tra cứu lịch quay', action: 'send', message: 'tra cứu lịch quay', primary: true },
          { id: 'result-again', label: 'Tra cứu kết quả khác', action: 'send', message: 'tra cứu kết quả xổ số' },
        ],
      };
    }
  }

  return { chips: [] };
};

export const shouldShowContextualQuickReplies = (options: {
  lastMessage?: ChatQuickReplyMessageContext | null;
  inputValue: string;
  isInputFocused?: boolean;
  isInteractive: boolean;
  replies: ContextualQuickReplies;
}): boolean => {
  if (!options.isInteractive || options.inputValue.trim() || options.isInputFocused) {
    return false;
  }
  if (!options.lastMessage || options.lastMessage.sender !== 'bot') {
    return false;
  }
  if (options.lastMessage.variant === 'divider' || options.lastMessage.variant === 'date') {
    return false;
  }
  return options.replies.chips.length > 0;
};

export const resolveBuyTicketPathFromChip = (chip: QuickReplyChip): string =>
  buildBuyTicketPath(chip.buyTicket);
