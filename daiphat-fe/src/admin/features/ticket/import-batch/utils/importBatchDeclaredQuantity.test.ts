import { describe, expect, it } from 'vitest';
import { declaredQuantitiesMatch, sumImportBatchLineDeclaredQuantity } from './importBatchDeclaredQuantity';
import { updateImportBatchSchema } from '../schemas/importBatch.schema';

describe('allocation deletion', () => {
    it('keeps the removal marker for the API and reduces the total without reallocating tickets', () => {
        const lines = [
            { id: 427, lotteryStationId: 3, declareQuantity: 500, totalQuantity: 500,
                importCost: 10000, status: 'IMPORTED', removed: false },
            { id: 428, lotteryStationId: 1, declareQuantity: 500, totalQuantity: 0,
                importCost: 10000, status: 'OPEN', removed: true },
        ];
        const totalDeclareQuantity = sumImportBatchLineDeclaredQuantity(lines);
        const result = updateImportBatchSchema.parse({
            supplierId: 5, drawDate: '2026-10-05', importMode: 'IN_DAY',
            totalDeclareQuantity, lines,
        });
        expect(totalDeclareQuantity).toBe(500);
        expect(result.lines[0].declareQuantity).toBe(500);
        expect(result.lines[1]).toMatchObject({ id: 428, removed: true });
        expect(declaredQuantitiesMatch(1000, lines)).toBe(false);
    });
});
