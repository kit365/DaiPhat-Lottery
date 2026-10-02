import type { ImportBatch, ImportBatchLine } from '../types/importBatch.type';

const activeLines = (batch: Pick<ImportBatch, 'lines'>) =>
    (batch.lines ?? []).filter((line) => line.status !== 'CANCELLED');

export const importBatchHasImportedLine = (batch: Pick<ImportBatch, 'lines'>) =>
    activeLines(batch).some((line) => line.status === 'IMPORTED');

export const importBatchHasImportingLine = (batch: Pick<ImportBatch, 'lines'>) =>
    activeLines(batch).some((line) => line.status === 'IMPORTING');

export const canShowImportBatchDelete = (batch: Pick<ImportBatch, 'lines'>) =>
    !importBatchHasImportedLine(batch);

export const canDeleteImportBatch = (batch: Pick<ImportBatch, 'lines'>) =>
    canShowImportBatchDelete(batch) && !importBatchHasImportingLine(batch);

export const canPauseImportBatchLine = (line: Pick<ImportBatchLine, 'status'>) =>
    line.status === 'IMPORTING';

export const canDeleteImportBatchLine = (line: Pick<ImportBatchLine, 'status'>) =>
    line.status === 'OPEN' || line.status === 'PAUSED';

export const getImportBatchDeleteDisabledReason = (batch: Pick<ImportBatch, 'lines'>) => {
    if (importBatchHasImportedLine(batch)) {
        return 'Không thể xóa phiếu vì đã có dòng được nhập hoàn tất.';
    }
    if (importBatchHasImportingLine(batch)) {
        return 'Hãy tạm dừng tất cả dòng đang nhập trước khi xóa phiếu.';
    }
    return undefined;
};
