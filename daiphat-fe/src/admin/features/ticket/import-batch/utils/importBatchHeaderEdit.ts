import type { ImportBatch, ImportBatchLine } from '../types/importBatch.type';

export const hasImportedImportBatchLines = (batch?: ImportBatch | null) =>
    (batch?.lines ?? []).some((line) => line.status === 'IMPORTED');

/** Supplier may only change while the batch is still DRAFT (before any ticket import starts). */
export const canChangeImportBatchSupplier = (batch?: ImportBatch | null) =>
    !!batch && batch.status === 'DRAFT';

export const IMPORT_BATCH_SUPPLIER_LOCKED_MESSAGE =
    'Không thể thay đổi nhà cung cấp khi phiếu nhập lô đã bắt đầu nhập vé (Đang nhập / Nhập một phần).';

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
    status === 'OPEN' || status === 'PAUSED' || status === 'CANCELLED';

export const canPauseImportBatchLine = (status?: ImportBatchLine['status']) =>
    status === 'IMPORTING';

export const canResumeImportBatchLine = (status?: ImportBatchLine['status']) =>
    status === 'PAUSED';

/**
 * Direct Declared Quantity edits are allowed only while the line is still draft (OPEN / Nháp).
 * After import has started, use the dedicated Pause & Adjust Quantity workflow instead.
 */
export const canEditImportBatchLineDeclareQuantity = (
    status?: ImportBatchLine['status'] | 'DRAFT'
) => status === 'OPEN' || status === 'DRAFT' || !status;

/** PAUSED lines may open the dedicated declare-quantity adjustment dialog. */
export const canAdjustPausedImportBatchLineDeclareQuantity = (
    status?: ImportBatchLine['status']
) => status === 'PAUSED';

/** Lines that may receive redistributed declare quantity inside the adjustment dialog. */
export const canRedistributeImportBatchLineDeclareQuantity = (
    status?: ImportBatchLine['status'] | 'DRAFT'
) => status === 'OPEN' || status === 'DRAFT' || status === 'PAUSED' || !status;

/** Cost remains editable for non-terminal lines (OPEN / IMPORTING / PAUSED). */
export const canEditImportBatchLineCost = (status?: ImportBatchLine['status'] | 'DRAFT') =>
    status !== 'IMPORTED' && status !== 'CANCELLED';

/** @deprecated Prefer canEditImportBatchLineDeclareQuantity / canEditImportBatchLineCost */
export const canEditImportBatchLineQuantities = canEditImportBatchLineCost;
