import { describe, expect, it } from 'vitest';
import {
  buildBuyTicketPath,
  buildLotteryResultsPath,
  buildSelectStationMessage,
  parseConfirmStationToken,
  parsePickStationListMeta,
  parsePickStationListToken,
  parseScheduleResultSummaryToken,
  parseScheduleResultToken,
  parseStationReadyToken,
  SCHEDULE_TOKEN_CONFIRM_STATION_PREFIX,
  SCHEDULE_TOKEN_PICK_STATION_LIST_PREFIX,
  SCHEDULE_TOKEN_RESULT_PREFIX,
  SCHEDULE_TOKEN_RESULT_SUMMARY_PREFIX,
  SCHEDULE_TOKEN_SELECT_STATION_PREFIX,
  SCHEDULE_TOKEN_STATION_READY_PREFIX,
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

  it('parses region today scope with stations', () => {
    const result = parseScheduleResultToken(
      `${SCHEDULE_TOKEN_RESULT_PREFIX}region=MIEN_NAM:scope=today:stations=1,2,3:date=2026-07-27`
    );
    expect(result).toEqual({
      region: 'MIEN_NAM',
      regionToday: true,
      stationIds: [1, 2, 3],
      highlightDate: '2026-07-27',
    });
  });

  it('parses nation scope without date', () => {
    const result = parseScheduleResultToken(`${SCHEDULE_TOKEN_RESULT_PREFIX}scope=nation`);
    expect(result).toEqual({
      nationAll: true,
    });
  });
});

describe('parseScheduleResultSummaryToken', () => {
  it('parses summary token with region and stations', () => {
    const result = parseScheduleResultSummaryToken(
      `${SCHEDULE_TOKEN_RESULT_SUMMARY_PREFIX}region=MIEN_NAM:stations=1,2,3:date=2026-07-27`
    );
    expect(result).toEqual({
      region: 'MIEN_NAM',
      stationIds: [1, 2, 3],
      highlightDate: '2026-07-27',
    });
  });

  it('parses station name on single-station summary', () => {
    const result = parseScheduleResultSummaryToken(
      `${SCHEDULE_TOKEN_RESULT_SUMMARY_PREFIX}station=3:region=MIEN_NAM:stationName=B%E1%BA%BFn%20Tre:date=2026-07-28`
    );
    expect(result?.stationId).toBe(3);
    expect(result?.stationName).toBe('Bến Tre');
  });
});

describe('buildBuyTicketPath', () => {
  it('builds path for single station with draw date', () => {
    expect(buildBuyTicketPath({ stationId: 42, highlightDate: '2026-07-04' })).toBe(
      '/buy-ticket?stationId=42&drawDate=2026-07-04'
    );
  });

  it('builds path with ticketId from chat CTA', () => {
    expect(
      buildBuyTicketPath({ ticketId: 99, stationId: 3, highlightDate: '2026-07-21' })
    ).toBe('/buy-ticket?ticketId=99&stationId=3&drawDate=2026-07-21');
  });

  it('builds path for region scope', () => {
    expect(buildBuyTicketPath({ region: 'MIEN_NAM' })).toBe('/buy-ticket?region=MIEN_NAM');
  });

  it('falls back to buy ticket page without query', () => {
    expect(buildBuyTicketPath({})).toBe('/buy-ticket');
  });
});

describe('buildLotteryResultsPath', () => {
  it('builds home path with station and draw date', () => {
    expect(buildLotteryResultsPath({ stationId: 7, drawDate: '2026-07-29' })).toBe(
      '/?stationId=7&drawDate=2026-07-29'
    );
  });

  it('builds home path with multiple stations and draw date', () => {
    expect(buildLotteryResultsPath({ stationIds: [1, 2, 3], drawDate: '2026-07-27' })).toBe(
      '/?stationIds=1%2C2%2C3&drawDate=2026-07-27'
    );
  });

  it('builds home path with region and draw date', () => {
    expect(buildLotteryResultsPath({ region: 'MIEN_NAM', drawDate: '2026-07-27' })).toBe(
      '/?drawDate=2026-07-27&region=MIEN_NAM'
    );
  });
});

describe('parsePickStationListToken', () => {
  it('parses today station chips from pick-station-list token', () => {
    const result = parsePickStationListToken(
      `${SCHEDULE_TOKEN_PICK_STATION_LIST_PREFIX}region=MIEN_NAM:date=2026-07-27:stations=1:Cà Mau,2:Hồ Chí Minh`
    );
    expect(result).toEqual([
      { id: 1, name: 'Cà Mau' },
      { id: 2, name: 'Hồ Chí Minh' },
    ]);
  });

  it('does not leak trailing goal=RESULT into the last station name', () => {
    const result = parsePickStationListToken(
      `${SCHEDULE_TOKEN_PICK_STATION_LIST_PREFIX}region=MIEN_NAM:date=2026-07-27:stations=1:Cà Mau,2:Hồ Chí Minh,3:Đồng Tháp:goal=RESULT`
    );
    expect(result).toEqual([
      { id: 1, name: 'Cà Mau' },
      { id: 2, name: 'Hồ Chí Minh' },
      { id: 3, name: 'Đồng Tháp' },
    ]);
  });

  it('parses goal before stations without polluting names', () => {
    const result = parsePickStationListToken(
      `${SCHEDULE_TOKEN_PICK_STATION_LIST_PREFIX}goal=RESULT:region=MIEN_NAM:date=2026-07-27:stations=7:Cà Mau,18:Hồ Chí Minh,11:Đồng Tháp`
    );
    expect(result).toEqual([
      { id: 7, name: 'Cà Mau' },
      { id: 18, name: 'Hồ Chí Minh' },
      { id: 11, name: 'Đồng Tháp' },
    ]);
  });

  it('does not leak trailing hasNext into the last station name', () => {
    const result = parsePickStationListToken(
      `${SCHEDULE_TOKEN_PICK_STATION_LIST_PREFIX}region=MIEN_NAM:page=1:stations=1:Cà Mau,2:Bạc Liêu:hasNext=true`
    );
    expect(result).toEqual([
      { id: 1, name: 'Cà Mau' },
      { id: 2, name: 'Bạc Liêu' },
    ]);
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

describe('select station token helpers', () => {
  it('builds select station message with id', () => {
    expect(buildSelectStationMessage(5)).toBe(`${SCHEDULE_TOKEN_SELECT_STATION_PREFIX}id=5`);
  });

  it('builds select station message with display name', () => {
    expect(buildSelectStationMessage(7, 'Cà Mau')).toBe(
      `${SCHEDULE_TOKEN_SELECT_STATION_PREFIX}id=7:name=Cà Mau`
    );
  });

  it('parses station ready token', () => {
    const result = parseStationReadyToken(
      `${SCHEDULE_TOKEN_STATION_READY_PREFIX}station=5:region=MIEN_NAM:name=Bạc Liêu`
    );
    expect(result).toEqual({
      stationId: 5,
      region: 'MIEN_NAM',
      stationName: 'Bạc Liêu',
    });
  });

  it('parses pick station list pagination meta', () => {
    const result = parsePickStationListMeta(
      `${SCHEDULE_TOKEN_PICK_STATION_LIST_PREFIX}region=MIEN_NAM:page=1:stations=1:Cà Mau:hasNext=true`
    );
    expect(result).toEqual({ page: 1, hasNext: true });
  });
});
