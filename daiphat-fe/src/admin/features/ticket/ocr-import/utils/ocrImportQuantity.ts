import type { ImportBatch, ImportBatchLine } from '../../import-batch/types/importBatch.type';
import type { OcrReviewRow } from '../types/ticketOcr.type';

export type ImportQuantityCheck = {
    selectedCount: number;
    remainingCapacity: number;
    excessCount: number;
    shortfallCount: number;
    isOverCapacity: boolean;
    isShortfall: boolean;
    stationExcesses: Array<{ stationId: number; stationName: string; selected: number; remaining: number }>;
};

const isOpenCapacityLine = (line: ImportBatchLine): boolean => {
    const status = line.status;
    return status !== 'CANCELLED' && status !== 'IMPORTED';
};

export const getBatchRemainingCapacity = (batch: ImportBatch | null | undefined): number => {
    if (!batch) {
        return 0;
    }
    const lines = batch.lines ?? [];
    if (lines.length > 0) {
        return lines
            .filter(isOpenCapacityLine)
            .reduce((sum, line) => {
                const declared = line.declareQuantity ?? 0;
                const imported = line.totalQuantity ?? 0;
                return sum + Math.max(0, declared - imported);
            }, 0);
    }
    const declared = batch.totalDeclareQuantity ?? 0;
    const imported = batch.totalImportedQuantity ?? 0;
    return Math.max(0, declared - imported);
};

export const getBatchRemainingByStation = (
    batch: ImportBatch | null | undefined
): Map<number, number> => {
    const map = new Map<number, number>();
    if (!batch?.lines?.length) {
        return map;
    }
    for (const line of batch.lines) {
        if (!isOpenCapacityLine(line) || line.lotteryStationId == null) {
            continue;
        }
        const rem = Math.max(0, (line.declareQuantity ?? 0) - (line.totalQuantity ?? 0));
        map.set(line.lotteryStationId, (map.get(line.lotteryStationId) ?? 0) + rem);
    }
    return map;
};

/**
 * Compare selected OCR tickets vs remaining slots on the chosen import batch.
 * Over capacity → must deselect tickets; shortfall → warn via popup.
 */
export const checkOcrImportQuantity = (
    rows: OcrReviewRow[],
    batch: ImportBatch | null | undefined,
    isRowConfirmable: (row: OcrReviewRow) => boolean
): ImportQuantityCheck => {
    const selected = rows.filter((row) => row.selected && isRowConfirmable(row));
    const remainingByStation = getBatchRemainingByStation(batch);
    const remainingCapacity = getBatchRemainingCapacity(batch);
    const selectedCount = selected.length;

    const selectedByStation = new Map<number, { count: number; name: string }>();
    for (const row of selected) {
        if (row.stationId == null) {
            continue;
        }
        const current = selectedByStation.get(row.stationId) ?? {
            count: 0,
            name: row.stationName?.trim() || `Nhà đài #${row.stationId}`,
        };
        current.count += 1;
        selectedByStation.set(row.stationId, current);
    }

    const stationExcesses: ImportQuantityCheck['stationExcesses'] = [];
    for (const [stationId, info] of selectedByStation) {
        const remaining = remainingByStation.get(stationId) ?? 0;
        if (info.count > remaining) {
            stationExcesses.push({
                stationId,
                stationName: info.name,
                selected: info.count,
                remaining,
            });
        }
    }

    const excessCount = Math.max(0, selectedCount - remainingCapacity);
    const shortfallCount = Math.max(0, remainingCapacity - selectedCount);
    const isOverCapacity = excessCount > 0 || stationExcesses.length > 0;

    return {
        selectedCount,
        remainingCapacity,
        excessCount: isOverCapacity
            ? Math.max(
                  excessCount,
                  stationExcesses.reduce((sum, item) => sum + (item.selected - item.remaining), 0)
              )
            : 0,
        shortfallCount: isOverCapacity ? 0 : shortfallCount,
        isOverCapacity,
        isShortfall: !isOverCapacity && shortfallCount > 0,
        stationExcesses,
    };
};

type FileStationQty = {
    lotteryStationId: number;
    stationName?: string | null;
    serialCount?: number;
};

type FileGroupQty = {
    drawDate?: string | null;
    stations?: FileStationQty[] | null;
    ticketCount?: number;
    totalSerialCount?: number;
};

/** Compare file-import group serials vs remaining slots on the chosen import batch. */
export const checkFileImportGroupQuantity = (
    group: FileGroupQty,
    batch: ImportBatch | null | undefined
): ImportQuantityCheck => {
    const stations = group.stations ?? [];
    const remainingByStation = getBatchRemainingByStation(batch);
    const remainingCapacity = getBatchRemainingCapacity(batch);
    const selectedCount =
        stations.length > 0
            ? stations.reduce((sum, station) => sum + Math.max(0, station.serialCount ?? 0), 0)
            : Math.max(0, group.totalSerialCount ?? group.ticketCount ?? 0);

    const stationExcesses: ImportQuantityCheck['stationExcesses'] = [];
    for (const station of stations) {
        const selected = Math.max(0, station.serialCount ?? 0);
        if (selected <= 0 || station.lotteryStationId == null) {
            continue;
        }
        const remaining = remainingByStation.get(station.lotteryStationId) ?? 0;
        if (selected > remaining) {
            stationExcesses.push({
                stationId: station.lotteryStationId,
                stationName: station.stationName?.trim() || `Nhà đài #${station.lotteryStationId}`,
                selected,
                remaining,
            });
        }
    }

    const excessCount = Math.max(0, selectedCount - remainingCapacity);
    const shortfallCount = Math.max(0, remainingCapacity - selectedCount);
    const isOverCapacity = excessCount > 0 || stationExcesses.length > 0;

    return {
        selectedCount,
        remainingCapacity,
        excessCount: isOverCapacity
            ? Math.max(
                  excessCount,
                  stationExcesses.reduce((sum, item) => sum + (item.selected - item.remaining), 0)
              )
            : 0,
        shortfallCount: isOverCapacity ? 0 : shortfallCount,
        isOverCapacity,
        isShortfall: !isOverCapacity && shortfallCount > 0,
        stationExcesses,
    };
};

export const mergeImportQuantityChecks = (checks: ImportQuantityCheck[]): ImportQuantityCheck => {
    if (checks.length === 0) {
        return {
            selectedCount: 0,
            remainingCapacity: 0,
            excessCount: 0,
            shortfallCount: 0,
            isOverCapacity: false,
            isShortfall: false,
            stationExcesses: [],
        };
    }
    const selectedCount = checks.reduce((sum, item) => sum + item.selectedCount, 0);
    const remainingCapacity = checks.reduce((sum, item) => sum + item.remainingCapacity, 0);
    const stationExcesses = checks.flatMap((item) => item.stationExcesses);
    const excessCount = checks.reduce((sum, item) => sum + item.excessCount, 0);
    const shortfallCount = checks.reduce((sum, item) => sum + item.shortfallCount, 0);
    const isOverCapacity = excessCount > 0 || stationExcesses.length > 0;
    return {
        selectedCount,
        remainingCapacity,
        excessCount,
        shortfallCount: isOverCapacity ? 0 : shortfallCount,
        isOverCapacity,
        isShortfall: !isOverCapacity && shortfallCount > 0,
        stationExcesses,
    };
};
