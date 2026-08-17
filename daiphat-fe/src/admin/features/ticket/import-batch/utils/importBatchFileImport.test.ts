import { describe, expect, it } from 'vitest';
import type { ImportBatchFileIssue, ImportBatchFileRow } from '../types/importBatch.type';
import {
    collectPreviewRowNotes,
    formatPreviewIssueNote,
    formatRowNumberRange,
    groupPreviewTicketRows,
    listPreviewSerials,
} from './importBatchFileImport';

const issue = (
    code: ImportBatchFileIssue['code'],
    message: string,
    severity: ImportBatchFileIssue['severity'] = 'SKIPPED'
): ImportBatchFileIssue => ({ code, message, severity });

const row = (partial: Partial<ImportBatchFileRow> & Pick<ImportBatchFileRow, 'rowNumber' | 'status'>): ImportBatchFileRow => ({
    rawValues: {},
    issues: [],
    ...partial,
});

describe('formatRowNumberRange', () => {
    it('collapses consecutive numbers', () => {
        expect(formatRowNumberRange([16, 17, 18, 19])).toBe('#16–19');
    });

    it('keeps gaps as a list', () => {
        expect(formatRowNumberRange([16, 17, 20])).toBe('#16–17, #20');
    });
});

describe('groupPreviewTicketRows', () => {
    it('folds merged serial lines into the first row of the same lottery number', () => {
        const keeper = row({
            rowNumber: 16,
            status: 'OK',
            numbers: '100000',
            stationName: 'Cà Mau',
            serialNumbers: ['CM1000001', 'CM1000002'],
            serialCount: 2,
        });
        const merged = row({
            rowNumber: 17,
            status: 'SKIPPED',
            numbers: '100000',
            stationName: 'Cà Mau',
            serialNumbers: ['CM1000002'],
            mergedIntoRowNumber: 16,
            issues: [
                issue(
                    'NUMBERS_MERGED_INTO_ROW',
                    'Dãy số 100000 đã có ở dòng 16. 1 sê-ri của dòng này đã gộp vào dòng đó, không bị bỏ sót.'
                ),
            ],
        });
        const otherStation = row({
            rowNumber: 18,
            status: 'ERROR',
            numbers: '100000',
            stationName: 'Tiền Giang',
            serialNumbers: ['TG1000001'],
        });

        const grouped = groupPreviewTicketRows([keeper, merged, otherStation]);

        expect(grouped).toHaveLength(1);
        expect(grouped[0].row.stationName).toBe('Cà Mau');
        expect(grouped[0].sourceRowNumbers).toEqual([16, 17, 18]);
        expect(grouped[0].attachedRows).toHaveLength(1);
        expect(listPreviewSerials(grouped[0]).map((item) => item.serial)).toEqual([
            'CM1000001',
            'CM1000002',
            'TG1000001',
        ]);
    });

    it('keeps the same lottery number on two successful stations as separate tickets', () => {
        const grouped = groupPreviewTicketRows([
            row({
                rowNumber: 1,
                status: 'OK',
                numbers: '100000',
                lotteryStationId: 10,
                stationName: 'Cà Mau',
                serialNumbers: ['CM1000001'],
            }),
            row({
                rowNumber: 2,
                status: 'OK',
                numbers: '100000',
                lotteryStationId: 20,
                stationName: 'Hồ Chí Minh',
                serialNumbers: ['HCM1000001'],
            }),
        ]);

        expect(grouped).toHaveLength(2);
        expect(grouped.map((line) => line.row.stationName)).toEqual(['Cà Mau', 'Hồ Chí Minh']);
    });

    it('flags price differences across merged lines', () => {
        const keeper = row({
            rowNumber: 20,
            status: 'OK',
            numbers: '100001',
            rawValues: { 'Giá bán': '10,000', 'Hoa hồng (%)': '5' },
        });
        const variant = row({
            rowNumber: 21,
            status: 'SKIPPED',
            numbers: '100001',
            mergedIntoRowNumber: 20,
            rawValues: { 'Giá bán': '9,000', 'Hoa hồng (%)': '10' },
        });

        const [line] = groupPreviewTicketRows([keeper, variant], {
            salePriceColumn: 'Giá bán',
            commissionRateColumn: 'Hoa hồng (%)',
        });
        expect(line.priceVariance).toBe(true);
    });

    it('keeps out-of-window file rows visible and groups them by lottery number', () => {
        const mapping = {
            stationColumn: 'Nhà đài',
            numbersColumn: 'Dãy số',
            serialsColumn: 'Số sê-ri',
        };
        const grouped = groupPreviewTicketRows(
            [
                row({
                    rowNumber: 3,
                    status: 'SKIPPED',
                    drawDate: '2026-08-16',
                    issues: [issue('DRAW_DATE_OUT_OF_WINDOW', 'Ngày quay nằm ngoài phạm vi cho phép.', 'SKIPPED')],
                    rawValues: {
                        'Nhà đài': 'Cà Mau',
                        'Dãy số': '100000',
                        'Số sê-ri': 'CM1000003',
                    },
                }),
                row({
                    rowNumber: 4,
                    status: 'SKIPPED',
                    drawDate: '2026-08-16',
                    issues: [issue('DRAW_DATE_OUT_OF_WINDOW', 'Ngày quay nằm ngoài phạm vi cho phép.', 'SKIPPED')],
                    rawValues: {
                        'Nhà đài': 'Cà Mau',
                        'Dãy số': '100000',
                        'Số sê-ri': 'CM1000004',
                    },
                }),
            ],
            mapping
        );

        expect(grouped).toHaveLength(1);
        expect(grouped[0].row.numbers).toBe('100000');
        expect(grouped[0].row.stationName).toBe('Cà Mau');
        expect(listPreviewSerials(grouped[0]).map((item) => item.serial)).toEqual([
            'CM1000003',
            'CM1000004',
        ]);
    });
});

describe('preview notes', () => {
    it('shortens merge and error messages while keeping the original in the tooltip text', () => {
        expect(
            formatPreviewIssueNote(
                issue('STATION_SCHEDULE_MISMATCH', 'Nhà đài có trong hệ thống nhưng lịch quay không bao gồm thứ của ngày quay này.', 'ERROR')
            )
        ).toBe('Lịch quay không khớp');

        const line = groupPreviewTicketRows([
            row({
                rowNumber: 16,
                status: 'OK',
                issues: [
                    issue(
                        'STATION_PRICING_MISMATCH',
                        'Dòng 21 đài Cà Mau có giá/hoa hồng trong tệp không khớp cấu hình.',
                        'ERROR'
                    ),
                ],
            }),
            row({
                rowNumber: 17,
                status: 'SKIPPED',
                mergedIntoRowNumber: 16,
                issues: [
                    issue('NUMBERS_MERGED_INTO_ROW', 'Dãy số 100000 đã có ở dòng 16. 1 sê-ri của dòng này đã gộp vào dòng đó, không bị bỏ sót.'),
                ],
            }),
        ])[0];

        const notes = collectPreviewRowNotes(line);
        expect(notes.short).toBe('Giá lệch hệ thống');
        expect(notes.short).not.toContain('đã gộp vào dòng đó');
        expect(notes.full).toContain('không khớp cấu hình');
    });
});
