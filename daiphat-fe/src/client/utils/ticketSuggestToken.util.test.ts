import { describe, expect, it } from 'vitest';
import {
  parseTicketSuggestToken,
  TICKET_SUGGEST_TOKEN_PREFIX,
} from './ticketSuggestToken.util';

describe('parseTicketSuggestToken', () => {
  it('parses bare token into cards payload', () => {
    const content =
      `${TICKET_SUGGEST_TOKEN_PREFIX}` +
      '[{"id":1,"numbers":"334455","stationId":3,"stationName":"Bến Tre","drawDate":"2026-07-21","price":10000}]';

    const parsed = parseTicketSuggestToken(content);
    expect(parsed).toMatchObject({
      tickets: [
        {
          id: 1,
          numbers: '334455',
          stationId: 3,
          stationName: 'Bến Tre',
          drawDate: '2026-07-21',
          price: 10000,
        },
      ],
    });
    expect(parsed?.text).toContain('gợi ý');
  });

  it('keeps leading empty-match copy above cards', () => {
    const content =
      'Kho chưa có số bạn tìm ("99"). Đây là vài vé đang bán hôm nay:\n\n' +
      `${TICKET_SUGGEST_TOKEN_PREFIX}` +
      '[{"id":9,"numbers":"111222","stationId":9,"stationName":"Bến Tre","drawDate":"2026-07-15","price":10000}]';

    const parsed = parseTicketSuggestToken(content);
    expect(parsed?.text).toContain('chưa có số bạn tìm');
    expect(parsed?.isEmptyMatch).toBe(true);
    expect(parsed?.tickets[0].numbers).toBe('111222');
  });

  it('returns null for plain bubbles', () => {
    expect(parseTicketSuggestToken('Xin chào')).toBeNull();
  });
});
