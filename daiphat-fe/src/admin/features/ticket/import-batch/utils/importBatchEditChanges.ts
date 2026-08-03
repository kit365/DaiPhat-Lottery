import type { ImportBatch } from '../types/importBatch.type';
import type { UpdateImportBatchFormValues } from '../schemas/importBatch.schema';
import { canEditImportBatchLineCost } from './importBatchHeaderEdit';

export interface ImportBatchEditFieldChange {
    label: string;
    oldValue: string;
    newValue: string;
}

export interface ImportBatchEditLineChanges {
    lineLabel: string;
    changes: ImportBatchEditFieldChange[];
}

export interface ImportBatchEditAddedLine {
    lineLabel: string;
    stationName: string;
    declareQuantity: number;
    importCost: number;
}

export interface ImportBatchEditRemovedLine {
    lineLabel: string;
    stationName: string;
}

export interface ImportBatchEditInvoiceChange {
    oldUrl: string;
    newUrl: string | File;
}

export interface ImportBatchEditChangeSummary {
    headerChanges: ImportBatchEditFieldChange[];
    invoiceChange: ImportBatchEditInvoiceChange | null;
    modifiedLines: ImportBatchEditLineChanges[];
    addedLines: ImportBatchEditAddedLine[];
    removedLines: ImportBatchEditRemovedLine[];
    hasAnyChanges: boolean;
}

export interface ComputeImportBatchEditChangesParams {
    baseline: UpdateImportBatchFormValues;
    current: UpdateImportBatchFormValues;
    showSharedReceipt: boolean;
    resolveSupplierName: (supplierId: number) => string;
    resolveStationName: (stationId: number) => string;
}

const formatQuantity = (value: number) => value.toLocaleString('vi-VN');

const formatCost = (value: number) => `${value.toLocaleString('vi-VN')} VNĐ`;

const normalizeInvoice = (value?: string | File) => {
    if (value instanceof File) {
        return `file:${value.name}:${value.size}:${value.lastModified}`;
    }
    return value?.trim() || '';
};

export const buildImportBatchEditBaseline = (
    batch: ImportBatch,
    resolveStationName: (stationId: number) => string
): UpdateImportBatchFormValues => ({
    supplierId: batch.supplierId ?? 0,
    drawDate: batch.drawDate,
    importMode: batch.importMode ?? 'IN_DAY',
    totalDeclareQuantity: batch.totalDeclareQuantity ?? 0,
    invoiceEvidenceUrl: batch.invoiceEvidenceUrl ?? '',
    lines: (batch.lines ?? []).map((line) => ({
        id: line.id,
        lotteryStationId: line.lotteryStationId,
        declareQuantity: line.declareQuantity ?? 1,
        importCost: line.importCost ?? 10000,
        resolvedBatchType: line.batchType,
        status: line.status,
        totalQuantity: line.totalQuantity ?? 0,
        stationName: line.lotteryStationId
            ? resolveStationName(line.lotteryStationId)
            : undefined,
        readOnly: !canEditImportBatchLineCost(line.status),
        removed: false,
    })),
});

export const computeImportBatchEditChanges = (
    params: ComputeImportBatchEditChangesParams
): ImportBatchEditChangeSummary => {
    const { baseline, current, showSharedReceipt, resolveSupplierName, resolveStationName } =
        params;

    const headerChanges: ImportBatchEditFieldChange[] = [];
    let invoiceChange: ImportBatchEditInvoiceChange | null = null;

    if (baseline.supplierId !== current.supplierId) {
        headerChanges.push({
            label: 'Nhà cung cấp',
            oldValue: resolveSupplierName(baseline.supplierId),
            newValue: resolveSupplierName(current.supplierId),
        });
    }

    if (baseline.totalDeclareQuantity !== current.totalDeclareQuantity) {
        headerChanges.push({
            label: 'Tổng số lượng khai báo phiếu nhập lô',
            oldValue: `${formatQuantity(baseline.totalDeclareQuantity ?? 0)} vé`,
            newValue: `${formatQuantity(current.totalDeclareQuantity ?? 0)} vé`,
        });
    }

    if (showSharedReceipt) {
        const oldInvoice = normalizeInvoice(baseline.invoiceEvidenceUrl || undefined);
        const newInvoice = normalizeInvoice(current.invoiceEvidenceUrl || undefined);
        if (oldInvoice !== newInvoice) {
            invoiceChange = {
                oldUrl:
                    typeof baseline.invoiceEvidenceUrl === 'string'
                        ? baseline.invoiceEvidenceUrl.trim()
                        : '',
                newUrl:
                    current.invoiceEvidenceUrl instanceof File
                        ? current.invoiceEvidenceUrl
                        : typeof current.invoiceEvidenceUrl === 'string'
                          ? current.invoiceEvidenceUrl.trim()
                          : '',
            };
        }
    }

    const baselineActiveLines = baseline.lines.filter((line) => line.id);
    const currentLinesById = new Map<number, (typeof current.lines)[number]>();
    current.lines.forEach((line) => {
        if (line.id) {
            currentLinesById.set(line.id, line);
        }
    });

    const modifiedLines: ImportBatchEditLineChanges[] = [];
    const removedLines: ImportBatchEditRemovedLine[] = [];

    baselineActiveLines.forEach((baseLine, index) => {
        const lineNumber = index + 1;
        const lineId = baseLine.id!;
        const currentLine = currentLinesById.get(lineId);
        const stationName =
            baseLine.stationName ?? resolveStationName(baseLine.lotteryStationId ?? 0);
        const lineLabel = `Dòng nhập lô #${lineNumber}`;

        if (!currentLine || currentLine.removed) {
            removedLines.push({ lineLabel, stationName });
            return;
        }

        const changes: ImportBatchEditFieldChange[] = [];

        const oldStationId = baseLine.lotteryStationId ?? 0;
        const newStationId = currentLine.lotteryStationId ?? 0;
        if (oldStationId !== newStationId) {
            changes.push({
                label: 'Nhà đài',
                oldValue: baseLine.stationName ?? resolveStationName(oldStationId),
                newValue: currentLine.stationName ?? resolveStationName(newStationId),
            });
        }

        const oldQty = baseLine.declareQuantity ?? 0;
        const newQty = currentLine.declareQuantity ?? 0;
        if (oldQty !== newQty) {
            changes.push({
                label: 'Số lượng khai báo',
                oldValue: formatQuantity(oldQty),
                newValue: formatQuantity(newQty),
            });
        }

        const oldCost = baseLine.importCost ?? 0;
        const newCost = currentLine.importCost ?? 0;
        if (oldCost !== newCost) {
            changes.push({
                label: 'Giá vốn',
                oldValue: formatCost(oldCost),
                newValue: formatCost(newCost),
            });
        }

        if (changes.length > 0) {
            modifiedLines.push({ lineLabel, changes });
        }
    });

    const addedLines: ImportBatchEditAddedLine[] = [];
    let addedIndex = 0;
    current.lines
        .filter((line) => !line.removed && !line.id)
        .forEach((line) => {
            addedIndex += 1;
            const stationId = line.lotteryStationId ?? 0;
            addedLines.push({
                lineLabel: `Dòng mới #${addedIndex}`,
                stationName:
                    line.stationName ?? (stationId > 0 ? resolveStationName(stationId) : '—'),
                declareQuantity: line.declareQuantity ?? 0,
                importCost: line.importCost ?? 0,
            });
        });

    const hasAnyChanges =
        headerChanges.length > 0 ||
        invoiceChange !== null ||
        modifiedLines.length > 0 ||
        addedLines.length > 0 ||
        removedLines.length > 0;

    return {
        headerChanges,
        invoiceChange,
        modifiedLines,
        addedLines,
        removedLines,
        hasAnyChanges,
    };
};
