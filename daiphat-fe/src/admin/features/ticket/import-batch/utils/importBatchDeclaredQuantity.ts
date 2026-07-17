import type { CreateImportBatchLineFormValues } from '../schemas/importBatch.schema';

export const IMPORT_BATCH_DECLARE_QUANTITY_MISMATCH_MESSAGE =
    'Tổng số lượng khai báo của các nhà đài phải bằng Tổng số lượng khai báo của phiếu nhập lô.';

const toPositiveNumber = (value: unknown): number => {
    if (value === null || value === undefined || value === '') {
        return 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
};

export const sumImportBatchLineDeclaredQuantity = (
    lines: Array<{ declareQuantity?: unknown; removed?: boolean; lotteryStationId?: unknown }> = []
) =>
    lines
        .filter((line) => !line.removed && toPositiveNumber(line.lotteryStationId) > 0)
        .reduce((sum, line) => sum + toPositiveNumber(line.declareQuantity), 0);

export const getImportBatchDeclaredQuantityProgress = (
    totalDeclareQuantity: number,
    linesSum: number
) => {
    const target = Math.max(0, totalDeclareQuantity);
    const current = Math.max(0, linesSum);
    const percent =
        target > 0 ? Math.min(100, Math.round((current / target) * 100)) : current > 0 ? 100 : 0;

    return {
        target,
        current,
        percent,
        isExactMatch: target > 0 && current === target,
        isOverTarget: target > 0 && current > target,
        isUnderTarget: target > 0 && current < target,
    };
};

export const declaredQuantitiesMatch = (
    totalDeclareQuantity: number,
    lines: CreateImportBatchLineFormValues[] | Array<{ declareQuantity?: unknown; removed?: boolean; lotteryStationId?: unknown }>
) => {
    const target = toPositiveNumber(totalDeclareQuantity);
    if (target < 1) {
        return false;
    }
    return sumImportBatchLineDeclaredQuantity(lines) === target;
};
