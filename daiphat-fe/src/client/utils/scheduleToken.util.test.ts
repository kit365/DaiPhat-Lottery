import { describe, expect, it } from 'vitest';
import {
  buildBuyTicketPath,
  parseConfirmStationToken,
  parseScheduleResultToken,
  SCHEDULE_TOKEN_CONFIRM_STATION_PREFIX,
  SCHEDULE_TOKEN_RESULT_PREFIX,
} from './scheduleToken.util';

describe('parseScheduleResultToken', () => {
  it('parses single station with date', () => {
    const result = parseScheduleResultToken(`${SCHEDULE_TOKEN_RESULT_PREFIX}station=42:date=2026-07-04`);
    expect(result).toEqual({
      stationId: 42,
      highlightDate: '2026-07-04',
    });
  });

  it('parses multiple stations without date for all-days', () => {
    const result = parseScheduleResultToken(`${SCHEDULE_TOKEN_RESULT_PREFIX}stations=1,2,3`);
    expect(result).toEqual({
      stationIds: [1, 2, 3],
    });
  });

  it('parses region all scope with date', () => {
    const result = parseScheduleResultToken(
      `${SCHEDULE_TOKEN_RESULT_PREFIX}region=MIEN_NAM:date=2026-07-04:scope=all`
    );
    expect(result).toEqual({
      region: 'MIEN_NAM',
      highlightDate: '2026-07-04',
    });
  });

  it('parses nation scope without date', () => {
    const result = parseScheduleResultToken(`${SCHEDULE_TOKEN_RESULT_PREFIX}scope=nation`);
    expect(result).toEqual({
      nationAll: true,
    });
  });
});

describe('buildBuyTicketPath', () => {
  it('builds path for single station with draw date', () => {
    expect(buildBuyTicketPath({ stationId: 42, highlightDate: '2026-07-04' })).toBe(
      '/buy-ticket?stationId=42&drawDate=2026-07-04'
    );
  });

  it('builds path for region scope', () => {
    expect(buildBuyTicketPath({ region: 'MIEN_NAM' })).toBe('/buy-ticket?region=MIEN_NAM');
  });

  it('falls back to buy ticket page without query', () => {
    expect(buildBuyTicketPath({})).toBe('/buy-ticket');
  });
});

describe('parseConfirmStationToken', () => {
  it('parses candidate station ids and names', () => {
    const result = parseConfirmStationToken(`${SCHEDULE_TOKEN_CONFIRM_STATION_PREFIX}5:Bến Tre,12:Tiền Giang`);
    expect(result).toEqual([
      { id: 5, name: 'Bến Tre' },
      { id: 12, name: 'Tiền Giang' },
    ]);
  });
});
