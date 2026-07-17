export type TicketNumberLengthRules = {
    minLength: number;
    maxLength: number;
};

export const DEFAULT_TICKET_NUMBER_LENGTH_RULES: TicketNumberLengthRules = {
    minLength: 6,
    maxLength: 6,
};

export const getTicketNumberLengthMessage = (rules: TicketNumberLengthRules): string => {
    const { minLength, maxLength } = rules;
    if (minLength === maxLength) {
        return `Dãy số phải có đúng ${minLength} chữ số.`;
    }
    return `Dãy số phải có từ ${minLength} đến ${maxLength} chữ số.`;
};

export const getTicketNumberLengthHint = (rules: TicketNumberLengthRules): string => {
    const { minLength, maxLength } = rules;
    if (minLength === maxLength) {
        return `Nhập ${minLength} chữ số`;
    }
    return `Nhập ${minLength}–${maxLength} chữ số`;
};

export const sanitizeTicketNumberInput = (value: string, maxLength: number): string =>
    value.replace(/\D/g, '').slice(0, maxLength);

export const isTicketNumberLengthValid = (value: string, rules: TicketNumberLengthRules): boolean => {
    const trimmed = value.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) {
        return false;
    }
    const length = trimmed.length;
    return length >= rules.minLength && length <= rules.maxLength;
};

export type RegionLengthSource = {
    minLength?: number;
    maxLength?: number;
    minNumber?: number;
    maxNumber?: number;
    numberLength?: number;
};

export const resolveRegionLengthRules = (
    region?: RegionLengthSource | null
): TicketNumberLengthRules => {
    if (!region) {
        return DEFAULT_TICKET_NUMBER_LENGTH_RULES;
    }

    if (region.minLength != null && region.maxLength != null) {
        return { minLength: region.minLength, maxLength: region.maxLength };
    }

    const maxLength =
        region.maxLength ??
        region.numberLength ??
        String(region.maxNumber ?? 999_999).length;

    const minLength =
        region.minLength ??
        (region.minNumber === 0 || region.minNumber == null
            ? maxLength
            : String(region.minNumber).length);

    return { minLength, maxLength };
};

export const isTicketNumberLengthApiError = (error: unknown): boolean => {
    const code = (error as any)?.response?.data?.code ?? (error as any)?.response?.data?.errorCode;
    return code === 'LT_016';
};
