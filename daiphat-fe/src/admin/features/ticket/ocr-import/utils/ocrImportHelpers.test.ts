import { describe, expect, it } from 'vitest';
import type { ImportBatch } from '../../import-batch/types/importBatch.type';
import {
    buildReviewImageGroups,
    canConfirmReviewRow,
    collectOcrBatchOptions,
    createFailedReviewRow,
    formatDenomination,
    getScanStatusLabel,
    getUnreadableFieldCaption,
    reconcileOcrSerialAndBatchCode,
    toShortFieldHint,
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

    it('rebuilds review groups from draft rows when images are empty', () => {
        const failedRow = createFailedReviewRow(
            'img-restored',
            'restored.jpg',
            'https://cdn.example.com/ocr.jpg',
            'Không thể đọc rõ'
        );
        const groups = buildReviewImageGroups([], [failedRow]);
        expect(groups).toHaveLength(1);
        expect(groups[0].imageId).toBe('img-restored');
        expect(groups[0].previewUrl).toBe('https://cdn.example.com/ocr.jpg');
        expect(groups[0].rows).toHaveLength(1);
    });

    it('builds unreadable field caption from validation message', () => {
        expect(
            getUnreadableFieldCaption('serialNumber', {
                status: 'UNREADABLE',
                message: 'Serial bị che',
            })
        ).toBe('Serial bị che');
        expect(getUnreadableFieldCaption('serialNumber', null)).toContain('Số sê-ri');
    });

    it('converts verbose messages to short field hints', () => {
        expect(toShortFieldHint('Vui lòng nhập dãy số dự thưởng.')).toBe('Thiếu dãy số');
        expect(toShortFieldHint('Dãy số chỉ được chứa chữ số.')).toBe('Chỉ nhập số');
        expect(toShortFieldHint('Vui lòng nhập số sê-ri.')).toBe('Thiếu số sê-ri');
        expect(toShortFieldHint('Số sê-ri gồm chữ và số, có ít nhất 1 chữ cái (1–20 ký tự).')).toBe('Sai dạng sê-ri');
        expect(toShortFieldHint('Chưa chọn đài mở thưởng cho vé này')).toBe('Chưa chọn đài');
        expect(toShortFieldHint('Đài này không mở thưởng vào ngày đã chọn.')).toBe('Sai lịch quay');
        expect(toShortFieldHint('Vui lòng chọn ngày mở thưởng.')).toBe('Thiếu ngày quay');
        expect(toShortFieldHint('Mệnh giá nhận diện không khớp với giá nhà đài.')).toBe('Lệch mệnh giá');
        expect(toShortFieldHint('Không nhận diện được nhà đài trên vé. Thông tin có thể bị che bởi vé khác.')).toBe('Chưa chọn đài');
        expect(toShortFieldHint('Không thể đọc rõ thông tin do ảnh mờ')).toBe('Ảnh mờ/bị che');
    });
});

describe('formatDenomination', () => {
    it('formats raw numbers and strings with dot thousand separators', () => {
        expect(formatDenomination(10000)).toBe('10.000');
        expect(formatDenomination('20000')).toBe('20.000');
        expect(formatDenomination('50000')).toBe('50.000');
        expect(formatDenomination('10.000')).toBe('10.000');
        expect(formatDenomination('')).toBe('');
        expect(formatDenomination(null)).toBe('');
    });
});

describe('canConfirmReviewRow & evaluateOcrFieldUiStatus', () => {
    const validRow = {
        key: 'row-1',
        sourceImageId: 'img-1',
        sourceFileName: 'test.jpg',
        status: 'COMPLETE' as const,
        confidence: 0.95,
        numbers: '123456',
        serialNumber: 'A123456',
        stationId: 10,
        stationName: 'Đài Tiền Giang',
        drawDate: '2026-09-20',
        ticketType: '10.000',
        fieldValidations: {},
        fields: {},
        selected: false,
        edited: false,
    };

    it('allows valid rows to be confirmed', () => {
        expect(canConfirmReviewRow(validRow as any)).toBe(true);
    });

    it('blocks rows with missing or invalid numbers', () => {
        expect(canConfirmReviewRow({ ...validRow, numbers: '' } as any)).toBe(false);
        expect(canConfirmReviewRow({ ...validRow, numbers: '12A456' } as any)).toBe(false);
        expect(canConfirmReviewRow({ ...validRow, numbers: '12345' } as any)).toBe(false);
        expect(canConfirmReviewRow({ ...validRow, numbers: '1234567' } as any)).toBe(false);
    });

    it('blocks rows with missing or invalid serial number', () => {
        expect(canConfirmReviewRow({ ...validRow, serialNumber: '' } as any)).toBe(false);
        expect(canConfirmReviewRow({ ...validRow, serialNumber: '123456' } as any)).toBe(false); // No letters
        expect(canConfirmReviewRow({ ...validRow, serialNumber: '4E2' } as any)).toBe(false); // letter in middle
        expect(canConfirmReviewRow({ ...validRow, serialNumber: 'XSCMG997' } as any)).toBe(false);
        expect(canConfirmReviewRow({ ...validRow, serialNumber: '123456B' } as any)).toBe(true);
    });

    it('reconciles misplaced batch codes out of serialNumber', () => {
        expect(reconcileOcrSerialAndBatchCode('XSCMG997', null)).toEqual({
            serialNumber: '',
            batchCode: 'XSCMG997',
        });
        expect(reconcileOcrSerialAndBatchCode('4E2', '')).toEqual({
            serialNumber: '',
            batchCode: '4E2',
        });
        expect(reconcileOcrSerialAndBatchCode('A424944', '08D')).toEqual({
            serialNumber: 'A424944',
            batchCode: '08D',
        });
        expect(reconcileOcrSerialAndBatchCode(null, 'A123456')).toEqual({
            serialNumber: 'A123456',
            batchCode: null,
        });
    });

    it('blocks rows with duplicate flag', () => {
        expect(canConfirmReviewRow({ ...validRow, duplicate: true } as any)).toBe(false);
    });

    it('blocks rows without selected station', () => {
        expect(canConfirmReviewRow({ ...validRow, stationId: null } as any)).toBe(false);
    });

    it('blocks rows when station is not allowed for the draw date', () => {
        const ctx = { allowedStationIds: new Set([20, 30]) };
        expect(canConfirmReviewRow(validRow as any, ctx)).toBe(false);
    });

    it('blocks rows when drawDate does not match batch draw date', () => {
        const ctx = { batchDrawDate: '2026-09-21' };
        expect(canConfirmReviewRow(validRow as any, ctx)).toBe(false);
    });

    it('blocks rows when denomination does not match station price', () => {
        const ctx = { stationPriceById: new Map([[10, 10000]]) };
        expect(canConfirmReviewRow({ ...validRow, ticketType: '50.000' } as any, ctx)).toBe(false);
        expect(canConfirmReviewRow({ ...validRow, ticketType: '10.000' } as any, ctx)).toBe(true);
    });
});

