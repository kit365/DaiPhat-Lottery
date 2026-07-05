export const SCHEDULE_TOKEN_ASK_LOCATION = 'SCHEDULE_ASK_LOCATION';
export const SCHEDULE_TOKEN_ASK_DATE = 'SCHEDULE_ASK_DATE';
export const SCHEDULE_TOKEN_ASK_DATE_MODE = 'SCHEDULE_ASK_DATE_MODE';
export const SCHEDULE_TOKEN_ASK_STATION_PREFIX = 'SCHEDULE_ASK_STATION:';
export const SCHEDULE_TOKEN_CONFIRM_STATION_PREFIX = 'SCHEDULE_CONFIRM_STATION:';
export const SCHEDULE_TOKEN_REGION_CHOICE_PREFIX = 'SCHEDULE_REGION_CHOICE:';
export const SCHEDULE_TOKEN_RESULT_PREFIX = 'SCHEDULE_RESULT:';
export const SCHEDULE_TOKEN_RESTART = 'SCHEDULE_RESTART';

export interface ParsedScheduleResult {
  region?: string;
  stationId?: number;
  stationIds?: number[];
  nationAll?: boolean;
  highlightDate?: string;
}

export interface BuildBuyTicketPathOptions {
  region?: string;
  stationId?: number;
  stationIds?: number[];
  highlightDate?: string;
}

export const buildBuyTicketPath = ({
  region,
  stationId,
  stationIds,
  highlightDate,
}: BuildBuyTicketPathOptions = {}): string => {
  const params = new URLSearchParams();
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

export const parseScheduleResultToken = (content: string): ParsedScheduleResult | null => {
  if (!content.startsWith(SCHEDULE_TOKEN_RESULT_PREFIX)) {
    return null;
  }

  const parsed: ParsedScheduleResult = {};
  const params = content.slice(SCHEDULE_TOKEN_RESULT_PREFIX.length).split(':');

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
        .map((id) => Number(id.trim()))
        .filter((id) => !Number.isNaN(id));
    }
    if (key === 'date') {
      parsed.highlightDate = value;
    }
    if (key === 'scope' && value === 'nation') {
      parsed.nationAll = true;
    }
    if (key === 'scope' && value === 'all' && parsed.region) {
      // region=MIEN_NAM:scope=all — region already set
    }
  });

  return parsed;
};

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
