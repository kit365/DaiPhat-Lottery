import { describe, expect, it } from 'vitest';
import {
    computeImportCostFromStation,
    formatImportCost,
} from './importCostCalculator';

describe('importCostCalculator', () => {
    it('computes price × (1 − commission) rounded half-up to 3 decimals', () => {
        expect(computeImportCostFromStation(10000, 0.05)).toBe(9500);
        expect(computeImportCostFromStation(10000, 0.12345)).toBe(8765.5);
        expect(computeImportCostFromStation(1000, 0.0015)).toBe(998.5);
    });

    it('returns null for invalid inputs', () => {
        expect(computeImportCostFromStation(0, 0.05)).toBeNull();
        expect(computeImportCostFromStation(10000, 1.2)).toBeNull();
        expect(computeImportCostFromStation(undefined, 0.1)).toBeNull();
    });

    it('formats with up to 3 decimals', () => {
        expect(formatImportCost(9500)).toContain('9');
        expect(formatImportCost(9500.125)).toMatch(/9\.?500[,.]125/);
    });
});
