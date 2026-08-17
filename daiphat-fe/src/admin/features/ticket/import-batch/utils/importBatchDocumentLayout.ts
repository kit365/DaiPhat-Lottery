import ExcelJS from 'exceljs';
import dayjs from 'dayjs';

/**
 * The shared look of every ticket document this feature produces: the blank
 * delivery note offered for download, and the reconciliation note exported after
 * a file has been read.
 *
 * <p>They were built twice before, and drifted — same data, different letterhead,
 * different rules, different column widths. Anyone comparing the two on a desk
 * could see they were not the same form. Everything structural lives here now, so
 * a change to the form reaches both by construction rather than by discipline.
 */

// ------------------------------------------------------------- palette

export const BRAND = 'FFEE1314';
export const HEADER_TEXT = 'FFFFFFFF';
/**
 * Slate-500 rather than a hairline grey: at 100% zoom in Excel a CBD5E1 rule is
 * indistinguishable from the sheet's own gridlines, so a printed copy came out
 * looking like an unruled list.
 */
export const BORDER = 'FF64748B';
export const STRONG_BORDER = 'FF334155';
export const ZEBRA = 'FFF8FAFC';
export const NOTE_BG = 'FFFFF9E6';
export const PARTY_BG = 'FFF1F5F9';
export const TOTAL_BG = 'FFFEF2F2';
export const INK = 'FF0F172A';
export const MUTED = 'FF64748B';

export const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: BORDER } },
    left: { style: 'thin', color: { argb: BORDER } },
    bottom: { style: 'thin', color: { argb: BORDER } },
    right: { style: 'thin', color: { argb: BORDER } },
};

export const mediumBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'medium', color: { argb: STRONG_BORDER } },
    left: { style: 'thin', color: { argb: STRONG_BORDER } },
    bottom: { style: 'medium', color: { argb: STRONG_BORDER } },
    right: { style: 'thin', color: { argb: STRONG_BORDER } },
};

export const MONEY_FORMAT = '#,##0';

/**
 * "General", not "0.##": a decimal point written in an Excel format code is
 * always printed, so "0.##" renders a whole 5% as "5." — which reads like a
 * truncated number. General shows 5 as "5" and 12.5 as "12.5".
 */
export const PERCENT_FORMAT = 'General';

// -------------------------------------------------------------- columns

/**
 * The ticket table, in the order both documents print it. The reconciliation
 * note appends its own columns after these; it never reorders or replaces them,
 * so a row lines up with the uploaded file line for line.
 */
/**
 * One row is one physical ticket, so a "thành tiền" column would only ever
 * repeat the unit price — it carried no information and was dropped. Giá nhập
 * now closes the row, which is where the eye looks for the figure that matters:
 * the price is read after the sale price and commission it derives from.
 */
export const IMPORT_BATCH_TICKET_HEADERS = [
    'STT',
    'Mã đài',
    'Nhà đài',
    'Ngày quay',
    'Dãy số',
    'Số sê-ri',
    'Ảnh vé',
    'Giá bán',
    'Hoa hồng (%)',
    'Giá nhập',
] as const;

export const TICKET_COLUMN_WIDTHS = [6, 10, 22, 13, 12, 20, 26, 13, 13, 15];

/** 1-based column positions of the ticket table. */
export const COL = {
    index: 1,
    stationCode: 2,
    stationName: 3,
    drawDate: 4,
    numbers: 5,
    serial: 6,
    image: 7,
    salePrice: 8,
    commission: 9,
    importCost: 10,
} as const;

export const TICKET_COLUMN_COUNT = IMPORT_BATCH_TICKET_HEADERS.length;

/** Free text reads left; figures and codes read centred. */
export const LEFT_ALIGNED_COLUMNS: number[] = [COL.stationName, COL.serial, COL.image];

// ---------------------------------------------------------------- types

/**
 * Supplier facts printed into the letterhead. The backend reads these back and
 * refuses an upload that names a different company than the one selected, so
 * they are part of the document's meaning, not decoration.
 */
export type ImportBatchTemplateSupplier = {
    name: string;
    code?: string;
    taxCode?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    address?: string;
};

/**
 * The receiving party: tickets travel from the supplier into this company's
 * warehouse. Sourced from system_config so the legal name and tax code printed
 * here match the ones the server prints on an exported batch.
 */
export type ImportBatchTemplateIssuer = {
    legalName: string;
    taxCode?: string;
    address?: string;
    phone?: string;
    email?: string;
};

export const FALLBACK_ISSUER: ImportBatchTemplateIssuer = {
    legalName: 'ĐẠI PHÁT',
};

// ------------------------------------------------------------ primitives

export const mergeAcross = (
    sheet: ExcelJS.Worksheet,
    row: number,
    from: number,
    to: number
) => {
    sheet.mergeCells(row, from, row, to);
};

/** Label / value pair as an accounting form prints it, label bold on the left. */
export const writeField = (
    sheet: ExcelJS.Worksheet,
    row: number,
    labelColumn: number,
    valueColumn: number,
    valueEndColumn: number,
    label: string,
    value?: string
) => {
    const labelCell = sheet.getCell(row, labelColumn);
    labelCell.value = label;
    labelCell.font = { bold: true, size: 10, color: { argb: INK } };
    labelCell.alignment = { vertical: 'middle' };

    if (valueEndColumn > valueColumn) {
        mergeAcross(sheet, row, valueColumn, valueEndColumn);
    }
    const valueCell = sheet.getCell(row, valueColumn);
    valueCell.value = value && value.trim() ? value : '.'.repeat(30);
    valueCell.font = { size: 10, color: { argb: value && value.trim() ? INK : MUTED } };
    valueCell.alignment = { vertical: 'middle' };
};

export const styleHeaderRow = (row: ExcelJS.Row, columnCount: number) => {
    row.height = 30;
    for (let column = 1; column <= columnCount; column++) {
        const cell = row.getCell(column);
        cell.font = { bold: true, color: { argb: HEADER_TEXT }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = mediumBorder;
    }
};

/** Landscape A4 scaled to one page wide, the shape both documents print on. */
export const DOCUMENT_PAGE_SETUP: Partial<ExcelJS.PageSetup> = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
};

// ----------------------------------------------------------- letterhead

/** 1-based row the label/value block starts on, after the title and subtitle. */
const FIRST_PARTY_ROW = 7;

/**
 * Where the party block puts its labels and values.
 *
 * <p>Fixed positions rather than names borrowed from the ticket table: the two
 * layouts are independent, and reading the value column as COL.importCost once
 * meant that reordering the table silently pushed every value in the letterhead
 * sideways, leaving a gap between each label and its value.
 */
const PARTY = {
    leftLabel: 1,
    leftValue: 2,
    leftValueEnd: 5,
    rightLabel: 6,
    rightValue: 8,
} as const;

export type LetterheadOptions = {
    /** Centred title, e.g. "PHIẾU GIAO NHẬN VÉ XỔ SỐ". */
    title: string;
    /** Italic line under the title. */
    subtitle: string;
    /** Right-aligned form code on the first line. */
    formCode: string;
    /** Right-aligned document number on the second line. */
    documentNumber?: string;
    supplier?: ImportBatchTemplateSupplier;
    issuer: ImportBatchTemplateIssuer;
    /** Draw dates the document covers, already formatted for print. */
    drawDates: string;
    /** Rightmost column the letterhead spans — the table's last column. */
    lastColumn: number;
    /**
     * Extra label/value pairs appended to the party block, for facts only one of
     * the documents has (the reconciliation note names its source file).
     */
    extraFields?: Array<[string, string | undefined]>;
};

/**
 * Writes the document head: issuer, title, and the party block naming both
 * sides. Ends on a blank row so the table below reads as its own block.
 *
 * <p>The left column is the supplier (bên giao), the right column is us (bên
 * nhận). Every receiving-side label carries a qualifier such as "bên nhận" or
 * "người nhập" — SupplierIdentityScanner skips those, so our own tax code is
 * never compared against the supplier's. Drop the qualifier and the check starts
 * rejecting correct files.
 *
 * @returns the 1-based row the column headers should be written to
 */
export const buildLetterhead = (
    sheet: ExcelJS.Worksheet,
    options: LetterheadOptions
): number => {
    const { issuer: issuerInfo, lastColumn } = options;

    mergeAcross(sheet, 1, PARTY.leftLabel, PARTY.leftValueEnd);
    const issuerCell = sheet.getCell(1, PARTY.leftLabel);
    issuerCell.value = issuerInfo.legalName;
    issuerCell.font = { bold: true, size: 12, color: { argb: BRAND } };

    mergeAcross(sheet, 1, PARTY.rightLabel, lastColumn);
    const formCode = sheet.getCell(1, PARTY.rightLabel);
    formCode.value = options.formCode;
    formCode.font = { italic: true, size: 10, color: { argb: MUTED } };
    formCode.alignment = { horizontal: 'right' };

    mergeAcross(sheet, 2, PARTY.leftLabel, PARTY.leftValueEnd);
    const address = sheet.getCell(2, PARTY.leftLabel);
    address.value = `Địa chỉ: ${issuerInfo.address ?? '—'}`;
    address.font = { size: 10, color: { argb: MUTED } };

    mergeAcross(sheet, 2, PARTY.rightLabel, lastColumn);
    const docNumber = sheet.getCell(2, PARTY.rightLabel);
    docNumber.value = options.documentNumber ?? 'Số phiếu: ...........................';
    docNumber.font = { size: 10, color: { argb: MUTED } };
    docNumber.alignment = { horizontal: 'right' };

    mergeAcross(sheet, 4, PARTY.leftLabel, lastColumn);
    const title = sheet.getCell(4, PARTY.leftLabel);
    title.value = options.title;
    title.font = { bold: true, size: 16, color: { argb: INK } };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(4).height = 28;

    mergeAcross(sheet, 5, PARTY.leftLabel, lastColumn);
    const subtitle = sheet.getCell(5, PARTY.leftLabel);
    subtitle.value = options.subtitle;
    subtitle.font = { italic: true, size: 11, color: { argb: MUTED } };
    subtitle.alignment = { horizontal: 'center' };

    const supplier = options.supplier;
    const partyRows: Array<[string, string | undefined, string, string | undefined]> = [
        ['Nhà cung cấp:', supplier?.name, 'Bên nhận:', issuerInfo.legalName],
        ['Mã nhà cung cấp:', supplier?.code, 'Mã số thuế bên nhận:', issuerInfo.taxCode],
        ['Mã số thuế:', supplier?.taxCode, 'SĐT bên nhận:', issuerInfo.phone],
        ['Người liên hệ:', supplier?.contactName, 'Email bên nhận:', issuerInfo.email],
        ['Số điện thoại:', supplier?.contactPhone, 'Ngày quay:', options.drawDates],
        ['Email:', supplier?.contactEmail, 'Ngày lập phiếu:', dayjs().format('DD/MM/YYYY')],
        ['Địa chỉ:', supplier?.address, '', undefined],
    ];
    (options.extraFields ?? []).forEach(([label, value]) => {
        partyRows.push(['', undefined, label, value]);
    });

    partyRows.forEach(([leftLabel, leftValue, rightLabel, rightValue], offset) => {
        const row = FIRST_PARTY_ROW + offset;
        if (leftLabel) {
            writeField(
                sheet, row, PARTY.leftLabel, PARTY.leftValue, PARTY.leftValueEnd,
                leftLabel, leftValue);
        }
        if (rightLabel) {
            writeField(
                sheet, row, PARTY.rightLabel, PARTY.rightValue, lastColumn,
                rightLabel, rightValue);
        }
        sheet.getRow(row).height = 18;
        for (let column = PARTY.leftLabel; column <= lastColumn; column++) {
            const cell = sheet.getCell(row, column);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PARTY_BG } };
            // Boxed like the party block of a printed delivery note, so the two
            // sides read as two columns of a form rather than as floating text.
            cell.border = thinBorder;
        }
    });

    // One blank row separates the party block from the table.
    return FIRST_PARTY_ROW + partyRows.length + 1;
};

// ------------------------------------------------------------- closing

/**
 * Closes the table the way a delivery note does. It sits below the last line and
 * names no station, which is how the backend recognises the table has ended and
 * stops reading rows — so a document round-trips through import unchanged.
 */
export const buildTotalsRow = (
    sheet: ExcelJS.Worksheet,
    rowNumber: number,
    label: string,
    lastColumn: number,
    /**
     * Optional figure closing the row.
     *
     * @param result what the formula evaluates to. ExcelJS writes a formula with
     *        no cached value, and a reader that does not recalculate — a preview
     *        pane, a viewer, Excel's protected view — then shows the cell blank.
     *        Supplying the result makes the number visible immediately while the
     *        formula stays live for anyone editing the sheet.
     */
    total?: { column: number; formula: string; result?: number }
) => {
    const row = sheet.getRow(rowNumber);

    mergeAcross(sheet, rowNumber, COL.index, COL.serial);
    row.getCell(COL.index).value = label;
    if (total) {
        row.getCell(total.column).value =
            total.result == null
                ? { formula: total.formula }
                : { formula: total.formula, result: total.result };
        row.getCell(total.column).numFmt = MONEY_FORMAT;
    }

    for (let column = 1; column <= lastColumn; column++) {
        const cell = row.getCell(column);
        cell.font = { bold: true, size: 11, color: { argb: INK } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } };
        cell.border = mediumBorder;
        cell.alignment = {
            vertical: 'middle',
            horizontal: column === COL.index ? 'left' : 'center',
        };
    }
    row.height = 24;
};

export const buildSignatureBlock = (
    sheet: ExcelJS.Worksheet,
    startRow: number,
    roles: Array<[string, number, number]>
) => {
    roles.forEach(([role, from, to]) => {
        mergeAcross(sheet, startRow, from, to);
        const roleCell = sheet.getCell(startRow, from);
        roleCell.value = role;
        roleCell.font = { bold: true, size: 11, color: { argb: INK } };
        roleCell.alignment = { horizontal: 'center' };

        mergeAcross(sheet, startRow + 1, from, to);
        const hintCell = sheet.getCell(startRow + 1, from);
        hintCell.value = '(Ký, ghi rõ họ tên)';
        hintCell.font = { italic: true, size: 10, color: { argb: MUTED } };
        hintCell.alignment = { horizontal: 'center' };
    });
    // Empty rows leaving room to sign on a printed copy.
    sheet.getRow(startRow + 2).height = 60;
};

/** Signature roles of the blank delivery note. */
export const DELIVERY_SIGNATURE_ROLES: Array<[string, number, number]> = [
    ['NGƯỜI GIAO VÉ', COL.index, COL.drawDate],
    ['THỦ KHO NHẬN VÉ', COL.numbers, COL.image],
    ['KẾ TOÁN', COL.salePrice, COL.importCost],
];
