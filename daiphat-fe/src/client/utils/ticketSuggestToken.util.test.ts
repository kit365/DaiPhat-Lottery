import { describe, expect, it } from 'vitest';
import {
  formatChatMessageContent,
  parseTicketSuggestToken,
  splitTicketSuggestText,
  stripTicketSuggestToken,
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
    expect(parsed?.text).toContain('Dưới đây');
    expect(parsed?.text).toContain('quý khách');
  });

  it('keeps leading empty-match copy above cards', () => {
    const content =
      'Hiện Đại Phát chưa có vé khớp đuôi số 99. Trong lúc đó, dưới đây là vài vé đang bán hôm nay dành cho quý khách:\n\n' +
      `${TICKET_SUGGEST_TOKEN_PREFIX}` +
      '[{"id":9,"numbers":"111222","stationId":9,"stationName":"Bến Tre","drawDate":"2026-07-15","price":10000}]';

    const parsed = parseTicketSuggestToken(content);
    expect(parsed?.text).toContain('chưa có vé khớp đuôi số');
    expect(parsed?.isEmptyMatch).toBe(true);
    expect(parsed?.tickets[0].numbers).toBe('111222');
  });

  it('returns null for plain bubbles', () => {
    expect(parseTicketSuggestToken('Xin chào')).toBeNull();
  });

  it('strips token when JSON is invalid', () => {
    const content = 'Hiện chưa có vé khớp.\n\nTICKET_SUGGEST:[{bad json';
    expect(stripTicketSuggestToken(content)).toBe('Hiện chưa có vé khớp.');
  });

  it('formats admin-readable ticket list', () => {
    const content =
      'Dưới đây là 2 vé đang bán:\n\n' +
      `${TICKET_SUGGEST_TOKEN_PREFIX}` +
      '[{"id":1,"numbers":"579361","stationName":"Bến Tre","price":10000},{"id":2,"numbers":"579362","stationName":"TP.HCM","price":10000}]';

    expect(formatChatMessageContent(content)).toContain('579361');
    expect(formatChatMessageContent(content)).toContain('Bến Tre');
    expect(formatChatMessageContent(content)).not.toContain('TICKET_SUGGEST');
  });
});

describe('splitTicketSuggestText', () => {
  it('shows fortune reply then professional ticket intro', () => {
    const split = splitTicketSuggestText(
      'Đại Phát tra sổ mơ dân gian giúp quý khách: mơ thấy "bò" thường gắn với các số 09, 19, 49. Thông tin này chỉ mang tính tham khảo nhé.\n\nDưới đây là vài vé đang bán khớp đuôi số 09, 19, 49 dành cho quý khách:'
    );
    expect(split.reply).toContain('bò');
    expect(split.reply).toContain('chỉ mang tính tham khảo');
    expect(split.caption).toContain('Dưới đây là vài vé');
  });

  it('drops legacy searching status lines', () => {
    const split = splitTicketSuggestText(
      'Đại Phát tra sổ mơ dân gian giúp quý khách: mơ thấy "trâu" thường gắn với các số 09, 19, 49.\n\nĐang tìm vé khớp đuôi số: 09, 19, 49.\n\nDưới đây là vài vé đang bán khớp đuôi số 09, 19, 49 dành cho quý khách:'
    );
    expect(split.reply).toContain('trâu');
    expect(split.caption).toContain('Dưới đây');
    expect(split.reply).not.toContain('Đang tìm vé');
    expect(split.caption).not.toContain('Đang tìm vé');
  });
});
