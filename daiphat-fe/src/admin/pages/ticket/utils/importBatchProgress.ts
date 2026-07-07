import type { ImportBatch, ImportBatchLine } from '../../../api/importBatch.api';
import { getImportBatchStatusLabel } from '../../import-batch/utils/batchTypeLabels';

export type IncompleteImportBatchDisplayStatus = 'DRAFT' | 'RECEIVING';

export const getImportBatchProgress = (batch: ImportBatch) => {
    const imported = batch.totalImportedQuantity ?? 0;
    const declared = batch.totalDeclareQuantity ?? 0;
    const percent = declared > 0 ? Math.min(100, Math.round((imported / declared) * 100)) : 0;
    const isComplete = declared > 0 && imported >= declared;

    return { imported, declared, percent, isComplete };
};

/** Maps DRAFT batches to DRAFT (not started) or RECEIVING (partial import) for display. */
export const getIncompleteImportBatchDisplayStatus = (
    batch: ImportBatch
): { key: IncompleteImportBatchDisplayStatus; label: string } => {
    const { imported } = getImportBatchProgress(batch);
    if (imported > 0) {
        return { key: 'RECEIVING', label: 'Đang nhập lô' };
    }
    return { key: 'DRAFT', label: getImportBatchStatusLabel('DRAFT') };
};

export const findFirstIncompleteLine = (batch: ImportBatch): ImportBatchLine | undefined => {
    const lines = batch.lines ?? [];
    return (
        lines.find((line) => (line.totalQuantity ?? 0) < (line.declareQuantity ?? 0)) ?? lines[0]
    );
};

export const resolveImportBatchStationNames = (
    batch: ImportBatch,
    resolveStationName: (stationId: number) => string
) => {
    const stationIds = [...new Set((batch.lines ?? []).map((line) => line.lotteryStationId))];
    return stationIds.map((stationId) => resolveStationName(stationId)).filter(Boolean);
};
