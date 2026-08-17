import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import type {
    ImportBatchFileGroup,
    ImportBatchFileMapping,
    ImportBatchFilePreviewResult,
    ImportBatchFileRow,
} from '../types/importBatch.type';
import { formatPreviewIssueNote, resolveGroupBlockingNote } from './importBatchFileImport';
import {
    COL,
    DOCUMENT_PAGE_SETUP,
    FALLBACK_ISSUER,
    IMPORT_BATCH_TICKET_HEADERS,
    LEFT_ALIGNED_COLUMNS,
    MONEY_FORMAT,
    PERCENT_FORMAT,
    TICKET_COLUMN_COUNT,
    TICKET_COLUMN_WIDTHS,
    ZEBRA,
    buildLetterhead,
    buildSignatureBlock,
    buildTotalsRow,
    styleHeaderRow,
    thinBorder,
    type ImportBatchTemplateIssuer,
    type ImportBatchTemplateSupplier,
} from './importBatchDocumentLayout';

/**
 * The delivery note as the system read it back.
 *
 * <p>Same form, same columns, same order as the file that was uploaded — the
 * operator lays the two side by side, so anything that moved would have to be
 * re-found. Only the title changes and two columns are appended: what the system
 * made of each line, and why.
 */

/** The two columns this document adds after the uploaded file's own. */
const REVIEW_HEADERS = ['Trạng thái', 'Ghi chú'] as const;

const HEADERS = [...IMPORT_BATCH_TICKET_HEADERS, ...REVIEW_HEADERS] as const;

const COLUMN_WIDTHS = [...TICKET_COLUMN_WIDTHS, 18, 44];

/** 1-based positions of the appended columns. */
const REVIEW_COL = {
    status: TICKET_COLUMN_COUNT + 1,
    note: TICKET_COLUMN_COUNT + 2,
} as const;

const LAST_COLUMN = REVIEW_COL.note;

const ERROR_BG = 'FFFEF2F2';
const WARNING_BG = 'FFFFF7ED';
const SKIPPED_BG = 'FFF1F5F9';

/** What the operator needs to do about a row, in their own words. */
export type ImportBatchProgressStatus =
    | 'Hợp lệ'
    | 'Cần xem lại'
    | 'Lỗi'
    | 'Bỏ qua'
    | 'Ngoài hạn nhập'
    /** The row is sound but its whole draw date is barred from import. */
    | 'Không hợp lệ';

const formatDate = (value?: string) => (value ? dayjs(value).format('DD/MM/YYYY') : '');

/** Per-station facts the preview response does not carry but the document names. */
export type ImportBatchProgressStationPricing = {
    drawSchedule?: string;
    salePrice?: number;
    commissionPercent?: number;
};

export type ImportBatchProgressContext = {
    issuer?: ImportBatchTemplateIssuer;
    supplier?: ImportBatchTemplateSupplier;
    operatorName?: string;
    sourceFileName?: string;
    stationPricing?: Record<number, ImportBatchProgressStationPricing>;
};

// ------------------------------------------------------------ cell reads

const rawValue = (row: ImportBatchFileRow, column?: string | null): string =>
    column ? String(row.rawValues?.[column] ?? '').trim() : '';

const normalizeHeader = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9%]/g, '');

/**
 * Reads a cell the mapping does not name.
 *
 * <p>rawValues only carries the columns the mapping bound, so a column such as
 * "Thành tiền" is simply absent — it is a spreadsheet formula the backend never
 * reads. Falling back to a header lookup keeps the document honest about that
 * rather than inventing a value.
 */
const cellByHeader = (row: ImportBatchFileRow, header: string): string => {
    const exact = row.rawValues?.[header];
    if (exact != null && String(exact).trim()) {
        return String(exact).trim();
    }
    const wanted = normalizeHeader(header);
    const match = Object.entries(row.rawValues ?? {}).find(
        ([key]) => normalizeHeader(key) === wanted
    );
    return match ? String(match[1] ?? '').trim() : '';
};

const toNumber = (value: string): number | string => {
    if (!value) {
        return '';
    }
    // Vietnamese exports write 9.500 or 9,500 for the same figure.
    const cleaned = value.replace(/[\s.,](?=\d{3}\b)/g, '').replace(',', '.');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : value;
};

// -------------------------------------------------------- row verdicts

export const resolveProgressStatus = (
    group: ImportBatchFileGroup,
    row: ImportBatchFileRow
): ImportBatchProgressStatus => {
    if (
        group.status === 'OUT_OF_WINDOW' ||
        row.issues.some((issue) => issue.code === 'DRAW_DATE_OUT_OF_WINDOW')
    ) {
        return 'Ngoài hạn nhập';
    }
    if (row.status === 'ERROR') {
        return 'Lỗi';
    }
    // The group's verdict outranks the row's: nothing here will be imported, so
    // the document must not record the line as valid.
    if (resolveGroupBlockingNote(group)) {
        return 'Không hợp lệ';
    }
    if (row.status === 'WARNING') {
        return 'Cần xem lại';
    }
    // A line whose serial was handed to an earlier line of the same lottery
    // number is accepted, not skipped: the ticket exists after import. Merging is
    // how one number covering several physical tickets is stored, so reporting it
    // as anything other than valid describes plumbing rather than an outcome.
    if (row.status === 'SKIPPED' && row.mergedIntoRowNumber == null) {
        return 'Bỏ qua';
    }
    return 'Hợp lệ';
};

/**
 * Why a line is not simply valid. Silent when it is.
 *
 * <p>Merging is deliberately not reported: it is internal storage mechanics, and
 * a note about it on a document that gets signed and filed only invites the
 * question of whether a ticket went missing.
 */
export const resolveProgressNote = (
    group: ImportBatchFileGroup,
    row: ImportBatchFileRow,
    status: ImportBatchProgressStatus
): string => {
    const notes: string[] = [];

    // First, because it is the reason nothing on this line was imported.
    const blocked = resolveGroupBlockingNote(group);
    if (blocked) {
        notes.push(blocked.short);
    }

    row.issues
        .filter(
            (issue) =>
                issue.code !== 'NUMBERS_MERGED_INTO_ROW' &&
                issue.code !== 'NUMBERS_DUPLICATED_IN_GROUP'
        )
        .forEach((issue) => notes.push(formatPreviewIssueNote(issue)));

    if (status === 'Ngoài hạn nhập' && notes.length === 0) {
        group.groupIssues.forEach((issue) => notes.push(formatPreviewIssueNote(issue)));
    }

    return Array.from(new Set(notes.filter(Boolean))).join(' · ');
};

// ------------------------------------------------------------ the table

type ExportRow = {
    /** Line of the uploaded file, so a note referring to it can be resolved. */
    fileLine: number;
    values: Array<string | number>;
    status: ImportBatchProgressStatus;
    group: ImportBatchFileGroup;
    row: ImportBatchFileRow;
};

/** Tickets this line of the file stands for — one row may pack several serials. */
const countSerials = (serialCell: string): number => {
    const counted = serialCell
        .split(/[;,]/)
        .map((part) => part.trim())
        .filter(Boolean).length;
    return counted > 0 ? counted : 1;
};

/**
 * What one ticket on this line actually costs.
 *
 * <p>Giá nhập is the figure the batch is costed with, so it wins when the file
 * states it. When it does not, it is derived the way the system derives it
 * everywhere else — giá bán × (1 − hoa hồng) — rather than left blank, which is
 * how this column came out empty.
 */
const resolveUnitCost = (
    importCost: number | string,
    salePrice: number | string,
    commissionPercent: number | string
): number | undefined => {
    if (typeof importCost === 'number' && Number.isFinite(importCost)) {
        return importCost;
    }
    if (typeof salePrice !== 'number' || !Number.isFinite(salePrice)) {
        return undefined;
    }
    const commission =
        typeof commissionPercent === 'number' && Number.isFinite(commissionPercent)
            ? commissionPercent
            : 0;
    return Math.round(salePrice * (1 - commission / 100));
};

const buildExportRow = (
    group: ImportBatchFileGroup,
    row: ImportBatchFileRow,
    mapping: ImportBatchFileMapping | null
): ExportRow => {
    const status = resolveProgressStatus(group, row);
    const serialFromFile = rawValue(row, mapping?.serialsColumn) || cellByHeader(row, 'Số sê-ri');
    const serialCell = serialFromFile || (row.serialNumbers ?? []).join('; ');

    const importCost = toNumber(
        rawValue(row, mapping?.importCostColumn) || cellByHeader(row, 'Giá nhập')
    );
    const salePrice = toNumber(
        rawValue(row, mapping?.salePriceColumn) || cellByHeader(row, 'Giá bán')
    );
    const commissionPercent = toNumber(
        rawValue(row, mapping?.commissionRateColumn) || cellByHeader(row, 'Hoa hồng (%)')
    );
    // Derived when the file omits it, so the column is never blank on a line the
    // supplier priced through sale price and commission alone.
    const unitCost = resolveUnitCost(importCost, salePrice, commissionPercent);

    return {
        fileLine: row.rowNumber,
        status,
        group,
        row,
        values: [
            // Filled in once the rows are ordered: the column is a running count
            // of this document, not the line number of the file.
            '',
            rawValue(row, mapping?.stationCodeColumn) || cellByHeader(row, 'Mã đài'),
            rawValue(row, mapping?.stationColumn) || row.stationName || cellByHeader(row, 'Nhà đài'),
            rawValue(row, mapping?.drawDateColumn) ||
                formatDate(row.drawDate ?? group.drawDate) ||
                cellByHeader(row, 'Ngày quay'),
            rawValue(row, mapping?.numbersColumn) || row.numbers || cellByHeader(row, 'Dãy số'),
            serialCell,
            rawValue(row, mapping?.ticketImageColumn) || cellByHeader(row, 'Ảnh vé'),
            salePrice,
            commissionPercent,
            // Giá nhập closes the ticket columns, read after the sale price and
            // commission it derives from.
            importCost !== '' ? importCost : (unitCost ?? ''),
            status,
            // Filled in once every line has an STT — see collectExportRows.
            '',
        ],
    };
};

const collectExportRows = (
    preview: ImportBatchFilePreviewResult,
    mapping: ImportBatchFileMapping | null
): ExportRow[] => {
    const rows: ExportRow[] = [];
    preview.groups.forEach((group) => {
        group.rows.forEach((row) => rows.push(buildExportRow(group, row, mapping)));
    });
    // Back into file order, so the document reads like the upload it mirrors.
    rows.sort((left, right) => left.fileLine - right.fileLine);

    rows.forEach((exportRow, index) => {
        exportRow.values[COL.index - 1] = index + 1;
        exportRow.values[REVIEW_COL.note - 1] = resolveProgressNote(
            exportRow.group,
            exportRow.row,
            exportRow.status
        );
    });
    return rows;
};

const fillArgb = (status: ImportBatchProgressStatus): string | undefined => {
    if (status === 'Lỗi') {
        return ERROR_BG;
    }
    if (status === 'Không hợp lệ') {
        return ERROR_BG;
    }
    if (status === 'Cần xem lại' || status === 'Ngoài hạn nhập') {
        return WARNING_BG;
    }
    if (status === 'Bỏ qua') {
        return SKIPPED_BG;
    }
    return undefined;
};

const summarize = (rows: ExportRow[]) => {
    const byStatus = new Map<ImportBatchProgressStatus, number>();
    rows.forEach((row) => byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1));
    return [...byStatus.entries()]
        .map(([status, count]) => `${status}: ${count.toLocaleString('vi-VN')}`)
        .join(' · ');
};

// ---------------------------------------------------------------- entry

export const buildImportBatchProgressWorkbook = (
    preview: ImportBatchFilePreviewResult,
    mapping: ImportBatchFileMapping | null,
    context?: ImportBatchProgressContext
): ExcelJS.Workbook => {
    const workbook = new ExcelJS.Workbook();
    const issuer = context?.issuer ?? FALLBACK_ISSUER;
    workbook.creator = issuer.legalName;
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Đối chiếu sau nhập', {
        pageSetup: DOCUMENT_PAGE_SETUP,
    });
    COLUMN_WIDTHS.forEach((width, index) => {
        sheet.getColumn(index + 1).width = width;
    });

    const rows = collectExportRows(preview, mapping);
    const drawDates =
        [...new Set(preview.groups.map((group) => formatDate(group.drawDate)).filter(Boolean))].join(
            ' · '
        ) || '—';

    const headerRowNumber = buildLetterhead(sheet, {
        title: 'PHIẾU ĐỐI CHIẾU SAU NHẬP',
        subtitle: `Đối chiếu tệp nhập vé · Ngày quay: ${drawDates}`,
        formCode: 'Mẫu số: 02-VT/ĐC',
        documentNumber: `Lập lúc: ${dayjs().format('DD/MM/YYYY HH:mm')}`,
        supplier: context?.supplier,
        issuer,
        drawDates,
        lastColumn: LAST_COLUMN,
        extraFields: [
            ['Tệp gốc:', context?.sourceFileName],
            ['Người đối chiếu:', context?.operatorName],
        ],
    });

    const headerRow = sheet.getRow(headerRowNumber);
    HEADERS.forEach((label, index) => {
        headerRow.getCell(index + 1).value = label;
    });
    styleHeaderRow(headerRow, LAST_COLUMN);
    sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];

    const firstDataRow = headerRowNumber + 1;
    rows.forEach((exportRow, index) => {
        const rowNumber = firstDataRow + index;
        const row = sheet.getRow(rowNumber);
        const tint = fillArgb(exportRow.status);

        exportRow.values.forEach((value, offset) => {
            row.getCell(offset + 1).value = value;
        });

        for (let column = 1; column <= LAST_COLUMN; column++) {
            const cell = row.getCell(column);
            cell.border = thinBorder;
            cell.alignment = {
                vertical: 'middle',
                horizontal:
                    LEFT_ALIGNED_COLUMNS.includes(column) || column === REVIEW_COL.note
                        ? 'left'
                        : 'center',
                wrapText: column === REVIEW_COL.note,
            };
            if (tint) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tint } };
            } else if (index % 2 === 1) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
            }
        }
        row.getCell(COL.salePrice).numFmt = MONEY_FORMAT;
        row.getCell(COL.commission).numFmt = PERCENT_FORMAT;
        row.getCell(COL.importCost).numFmt = MONEY_FORMAT;
        row.height = 22;
    });

    const lastDataRow = firstDataRow + rows.length - 1;
    if (rows.length > 0) {
        buildTotalsRow(
            sheet,
            lastDataRow + 1,
            `TỔNG CỘNG: ${rows.length.toLocaleString('vi-VN')} dòng  (${summarize(rows)})`,
            LAST_COLUMN
            // Nothing to total: Giá nhập is a unit price, not a line amount.
        );
        buildSignatureBlock(sheet, lastDataRow + 4, [
            ['NGƯỜI ĐỐI CHIẾU', COL.index, COL.drawDate],
            ['THỦ KHO', COL.numbers, COL.image],
            ['KẾ TOÁN', COL.salePrice, LAST_COLUMN],
        ]);
    }

    sheet.autoFilter = {
        from: { row: headerRowNumber, column: 1 },
        to: { row: headerRowNumber, column: LAST_COLUMN },
    };
    return workbook;
};

/**
 * File name stem for a reconciliation download.
 *
 * <p>Strips the extension, then any prefix and timestamp this function itself
 * added on an earlier round. Exporting, re-uploading and exporting again is
 * normal, and without this the name grew a "phieu-doi-chieu-" on every pass
 * until it no longer fit the cell that displays it.
 */
export const reconciliationFileStem = (sourceFileName?: string): string => {
    let base = (sourceFileName ?? 'nhap-ve').replace(/\.[^.]+$/, '');
    let previous: string;
    do {
        previous = base;
        base = base
            .replace(/^phieu-doi-chieu-/i, '')
            .replace(/^doi-chieu-/i, '')
            .replace(/-\d{8}-\d{4}$/, '');
    } while (base !== previous && base.length > 0);

    return `phieu-doi-chieu-${base || 'nhap-ve'}`;
};

export const downloadImportBatchProgressCsv = async (
    preview: ImportBatchFilePreviewResult,
    mapping: ImportBatchFileMapping | null,
    sourceFileName?: string,
    context?: ImportBatchProgressContext
) => {
    const workbook = buildImportBatchProgressWorkbook(preview, mapping, {
        ...context,
        sourceFileName: context?.sourceFileName ?? sourceFileName,
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reconciliationFileStem(sourceFileName)}-${dayjs().format('YYYYMMDD-HHmm')}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
