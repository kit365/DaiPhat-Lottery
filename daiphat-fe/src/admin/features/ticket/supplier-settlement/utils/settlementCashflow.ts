/**
 * Supplier-settlement amounts are persisted as a payable delta:
 * positive means the agency must pay the supplier more.  The admin UI instead
 * presents the agency's cash position, where an outflow/cost is negative and a
 * saving/surplus is positive.
 */
export const toAgencyCashflow = (payableDelta?: number | null): number =>
    -Number(payableDelta ?? 0);

/** Converts the admin-facing cashflow convention back to the persisted payable convention. */
export const toSupplierPayableDelta = (agencyCashflow?: number | null): number =>
    -Number(agencyCashflow ?? 0);

/** Settlement matching/inspect screens show whole dong only. */
export const scaleSettlementMoney = (value: number): number => {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value);
};

export const formatSettlementMoney = (value?: number | null): string => {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return '—';
    }
    return Math.round(Number(value)).toLocaleString('vi-VN');
};

export const formatSignedCashflow = (
    amount: number | null | undefined,
    formatAmount: (value: number) => string = formatSettlementMoney,
): string => {
    const value = Number(amount ?? 0);
    if (!Number.isFinite(value)) {
        return '—';
    }
    return `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatAmount(Math.abs(value))}`;
};

export const getAgencyCashflowLabel = (amount: number): string => {
    if (amount > 0) return 'Dư / giảm chi';
    if (amount < 0) return 'Phát sinh chi phí';
    return 'Không đổi';
};
