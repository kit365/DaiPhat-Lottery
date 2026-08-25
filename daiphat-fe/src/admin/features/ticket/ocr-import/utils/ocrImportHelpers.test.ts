import { describe, expect, it } from 'vitest';
import type { ImportBatch } from '../../import-batch/types/importBatch.type';
import {
    buildReviewImageGroups,
    collectOcrBatchOptions,
    createFailedReviewRow,
    getScanStatusLabel,
    getUnreadableFieldCaption,
} from './ocrImportHelpers';

const editableBatch = (
    partial: Partial<ImportBatch> & Pick<ImportBatch, 'id' | 'batchCode' | 'drawDate'>
): ImportBatch => ({
    status: 'DRAFT',
    lines: [],
    ...partial,
});

describe('collectOcrBatchOptions', () => {
    it('returns editable import-batches only (batch-level, not lines)', () => {
        const options = collectOcrBatchOptions([
            editableBatch({
                id: 1,
                batchCode: 'IB-1',
                drawDate: '2026-08-24',
                supplierId: 7,
                supplierName: 'NCC A',
            }),
            editableBatch({
                id: 2,
                batchCode: '  ',
                drawDate: '2026-08-24',
            }),
            editableBatch({
                id: 3,
                batchCode: 'IB-3',
                drawDate: '2026-08-25',
                status: 'COMPLETED',
            }),
        ]);

        expect(options).toEqual([
            {
                id: 1,
                batchCode: 'IB-1',
                drawDate: '2026-08-24',
                supplierId: 7,
                supplierName: 'NCC A',
                status: 'DRAFT',
            },
        ]);
    });
});

describe('OCR soft-fail helpers', () => {
    it('maps COMPLETE to SUCCESS label', () => {
        expect(getScanStatusLabel('COMPLETE')).toBe('SUCCESS');
        expect(getScanStatusLabel('FAILED')).toBe('FAILED');
        expect(getScanStatusLabel('PARTIAL')).toBe('PARTIAL');
    });

    it('keeps failed images in review groups even with zero rows', () => {
        const images = [
            {
                id: 'img-1',
                file: { name: 'a.jpg' },
                previewUrl: 'blob:a',
                status: 'error' as const,
                error: 'Không thể đọc rõ',
            },
            {
                id: 'img-2',
                file: { name: 'b.jpg' },
                previewUrl: 'blob:b',
                status: 'done' as const,
                error: null,
            },
        ];
        const failedRow = createFailedReviewRow('img-1', 'a.jpg', 'blob:a', 'Không thể đọc rõ');
        const groups = buildReviewImageGroups(images, [failedRow]);

        expect(groups).toHaveLength(2);
        expect(groups[0].imageId).toBe('img-1');
        expect(groups[0].rows).toHaveLength(1);
        expect(groups[0].rows[0].status).toBe('FAILED');
        expect(groups[1].imageId).toBe('img-2');
        expect(groups[1].rows).toHaveLength(0);
    });

    it('builds unreadable field caption from validation message', () => {
        expect(
            getUnreadableFieldCaption('serialNumber', {
                status: 'UNREADABLE',
                message: 'Serial bị che',
            })
        ).toBe('Serial bị che');
        expect(getUnreadableFieldCaption('serialNumber', null)).toContain('Serial');
    });
});
