import { describe, expect, it } from 'vitest';
import { computeImportBatchRowLimit } from './importBatchRowLimit';

const stations = [
    { lotteryStationId: 1, name: 'An Giang', resolvedBatchType: 'NEW' as const },
    { lotteryStationId: 2, name: 'Bình Thuận', resolvedBatchType: 'NEW' as const },
    { lotteryStationId: 3, name: 'Tây Ninh', resolvedBatchType: 'NEW' as const },
];

describe('computeImportBatchRowLimit', () => {
    it('allows adding one row when one eligible station remains unassigned', () => {
        const result = computeImportBatchRowLimit(stations, [
            { lotteryStationId: 1 },
            { lotteryStationId: 2 },
        ]);

        expect(result.maxRows).toBe(3);
        expect(result.remainingAssignable).toBe(1);
        expect(result.canAddRow).toBe(true);
        expect(result.isAtRowLimit).toBe(false);
    });

    it('blocks adding a row when every eligible station is already assigned', () => {
        const result = computeImportBatchRowLimit(stations, [
            { lotteryStationId: 1 },
            { lotteryStationId: 2 },
            { lotteryStationId: 3 },
        ]);

        expect(result.canAddRow).toBe(false);
        expect(result.isAtRowLimit).toBe(true);
    });

    it('blocks adding rows when empty placeholders already reach the station limit', () => {
        const result = computeImportBatchRowLimit(stations, [
            { lotteryStationId: 1 },
            { lotteryStationId: 2 },
            { lotteryStationId: 0 },
            { lotteryStationId: 0 },
            { lotteryStationId: 0 },
        ]);

        expect(result.activeRowCount).toBe(5);
        expect(result.remainingAssignable).toBe(1);
        expect(result.canAddRow).toBe(false);
        expect(result.isAtRowLimit).toBe(true);
    });

    it('blocks adding another row once row count equals remaining assignable slots', () => {
        const result = computeImportBatchRowLimit(stations, [
            { lotteryStationId: 1 },
            { lotteryStationId: 2 },
            { lotteryStationId: 0 },
        ]);

        expect(result.activeRowCount).toBe(3);
        expect(result.remainingAssignable).toBe(1);
        expect(result.canAddRow).toBe(false);
        expect(result.isAtRowLimit).toBe(true);
    });
});
