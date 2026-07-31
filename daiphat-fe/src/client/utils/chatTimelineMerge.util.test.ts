import { describe, expect, it } from 'vitest';
import {
  claimPendingCustomerSends,
  countBotReplies,
  mergeTimelineWithOverlay,
  pruneOverlayMessages,
} from './chatTimelineMerge.util';

const SCHEDULE_SHOW = 'SCHEDULE_SHOW:goal=SCHEDULE:region=MIEN_NAM:scope=all';

describe('chatTimelineMerge.util', () => {
  it('claims pending sends FIFO when matching timeline users appear', () => {
    const pending = [
      { sendToken: '1', label: 'Xem lịch xổ', raw: SCHEDULE_SHOW },
      { sendToken: '2', label: 'Xem lịch xổ', raw: SCHEDULE_SHOW },
    ];
    const timeline = [
      { id: 'u1', sender: 'user' as const, text: 'Xem lịch xổ', sentContent: SCHEDULE_SHOW },
    ];
    expect(claimPendingCustomerSends(pending, timeline)).toEqual([
      { sendToken: '2', label: 'Xem lịch xổ', raw: SCHEDULE_SHOW },
    ]);
  });

  it('prunes one optimistic bubble per matching timeline user', () => {
    const overlay = [
      {
        id: 'optimistic-user-1',
        sender: 'user' as const,
        text: 'Xem lịch xổ',
        sentContent: SCHEDULE_SHOW,
      },
      {
        id: 'optimistic-user-2',
        sender: 'user' as const,
        text: 'Xem lịch xổ',
        sentContent: SCHEDULE_SHOW,
      },
      { id: 'typing-2', sender: 'bot' as const, text: '', variant: 'typing' },
    ];
    const timeline = [
      { id: 'u1', sender: 'user' as const, text: 'Xem lịch xổ', sentContent: SCHEDULE_SHOW },
    ];
    const pruned = pruneOverlayMessages(overlay, timeline);
    expect(pruned.map((m) => m.id)).toEqual(['optimistic-user-2', 'typing-2']);
  });

  it('counts bot replies excluding typing/divider/welcome', () => {
    expect(
      countBotReplies([
        { id: 'welcome', sender: 'bot', text: 'hi', variant: 'bubble' },
        { id: 'b1', sender: 'bot', text: 'a', variant: 'schedule' },
        { id: 'typing-1', sender: 'bot', text: '', variant: 'typing' },
        { id: 'd1', sender: 'bot', text: 'note', variant: 'divider' },
        { id: 'u1', sender: 'user', text: 'hi' },
      ])
    ).toBe(1);
  });

  it('keeps duplicate optimistic users until claimed', () => {
    const timeline = [{ id: 'b1', sender: 'bot' as const, text: 'old', variant: 'schedule' }];
    const overlay = [
      {
        id: 'optimistic-user-1',
        sender: 'user' as const,
        text: 'Xem lịch xổ',
        sentContent: SCHEDULE_SHOW,
      },
      {
        id: 'optimistic-user-2',
        sender: 'user' as const,
        text: 'Xem lịch xổ',
        sentContent: SCHEDULE_SHOW,
      },
      { id: 'typing-2', sender: 'bot' as const, text: '', variant: 'typing' },
    ];
    const merged = mergeTimelineWithOverlay(timeline, overlay, {
      awaitingBotReply: true,
      botReplyCountAtSend: 1,
      holdTypingReveal: true,
    });
    expect(merged.map((m) => m.id)).toEqual([
      'b1',
      'optimistic-user-1',
      'optimistic-user-2',
      'typing-2',
    ]);
  });

  it('appends settled timeline user after optimistic is pruned', () => {
    const timeline = [
      { id: 'b1', sender: 'bot' as const, text: 'old', variant: 'schedule' },
      { id: 'u1', sender: 'user' as const, text: 'Xem lịch xổ', sentContent: SCHEDULE_SHOW },
      { id: 'b2', sender: 'bot' as const, text: 'new schedule', variant: 'schedule' },
    ];
    const overlay = [{ id: 'typing-9', sender: 'bot' as const, text: '', variant: 'typing' }];
    const merged = mergeTimelineWithOverlay(timeline, overlay, {
      awaitingBotReply: false,
      botReplyCountAtSend: 1,
    });
    expect(merged.map((m) => m.id)).toEqual(['b1', 'u1', 'b2']);
  });

  it('holds typing and hides early bot reply until reveal delay ends', () => {
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
    const held = mergeTimelineWithOverlay(timeline, overlay, {
      awaitingBotReply: false,
      botReplyCountAtSend: 1,
      holdTypingReveal: true,
    });
    expect(held.map((m) => m.id)).toEqual(['b1', 'optimistic-user-9', 'typing-9']);
    expect(held.some((m) => m.id === 'b2')).toBe(false);

    const revealed = mergeTimelineWithOverlay(timeline, overlay, {
      awaitingBotReply: false,
      botReplyCountAtSend: 1,
      holdTypingReveal: false,
    });
    expect(revealed.map((m) => m.id)).toEqual(['b1', 'b2', 'optimistic-user-9']);
  });

  it('never shows AI result and typing together after optimistic is pruned', () => {
    const timeline = [
      { id: 'b1', sender: 'bot' as const, text: 'old', variant: 'schedule' },
      {
        id: 'u1',
        sender: 'user' as const,
        text: 'Xem lịch xổ',
        sentContent: SCHEDULE_SHOW,
      },
      { id: 'b2', sender: 'bot' as const, text: 'new schedule', variant: 'schedule' },
    ];
    const overlay = [{ id: 'typing-9', sender: 'bot' as const, text: '', variant: 'typing' }];

    const held = mergeTimelineWithOverlay(timeline, overlay, {
      awaitingBotReply: true,
      botReplyCountAtSend: 1,
      holdTypingReveal: true,
    });
    expect(held.map((m) => m.id)).toEqual(['b1', 'u1', 'typing-9']);
    expect(held.some((m) => m.id === 'b2')).toBe(false);

    const revealed = mergeTimelineWithOverlay(timeline, [], {
      awaitingBotReply: false,
      botReplyCountAtSend: 1,
      holdTypingReveal: false,
    });
    expect(revealed.map((m) => m.id)).toEqual(['b1', 'u1', 'b2']);
  });

  it('hides bot replies whenever typing overlay is present even if hold flag is off', () => {
    const timeline = [
      { id: 'u1', sender: 'user' as const, text: 'Xem lịch xổ', sentContent: SCHEDULE_SHOW },
      { id: 'b2', sender: 'bot' as const, text: 'new schedule', variant: 'schedule' },
    ];
    const overlay = [{ id: 'typing-9', sender: 'bot' as const, text: '', variant: 'typing' }];

    const merged = mergeTimelineWithOverlay(timeline, overlay, {
      awaitingBotReply: true,
      botReplyCountAtSend: 0,
      holdTypingReveal: false,
    });
    expect(merged.map((m) => m.id)).toEqual(['u1', 'typing-9']);
  });

  it('hides early bot reply while awaitingBotReply even before typing overlay commits', () => {
    const timeline = [
      { id: 'u1', sender: 'user' as const, text: 'Xem lịch xổ', sentContent: SCHEDULE_SHOW },
      { id: 'b2', sender: 'bot' as const, text: 'new schedule', variant: 'schedule' },
    ];

    const merged = mergeTimelineWithOverlay(timeline, [], {
      awaitingBotReply: true,
      botReplyCountAtSend: 0,
      holdTypingReveal: false,
    });
    expect(merged.map((m) => m.id)).toEqual(['u1']);
    expect(merged.some((m) => m.id === 'b2')).toBe(false);
  });
});
