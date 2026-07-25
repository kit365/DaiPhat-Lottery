import type { ImportBatch, ImportBatchLine, ImportBatchLineStatus } from '../types/importBatch.type';
import { getImportBatchLineStatusLabel, getImportBatchStatusLabel } from './batchTypeLabels';

export type IncompleteImportBatchDisplayStatus = 'DRAFT' | 'RECEIVING' | 'PARTIALLY_IMPORTED';

export const CANCELLED_LINE_SEGMENT_COLORS = { main: '#9e9e9e', track: '#eeeeee' } as const;

export const IMPORT_BATCH_STATION_SEGMENT_COLORS = [
    { main: '#1976d2', track: '#bbdefb' },
    { main: '#ed6c02', track: '#ffe0b2' },
    { main: '#2e7d32', track: '#c8e6c9' },
    { main: '#9c27b0', track: '#e1bee7' },
    { main: '#d32f2f', track: '#ffcdd2' },
    { main: '#0288d1', track: '#b3e5fc' },
    { main: '#7b1fa2', track: '#d1c4e9' },
    { main: '#c2185b', track: '#f8bbd0' },
] as const;

export type ImportBatchProgressSegment = {
    lineId: number;
    stationId: number;
    stationName: string;
    imported: number;
    declared: number;
    percent: number;
    status?: ImportBatchLineStatus;
    statusLabel: string;
    color: string;
    trackColor: string;
    cancelReason?: string;
};

export const getStationSegmentColor = (index: number) =>
    IMPORT_BATCH_STATION_SEGMENT_COLORS[index % IMPORT_BATCH_STATION_SEGMENT_COLORS.length];

export const getLineStationColor = (lines: ImportBatchLine[], line: ImportBatchLine) => {
    const index = lines.findIndex((entry) => entry.id === line.id);
    return getStationSegmentColor(index >= 0 ? index : 0);
};

export const getLineStationColorById = (lines: ImportBatchLine[], lineId: number | string) => {
    const index = lines.findIndex((entry) => String(entry.id) === String(lineId));
    return getStationSegmentColor(index >= 0 ? index : 0);
};

export const formatImportProgressPercent = (imported: number, declared: number) => {
    if (declared <= 0) {
        return '0%';
    }
    const percent = Math.min(100, (imported / declared) * 100);
    return `${percent.toFixed(1)}%`;
};

export const getLineImportProgress = (line: ImportBatchLine) => {
    const imported = line.totalQuantity ?? 0;
    const declared = line.declareQuantity ?? 0;
    const percent = declared > 0 ? Math.min(100, (imported / declared) * 100) : 0;
    const isComplete = declared > 0 && imported >= declared;

    return { imported, declared, percent, isComplete };
};

export const buildImportBatchProgressSegments = (
    batch: ImportBatch,
    resolveStationName?: (stationId: number) => string
): ImportBatchProgressSegment[] =>
    (batch.lines ?? []).map((line, index) => {
        const { imported, declared, percent } = getLineImportProgress(line);
        const colors =
            line.status === 'CANCELLED'
                ? CANCELLED_LINE_SEGMENT_COLORS
                : getStationSegmentColor(index);

        return {
            lineId: line.id,
            stationId: line.lotteryStationId,
            stationName:
                resolveStationName?.(line.lotteryStationId) ?? `Đài #${line.lotteryStationId}`,
            imported,
            declared,
            percent: line.status === 'CANCELLED' ? 0 : percent,
            status: line.status,
            statusLabel: getImportBatchLineStatusLabel(line.status),
            color: colors.main,
            trackColor: colors.track,
            cancelReason: line.cancelReason,
        };
    });

export const isLineCancelled = (line: ImportBatchLine) => line.status === 'CANCELLED';

export const isLinePaused = (line: ImportBatchLine) => line.status === 'PAUSED';

export const isLineActionable = (line: ImportBatchLine) => isLineIncomplete(line);

export const isLineIncomplete = (line: ImportBatchLine) =>
    !isLineCancelled(line) &&
    (line.status !== 'IMPORTED' || (line.totalQuantity ?? 0) < (line.declareQuantity ?? 0));

export const getIncompleteLines = (batch: ImportBatch): ImportBatchLine[] =>
    (batch.lines ?? []).filter(isLineIncomplete);

export const getImportBatchProgress = (batch: ImportBatch) => {
    const imported = batch.totalImportedQuantity ?? 0;
    const declared = batch.totalDeclareQuantity ?? 0;
    const percent = declared > 0 ? Math.min(100, (imported / declared) * 100) : 0;
    const percentLabel = formatImportProgressPercent(imported, declared);
    const isComplete = declared > 0 && imported >= declared;

    return { imported, declared, percent, percentLabel, isComplete };
};

export const getIncompleteLineProgress = (batch: ImportBatch) => {
    const incompleteLines = getIncompleteLines(batch);
    const imported = incompleteLines.reduce((sum, line) => sum + (line.totalQuantity ?? 0), 0);
    const declared = incompleteLines.reduce((sum, line) => sum + (line.declareQuantity ?? 0), 0);
    const remaining = Math.max(0, declared - imported);
    const percent = declared > 0 ? Math.min(100, Math.round((imported / declared) * 100)) : 0;

    return { imported, declared, remaining, percent };
};

export const hasTicketImportEligibleLines = (batch: ImportBatch): boolean =>
    (batch.lines ?? []).some(
        (line) => line.status === 'OPEN' || line.status === 'IMPORTING'
    );

export const isImportBatchEditable = (batch: ImportBatch) =>
    batch.status === 'DRAFT' || batch.status === 'RECEIVING' || batch.status === 'PARTIALLY_IMPORTED';

export const batchHasPendingLines = (batch: ImportBatch) =>
    isImportBatchEditable(batch) && getIncompleteLines(batch).length > 0;

export const importBatchHasNoLines = (batch: ImportBatch) => {
    if (Array.isArray(batch.lines)) {
        return batch.lines.length === 0;
    }
    return (batch.lineCount ?? 0) === 0;
};

export const importBatchMissingStations = (batch: ImportBatch) =>
    isImportBatchEditable(batch) && importBatchHasNoLines(batch);

/** Maps batch status for display in incomplete notifications. */
export const getIncompleteImportBatchDisplayStatus = (
    batch: ImportBatch
): { key: IncompleteImportBatchDisplayStatus; label: string } => {
    if (batch.status === 'PARTIALLY_IMPORTED') {
        return { key: 'PARTIALLY_IMPORTED', label: getImportBatchStatusLabel('PARTIALLY_IMPORTED') };
    }
    if (batch.status === 'RECEIVING' || (batch.totalImportedQuantity ?? 0) > 0) {
        return { key: 'RECEIVING', label: 'Đang nhập lô' };
    }
    return { key: 'DRAFT', label: getImportBatchStatusLabel('DRAFT') };
};

export const findFirstIncompleteLine = (batch: ImportBatch): ImportBatchLine | undefined => {
    const incompleteLines = getIncompleteLines(batch);
    return incompleteLines[0];
};

export const getActionableLines = (batch: ImportBatch): ImportBatchLine[] =>
    (batch.lines ?? []).filter(isLineActionable);

export const resolveImportBatchStationNames = (
    batch: ImportBatch,
    resolveStationName: (stationId: number) => string,
    lines: ImportBatchLine[] = getIncompleteLines(batch)
) => {
    const stationIds = [...new Set(lines.map((line) => line.lotteryStationId))];
    return stationIds.map((stationId) => resolveStationName(stationId)).filter(Boolean);
};

export const isLineDeletable = (line: ImportBatchLine, batch: ImportBatch) =>
    isImportBatchEditable(batch) &&
    isLineActionable(line) &&
    line.status === 'OPEN' &&
    (batch.lines?.length ?? 0) > 1;
