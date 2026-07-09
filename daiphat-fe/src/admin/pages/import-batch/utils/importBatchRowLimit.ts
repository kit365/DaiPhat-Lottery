import type { ImportBatchEligibleStation } from '../../../api/importBatch.api';

type RowLimitLine = {
    lotteryStationId?: number;
    removed?: boolean;
};

export const IMPORT_BATCH_ROW_LIMIT_MESSAGE =
    'Đã đạt giới hạn số dòng. Ngày quay đã chọn không còn nhà đài nào để thêm.';

export const computeImportBatchRowLimit = (
    eligibleStations: ImportBatchEligibleStation[],
    lines: RowLimitLine[] = []
) => {
    const activeLines = lines.filter((line) => !line.removed);
    const assignedStationIds = new Set(
        activeLines
            .map((line) => Number(line.lotteryStationId) || 0)
            .filter((stationId) => stationId > 0)
    );

    const maxRows = eligibleStations.length;
    const remainingAssignable = eligibleStations.filter(
        (station) => !assignedStationIds.has(station.lotteryStationId)
    ).length;

    const activeRowCount = activeLines.length;
    const canAddRow =
        maxRows > 0 && activeRowCount < maxRows && remainingAssignable > 0;
    const isAtRowLimit = maxRows > 0 && !canAddRow;

    return {
        maxRows,
        remainingAssignable,
        activeRowCount,
        canAddRow,
        isAtRowLimit,
    };
};
