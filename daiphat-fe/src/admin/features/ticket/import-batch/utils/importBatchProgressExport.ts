import dayjs from 'dayjs';
import type {
    ImportBatchFileGroup,
    ImportBatchFileMapping,
    ImportBatchFilePreviewResult,
    ImportBatchFileRow,
} from '../types/importBatch.type';

const HEADERS = [
    'Dòng',
    'Ngày quay',
    'Mã đài',
    'Nhà đài (trong tệp)',
    'Nhà đài khớp',
    'Dãy số',
    'Số sê-ri',
    'Khai báo',
    'Nhập được',
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
    mapping: ImportBatchFileMapping | null
): string => {
    const rows: string[][] = [];

    preview.groups.forEach((group) => {
        group.rows.forEach((row) => {
            const status = resolveProgressStatus(group, row);
            const rawValue = (column?: string | null) =>
                column ? row.rawValues[column] ?? '' : '';

            rows.push([
                String(row.rowNumber),
                formatDate(row.drawDate ?? group.drawDate),
                rawValue(mapping?.stationCodeColumn),
                rawValue(mapping?.stationColumn),
                row.stationName ?? '',
                row.numbers ?? '',
                (row.serialNumbers ?? []).join('; '),
                String(row.declareQuantity ?? ''),
                String(row.serialCount ?? row.serialNumbers?.length ?? ''),
                status,
                resolveProgressNote(group, row, status),
            ]);
        });
    });

    return [HEADERS, ...rows]
        .map((row) => row.map(escapeCell).join(','))
        .join('\r\n');
};

export const downloadImportBatchProgressCsv = (
    preview: ImportBatchFilePreviewResult,
    mapping: ImportBatchFileMapping | null,
    sourceFileName?: string
) => {
    // The BOM makes Excel read it as UTF-8 rather than the system code page.
    const blob = new Blob(['﻿' + buildImportBatchProgressCsv(preview, mapping)], {
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
