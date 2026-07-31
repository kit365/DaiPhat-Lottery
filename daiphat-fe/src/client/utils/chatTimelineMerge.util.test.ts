import { describe, expect, it } from 'vitest';
import {
  customerMessagesMatch,
  mergeTimelineWithOverlay,
  pruneOverlayMessages,
  claimPendingCustomerSends,
} from './chatTimelineMerge.util';

const SCHEDULE_SHOW = 'SCHEDULE_SHOW:goal=SCHEDULE:region=MIEN_NAM:scope=all';

describe('customerMessagesMatch', () => {
  it('matches display label with raw token sentContent', () => {
    expect(
      customerMessagesMatch(
        { id: '1', sender: 'user', text: 'Xem lịch xổ', sentContent: SCHEDULE_SHOW },
        { id: 'opt', sender: 'user', text: 'Xem lịch xổ', sentContent: SCHEDULE_SHOW }
      )
    ).toBe(true);
  });
});

describe('pruneOverlayMessages', () => {
  it('claims one optimistic per timeline row for identical sends', () => {
    const timeline = [
      { id: 't1', sender: 'user' as const, text: 'Xem lịch xổ', sentContent: SCHEDULE_SHOW },
      { id: 't2', sender: 'user' as const, text: 'Xem lịch xổ', sentContent: SCHEDULE_SHOW },
    ];
    const overlay = [
      { id: 'optimistic-user-1', sender: 'user' as const, text: 'Xem lịch xổ', sentContent: SCHEDULE_SHOW },
      { id: 'optimistic-user-2', sender: 'user' as const, text: 'Xem lịch xổ', sentContent: SCHEDULE_SHOW },
      { id: 'optimistic-user-3', sender: 'user' as const, text: 'Xem lịch xổ', sentContent: SCHEDULE_SHOW },
    ];
    const pruned = pruneOverlayMessages(overlay, timeline);
    expect(pruned.map((m) => m.id)).toEqual(['optimistic-user-3']);
  });
});

describe('claimPendingCustomerSends', () => {
  it('claims one pending send per timeline row for identical content', () => {
    const timeline = [
      { id: 't1', sender: 'user' as const, text: 'Xem lịch xổ', sentContent: SCHEDULE_SHOW },
    ];
    const pending = [
      { sendToken: '1', label: 'Xem lịch xổ', raw: SCHEDULE_SHOW },
      { sendToken: '2', label: 'Xem lịch xổ', raw: SCHEDULE_SHOW },
    ];
    expect(claimPendingCustomerSends(pending, timeline).map((p) => p.sendToken)).toEqual(['2']);
  });
});

describe('mergeTimelineWithOverlay', () => {
  it('keeps pending optimistic before bot reply that arrived early', () => {
    const timeline = [
      { id: 'b1', sender: 'bot' as const, text: 'old', variant: 'schedule' },
      { id: 'b2', sender: 'bot' as const, text: 'new schedule', variant: 'schedule' },
    ];
    const overlay = [
      {
        id: 'optimistic-user-9',
        sender: 'user' as const,
        text: 'Kết quả',
        sentContent: 'SCHEDULE_SET_GOAL:RESULT',
      },
      { id: 'typing-9', sender: 'bot' as const, text: '', variant: 'typing' },
    ];
    const merged = mergeTimelineWithOverlay(timeline, overlay, {
      awaitingBotReply: true,
      botReplyCountAtSend: 2,
    });
    expect(merged.map((m) => m.id)).toEqual([
      'b1',
      'b2',
      'optimistic-user-9',
      'typing-9',
    ]);
  });

  it('does not swap old schedule with unrelated later user action', () => {
    const timeline = [
      { id: 'b1', sender: 'bot' as const, text: 'schedule', variant: 'schedule' },
      { id: 'u1', sender: 'user' as const, text: 'Kết quả', sentContent: 'SCHEDULE_SET_GOAL:RESULT' },
      { id: 'b2', sender: 'bot' as const, text: 'ask date', variant: 'schedule-ask-date-mode' },
    ];
    const merged = mergeTimelineWithOverlay(timeline, [], {
      awaitingBotReply: false,
      botReplyCountAtSend: 1,
    });
    expect(merged.map((m) => m.id)).toEqual(['b1', 'u1', 'b2']);
  });
});
