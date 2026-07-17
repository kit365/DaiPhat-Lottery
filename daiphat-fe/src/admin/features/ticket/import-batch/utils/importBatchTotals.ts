import type { CreateImportBatchLineFormValues } from '../schemas/importBatch.schema';

const toPositiveNumber = (value: unknown): number => {
    if (value === null || value === undefined || value === '') {
        return 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const computeImportBatchLineTotal = (line: CreateImportBatchLineFormValues): number => {
    const quantity = toPositiveNumber(line.declareQuantity);
    const unitCost = toPositiveNumber(line.importCost);
    return quantity * unitCost;
};

export const computeImportBatchTotals = (lines: CreateImportBatchLineFormValues[] = []) => {
    const validLines = lines.filter((line) => toPositiveNumber(line.lotteryStationId) > 0);

    const totalQty = validLines.reduce(
        (sum, line) => sum + toPositiveNumber(line.declareQuantity),
        0
    );
    const totalCost = validLines.reduce(
        (sum, line) => sum + computeImportBatchLineTotal(line),
        0
    );

    return { totalQty, totalCost };
};
