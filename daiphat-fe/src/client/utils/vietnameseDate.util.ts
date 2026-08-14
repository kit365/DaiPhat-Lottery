import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import { VIETNAM_TZ } from './sellableDrawDate.util';

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
    const dmyDash = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
    if (dmyDash) {
        return dayjs(`${dmyDash[1]}-${dmyDash[2]}-${dmyDash[3]}`, 'DD-MM-YYYY', true);
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

/** Formats as "04-08-2026" for fortune cast UI copy. */
export function formatFortuneDisplayDate(value?: string | null): string {
    if (!value) return '—';
    const parsed = parseDrawDate(value);
    if (!parsed.isValid()) return value;
    return parsed.format('DD-MM-YYYY');
}

/** Replace ISO `YYYY-MM-DD` dates inside prose with `DD-MM-YYYY`. */
export function localizeFortuneProseDates(prose: string): string {
    return prose.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_m, y, m, d) => `${d}-${m}-${y}`);
}

export function vietnameseWeekdayLabel(value?: string | null): string {
    if (!value) return '';
    const parsed = parseDrawDate(value);
    if (!parsed.isValid()) return '';
    return VI_WEEKDAY_BY_DAYJS[parsed.day()] ?? '';
}

/** Chuẩn hoá drawDate về `YYYY-MM-DD` (tránh lệch ngày do UTC). */
export function normalizeDrawDateIso(raw?: string | null): string {
    if (!raw) return '';
    const matched = raw.match(/\d{4}-\d{2}-\d{2}/);
    if (matched?.[0]) return matched[0];
    const parsed = parseDrawDate(raw);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
}

/** Hiển thị datetime theo giờ VN: `DD/MM/YYYY - HH:mm:ss`. */
export function formatVietnameseDateTime(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: VIETNAM_TZ,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value ?? '';

    return `${get('day')}/${get('month')}/${get('year')} - ${get('hour')}:${get('minute')}:${get('second')}`;
}
