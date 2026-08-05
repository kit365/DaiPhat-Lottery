import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

/** Vietnamese weekday labels matching product copy (Thứ 2 … Chủ nhật). */
const VI_WEEKDAY_BY_DAYJS: readonly string[] = [
    'Chủ nhật',
    'Thứ 2',
    'Thứ 3',
    'Thứ 4',
    'Thứ 5',
    'Thứ 6',
    'Thứ 7',
];

/** Parse draw dates as calendar dates (avoid UTC day-shift / English `dddd`). */
function parseDrawDate(value: string) {
    const trimmed = value.trim();
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (isoDate) {
        return dayjs(`${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`, 'YYYY-MM-DD', true);
    }
    const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
    if (dmy) {
        return dayjs(`${dmy[1]}/${dmy[2]}/${dmy[3]}`, 'DD/MM/YYYY', true);
    }
    return dayjs(trimmed);
}

/**
 * Formats a draw date as "Thứ 2, 03/08/2026" (never English Monday/Tuesday).
 */
export function formatVietnameseDrawDate(value?: string | null): string {
    if (!value) return '—';
    const parsed = parseDrawDate(value);
    if (!parsed.isValid()) return '—';
    const weekday = VI_WEEKDAY_BY_DAYJS[parsed.day()] ?? '';
    return `${weekday}, ${parsed.format('DD/MM/YYYY')}`;
}

/** Formats as "03/08/2026 (Thứ 2)". */
export function formatVietnameseDrawDateWithParen(value?: string | null): string {
    if (!value) return '—';
    const parsed = parseDrawDate(value);
    if (!parsed.isValid()) return '—';
    const weekday = VI_WEEKDAY_BY_DAYJS[parsed.day()] ?? '';
    return `${parsed.format('DD/MM/YYYY')} (${weekday})`;
}

export function vietnameseWeekdayLabel(value?: string | null): string {
    if (!value) return '';
    const parsed = parseDrawDate(value);
    if (!parsed.isValid()) return '';
    return VI_WEEKDAY_BY_DAYJS[parsed.day()] ?? '';
}
