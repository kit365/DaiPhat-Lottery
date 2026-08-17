import type {
    CreateImportBatchFormValues,
    UpdateImportBatchFormValues,
    UpdateImportBatchLineFormValues,
} from '../schemas/importBatch.schema';
import type { ImportBatch, ImportBatchLine } from '../types/importBatch.type';
import {
    clearTicketLineFormDraft,
    clearTicketLineFormDrafts,
} from '../../inventory/utils/ticketLineFormDraftStorage';
import { canEditImportBatchLineCost } from './importBatchHeaderEdit';
import { isDrawDateToday, isTicketIntakeClosed } from './importBatchDrawDate';
import dayjs, { type Dayjs } from 'dayjs';

export type ImportBatchEditDraft = {
    batchId: number;
    savedAt: string;
    values: UpdateImportBatchFormValues;
};

export const importBatchEditDraftStorageKey = (batchId: string | number) =>
    `import-batch-edit-draft:${batchId}`;

export const readLocalImportBatchEditDraft = (
    batchId: string | number
): ImportBatchEditDraft | null => {
    try {
        const raw = localStorage.getItem(importBatchEditDraftStorageKey(batchId));
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as ImportBatchEditDraft;
        if (!parsed || Number(parsed.batchId) !== Number(batchId) || !parsed.values) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
};

export const writeLocalImportBatchEditDraft = (
    batchId: string | number,
    values: UpdateImportBatchFormValues
) => {
    try {
        const payload: ImportBatchEditDraft = {
            batchId: Number(batchId),
            savedAt: new Date().toISOString(),
            values,
        };
        localStorage.setItem(importBatchEditDraftStorageKey(batchId), JSON.stringify(payload));
    } catch {
        // ignore quota errors
    }
};

export const clearLocalImportBatchEditDraft = (batchId: string | number) => {
    try {
        localStorage.removeItem(importBatchEditDraftStorageKey(batchId));
    } catch {
        // ignore
    }
};

/** Clears edit-form + unsaved ticket-entry drafts for a batch (browser only). */
export const clearImportBatchBrowserDrafts = (batchId: string | number) => {
    clearLocalImportBatchEditDraft(batchId);
    clearTicketLineFormDrafts(batchId);
};

/**
 * Drop local drafts that can no longer be applied: cancelled batch/lines,
 * or same-day intake already closed (inspection window started).
 */
export const discardStaleImportBatchBrowserDrafts = (
    batch: Pick<ImportBatch, 'id' | 'status' | 'drawDate' | 'lines'>,
    options?: {
        returnBufferMinutes?: number;
        returnCutOffTime?: string | null;
        now?: Dayjs;
    }
) => {
    if (!batch?.id) {
        return;
    }

    if (batch.status === 'CANCELLED') {
        clearImportBatchBrowserDrafts(batch.id);
        return;
    }

    for (const line of batch.lines ?? []) {
        if (line.status === 'CANCELLED' && line.id != null) {
            clearTicketLineFormDraft(batch.id, line.id);
        }
    }

    const returnCutOffTime = options?.returnCutOffTime ?? undefined;
    const returnBufferMinutes = options?.returnBufferMinutes ?? 45;
    const now = options?.now ?? dayjs();
    if (
        isDrawDateToday(batch.drawDate) &&
        isTicketIntakeClosed(returnCutOffTime, returnBufferMinutes, now)
    ) {
        clearImportBatchBrowserDrafts(batch.id);
    }
};

const emptyLine = (): UpdateImportBatchLineFormValues => ({
    lotteryStationId: 0,
    declareQuantity: 1,
    importCost: 10000,
    resolvedBatchType: undefined,
    removed: false,
});

const toPositiveId = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/** User has entered at least one import batch line in the local edit draft. */
export const hasStartedImportBatchLineEntry = (batchId: string | number): boolean => {
    const draft = readLocalImportBatchEditDraft(batchId);
    if (!draft) {
        return false;
    }

    return (draft.values.lines ?? []).some(
        (line) => !line.removed && toPositiveId(line.lotteryStationId) > 0
    );
};

/** Local edit draft exists for this batch (autosaved while editing). */
export const hasUnsavedImportBatchEditDraft = (batchId: string | number): boolean =>
    readLocalImportBatchEditDraft(batchId) != null;

export const getImportBatchEditDraftStationNames = (batchId: string | number): string[] => {
    const draft = readLocalImportBatchEditDraft(batchId);
    if (!draft) {
        return [];
    }

    return (draft.values.lines ?? [])
        .filter((line) => !line.removed && toPositiveId(line.lotteryStationId) > 0)
        .map((line) => line.stationName?.trim() || `Đài #${line.lotteryStationId}`);
};

const mapServerLineToFormLine = (
    line: ImportBatchLine,
    resolveStationName?: (stationId: number) => string | undefined
): UpdateImportBatchLineFormValues => {
    const lotteryStationId = toPositiveId(line.lotteryStationId);

    return {
        id: line.id,
        lotteryStationId,
        declareQuantity: line.declareQuantity ?? 1,
        importCost: Number(line.importCost) || 10000,
        resolvedBatchType: line.batchType,
        status: line.status,
        totalQuantity: line.totalQuantity ?? 0,
        stationName: lotteryStationId ? resolveStationName?.(lotteryStationId) : undefined,
        readOnly: !canEditImportBatchLineCost(line.status),
        removed: false,
    };
};

export const convertCreateFormToEditDraft = (
    createValues: CreateImportBatchFormValues
): UpdateImportBatchFormValues => ({
    supplierId: Number(createValues.supplierId) || 0,
    drawDate: createValues.drawDate ?? '',
    importMode: createValues.importMode ?? 'IN_DAY',
    totalDeclareQuantity: Number(createValues.totalDeclareQuantity) || 0,
    invoiceEvidenceUrl:
        typeof createValues.invoiceEvidenceUrl === 'string'
            ? createValues.invoiceEvidenceUrl.trim()
            : '',
    ticketListImageUrls: (createValues.ticketListImageUrls ?? []).filter(Boolean),
    lines: (createValues.lines ?? [])
        .map((line) => ({
            lotteryStationId: toPositiveId(line.lotteryStationId),
            declareQuantity: Number(line.declareQuantity) || 1,
            importCost: Number(line.importCost) || 10000,
            resolvedBatchType: line.resolvedBatchType,
            stationName: line.stationName,
            removed: false,
            restoredFromCreate: true,
        }))
        .filter((line) => line.lotteryStationId > 0),
});

export const transferCreateFormToEditDraft = (
    batchId: string | number,
    createValues: CreateImportBatchFormValues,
    existingBatch?: ImportBatch | null
): void => {
    const createDraft = convertCreateFormToEditDraft(createValues);
    const priorEditDraft = readLocalImportBatchEditDraft(batchId)?.values;

    let draftToSave = createDraft;

    if (priorEditDraft) {
        draftToSave = mergeImportBatchEditDraftWithServer(createDraft, {
            id: Number(batchId),
            drawDate: createDraft.drawDate || priorEditDraft.drawDate,
            supplierId: createDraft.supplierId || priorEditDraft.supplierId,
            status: 'DRAFT',
            importMode: createDraft.importMode || priorEditDraft.importMode,
            invoiceEvidenceUrl:
                (typeof createDraft.invoiceEvidenceUrl === 'string'
                    ? createDraft.invoiceEvidenceUrl.trim()
                    : '') ||
                (typeof priorEditDraft.invoiceEvidenceUrl === 'string'
                    ? priorEditDraft.invoiceEvidenceUrl
                    : '') ||
                '',
            ticketListImageUrls:
                (createDraft.ticketListImageUrls?.length ?? 0) > 0
                    ? createDraft.ticketListImageUrls
                    : (priorEditDraft.ticketListImageUrls ?? []),
            lines: priorEditDraft.lines
                .filter((line) => line.id && !line.removed)
                .map((line) => ({
                    id: line.id!,
                    lotteryStationId: toPositiveId(line.lotteryStationId),
                    batchType: line.resolvedBatchType ?? 'NEW',
                    declareQuantity: line.declareQuantity ?? 1,
                    importCost: Number(line.importCost) || 10000,
                    totalQuantity: line.totalQuantity ?? 0,
                    totalCostValue: 0,
                })),
        });
    }

    if (existingBatch) {
        draftToSave = mergeImportBatchEditDraftWithServer(draftToSave, existingBatch);
    }

    writeLocalImportBatchEditDraft(batchId, draftToSave);
};

export const buildFormValuesFromBatch = (
    batch: ImportBatch,
    resolveStationName?: (stationId: number) => string | undefined
): UpdateImportBatchFormValues => {
    const mappedLines = (batch.lines ?? []).map((line) =>
        mapServerLineToFormLine(line, resolveStationName)
    );

    return {
        supplierId: batch.supplierId ?? 0,
        drawDate: batch.drawDate,
        importMode: batch.importMode ?? 'IN_DAY',
        totalDeclareQuantity: batch.totalDeclareQuantity ?? 0,
        invoiceEvidenceUrl: batch.invoiceEvidenceUrl ?? '',
        ticketListImageUrls: batch.ticketListImageUrls ?? [],
        lines: mappedLines.length > 0 ? mappedLines : [emptyLine()],
    };
};

const mergeDraftLineWithServerLine = (
    serverLine: UpdateImportBatchLineFormValues,
    draftLine?: UpdateImportBatchLineFormValues
): UpdateImportBatchLineFormValues => {
    if (!draftLine) {
        return serverLine;
    }

    const draftStationId = toPositiveId(draftLine.lotteryStationId);

    return {
        ...serverLine,
        declareQuantity: draftLine.declareQuantity ?? serverLine.declareQuantity,
        importCost: draftLine.importCost ?? serverLine.importCost,
        lotteryStationId: draftStationId > 0 ? draftStationId : serverLine.lotteryStationId,
        resolvedBatchType: draftLine.resolvedBatchType ?? serverLine.resolvedBatchType,
        stationName: draftLine.stationName ?? serverLine.stationName,
        removed: draftLine.removed ?? false,
        status: serverLine.status,
        totalQuantity: serverLine.totalQuantity,
        readOnly: serverLine.readOnly,
        id: serverLine.id,
        restoredFromCreate: false,
    };
};

export const mergeImportBatchEditDraftWithServer = (
    draft: UpdateImportBatchFormValues,
    batch: ImportBatch,
    resolveStationName?: (stationId: number) => string | undefined
): UpdateImportBatchFormValues => {
    const serverValues = buildFormValuesFromBatch(batch, resolveStationName);
    const serverLines = serverValues.lines.filter((line) => line.id);
    const draftLines = draft.lines ?? [];
    const draftLineById = new Map(
        draftLines.filter((line) => line.id).map((line) => [line.id!, line])
    );

    const unmatchedDraftByStation = new Map<number, UpdateImportBatchLineFormValues>();
    draftLines
        .filter((line) => !line.id && !line.removed && toPositiveId(line.lotteryStationId) > 0)
        .forEach((line) => {
            unmatchedDraftByStation.set(toPositiveId(line.lotteryStationId), line);
        });

    const mergedServerLines = serverLines.map((serverLine) => {
        const draftById = draftLineById.get(serverLine.id!);
        if (draftById) {
            return mergeDraftLineWithServerLine(serverLine, draftById);
        }

        const stationId = toPositiveId(serverLine.lotteryStationId);
        const draftByStation = unmatchedDraftByStation.get(stationId);
        if (draftByStation) {
            unmatchedDraftByStation.delete(stationId);
            return mergeDraftLineWithServerLine(serverLine, draftByStation);
        }

        return serverLine;
    });

    const newDraftLines = Array.from(unmatchedDraftByStation.values());

    const lines =
        mergedServerLines.length > 0
            ? [...mergedServerLines, ...newDraftLines]
            : draftLines.length > 0
              ? draftLines
              : [emptyLine()];

    return {
        supplierId: draft.supplierId || serverValues.supplierId,
        drawDate: draft.drawDate || serverValues.drawDate,
        importMode: draft.importMode || serverValues.importMode,
        totalDeclareQuantity:
            draft.totalDeclareQuantity || serverValues.totalDeclareQuantity || 0,
        invoiceEvidenceUrl:
            (typeof draft.invoiceEvidenceUrl === 'string' ? draft.invoiceEvidenceUrl.trim() : '') ||
            (typeof serverValues.invoiceEvidenceUrl === 'string'
                ? serverValues.invoiceEvidenceUrl
                : '') ||
            '',
        ticketListImageUrls: draft.ticketListImageUrls ?? serverValues.ticketListImageUrls ?? [],
        lines,
    };
};
