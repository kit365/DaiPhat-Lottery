import { formatDisplayDateToApi } from '@/client/types/lottery';

const REGION_TICKET_LENGTH: Record<string, number> = {
    MIEN_NAM: 6,
    MIEN_TRUNG: 6,
    MIEN_BAC: 5,
};

/** Chuyển ngày hiển thị hoặc ISO sang YYYY-MM-DD cho API. */
export const toApiDrawDate = (date: string): string => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }
    return formatDisplayDateToApi(date);
};

/** Chuẩn hóa dãy số vé theo độ dài miền (thêm số 0 đầu nếu thiếu). */
export const normalizeTicketNumberForCheck = (raw: string, region?: string | null): string => {
    const digits = raw.replace(/\D/g, '');
    const length = REGION_TICKET_LENGTH[(region ?? 'MIEN_NAM').toUpperCase()] ?? 6;

    if (digits.length > length) {
        return digits.slice(-length);
    }

    return digits.padStart(length, '0');
};

export const getTicketNumberLengthHint = (region?: string | null): number =>
    REGION_TICKET_LENGTH[(region ?? 'MIEN_NAM').toUpperCase()] ?? 6;
