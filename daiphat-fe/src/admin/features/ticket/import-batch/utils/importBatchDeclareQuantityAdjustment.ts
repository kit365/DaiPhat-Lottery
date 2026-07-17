import { IMPORT_BATCH_DECLARE_QUANTITY_MISMATCH_MESSAGE } from './importBatchDeclaredQuantity';

export const IMPORT_BATCH_DECLARE_QUANTITY_LINE_ADJUSTMENT_WARNING =
    'Tổng số lượng khai báo phiếu nhập lô hiện nhỏ hơn tổng số lượng khai báo của các dòng nhà đài. Vui lòng điều chỉnh số lượng khai báo trên từng dòng.';

export const IMPORT_BATCH_DECLARE_QUANTITY_LINE_ADJUSTMENT_HELPER =
    IMPORT_BATCH_DECLARE_QUANTITY_MISMATCH_MESSAGE;

const toPositiveNumber = (value: unknown): number => {
    if (value === null || value === undefined || value === '') {
        return 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
};

/** OPEN / DRAFT lines with no imported tickets yet. */
export const isDraftImportBatchLine = (status?: string, importedQuantity = 0) =>
    (status === 'OPEN' || status === 'DRAFT' || !status) && importedQuantity === 0;

export const requiresLineQuantityAdjustment = (
    newTotalDeclareQuantity: number,
    linesSum: number,
    totalImportedQuantity: number
) =>
    newTotalDeclareQuantity < linesSum && newTotalDeclareQuantity >= totalImportedQuantity;

export const getDraftLineIndicesForQuantityAdjustment = (
    lines: Array<{
        status?: string;
        removed?: boolean;
        totalQuantity?: number;
        lotteryStationId?: unknown;
    }> = []
) =>
    lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => !line.removed && toPositiveNumber(line.lotteryStationId) > 0)
        .filter(({ line }) => isDraftImportBatchLine(line.status, line.totalQuantity ?? 0))
        .map(({ index }) => index);
