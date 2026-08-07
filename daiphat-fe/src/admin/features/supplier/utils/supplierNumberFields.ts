import type { WheelEvent } from 'react';

/** Display-only Vietnamese thousand separators (1.000). */
export const formatViInteger = (value: number | null | undefined): string => {
    if (value == null || Number.isNaN(value)) {
        return '';
    }
    return Math.trunc(value).toLocaleString('vi-VN');
};

/** Parse digits only; always non-negative. Empty -> null. */
export const parseNonNegativeIntegerInput = (raw: string): number | null => {
    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) {
        return null;
    }
    const parsed = Number(digits);
    if (!Number.isFinite(parsed)) {
        return null;
    }
    return Math.max(0, Math.trunc(parsed));
};

/**
 * Stop mouse-wheel from changing focused number inputs.
 * React registers `onWheel` as passive, so `preventDefault()` is not allowed and
 * triggers a console warning. Blurring the field is enough: once unfocused,
 * the wheel no longer increments/decrements the value (and cannot go below 0).
 */
export const preventNumberInputWheel = (event: WheelEvent<HTMLElement>) => {
    if (event.target && 'blur' in event.target && typeof (event.target as any).blur === 'function') {
        (event.target as HTMLElement).blur();
    }
};
