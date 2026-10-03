import { isAxiosError } from 'axios';
import type {
    ImportBatch,
    ImportBatchLineStatus,
    ImportBatchStatus,
} from '../types/importBatch.type';

export const IMPORT_BATCH_SELECTION_STALE_CODE = 'LT_148';

export interface ImportBatchLineSelectionSnapshot {
    id: number;
    lotteryStationId: number;
    status: ImportBatchLineStatus;
    declareQuantity: number;
    totalQuantity: number;
    importCost: number;
}

export interface ImportBatchSelectionSnapshot {
    status: ImportBatchStatus;
    updatedAt?: string | null;
    totalDeclareQuantity: number;
    totalImportedQuantity: number;
    lines: ImportBatchLineSelectionSnapshot[];
}

const numberValue = (value: number | null | undefined) => Number(value ?? 0);

export const buildImportBatchSelectionSnapshot = (
    batch: ImportBatch
): ImportBatchSelectionSnapshot => ({
    status: batch.status,
    updatedAt: batch.updatedAt ?? null,
    totalDeclareQuantity: numberValue(batch.totalDeclareQuantity),
    totalImportedQuantity: numberValue(batch.totalImportedQuantity),
    lines: [...(batch.lines ?? [])]
        .map((line) => ({
            id: line.id,
            lotteryStationId: line.lotteryStationId,
            status: line.status ?? 'OPEN',
            declareQuantity: numberValue(line.declareQuantity),
            totalQuantity: numberValue(line.totalQuantity),
            importCost: numberValue(line.importCost),
        }))
        .sort((left, right) => left.id - right.id),
});

export const importBatchMatchesSelectionSnapshot = (
    batch: ImportBatch,
    expected: ImportBatchSelectionSnapshot
) => {
    const current = buildImportBatchSelectionSnapshot(batch);
    if (!expected.updatedAt) current.updatedAt = null;
    return JSON.stringify(current) === JSON.stringify(expected);
};

export const isImportBatchSelectionStaleError = (error: unknown) => {
    if (!isAxiosError(error)) return false;
    const data = error.response?.data as { code?: string; errorCode?: string } | undefined;
    return error.response?.status === 404 || error.response?.status === 409 ||
        data?.code === IMPORT_BATCH_SELECTION_STALE_CODE ||
        data?.errorCode === IMPORT_BATCH_SELECTION_STALE_CODE;
};
