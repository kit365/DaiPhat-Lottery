import type { ImportBatch, ImportBatchLine } from '../types/importBatch.type';
import { isImportBatchEditable } from './importBatchProgress';

export const hasImportedImportBatchLines = (batch?: ImportBatch | null) =>
    (batch?.lines ?? []).some((line) => line.status === 'IMPORTED');

export const canChangeImportBatchSupplier = (batch?: ImportBatch | null) =>
    !!batch && isImportBatchEditable(batch) && !hasImportedImportBatchLines(batch);

export const IMPORT_BATCH_SUPPLIER_LOCKED_MESSAGE =
    'Không thể thay đổi nhà cung cấp vì phiếu nhập đã có lô vé được nhập hoàn tất.';

export const batchUsesSharedInvoice = (importMode?: string) => importMode === 'IN_DAY';

export const importBatchRequiresInvoiceEvidence = (
    lines: ImportBatchLine[] = [],
    importMode?: string
) => {
    if (!batchUsesSharedInvoice(importMode)) {
        return false;
    }
    return lines.some((line) => line.batchType === 'NEW' || line.batchType === 'LATE_IMPORT');
};

export const canRemoveImportBatchLine = (status?: ImportBatchLine['status']) =>
    status === 'OPEN' || status === 'IMPORTING' || status === 'CANCELLED';
