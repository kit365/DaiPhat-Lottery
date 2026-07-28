export const SCHEDULE_TOKEN_ASK_LOCATION = 'SCHEDULE_ASK_LOCATION';
export const SCHEDULE_TOKEN_ASK_DATE = 'SCHEDULE_ASK_DATE';
export const SCHEDULE_TOKEN_ASK_DATE_MODE = 'SCHEDULE_ASK_DATE_MODE';
export const SCHEDULE_TOKEN_ASK_STATION_PREFIX = 'SCHEDULE_ASK_STATION:';
export const SCHEDULE_TOKEN_CONFIRM_STATION_PREFIX = 'SCHEDULE_CONFIRM_STATION:';
export const SCHEDULE_TOKEN_SELECT_STATION_PREFIX = 'SCHEDULE_SELECT_STATION:';
export const SCHEDULE_TOKEN_STATION_READY_PREFIX = 'SCHEDULE_STATION_READY:';
export const SCHEDULE_TOKEN_ASK_GOAL = 'SCHEDULE_ASK_GOAL';
export const SCHEDULE_TOKEN_SET_GOAL_PREFIX = 'SCHEDULE_SET_GOAL:';
export const SCHEDULE_TOKEN_SHOW_PREFIX = 'SCHEDULE_SHOW:';
export const SCHEDULE_TOKEN_PICK_STATION_PAGE_PREFIX = 'SCHEDULE_PICK_STATION_PAGE:';
export const SCHEDULE_TOKEN_PICK_STATION_LIST_PREFIX = 'SCHEDULE_PICK_STATION_LIST:';
export const SCHEDULE_TOKEN_REGION_CHOICE_PREFIX = 'SCHEDULE_REGION_CHOICE:';
export const SCHEDULE_TOKEN_RESULT_PREFIX = 'SCHEDULE_RESULT:';
export const SCHEDULE_TOKEN_RESULT_SUMMARY_PREFIX = 'SCHEDULE_RESULT_SUMMARY:';
export const SCHEDULE_TOKEN_RESTART = 'SCHEDULE_RESTART';

export interface ParsedScheduleResult {
  region?: string;
  stationId?: number;
  stationIds?: number[];
  nationAll?: boolean;
  regionToday?: boolean;
  highlightDate?: string;
}

export interface BuildBuyTicketPathOptions {
  region?: string;
  stationId?: number;
  stationIds?: number[];
  highlightDate?: string;
  ticketId?: number;
  /** Pre-fill search bar so the suggested ticket is visible on buy-ticket page. */
  search?: string;
}

export interface BuildLotteryResultsPathOptions {
  stationId?: number;
  stationIds?: number[];
  drawDate?: string;
  region?: string;
}

export const buildBuyTicketPath = ({
  region,
  stationId,
  stationIds,
  highlightDate,
  ticketId,
  search,
}: BuildBuyTicketPathOptions = {}): string => {
  const params = new URLSearchParams();
  if (ticketId != null && !Number.isNaN(ticketId)) {
    params.set('ticketId', String(ticketId));
  }
  if (search?.trim()) {
    params.set('search', search.trim());
  }
  if (stationId != null && !Number.isNaN(stationId)) {
    params.set('stationId', String(stationId));
  } else if (stationIds && stationIds.length > 0) {
    params.set('stationIds', stationIds.join(','));
  } else if (region) {
    params.set('region', region);
  }
  if (highlightDate) {
    params.set('drawDate', highlightDate);
  }
  const query = params.toString();
  return query ? `/buy-ticket?${query}` : '/buy-ticket';
};

export const buildLotteryResultsPath = ({
  stationId,
  stationIds,
  drawDate,
  region,
}: BuildLotteryResultsPathOptions = {}): string => {
  const params = new URLSearchParams();
  if (stationId != null && !Number.isNaN(stationId)) {
    params.set('stationId', String(stationId));
  } else if (stationIds && stationIds.length > 0) {
    params.set('stationIds', stationIds.join(','));
  }
  if (drawDate) {
    params.set('drawDate', drawDate);
  }
  if (region) {
    params.set('region', region);
  }
  const query = params.toString();
  return query ? `/?${query}` : '/';
};

const parseScheduleTokenParams = (content: string, prefix: string): ParsedScheduleResult | null => {
  if (!content.startsWith(prefix)) {
    return null;
  }

  const parsed: ParsedScheduleResult = {};
  const params = content.slice(prefix.length).split(':');

  params.forEach((part) => {
    const [key, value] = part.split('=');
    if (!key || !value) {
      return;
    }
    if (key === 'region') {
      parsed.region = value;
    }
    if (key === 'station') {
      parsed.stationId = Number(value);
    }
    if (key === 'stations') {
      parsed.stationIds = value
        .split(',')
        .map((segment) => {
          const idPart = segment.split(':')[0]?.trim();
          return idPart ? Number(idPart) : Number.NaN;
        })
        .filter((id) => !Number.isNaN(id));
    }
    if (key === 'date') {
      parsed.highlightDate = value;
    }
    if (key === 'scope' && value === 'nation') {
      parsed.nationAll = true;
    }
    if (key === 'scope' && value === 'today') {
      parsed.regionToday = true;
    }
    if (key === 'scope' && value === 'all' && parsed.region) {
      // region=MIEN_NAM:scope=all — region already set
    }
  });

  return parsed;
};

export const parseScheduleResultToken = (content: string): ParsedScheduleResult | null =>
  parseScheduleTokenParams(content, SCHEDULE_TOKEN_RESULT_PREFIX);

export const parseScheduleResultSummaryToken = (content: string): ParsedScheduleResult | null =>
  parseScheduleTokenParams(content, SCHEDULE_TOKEN_RESULT_SUMMARY_PREFIX);

export interface ConfirmStationOption {
  id: number;
  name: string;
}

export const parseConfirmStationToken = (content: string): ConfirmStationOption[] | null => {
  if (!content.startsWith(SCHEDULE_TOKEN_CONFIRM_STATION_PREFIX)) {
    return null;
  }
  const raw = content.slice(SCHEDULE_TOKEN_CONFIRM_STATION_PREFIX.length);
  const options = raw
    .split(',')
    .map((segment) => {
      const [idPart, ...nameParts] = segment.split(':');
      const id = Number(idPart?.trim());
      if (Number.isNaN(id)) {
        return null;
      }
      const name = nameParts.join(':').trim();
      return { id, name: name || `Đài ${id}` };
    })
    .filter((option): option is ConfirmStationOption => option !== null);
  return options.length > 0 ? options : null;
};

/**
 * Station list payload is `id:Name,id:Name` but BE may append trailing meta after it
 * (`:goal=RESULT`, `:hasNext=true`). Those must not become part of the last station name.
 */
const stripTrailingPickStationMeta = (stationsPart: string): string =>
  stationsPart
    .replace(/:goal=[A-Za-z_]+$/i, '')
    .replace(/:hasNext=(true|false)$/i, '');

const parseStationOptionSegment = (segment: string): ConfirmStationOption | null => {
  const [idPart, ...nameParts] = segment.split(':');
  const id = Number(idPart?.trim());
  if (Number.isNaN(id)) {
    return null;
  }
  // Drop accidental meta fragments inside a segment (defense in depth).
  const name = nameParts
    .filter((part) => !/^(goal|hasNext|page|region|date)=/i.test(part.trim()))
    .join(':')
    .trim();
  return { id, name: name || `Đài ${id}` };
};

export const parsePickStationListToken = (content: string): ConfirmStationOption[] | null => {
  if (!content.startsWith(SCHEDULE_TOKEN_PICK_STATION_LIST_PREFIX)) {
    return null;
  }
  const payload = content.slice(SCHEDULE_TOKEN_PICK_STATION_LIST_PREFIX.length);
  const stationsIndex = payload.indexOf('stations=');
  if (stationsIndex < 0) {
    return null;
  }
  const stationsPart = stripTrailingPickStationMeta(
    payload.slice(stationsIndex + 'stations='.length)
  );
  const options = stationsPart
    .split(',')
    .map((segment) => parseStationOptionSegment(segment))
    .filter((option): option is ConfirmStationOption => option !== null);
  return options.length > 0 ? options : null;
};

export interface ParsedStationReady {
  stationId?: number;
  region?: string;
  stationName?: string;
}

export const buildSelectStationMessage = (stationId: number, stationName?: string): string => {
  const base = `${SCHEDULE_TOKEN_SELECT_STATION_PREFIX}id=${stationId}`;
  const trimmedName = stationName?.trim();
  if (!trimmedName) {
    return base;
  }
  // Avoid breaking token parsers that split on ':'.
  const safeName = trimmedName.replace(/:/g, ' ');
  return `${base}:name=${safeName}`;
};

export const buildSetGoalMessage = (goal: 'SCHEDULE' | 'RESULT' | 'TICKET'): string =>
  `${SCHEDULE_TOKEN_SET_GOAL_PREFIX}${goal}`;

export interface BuildShowScheduleOptions {
  goal: 'SCHEDULE' | 'RESULT' | 'TICKET';
  region?: string;
  stationId?: number;
  scope?: 'all' | 'today';
  date?: string;
}

/** Hub footer: hiện lịch/kết quả ngay (không hỏi lại slot). */
export const buildShowScheduleMessage = ({
  goal,
  region,
  stationId,
  scope = 'all',
  date,
}: BuildShowScheduleOptions): string => {
  const parts = [`goal=${goal}`];
  if (stationId != null && !Number.isNaN(stationId)) {
    parts.push(`station=${stationId}`);
  } else {
    parts.push(`region=${region ?? 'MIEN_NAM'}`);
    parts.push(`scope=${scope}`);
  }
  if (date) {
    parts.push(`date=${date}`);
  }
  return `${SCHEDULE_TOKEN_SHOW_PREFIX}${parts.join(':')}`;
};

export const buildPickStationPageMessage = (page: number): string =>
  `${SCHEDULE_TOKEN_PICK_STATION_PAGE_PREFIX}page=${page}`;

export const isSelectStationMessage = (content: string): boolean =>
  content.trim().startsWith(SCHEDULE_TOKEN_SELECT_STATION_PREFIX);

export const parseSelectStationId = (content: string): number | undefined => {
  if (!isSelectStationMessage(content)) {
    return undefined;
  }
  const payload = content.trim().slice(SCHEDULE_TOKEN_SELECT_STATION_PREFIX.length);
  const idRaw = payload.startsWith('id=') ? payload.slice(3) : payload;
  const idPart = idRaw.split(':')[0]?.trim() ?? '';
  const id = Number(idPart);
  return Number.isNaN(id) ? undefined : id;
};

export const parseSelectStationName = (content: string): string | undefined => {
  if (!isSelectStationMessage(content)) {
    return undefined;
  }
  const payload = content.trim().slice(SCHEDULE_TOKEN_SELECT_STATION_PREFIX.length);
  const namePart = payload.split(':').find((part) => part.startsWith('name='));
  const name = namePart?.slice('name='.length).trim();
  return name || undefined;
};

export const resolveSelectStationDisplayLabel = (
  content: string,
  options?: ConfirmStationOption[]
): string | undefined => {
  const stationId = parseSelectStationId(content);
  if (stationId == null) {
    return undefined;
  }
  const fromToken = parseSelectStationName(content);
  if (fromToken) {
    return fromToken;
  }
  return options?.find((option) => option.id === stationId)?.name ?? `Đài ${stationId}`;
};

export const parseStationReadyToken = (content: string): ParsedStationReady | null => {
  if (!content.startsWith(SCHEDULE_TOKEN_STATION_READY_PREFIX)) {
    return null;
  }
  const parsed: ParsedStationReady = {};
  const params = content.slice(SCHEDULE_TOKEN_STATION_READY_PREFIX.length).split(':');
  params.forEach((part) => {
    const [key, ...valueParts] = part.split('=');
    const value = valueParts.join('=');
    if (!key || !value) {
      return;
    }
    if (key === 'station') {
      parsed.stationId = Number(value);
    }
    if (key === 'region') {
      parsed.region = value;
    }
    if (key === 'name') {
      parsed.stationName = value;
    }
  });
  return parsed;
};

export const parsePickStationListMeta = (
  content: string
): { hasNext?: boolean; page?: number } | null => {
  if (!content.startsWith(SCHEDULE_TOKEN_PICK_STATION_LIST_PREFIX)) {
    return null;
  }
  const payload = content.slice(SCHEDULE_TOKEN_PICK_STATION_LIST_PREFIX.length);
  const meta: { hasNext?: boolean; page?: number } = {};
  payload.split(':').forEach((part) => {
    if (part.startsWith('page=')) {
      meta.page = Number(part.slice(5));
    }
    if (part === 'hasNext=true') {
      meta.hasNext = true;
    }
  });
  return meta;
};

export const parsePickStationListRegion = (content: string): string | undefined => {
  if (!content.startsWith(SCHEDULE_TOKEN_PICK_STATION_LIST_PREFIX)) {
    return undefined;
  }
  const payload = content.slice(SCHEDULE_TOKEN_PICK_STATION_LIST_PREFIX.length);
  const regionPart = payload.split(':').find((part) => part.startsWith('region='));
  return regionPart?.slice('region='.length);
};
