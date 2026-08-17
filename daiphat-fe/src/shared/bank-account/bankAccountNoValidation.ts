/** NAPAS / hầu hết ngân hàng VN: STK chỉ gồm chữ số, thường 6–19 ký tự. */
export const BANK_ACCOUNT_NO_MIN_LENGTH = 6;
export const BANK_ACCOUNT_NO_MAX_LENGTH = 19;

export const BANK_ACCOUNT_NO_INVALID_MESSAGE =
    `Số tài khoản chỉ gồm chữ số, từ ${BANK_ACCOUNT_NO_MIN_LENGTH} đến ${BANK_ACCOUNT_NO_MAX_LENGTH} ký tự.`;

export function sanitizeBankAccountNoInput(raw: string): string {
    return raw.replace(/\D/g, '').slice(0, BANK_ACCOUNT_NO_MAX_LENGTH);
}

export function validateBankAccountNo(value: string): string | null {
    const normalized = value.trim();
    if (!normalized) {
        return 'Vui lòng nhập số tài khoản.';
    }
    if (!/^\d+$/.test(normalized)) {
        return 'Số tài khoản chỉ được chứa chữ số.';
    }
    if (normalized.length < BANK_ACCOUNT_NO_MIN_LENGTH) {
        return `Số tài khoản phải có ít nhất ${BANK_ACCOUNT_NO_MIN_LENGTH} chữ số.`;
    }
    if (normalized.length > BANK_ACCOUNT_NO_MAX_LENGTH) {
        return `Số tài khoản không được quá ${BANK_ACCOUNT_NO_MAX_LENGTH} chữ số.`;
    }
    return null;
}
