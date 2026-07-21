import type { ImportBatch, ImportBatchLine } from '../types/importBatch.type';

export const IMPORT_BATCH_DECLARE_QUANTITY_REDUCTION_IMPORTED_ONLY_MESSAGE =
    'Không thể giảm số lượng khai báo vì phần vé thừa nằm ở các dòng đã nhập hoàn tất (IMPORTED). Chỉ được xóa vé ở dòng OPEN, IMPORTING hoặc PAUSED.';

export const IMPORT_BATCH_DECLARE_QUANTITY_REDUCTION_WARNING =
    'Số lượng khai báo mới nhỏ hơn số vé đã nhập. Vui lòng xóa bớt vé trước khi áp dụng số lượng mới.';

export const isDeletableImportBatchLineStatus = (status?: string) =>
    status === 'OPEN' || status === 'IMPORTING' || status === 'PAUSED';

export const sumRemovableImportedQuantity = (lines: ImportBatchLine[] = []) =>
    lines
        .filter((line) => isDeletableImportBatchLineStatus(line.status))
        .reduce((sum, line) => sum + (line.totalQuantity ?? 0), 0);

export const computeDeclareQuantityReductionExcess = (
    newTotalDeclareQuantity: number,
    totalImportedQuantity: number
) => Math.max(0, totalImportedQuantity - newTotalDeclareQuantity);

export const requiresDeclareQuantityReduction = (
    newTotalDeclareQuantity: number,
    totalImportedQuantity: number
) => newTotalDeclareQuantity < totalImportedQuantity;

export const canReduceDeclareQuantity = (
    batch: Pick<ImportBatch, 'lines' | 'totalImportedQuantity'> | null | undefined,
    newTotalDeclareQuantity: number
) => {
    if (!batch) {
        return { allowed: true, excess: 0, removableImported: 0 };
    }

    const totalImportedQuantity = batch.totalImportedQuantity ?? 0;
    const excess = computeDeclareQuantityReductionExcess(newTotalDeclareQuantity, totalImportedQuantity);
    const removableImported = sumRemovableImportedQuantity(batch.lines);

    return {
        allowed: excess <= removableImported,
        excess,
        removableImported,
    };
};

export const sumSelectedTicketSerialCount = (
    selectedTicketIds: Set<number>,
    ticketsById: Map<number, number>
) =>
    Array.from(selectedTicketIds).reduce((sum, ticketId) => sum + (ticketsById.get(ticketId) ?? 0), 0);
