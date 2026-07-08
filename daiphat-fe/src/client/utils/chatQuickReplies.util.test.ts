import { describe, expect, it } from 'vitest';
import {
  resolveContextualQuickReplies,
  scheduleResultFollowUpChips,
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

  it('skips chips when bot message already has inline actions', () => {
    const result = resolveContextualQuickReplies(
      { id: '1', sender: 'bot', variant: 'schedule-ask-date-mode', text: 'Chọn ngày' },
      { hasCustomerMessages: true }
    );
    expect(result.chips).toHaveLength(0);
  });

  it('returns staff chip on escalation signal', () => {
    const result = resolveContextualQuickReplies(
      { id: '1', sender: 'bot', variant: 'bubble', text: 'AI tạm thời không khả dụng' },
      { hasCustomerMessages: true, showStaffEscalation: true }
    );
    expect(result.chips[0]).toMatchObject({ action: 'staff', label: 'Gặp nhân viên hỗ trợ' });
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

  it('hides when user focuses input', () => {
    expect(
      shouldShowContextualQuickReplies({
        lastMessage: { id: '1', sender: 'bot', variant: 'schedule-result' },
        inputValue: '',
        isInputFocused: true,
        isInteractive: true,
        replies: { chips: [{ id: 'a', label: 'A', action: 'send', message: 'a' }] },
      })
    ).toBe(false);
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
