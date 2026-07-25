import { normalizeTicketSearchDigits } from './ticketSearchQuery.util';

export const FAVORITES_STORAGE_KEY = 'daiphat.buyTicket.favoriteNumbers';

export const PRESET_TAIL_RANGES = [
  '00-09',
  '10-19',
  '20-29',
  '30-39',
  '40-49',
  '50-59',
  '60-69',
  '70-79',
  '80-89',
  '90-99',
] as const;

export type NumberTypeValue = 'DOUBLE' | 'SEQUENTIAL' | 'REPEATING';

export interface AppliedTicketFilters {
  searches: string[];
  tailRanges: string[];
  numberTypes: NumberTypeValue[];
}

export const EMPTY_APPLIED_FILTERS: AppliedTicketFilters = {
  searches: [],
  tailRanges: [],
  numberTypes: [],
};

/** Normalize UI labels like "00 - 09" → API "00-09". */
export const toApiTailRange = (label: string): string =>
  label.replace(/\s+/g, '').replace(/–/g, '-');

export const toUiTailRangeLabel = (apiRange: string): string => {
  const normalized = toApiTailRange(apiRange);
  const [from, to] = normalized.split('-');
  if (!from || !to) return apiRange;
  return `${from} - ${to}`;
};

export const loadFavoriteNumbers = (): string[] => {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeTicketSearchDigits(String(item), 6))
      .filter((item) => item.length >= 2);
  } catch {
    return [];
  }
};

export const saveFavoriteNumbers = (numbers: string[]): void => {
  const cleaned = Array.from(
    new Set(
      numbers
        .map((item) => normalizeTicketSearchDigits(item, 6))
        .filter((item) => item.length >= 2)
    )
  );
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(cleaned));
};

export const hasActiveTicketFilters = (filters: AppliedTicketFilters): boolean =>
  filters.searches.length > 0 ||
  filters.tailRanges.length > 0 ||
  filters.numberTypes.length > 0;

export const countActiveTicketFilters = (filters: AppliedTicketFilters): number =>
  filters.searches.length + filters.tailRanges.length + filters.numberTypes.length;
