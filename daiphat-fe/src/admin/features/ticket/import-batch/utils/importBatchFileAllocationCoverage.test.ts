import { describe, expect, it } from 'vitest';
import type { ImportBatchFileStationSummary } from '../types/importBatch.type';
import { getFileAllocationCoverageIssues } from './importBatchFileAllocationCoverage';

const fileStation = (lotteryStationId: number, serialCount: number): ImportBatchFileStationSummary => ({
    lotteryStationId,
    stationName: `Đài ${lotteryStationId}`,
    ticketCount: serialCount,
    serialCount,
    declaredQuantity: serialCount,
    importCost: 9500,
    declaredCostValue: serialCount * 9500,
});

describe('getFileAllocationCoverageIssues', () => {
    it('reports a station missing from the batch', () => {
        expect(getFileAllocationCoverageIssues([], [fileStation(1, 10)]))
            .toEqual(['Đài 1: chưa có trong phiếu nhập lô.']);
    });

    it('compares uploaded serials with remaining capacity after earlier imports', () => {
        const issues = getFileAllocationCoverageIssues(
            [{ lotteryStationId: 1, declareQuantity: 12, totalQuantity: 5 }],
            [fileStation(1, 10)]
        );
        expect(issues[0]).toContain('phiếu chỉ còn nhận 7 vé');
        expect(issues[0]).toContain('ít nhất 15 vé');
    });

    it('accepts every station when each line has enough remaining capacity', () => {
        expect(getFileAllocationCoverageIssues(
            [
                { lotteryStationId: 1, declareQuantity: 15, totalQuantity: 5 },
                { lotteryStationId: 2, declareQuantity: 20, totalQuantity: 0 },
            ],
            [fileStation(1, 10), fileStation(2, 20)]
        )).toEqual([]);
    });
});
