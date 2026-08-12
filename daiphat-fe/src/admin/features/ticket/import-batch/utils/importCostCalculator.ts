export { formatVnd } from '../../../../utils/currency';

/**
 * Unit import cost (costPrice) from station sale price and commission rate.
 * Matches backend ImportCostCalculator: HALF_UP to 3 decimal places.
 */
export const IMPORT_COST_SCALE = 3;

export const computeImportCostFromStation = (
    salePrice?: number | null,
    commissionRate?: number | null
): number | null => {
    const price = Number(salePrice);
    const rate = Number(commissionRate);
    if (!Number.isFinite(price) || price <= 0) {
        return null;
    }
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
        return null;
    }
    const raw = price * (1 - rate);
    const factor = 10 ** IMPORT_COST_SCALE;
    return Math.round((raw + Number.EPSILON) * factor) / factor;
};

export const formatImportCost = (value?: number | null): string => {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return '—';
    }
    return Number(value).toLocaleString('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: IMPORT_COST_SCALE,
    });
};
