import { describe, expect, it } from 'vitest';
import {
  buildHubActionChips,
  resolveContextualQuickReplies,
  ticketSuggestFollowUpChips,
  SUGGEST_TICKETS_MESSAGE,
  SEARCH_SUFFIX_MESSAGE,
  shouldShowContextualQuickReplies,
} from './chatQuickReplies.util';

const HUB_LABELS_DEFAULT = [
  'Gặp nhân viên',
  'Gợi ý vé',
  'Tìm đuôi số',
  'Kết quả',
];

describe('resolveContextualQuickReplies', () => {
  it('returns welcome chips before customer messages', () => {
    const result = resolveContextualQuickReplies(
      { id: 'welcome', sender: 'bot', variant: 'bubble', text: 'Xin chào' },
      { hasCustomerMessages: false }
    );
    expect(result.chips.map((chip) => chip.label)).toEqual(HUB_LABELS_DEFAULT);
    expect(result.chips.filter((chip) => chip.primary).map((chip) => chip.label)).toEqual([
      'Gặp nhân viên',
      'Gợi ý vé',
    ]);
  });

  it('does not expose Xem lịch xổ in hub after schedule result', () => {
    const result = resolveContextualQuickReplies(
      {
        id: '42',
        sender: 'bot',
        variant: 'schedule-result',
        scheduleRegion: 'MIEN_NAM',
      },
      { hasCustomerMessages: true }
    );
    expect(result.chips.map((chip) => chip.label)).toEqual(HUB_LABELS_DEFAULT);
    expect(result.chips.some((chip) => chip.id === 'hub-schedule')).toBe(false);
    expect(result.chips.some((chip) => chip.id === 'hub-schedule-restart')).toBe(false);
  });

  it('keeps hub chips visible after ticket suggest cards', () => {
    const result = resolveContextualQuickReplies(
      {
        id: '43',
        sender: 'bot',
        variant: 'ticket-suggest',
        text: 'Đại Phát gợi ý 2 vé đang bán hôm nay.',
      },
      { hasCustomerMessages: true }
    );
    expect(result.chips.map((chip) => chip.label)).toEqual(HUB_LABELS_DEFAULT);
  });

  it('shows hub chips during schedule inline steps', () => {
    const result = resolveContextualQuickReplies(
      { id: '1', sender: 'bot', variant: 'schedule-ask-date-mode', text: 'Chọn ngày' },
      { hasCustomerMessages: true }
    );
    expect(result.chips.map((chip) => chip.label)).toEqual(HUB_LABELS_DEFAULT);
  });

  it('returns hub chips after a plain bot bubble', () => {
    const result = resolveContextualQuickReplies(
      {
        id: '1',
        sender: 'bot',
        variant: 'bubble',
        intent: 'OTHER_KNOWLEDGE',
        text: 'Đại Phát tra sổ mơ dân gian giúp quý khách.',
      },
      { hasCustomerMessages: true }
    );
    expect(result.chips.map((chip) => chip.label)).toEqual(HUB_LABELS_DEFAULT);
  });

  it('only offers staff support while AI is disabled', () => {
    const result = resolveContextualQuickReplies(
      {
        id: '4',
        sender: 'bot',
        variant: 'bubble',
        text: 'Hiện Đại Phát chưa có vé khớp đuôi số 43.',
      },
      { hasCustomerMessages: true, isAiEnabled: false }
    );

    expect(result.chips).toEqual([
      {
        id: 'ai-disabled-staff',
        label: 'Gặp nhân viên',
        action: 'staff',
        primary: true,
      },
    ]);
  });
});

describe('buildHubActionChips', () => {
  it('orders staff then ticket then search then results, without schedule', () => {
    const chips = buildHubActionChips({
      id: '1',
      sender: 'bot',
      scheduleStationId: 7,
      scheduleStationName: 'Bạc Liêu',
      scheduleRegion: 'MIEN_NAM',
    });
    expect(chips.map((chip) => chip.label)).toEqual(HUB_LABELS_DEFAULT);
    expect(chips.filter((chip) => chip.primary).map((chip) => chip.id)).toEqual([
      'hub-staff',
      'hub-ticket',
    ]);
    expect(chips.some((chip) => chip.id === 'hub-schedule')).toBe(false);
  });

  it('sends in-chat messages — never navigate actions', () => {
    const chips = buildHubActionChips();
    expect(chips.every((chip) => chip.action === 'send' || chip.action === 'staff')).toBe(true);
    expect(chips.find((chip) => chip.id === 'hub-results')?.message).toBe(
      'SCHEDULE_SET_GOAL:RESULT'
    );
    expect(chips.find((chip) => chip.id === 'hub-ticket')?.message).toBe(SUGGEST_TICKETS_MESSAGE);
    expect(chips.find((chip) => chip.id === 'hub-search')?.message).toBe(SEARCH_SUFFIX_MESSAGE);
  });

  it('ignores station id for hub result tokens', () => {
    const chips = buildHubActionChips({
      id: '1',
      sender: 'bot',
      scheduleStationId: 7,
      scheduleStationName: 'Bạc Liêu',
      scheduleRegion: 'MIEN_NAM',
    });
    expect(chips.find((chip) => chip.id === 'hub-results')?.message).toBe(
      'SCHEDULE_SET_GOAL:RESULT'
    );
  });
});

describe('ticketSuggestFollowUpChips', () => {
  it('only offers suggest again — hub lives in footer', () => {
    const chips = ticketSuggestFollowUpChips();
    expect(chips.map((chip) => chip.label)).toEqual(['Gợi ý số khác']);
    expect(chips[0].action).toBe('send');
    expect(chips[0].message).toBe(SUGGEST_TICKETS_MESSAGE);
  });

  it('appends previously shown ticket ids so BE can exclude them', () => {
    const chips = ticketSuggestFollowUpChips([1, 2, 2, 5]);
    expect(chips[0].message).toBe(`${SUGGEST_TICKETS_MESSAGE}|exclude=1,2,5`);
  });
});

describe('shouldShowContextualQuickReplies', () => {
  it('hides when user is typing', () => {
    expect(
      shouldShowContextualQuickReplies({
        lastMessage: { id: '1', sender: 'bot', variant: 'bubble' },
        inputValue: 'hello',
        isInteractive: true,
        replies: { chips: [{ id: 'a', label: 'A', action: 'send', message: 'a' }] },
      })
    ).toBe(false);
  });

  it('shows when chips exist and input is empty — even without bot last message', () => {
    expect(
      shouldShowContextualQuickReplies({
        lastMessage: null,
        inputValue: '',
        isInteractive: true,
        replies: { chips: [{ id: 'a', label: 'A', action: 'send', message: 'a' }] },
      })
    ).toBe(true);
  });
});
