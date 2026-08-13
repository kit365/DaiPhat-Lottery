import {
    isTodayDrawPassed,
    todayIsoVn,
    tomorrowIsoVn,
} from '../../../../client/utils/sellableDrawDate.util';

const isValidCutoffHhMm = (cutoff?: string | null): cutoff is string => {
    if (!cutoff?.trim()) return false;
    const [hourPart, minutePart] = cutoff.trim().split(':');
    const hour = Number(hourPart);
    const minute = Number(minutePart ?? 0);
    return (
        Number.isFinite(hour) &&
        Number.isFinite(minute) &&
        hour >= 0 &&
        hour <= 23 &&
        minute >= 0 &&
        minute <= 59
    );
};

/**
 * Earliest selectable business date for vendor allocation (bàn giao).
 * Aligns with BE `VendorOperationalTimingResolver`:
 * - past Vietnam calendar dates are closed
 * - after system `VENDOR_RETURN_CUTOFF` on the current VN day, today is also closed
 */
export const minVendorAllocationBusinessDate = (
    returnCutoff?: string | null,
    now: Date = new Date()
): string => {
    const today = todayIsoVn(now);
    if (!isValidCutoffHhMm(returnCutoff)) {
        return today;
    }
    return isTodayDrawPassed(returnCutoff, now) ? tomorrowIsoVn(now) : today;
};

export const resolveVendorAllocationBusinessDate = (
    raw: string | null | undefined,
    returnCutoff?: string | null,
    now: Date = new Date()
): string => {
    const min = minVendorAllocationBusinessDate(returnCutoff, now);
    if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw >= min) {
        return raw;
    }
    return min;
};
