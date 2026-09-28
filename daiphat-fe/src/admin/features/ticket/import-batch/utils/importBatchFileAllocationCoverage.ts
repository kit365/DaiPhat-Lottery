import type { ImportBatchFileStationSummary } from '../types/importBatch.type';

interface AllocationLine {
    lotteryStationId: number;
    declareQuantity: number;
    totalQuantity: number;
    stationName?: string;
}

/** The uploaded serials must fit in the remaining capacity of their own station line. */
export const getFileAllocationCoverageIssues = (
    lines: AllocationLine[],
    fileStations: ImportBatchFileStationSummary[],
    sourceLabel = 'Tệp'
): string[] => fileStations.flatMap((station) => {
    const sourceReference = sourceLabel.charAt(0).toLowerCase() + sourceLabel.slice(1);
    const line = lines.find((item) => item.lotteryStationId === station.lotteryStationId);
    const name = station.stationName || line?.stationName || `Đài #${station.lotteryStationId}`;
    if (!line) {
        return [`${name}: chưa có trong phiếu nhập lô.`];
    }

    const required = Math.max(0, station.serialCount);
    const remaining = Math.max(0, line.declareQuantity - line.totalQuantity);
    if (remaining < required) {
        return [`${name}: ${sourceReference} có ${required.toLocaleString('vi-VN')} sê-ri, phiếu chỉ còn nhận ${remaining.toLocaleString('vi-VN')} vé. Cần khai báo ít nhất ${(line.totalQuantity + required).toLocaleString('vi-VN')} vé.`];
    }
    return [];
});
