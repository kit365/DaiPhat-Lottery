import { describe, expect, it } from 'vitest';
import {
  resolveContextualQuickReplies,
  scheduleResultFollowUpChips,
  ticketSuggestFollowUpChips,
  SCHEDULE_RESTART_MESSAGE,
  shouldShowContextualQuickReplies,
} from './chatQuickReplies.util';
import { SCHEDULE_TOKEN_RESTART } from './scheduleToken.util';

describe('resolveContextualQuickReplies', () => {
  it('returns welcome chips before customer messages', () => {
    const result = resolveContextualQuickReplies(
      { id: 'welcome', sender: 'bot', variant: 'bubble', text: 'Xin chào' },
      { hasCustomerMessages: false }
    );
    expect(result.chips.map((chip) => chip.label)).toEqual([
      'Tra cứu lịch quay',
      'Tra cứu kết quả',
      'Hỗ trợ đơn hàng',
    ]);
  });

  it('does not duplicate footer chips after schedule result', () => {
    const result = resolveContextualQuickReplies(
      {
        id: '42',
        sender: 'bot',
        variant: 'schedule-result',
        scheduleRegion: 'MIEN_NAM',
      },
      { hasCustomerMessages: true }
    );
    expect(result.chips).toHaveLength(0);
  });

  it('does not duplicate footer chips after ticket suggest cards', () => {
    const result = resolveContextualQuickReplies(
      {
        id: '43',
        sender: 'bot',
        variant: 'ticket-suggest',
        text: 'Đại Phát gợi ý 2 vé đang bán hôm nay.',
      },
      { hasCustomerMessages: true }
    );
    expect(result.chips).toHaveLength(0);
  });

  it('skips chips when bot message already has inline actions', () => {
    const result = resolveContextualQuickReplies(
      { id: '1', sender: 'bot', variant: 'schedule-ask-date-mode', text: 'Chọn ngày' },
      { hasCustomerMessages: true }
    );
    expect(result.chips).toHaveLength(0);
  });

  it('always returns the base follow-up chips after a plain bot bubble', () => {
    const result = resolveContextualQuickReplies(
      {
        id: '1',
        sender: 'bot',
        variant: 'bubble',
        intent: 'OTHER_KNOWLEDGE',
        text: 'Đại Phát tra sổ mơ dân gian giúp quý khách: mơ thấy "bò" thường gắn với các số 09, 19, 49.',
      },
      { hasCustomerMessages: true }
    );
    expect(result.hint).toBeUndefined();
    expect(result.chips.map((chip) => chip.label)).toEqual([
      'Gợi ý khác',
      'Tìm đuôi số',
      'Gặp nhân viên',
    ]);
  });

  it('appends the base chips after context-specific order chips', () => {
    const result = resolveContextualQuickReplies(
      { id: '2', sender: 'bot', variant: 'bubble', text: 'Đơn hàng của bạn đang được chuẩn bị.' },
      { hasCustomerMessages: true }
    );
    expect(result.chips.map((chip) => chip.label)).toEqual([
      'Xem đơn mới nhất',
      'Tra cứu lịch quay',
      'Gợi ý khác',
      'Tìm đuôi số',
      'Gặp nhân viên',
    ]);
  });

  it('does not render the duplicated generic staff-support hint', () => {
    const result = resolveContextualQuickReplies(
      { id: '3', sender: 'bot', variant: 'bubble', text: 'AI tạm thời không khả dụng' },
      { hasCustomerMessages: true }
    );
    expect(result.hint).toBeUndefined();
    expect(result.chips.map((chip) => chip.label)).toEqual([
      'Gợi ý khác',
      'Tìm đuôi số',
      'Gặp nhân viên',
    ]);
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

  it('keeps ticket-suggest footer empty when AI is disabled (inline staff chip owns the CTA)', () => {
    const result = resolveContextualQuickReplies(
      {
        id: '5',
        sender: 'bot',
        variant: 'ticket-suggest',
        text: 'Đại Phát gợi ý vé.',
      },
      { hasCustomerMessages: true, isAiEnabled: false }
    );
    expect(result.chips).toHaveLength(0);
  });
});

describe('scheduleResultFollowUpChips', () => {
  it('returns buy ticket and restart actions only', () => {
    const chips = scheduleResultFollowUpChips({
      id: '42',
      sender: 'bot',
      variant: 'schedule-result',
      scheduleRegion: 'MIEN_NAM',
    });
    expect(chips).toHaveLength(2);
    expect(chips[0]).toMatchObject({ label: 'Xem vé Miền Nam', action: 'buy-ticket', primary: true });
    expect(chips[1]).toMatchObject({ label: 'Tra cứu lịch khác', message: SCHEDULE_TOKEN_RESTART });
  });
});

describe('ticketSuggestFollowUpChips', () => {
  it('offers suggest again, search, and staff', () => {
    const chips = ticketSuggestFollowUpChips();
    expect(chips.map((chip) => chip.label)).toEqual(['Gợi ý khác', 'Tìm đuôi số', 'Gặp nhân viên']);
  });

  it('always labels the search chip as tìm đuôi số', () => {
    expect(ticketSuggestFollowUpChips()[1].label).toBe('Tìm đuôi số');
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

  it('keeps chips visible while input is focused but empty', () => {
    expect(
      shouldShowContextualQuickReplies({
        lastMessage: { id: '1', sender: 'bot', variant: 'bubble' },
        inputValue: '',
        isInteractive: true,
        replies: { chips: [{ id: 'a', label: 'A', action: 'send', message: 'a' }] },
      })
    ).toBe(true);
  });

  it('shows when last bot message has chips and input is empty', () => {
    expect(
      shouldShowContextualQuickReplies({
        lastMessage: { id: '1', sender: 'bot', variant: 'bubble' },
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
