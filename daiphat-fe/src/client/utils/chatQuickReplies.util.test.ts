import { describe, expect, it } from 'vitest';
import {
  buildHubActionChips,
  resolveContextualQuickReplies,
  scheduleResultFollowUpChips,
  ticketSuggestFollowUpChips,
  SCHEDULE_RESTART_MESSAGE,
  SUGGEST_TICKETS_MESSAGE,
  SEARCH_SUFFIX_MESSAGE,
  shouldShowContextualQuickReplies,
} from './chatQuickReplies.util';
import { SCHEDULE_TOKEN_RESTART } from './scheduleToken.util';

const HUB_LABELS_DEFAULT = [
  'Lịch Miền Nam',
  'Kết quả',
  'Gợi ý vé',
  'Tìm đuôi số',
  'Gặp nhân viên',
];

describe('resolveContextualQuickReplies', () => {
  it('returns welcome chips before customer messages', () => {
    const result = resolveContextualQuickReplies(
      { id: 'welcome', sender: 'bot', variant: 'bubble', text: 'Xin chào' },
      { hasCustomerMessages: false }
    );
    expect(result.chips.map((chip) => chip.label)).toEqual([
      'Tra cứu lịch quay',
      'Tra cứu kết quả',
      'Gợi ý vé',
      'Hỗ trợ đơn hàng',
    ]);
  });

  it('after schedule result replaces Lịch Miền Nam with Tra cứu lịch khác', () => {
    const result = resolveContextualQuickReplies(
      {
        id: '42',
        sender: 'bot',
        variant: 'schedule-result',
        scheduleRegion: 'MIEN_NAM',
      },
      { hasCustomerMessages: true }
    );
    expect(result.chips.map((chip) => chip.label)).toEqual([
      'Tra cứu lịch khác',
      'Kết quả',
      'Gợi ý vé',
      'Tìm đuôi số',
      'Gặp nhân viên',
    ]);
    expect(result.chips.find((chip) => chip.id === 'hub-schedule-restart')?.message).toBe(
      SCHEDULE_TOKEN_RESTART
    );
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
  it('uses station-specific labels when station is known', () => {
    const chips = buildHubActionChips({
      id: '1',
      sender: 'bot',
      scheduleStationId: 7,
      scheduleStationName: 'Bạc Liêu',
      scheduleRegion: 'MIEN_NAM',
    });
    expect(chips.map((chip) => chip.label)).toEqual([
      'Lịch Bạc Liêu',
      'Kết quả Bạc Liêu',
      'Vé Bạc Liêu',
      'Tìm đuôi số',
      'Gặp nhân viên',
    ]);
  });

  it('sends in-chat messages — never navigate actions', () => {
    const chips = buildHubActionChips();
    expect(chips.every((chip) => chip.action === 'send' || chip.action === 'staff')).toBe(true);
    expect(chips.find((chip) => chip.id === 'hub-schedule')?.message).toBe(
      'SCHEDULE_SHOW:goal=SCHEDULE:region=MIEN_NAM:scope=all'
    );
    expect(chips.find((chip) => chip.id === 'hub-results')?.message).toBe(
      'SCHEDULE_SET_GOAL:RESULT'
    );
    expect(chips.find((chip) => chip.id === 'hub-ticket')?.message).toBe(SUGGEST_TICKETS_MESSAGE);
    expect(chips.find((chip) => chip.id === 'hub-search')?.message).toBe(SEARCH_SUFFIX_MESSAGE);
  });

  it('shows station schedule token and result set-goal when station is known', () => {
    const chips = buildHubActionChips({
      id: '1',
      sender: 'bot',
      scheduleStationId: 7,
      scheduleStationName: 'Bạc Liêu',
      scheduleRegion: 'MIEN_NAM',
    });
    expect(chips.find((chip) => chip.id === 'hub-schedule')?.message).toBe(
      'SCHEDULE_SHOW:goal=SCHEDULE:station=7'
    );
    expect(chips.find((chip) => chip.id === 'hub-results')?.message).toBe(
      'SCHEDULE_SET_GOAL:RESULT'
    );
  });
});

describe('scheduleResultFollowUpChips', () => {
  it('only offers restart — hub lives in footer', () => {
    const chips = scheduleResultFollowUpChips({
      id: '42',
      sender: 'bot',
      variant: 'schedule-result',
      scheduleRegion: 'MIEN_NAM',
    });
    expect(chips).toHaveLength(1);
    expect(chips[0]).toMatchObject({ label: 'Tra cứu lịch khác', message: SCHEDULE_TOKEN_RESTART });
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

describe('SCHEDULE_RESTART_MESSAGE', () => {
  it('uses backend restart token', () => {
    expect(SCHEDULE_RESTART_MESSAGE).toBe('SCHEDULE_RESTART');
  });
});
