import dayjs from 'dayjs';
import type {
    ImportBatchFileGroup,
    ImportBatchFileMapping,
    ImportBatchFilePreviewResult,
    ImportBatchFileRow,
} from '../types/importBatch.type';

/**
 * Same field set as the delivery note, in the same order, plus what the preview
 * made of each row.
 *
 * <p>Kept in step with ImportBatchDocumentWriter.TICKET_HEADERS on the server and
 * TICKET_HEADERS in importBatchFileTemplate: this report is read side by side
 * with the file it describes, and a reader should not have to translate columns.
 */
const HEADERS = [
    'Dòng',
    'Mã đài',
    'Nhà đài (trong tệp)',
    'Nhà đài khớp',
    'Ngày quay',
    'Lịch quay',
    'Loại lô',
    'Dãy số',
    'Số sê-ri',
    'Khai báo',
    'Nhập được',
    'Giá nhập',
    'Giá bán',
    'Hoa hồng (%)',
    'Thành tiền',
    'Trạng thái',
    'Ghi chú',
];

/** What the operator needs to do about a row, in their own words. */
export type ImportBatchProgressStatus =
    | 'Nhập đủ'
    | 'Chưa nhập đủ'
    | 'Lỗi nhập'
    | 'Không tạo được'
    | 'Ngoài phạm vi ngày quay'
    | 'Đã gộp vào dòng khác';

const formatDate = (value?: string) => (value ? dayjs(value).format('DD/MM/YYYY') : '');

const formatNumber = (value?: number | null) =>
    value == null ? '' : String(Math.round(value * 100) / 100);

const BATCH_TYPE_LABELS: Record<string, string> = {
    NEW: 'Nhập mới',
    SUPPLEMENTARY: 'Nhập bổ sung',
    ADJUSTMENT: 'Nhập vé điều chỉnh',
};

/** Per-station facts the preview response does not carry but the document names. */
export type ImportBatchProgressStationPricing = {
    drawSchedule?: string;
    salePrice?: number;
    commissionPercent?: number;
};

/**
 * Who and what this reconciliation report is about.
 *
 * <p>The same identifying block the delivery note prints, so a report filed
 * beside the file it describes stands on its own months later - a bare table of
 * rows names neither the supplier nor the file it came from.
 */
export type ImportBatchProgressContext = {
    issuerName?: string;
    supplierName?: string;
    supplierCode?: string;
    supplierTaxCode?: string;
    operatorName?: string;
    sourceFileName?: string;
    /** Keyed by lotteryStationId. */
    stationPricing?: Record<number, ImportBatchProgressStationPricing>;
};

/**
 * Label / value rows above the table.
 *
 * <p>Written as two-cell rows so the backend's letterhead reader sees exactly the
 * shape it expects: were this report ever uploaded, the supplier check would read
 * it correctly rather than mistaking a heading for data.
 */
const buildLetterheadRows = (
    preview: ImportBatchFilePreviewResult,
    context?: ImportBatchProgressContext
): string[][] => {
    const drawDates = preview.groups
        .map((group) => formatDate(group.drawDate))
        .filter(Boolean)
        .join(' · ');

    return [
        [context?.issuerName ?? 'ĐẠI PHÁT', '', 'Mẫu số: 02-VT/ĐC'],
        ['BẢNG ĐỐI CHIẾU NHẬP VÉ TỪ TỆP', ''],
        ['Nhà cung cấp:', context?.supplierName ?? ''],
        ['Mã nhà cung cấp:', context?.supplierCode ?? ''],
        ['Mã số thuế:', context?.supplierTaxCode ?? ''],
        ['Người nhập lô:', context?.operatorName ?? ''],
        ['Tệp nguồn:', context?.sourceFileName ?? ''],
        ['Ngày quay trong tệp:', drawDates],
        ['Thời điểm đối chiếu:', dayjs().format('HH:mm DD/MM/YYYY')],
        ['Tổng số dòng:', String(preview.totalRows)],
        ['Nhập được:', String(preview.importableRows)],
        ['Bỏ qua:', String(preview.skippedRows)],
        ['Lỗi:', String(preview.errorRows)],
        [],
    ];
};

/**
 * Decides the progress status of one row.
 *
 * <p>The group is checked before the row: a row can be perfectly readable and
 * still produce nothing because its whole draw date is blocked, and reporting
 * that row as "nhập đủ" would be a lie.
 */
export const resolveProgressStatus = (
    group: ImportBatchFileGroup,
    row: ImportBatchFileRow
): ImportBatchProgressStatus => {
    if (group.status === 'OUT_OF_WINDOW') {
        return 'Ngoài phạm vi ngày quay';
    }
    if (row.status === 'ERROR') {
        return 'Lỗi nhập';
    }
    if (row.status === 'SKIPPED') {
        return 'Đã gộp vào dòng khác';
    }
    if (group.status === 'BLOCKED') {
        return 'Không tạo được';
    }

    const declared = row.declareQuantity ?? 0;
    const actual = row.serialCount ?? row.serialNumbers?.length ?? declared;
    return actual < declared ? 'Chưa nhập đủ' : 'Nhập đủ';
};

/**
 * The system's explanation for that status.
 *
 * <p>Group-level reasons are folded into every row of the group, because someone
 * filtering the file down to one bad row must still see why it failed.
 */
export const resolveProgressNote = (
    group: ImportBatchFileGroup,
    row: ImportBatchFileRow,
    status: ImportBatchProgressStatus
): string => {
    const notes: string[] = [];

    if (status === 'Không tạo được' || status === 'Ngoài phạm vi ngày quay') {
        group.groupIssues.forEach((issue) => notes.push(issue.message));
    }

    row.issues.forEach((issue) => notes.push(issue.message));

    if (status === 'Chưa nhập đủ' && notes.length === 0) {
        const declared = row.declareQuantity ?? 0;
        const actual = row.serialCount ?? row.serialNumbers?.length ?? 0;
        notes.push(`Thiếu ${declared - actual} vé so với số khai báo.`);
    }

    // Duplicates are common once group reasons are folded in.
    return Array.from(new Set(notes)).join(' | ');
};

const escapeCell = (value: string): string => {
    if (!value) {
        return '';
    }
    const needsQuoting = /[",\n\r]/.test(value) || value.startsWith(' ') || value.endsWith(' ');
    return needsQuoting ? `"${value.replace(/"/g, '""')}"` : value;
};

/**
 * Builds the progress report: every row of the uploaded file with what the system
 * made of it.
 *
 * <p>Generated here rather than on the server because the preview response already
 * holds everything, so the report is available the moment the operator looks at it
 * - and it describes what they are seeing on screen, not a later re-read.
 */
export const buildImportBatchProgressCsv = (
    preview: ImportBatchFilePreviewResult,
    mapping: ImportBatchFileMapping | null,
    context?: ImportBatchProgressContext
): string => {
    const rows: string[][] = [];

    preview.groups.forEach((group) => {
        const stationById = new Map(
            group.stations.map((station) => [station.lotteryStationId, station])
        );

        group.rows.forEach((row) => {
            const status = resolveProgressStatus(group, row);
            const rawValue = (column?: string | null) =>
                column ? row.rawValues[column] ?? '' : '';

            const station = row.lotteryStationId
                ? stationById.get(row.lotteryStationId)
                : undefined;
            const pricing = row.lotteryStationId
                ? context?.stationPricing?.[row.lotteryStationId]
                : undefined;
            const serialCount = row.serialCount ?? row.serialNumbers?.length ?? 0;
            const importCost = row.importCost ?? station?.importCost;

            rows.push([
                String(row.rowNumber),
                rawValue(mapping?.stationCodeColumn),
                rawValue(mapping?.stationColumn),
                row.stationName ?? '',
                formatDate(row.drawDate ?? group.drawDate),
                pricing?.drawSchedule ?? '',
                row.resolvedBatchType ? BATCH_TYPE_LABELS[row.resolvedBatchType] : '',
                row.numbers ?? '',
                (row.serialNumbers ?? []).join('; '),
                String(row.declareQuantity ?? ''),
                String(serialCount || ''),
                formatNumber(importCost),
                formatNumber(pricing?.salePrice),
                formatNumber(pricing?.commissionPercent),
                formatNumber(importCost != null && serialCount ? importCost * serialCount : undefined),
                status,
                resolveProgressNote(group, row, status),
            ]);
        });
    });

    return [...buildLetterheadRows(preview, context), HEADERS, ...rows]
        .map((row) => row.map(escapeCell).join(','))
        .join('\r\n');
};

export const downloadImportBatchProgressCsv = (
    preview: ImportBatchFilePreviewResult,
    mapping: ImportBatchFileMapping | null,
    sourceFileName?: string,
    context?: ImportBatchProgressContext
) => {
    const resolved: ImportBatchProgressContext = { ...context, sourceFileName };
    // The BOM makes Excel read it as UTF-8 rather than the system code page.
    const blob = new Blob(['﻿' + buildImportBatchProgressCsv(preview, mapping, resolved)], {
        type: 'text/csv;charset=utf-8;',
    });

    const base = (sourceFileName ?? 'nhap-ve').replace(/\.[^.]+$/, '');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tien-do-${base}-${dayjs().format('YYYYMMDD-HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
