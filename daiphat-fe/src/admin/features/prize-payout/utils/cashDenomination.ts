/** Smallest practical VND cash note for counter payouts. */
export const CASH_DENOMINATION_VND = 1_000;

export const CASH_DENOMINATION_INVALID_MESSAGE =
    'Số tiền mặt phải là bội số của 1.000đ (tối thiểu 1.000đ)';

/** Cash handed at the counter must be ≥ 1.000đ and a multiple of 1.000đ. */
export function isValidCashDenominationAmount(amount: number): boolean {
    return Number.isFinite(amount)
        && Number.isInteger(amount)
        && amount >= CASH_DENOMINATION_VND
        && amount % CASH_DENOMINATION_VND === 0;
}
