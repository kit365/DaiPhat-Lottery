import dayjs from 'dayjs';
import 'dayjs/locale/vi';

dayjs.locale('vi');

// --- TYPES ---
export interface LotteryPrizes {
  special: string;
  first: string;
  second: string;
  third: string[];
  fourth: string[];
  fifth: string;
  sixth: string[];
  seventh: string;
  eighth: string;
}

export interface LotteryResult {
  id?: number;
  stationId?: number;
  province: string;
  date: string;
  dayOfWeek: string;
  prizes: LotteryPrizes;
  drawDateIso?: string;
  status?: string;
}

export type DisplayType = 'full' | '2-digit' | '3-digit';

export interface LotoRow {
  head: string;   // The focus digit (0-9)
  heads: string;  // Heads digits when focus is tail (Left column)
  tails: string;  // Tails digits when focus is head (Right column)
}

export interface LotteryResultApiResponse {
  id: number;
  stationId: number;
  stationName: string;
  drawDate: string;
  status: string;
}

export interface LotteryResultDetailApiResponse {
  prizeCode: string;
  winningNumber: string;
}

export interface LotteryResultLiveItemApiResponse {
  result: LotteryResultApiResponse;
  details: LotteryResultDetailApiResponse[];
  status: string | null;
  pollAfterSeconds: number | null;
}

export interface LotteryResultLiveSummaryApiResponse {
  region: string;
  drawDate: string;
  results: LotteryResultApiResponse[];
}

export interface LotteryResultLiveDetailsApiResponse {
  results: LotteryResultLiveItemApiResponse[];
}

export interface LotteryBoardData {
  region: string;
  drawDate: string;
  drawDateIso: string;
  results: LotteryResult[];
  availableProvinces: string[];
}

export interface LotteryStationDrawApiResponse {
  id: number;
  name: string;
  province?: string | null;
  region: string;
  drawDays?: string[];
  drawTime?: string | null;
  nextDrawDate?: string | null;
  thumbnailUrl?: string | null;
  image?: string | null;
}

export interface LotteryStationDraw {
  id: number;
  province: string;
  drawTime: string | null;
  nextDrawDate: string | null;
  thumbnailUrl?: string | null;
  image?: string | null;
}

const STATION_DISPLAY_NAME_MAP: Record<string, string> = {
  'Hồ Chí Minh': 'TP. Hồ Chí Minh'
};

export const EMPTY_PRIZES: LotteryPrizes = {
  special: '',
  first: '',
  second: '',
  third: [],
  fourth: [],
  fifth: '',
  sixth: [],
  seventh: '',
  eighth: '',
};

// --- HELPERS ---
export const getDisplayNumber = (num: string, type: DisplayType): string => {
  if (type === '2-digit') return num.slice(-2);
  if (type === '3-digit') return num.slice(-3);
  return num;
};

export const calculateLotoTable = (prizes: LotteryPrizes): LotoRow[] => {
  const allNumbers = [
    prizes.special, prizes.first, prizes.second,
    ...prizes.third, ...prizes.fourth,
    prizes.fifth, ...prizes.sixth,
    prizes.seventh, prizes.eighth
  ].filter(Boolean);

  const asHead: Record<string, Record<string, number>> = {};
  const asTail: Record<string, Record<string, number>> = {};

  for (let i = 0; i <= 9; i++) {
    asHead[i.toString()] = {};
    asTail[i.toString()] = {};
  }

  allNumbers.forEach(num => {
    const lastTwo = num.slice(-2);
    if (lastTwo.length === 2) {
      const head = lastTwo[0];
      const tail = lastTwo[1];
      asHead[head][tail] = (asHead[head][tail] || 0) + 1;
      asTail[tail][head] = (asTail[tail][head] || 0) + 1;
    }
  });

  const formatList = (counts: Record<string, number>): string => {
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([digit, count]) => {
        if (count > 1) return `${digit}^${count}`;
        return digit;
      })
      .join(', ');
  };

  return Array.from({ length: 10 }, (_, i) => {
    const focus = i.toString();
    return {
      head: focus,
      heads: formatList(asTail[focus]),
      tails: formatList(asHead[focus])
    };
  });
};

export const toProvinceDisplayName = (stationName: string): string =>
  STATION_DISPLAY_NAME_MAP[stationName] || stationName;

export const formatApiDateToDisplay = (date: string): string =>
  dayjs(date).isValid() ? dayjs(date).format('DD/MM/YYYY') : date;

export const formatDisplayDateToApi = (date: string): string =>
  /^\d{2}\/\d{2}\/\d{4}$/.test(date)
    ? `${date.slice(6, 10)}-${date.slice(3, 5)}-${date.slice(0, 2)}`
    : date;

export const getDayOfWeekLabel = (date: string): string => {
  const parsed = dayjs(date);
  if (!parsed.isValid()) {
    return '';
  }

  const label = parsed.format('dddd');
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const buildRecentDateOptions = (days: number = 14): string[] =>
  Array.from({ length: days }, (_, index) =>
    dayjs().subtract(index, 'day').format('DD/MM/YYYY')
  );

export const isTodayDisplayDate = (date: string): boolean =>
  date === dayjs().format('DD/MM/YYYY');

export const isTomorrowDisplayDate = (date: string): boolean =>
  date === dayjs().add(1, 'day').format('DD/MM/YYYY');

export const buildCountdownTarget = (date: string, drawTime?: string | null): Date | null => {
  if (!drawTime) {
    return null;
  }

  const apiDate = formatDisplayDateToApi(date);
  const target = new Date(`${apiDate}T${drawTime}:00`);
  return Number.isNaN(target.getTime()) ? null : target;
};

export const mapStationDrawToClient = (
  item: LotteryStationDrawApiResponse
): LotteryStationDraw => ({
  id: item.id,
  province: toProvinceDisplayName(item.name || item.province || ''),
  drawTime: item.drawTime || null,
  nextDrawDate: item.nextDrawDate || null,
  thumbnailUrl: item.thumbnailUrl || null,
  image: item.image || null,
});

export const mapResultSummaryToLotteryResult = (
  item: LotteryResultApiResponse
): LotteryResult => ({
  id: item.id,
  stationId: item.stationId,
  province: toProvinceDisplayName(item.stationName),
  date: formatApiDateToDisplay(item.drawDate),
  dayOfWeek: getDayOfWeekLabel(item.drawDate),
  drawDateIso: item.drawDate,
  status: item.status,
  prizes: {
    ...EMPTY_PRIZES,
  },
});

const getWinningNumbersByPrizeCode = (
  details: LotteryResultDetailApiResponse[],
  prizeCode: string
): string[] =>
  details
    .filter((detail) => detail.prizeCode === prizeCode)
    .sort((a, b) => a.id - b.id)
    .map((detail) => detail.winningNumber);

export const mapLiveItemToLotteryResult = (
  item: LotteryResultLiveItemApiResponse
): LotteryResult => {
  const drawDateLabel = formatApiDateToDisplay(item.result.drawDate);

  return {
    id: item.result.id,
    stationId: item.result.stationId,
    province: toProvinceDisplayName(item.result.stationName),
    date: drawDateLabel,
    dayOfWeek: getDayOfWeekLabel(item.result.drawDate),
    drawDateIso: item.result.drawDate,
    status: item.result.status,
    prizes: {
      special: getWinningNumbersByPrizeCode(item.details, 'DB')[0] || '',
      first: getWinningNumbersByPrizeCode(item.details, 'G1')[0] || '',
      second: getWinningNumbersByPrizeCode(item.details, 'G2')[0] || '',
      third: getWinningNumbersByPrizeCode(item.details, 'G3'),
      fourth: getWinningNumbersByPrizeCode(item.details, 'G4'),
      fifth: getWinningNumbersByPrizeCode(item.details, 'G5')[0] || '',
      sixth: getWinningNumbersByPrizeCode(item.details, 'G6'),
      seventh: getWinningNumbersByPrizeCode(item.details, 'G7')[0] || '',
      eighth: getWinningNumbersByPrizeCode(item.details, 'G8')[0] || ''
    }
  };
};

export const mergeResultWithLiveDetails = (
  result: LotteryResult,
  liveItem?: LotteryResultLiveItemApiResponse
): LotteryResult => {
  if (!liveItem) {
    return result;
  }

  const detailed = mapLiveItemToLotteryResult(liveItem);
  return {
    ...result,
    ...detailed,
    id: result.id ?? detailed.id,
    stationId: result.stationId ?? detailed.stationId,
  };
};

export interface TicketMatchedPrize {
  prizeLevel: string;
  prizeDisplayName: string;
  prizeCode: string;
  prizeValue: number;
  matchDigits: number;
  matchFrom: string;
  matchFromDisplayName: string;
  winningNumber: string;
}

export interface TicketCheckResult {
  resultId: number;
  stationId: number;
  stationName: string;
  drawDate: string;
  ticketNumber: string;
  resultStatus: string;
  resultAvailable: boolean;
  canCheck: boolean;
  winning: boolean;
  totalWinningAmount: number;
  matchedPrizes: TicketMatchedPrize[];
}
