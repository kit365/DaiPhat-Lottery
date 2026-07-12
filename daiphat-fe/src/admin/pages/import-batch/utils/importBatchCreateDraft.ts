import type { CreateImportBatchFormValues } from '../schemas/importBatch.schema';
import {
    IMPORT_BATCH_CREATE_DRAFT_KEY,
    clearImportBatchCreateDraftStorage,
    isDraftExpired,
} from './importBatchDraftCleanup';

export { IMPORT_BATCH_CREATE_DRAFT_KEY } from './importBatchDraftCleanup';

export type ImportBatchCreateDraft = {
    savedAt: string;
    values: CreateImportBatchFormValues;
};

export const normalizeCreateDraftValues = (
    values: CreateImportBatchFormValues
): CreateImportBatchFormValues => ({
    ...values,
    supplierId: Number(values.supplierId) || 0,
    drawDate: values.drawDate ?? '',
    importMode: values.importMode ?? 'IN_DAY',
    totalDeclareQuantity: Number(values.totalDeclareQuantity) || 0,
    invoiceEvidenceUrl: values.invoiceEvidenceUrl ?? '',
    lines: (values.lines ?? []).map((line) => ({
        ...line,
        lotteryStationId: Number(line.lotteryStationId) || 0,
        declareQuantity: Number(line.declareQuantity) || 1,
        importCost: Number(line.importCost) || 10000,
        stationName: line.stationName,
        resolvedBatchType: line.resolvedBatchType,
    })),
});

export const readLocalImportBatchCreateDraft = (): ImportBatchCreateDraft | null => {
    try {
        const raw = localStorage.getItem(IMPORT_BATCH_CREATE_DRAFT_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as ImportBatchCreateDraft;
        if (!parsed?.values) {
            return null;
        }
        if (isDraftExpired(parsed.savedAt)) {
            clearImportBatchCreateDraftStorage();
            return null;
        }
        return {
            ...parsed,
            values: normalizeCreateDraftValues(parsed.values),
        };
    } catch {
        return null;
    }
};

export const writeLocalImportBatchCreateDraft = (values: CreateImportBatchFormValues) => {
    try {
        const payload: ImportBatchCreateDraft = {
            savedAt: new Date().toISOString(),
            values: normalizeCreateDraftValues(values),
        };
        localStorage.setItem(IMPORT_BATCH_CREATE_DRAFT_KEY, JSON.stringify(payload));
    } catch {
        // ignore quota errors
    }
};

export const clearLocalImportBatchCreateDraft = () => {
    clearImportBatchCreateDraftStorage();
};
