/** Chuẩn hoá input tra cứu đuôi số / dãy số (2–6 chữ số). */
export const normalizeTicketSearchDigits = (raw: string | null | undefined, maxLen = 6): string =>
    (raw ?? '').replace(/\D/g, '').slice(0, maxLen);

export const isValidTicketSearchLength = (digits: string, minLen = 2): boolean =>
    digits.length === 0 || digits.length >= minLen;

export type TicketSearchModeValue = 'SUFFIX' | 'PREFIX' | 'EXACT' | 'CONTAINS';

export const normalizeTicketSearchMode = (
    raw: string | null | undefined,
    fallback: TicketSearchModeValue = 'SUFFIX'
): TicketSearchModeValue => {
    const value = (raw ?? '').trim().toUpperCase();
    if (value === 'SUFFIX' || value === 'PREFIX' || value === 'EXACT' || value === 'CONTAINS') {
        return value;
    }
    return fallback;
};
