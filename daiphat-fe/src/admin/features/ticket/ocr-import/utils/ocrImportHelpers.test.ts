import { describe, expect, it } from 'vitest';
import type { ImportBatch } from '../../import-batch/types/importBatch.type';
import {
    buildReviewImageGroups,
    buildReviewStationGroups,
    canConfirmReviewRow,
    collectOcrBatchOptions,
    createFailedReviewRow,
    formatConfidence,
    formatDenomination,
    getOcrReviewFieldConfidence,
    getOcrReviewIssueCounts,
    hasHighConfidenceOcrFields,
    getScanStatusLabel,
    getUnreadableFieldCaption,
    reconcileOcrSerialAndBatchCode,
    resolveFieldDisplayConfidence,
    toShortFieldHint,
} from './ocrImportHelpers';
import type { OcrReviewRow } from '../types/ticketOcr.type';

describe('OCR confidence display', () => {
    it('formats 0..1 fractions and legacy over-1 ranking scores as percentages', () => {
        expect(formatConfidence(0.99)).toBe('99%');
        expect(formatConfidence(1)).toBe('100%');
        // Station ranking score saved before it was capped: not "1%".
        expect(formatConfidence(1.0808)).toBe('100%');
        expect(formatConfidence(88)).toBe('88%');
    });

    const scannedRow = (overrides: Partial<OcrReviewRow> = {}): OcrReviewRow => ({
        ...createFailedReviewRow('img-1', 'a.jpg', null),
        status: 'COMPLETE',
        stationId: 20,
        stationName: 'Kiên Giang',
        numbers: '424944',
        drawDate: '2026-08-23',
        ticketType: '10000',
        fieldConfidences: { stationName: 0.88, numbers: 0.99, drawDate: 0.99, ticketType: 0.9 },
        fieldValidations: {
            stationName: { status: 'MATCHED' },
            numbers: { status: 'MATCHED' },
            drawDate: { status: 'MISMATCHED' },
            ticketType: { status: 'MATCHED' },
        },
        fields: {
            stationName: { fieldName: 'stationName', value: 'Kiên Giang' },
            numbers: { fieldName: 'numbers', value: '424944' },
            drawDate: { fieldName: 'drawDate', value: '2026-08-23' },
            ticketType: { fieldName: 'ticketType', value: '10.000 VND' },
        },
        ...overrides,
    });

    it('reports 100% for values confirmed against their reference', () => {
        const row = scannedRow({ edited: true });
        expect(resolveFieldDisplayConfidence(row, 'stationName', 'corrected')).toEqual({
            confidence: 1,
            confirmed: true,
        });
        expect(resolveFieldDisplayConfidence(row, 'ticketType', 'valid').confidence).toBe(1);
    });

    it('keeps OCR confidence without a reference, on mismatch, or after a manual change', () => {
        const row = scannedRow();
        expect(resolveFieldDisplayConfidence(row, 'numbers', 'valid')).toEqual({
            confidence: 0.99,
            confirmed: false,
        });
        expect(resolveFieldDisplayConfidence(row, 'drawDate', 'invalid').confidence).toBe(0.99);
        const changed = scannedRow({ edited: true, stationName: 'Cần Thơ' });
        expect(resolveFieldDisplayConfidence(changed, 'stationName', 'corrected').confidence).toBe(0.88);
    });

    it('averages field recognition confidence instead of the backend overall score', () => {
        const row = scannedRow({
            confidence: 0.38,
            adjustedConfidence: 0.4,
            serialNumber: '424944A',
            fieldConfidences: {
                stationName: 0.8,
                drawDate: 0.8,
                numbers: 0.8,
                serialNumber: 0.8,
                ticketType: 0.8,
            },
            fieldValidations: {},
        });
        expect(getOcrReviewFieldConfidence(row)).toBeCloseTo(0.8);
        expect(getOcrReviewFieldConfidence({
            ...row,
            fieldValidations: { stationName: { status: 'MATCHED' } },
        })).toBeCloseTo(0.8);
        expect(getOcrReviewFieldConfidence({
            ...row,
            fieldConfidences: { stationName: 0.8, drawDate: 0.8, numbers: 0.8, ticketType: 0.8 },
        })).toBeCloseTo(0.64);
    });

    it('counts invalid fields once when system warnings repeat them', () => {
        const row = scannedRow({
            serialNumber: '424944A',
            fieldValidations: {
                stationName: { status: 'MISMATCHED', message: 'Đài không mở thưởng ngày này' },
                drawDate: { status: 'MISMATCHED', message: 'Ngày quay không khớp' },
            },
            validationErrors: ['Ngày quay không khớp'],
            businessValidationErrors: ['Đài không mở thưởng ngày này'],
        });
        expect(getOcrReviewIssueCounts(row)).toEqual({ errorCount: 2, warningCount: 0 });
    });

    it('still counts a standalone system error when no field is invalid', () => {
        const row = scannedRow({
            serialNumber: '424944A',
            fieldValidations: {},
            validationErrors: ['Không thể tiếp nhận vé vào phiếu'],
            businessValidationErrors: [],
        });
        expect(getOcrReviewIssueCounts(row).errorCount).toBe(1);
    });

    it('shows old OCR errors as notes after all required fields are corrected', () => {
        const row = scannedRow({
            key: 'scan-21',
            status: 'FAILED',
            serialNumber: '424944A',
            edited: true,
            editedFields: { drawDate: true },
            fieldValidations: { drawDate: { status: 'MISMATCHED', message: 'Ngày OCR sai' } },
            validationErrors: ['Ngày OCR sai'],
            businessValidationErrors: [],
        });
        expect(canConfirmReviewRow(row)).toBe(true);
        expect(getOcrReviewIssueCounts(row)).toEqual({ errorCount: 0, warningCount: 1 });
        expect(canConfirmReviewRow({ ...row, key: 'failed-img-1' })).toBe(false);
    });

    it('does not clear errors on untouched fields when another field is corrected', () => {
        const row = scannedRow({
            serialNumber: '424944A',
            edited: true,
            editedFields: { numbers: true },
            fieldValidations: { drawDate: { status: 'MISMATCHED', message: 'Ngày OCR sai' } },
        });
        expect(canConfirmReviewRow(row)).toBe(false);
        expect(getOcrReviewIssueCounts(row).errorCount).toBe(1);
    });

    it('keeps a clearly read ticket out of the OCR failure alert despite batch-rule errors', () => {
        const row = scannedRow({
            status: 'INCOMPLETE',
            serialNumber: '424944A',
            fieldConfidences: {
                stationName: 0.95,
                drawDate: 0.99,
                numbers: 0.99,
                serialNumber: 0.95,
                ticketType: 0.99,
            },
            fieldValidations: {
                stationName: { status: 'MISMATCHED' },
                drawDate: { status: 'MISMATCHED' },
            },
        });
        expect(hasHighConfidenceOcrFields(row)).toBe(true);
        expect(hasHighConfidenceOcrFields({ ...row, fieldConfidences: { ...row.fieldConfidences, serialNumber: 0.5 } })).toBe(false);
    });
});

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
                lines: [],
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

    it('does not label a recognized station or a missing denomination with the wrong hint', () => {
        expect(
            toShortFieldHint(
                "Nhà đài OCR 'Tây Ninh' không mở thưởng vào Thứ Hai (ngày phiếu 28/09/2026). Giữ kết quả OCR để bạn kiểm tra."
            )
        ).toBe('Sai lịch quay');
        expect(toShortFieldHint("Nhà đài OCR 'Tây Ninh' khác đài gắn với phiếu/dòng lô (Hồ Chí Minh). Vui lòng kiểm tra lại.")).toBe(
            'Khác đài phiếu'
        );
        expect(toShortFieldHint("Nhà đài nhận diện 'Tay Nin' không tìm thấy trong hệ thống.")).toBe('Không tìm thấy đài');
        expect(toShortFieldHint('Vui lòng nhập mệnh giá (chuẩn: 10.000 đ).')).toBe('Thiếu mệnh giá');
        expect(toShortFieldHint('Mệnh giá không hợp lệ.')).toBe('Sai mệnh giá');
        expect(toShortFieldHint('Không nhận diện được mệnh giá trên vé. Thông tin có thể bị che.')).toBe('Ảnh mờ/bị che');
        expect(toShortFieldHint('Chưa xác định nhà đài để kiểm tra mệnh giá vé.')).toBe('Chưa chọn đài');
        expect(
            toShortFieldHint('Ngày mở thưởng (11/06/2026) không khớp với ngày quay của phiếu (28/09/2026).')
        ).toBe('Lệch ngày phiếu');
        expect(toShortFieldHint('Ngày mở thưởng nhận diện (11/06/2026) không khớp phiếu nhập lô (28/09/2026).')).toBe(
            'Lệch ngày phiếu'
        );
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
            serialNumber: '',
            batchCode: 'A123456',
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

describe('review station groups', () => {
    it('groups serial rows by station, draw date and numbers without dropping unresolved rows', () => {
        const base = createFailedReviewRow('image-1', 'scan.jpg', null);
        const rows = [
            { ...base, key: 'a', stationId: 1, stationName: 'Bến Tre', drawDate: '2026-09-29', numbers: '123456', serialNumber: '123456A' },
            { ...base, key: 'b', stationId: 1, stationName: 'Bến Tre', drawDate: '2026-09-29', numbers: '123456', serialNumber: '123456B' },
            { ...base, key: 'c', stationId: 1, stationName: 'Bến Tre', drawDate: '2026-09-30', numbers: '123456', serialNumber: '123456C' },
            { ...base, key: 'd', stationId: null, stationName: null, numbers: '789012' },
        ];
        const groups = buildReviewStationGroups(rows);
        expect(groups).toHaveLength(2);
        expect(groups[0].tickets.map((ticket) => ticket.rows.map((row) => row.key))).toEqual([['a', 'b'], ['c']]);
        expect(groups[1].stationName).toBe('Chưa xác định nhà đài');
        expect(groups[1].tickets[0].rows[0].key).toBe('d');
    });
});
