import ExcelJS from 'exceljs';
import dayjs from 'dayjs';

export const IMPORT_BATCH_FILE_ACCEPT = '.csv,.xlsx';

/** Separator the backend expects inside the serial and image cells. */
export const IMPORT_BATCH_FILE_SERIAL_SEPARATOR = ';';

/**
 * Header labels the backend's auto-detection recognises, so a file built from the
 * template needs no manual column mapping at all. Keep in sync with
 * ImportBatchFileMappingDetector.
 */
const TICKET_HEADERS = [
    'STT',
    'Mã đài',
    'Nhà đài',
    'Ngày quay',
    'Dãy số',
    'Số sê-ri',
    'Ảnh vé',
    'Giá nhập',
    'Giá bán',
    'Hoa hồng (%)',
    'Thành tiền',
] as const;

const COLUMN_WIDTHS = [6, 10, 22, 13, 12, 20, 26, 13, 13, 13, 15];
const COLUMN_COUNT = TICKET_HEADERS.length;

/** 1-based column positions used by the styling and formula code below. */
const COL = {
    index: 1,
    stationCode: 2,
    stationName: 3,
    drawDate: 4,
    numbers: 5,
    serial: 6,
    image: 7,
    importCost: 8,
    salePrice: 9,
    commission: 10,
    lineTotal: 11,
} as const;

/** Station facts the template pre-fills so the file is usable as-is. */
export type ImportBatchTemplateStation = {
    name: string;
    code?: string;
    price?: number;
    commissionRate?: number;
    /** "Thứ 2, Thứ 6 · 16:15" — what makes a draw date plausible for this station. */
    drawSchedule?: string;
};

/**
 * Supplier facts printed into the letterhead. The backend reads these back and
 * refuses the upload if they name a different company than the one selected, so
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

const FALLBACK_ISSUER: ImportBatchTemplateIssuer = {
    legalName: 'ĐẠI PHÁT',
};

const FORM_CODE = 'Mẫu số: 01-VT/NV';

const BRAND = 'FFEE1314';
const HEADER_TEXT = 'FFFFFFFF';
// Slate-500 rather than a hairline grey: at 100% zoom in Excel a CBD5E1 rule is
// indistinguishable from the sheet's own gridlines, so a printed copy of the
// delivery note came out looking like an unruled list.
const BORDER = 'FF64748B';
const STRONG_BORDER = 'FF334155';
const ZEBRA = 'FFF8FAFC';
const NOTE_BG = 'FFFFF9E6';
const PARTY_BG = 'FFF1F5F9';
const TOTAL_BG = 'FFFEF2F2';
const INK = 'FF0F172A';
const MUTED = 'FF64748B';

const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: BORDER } },
    left: { style: 'thin', color: { argb: BORDER } },
    bottom: { style: 'thin', color: { argb: BORDER } },
    right: { style: 'thin', color: { argb: BORDER } },
};

const mediumBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'medium', color: { argb: STRONG_BORDER } },
    left: { style: 'thin', color: { argb: STRONG_BORDER } },
    bottom: { style: 'medium', color: { argb: STRONG_BORDER } },
    right: { style: 'thin', color: { argb: STRONG_BORDER } },
};

const FALLBACK_STATIONS: ImportBatchTemplateStation[] = [
    { name: 'Tiền Giang', code: 'TG', price: 10000, commissionRate: 0.1 },
    { name: 'Kiên Giang', code: 'KG', price: 10000, commissionRate: 0.1 },
    { name: 'Vĩnh Long', code: 'VL', price: 10000, commissionRate: 0.1 },
];

/** Physical tickets the template carries for each station. */
export const TEMPLATE_SERIALS_PER_STATION = 100;

/** Serials printed under one lottery number, mirroring how a booklet arrives. */
const SERIALS_PER_NUMBER = 4;

const MONEY_FORMAT = '#,##0';

/**
 * "General", not "0.##": a decimal point written in an Excel format code is
 * always printed, so "0.##" renders a whole 5% as "5." — which reads like a
 * truncated number. General shows 5 as "5" and 12.5 as "12.5", which is what a
 * commission rate needs.
 */
const PERCENT_FORMAT = 'General';

type TicketRow = {
    stationCode: string;
    stationName: string;
    drawDate: string;
    numbers: string;
    serial: string;
    importCost: number | '';
    salePrice: number | '';
    commissionPercent: number | '';
};

/**
 * One draw date the template covers, with the stations that actually drew on it.
 *
 * <p>Kept as a pair rather than a date plus one shared station list because the
 * southern schedule differs every day of the week - reusing today's stations for
 * yesterday would name stations that never drew.
 */
export type ImportBatchTemplateDay = {
    /** DD/MM/YYYY, exactly as the Ngày quay column states it. */
    drawDate: string;
    stations: ImportBatchTemplateStation[];
};

/**
 * A ready-to-import dataset rather than a two-line sample: on every draw date,
 * every scheduled station gets exactly {@link TEMPLATE_SERIALS_PER_STATION}
 * physical tickets, so the file can be downloaded and uploaded straight back.
 *
 * <p>One row is one physical ticket. Rows sharing a lottery number are merged
 * into a single lottery_tickets record on import, which is why the serials
 * repeat the number in groups of {@link SERIALS_PER_NUMBER}.
 *
 * <p>Rows are grouped by draw date and never separated by a heading row: a row
 * naming no station is how the backend recognises the table has ended, so a
 * separator inside the table would truncate the import.
 */
const buildTicketRows = (days: ImportBatchTemplateDay[]): TicketRow[] => {
    // Numbers are handed out in blocks that run across the whole file, not per
    // day. Restarting them each day would print the same serial twice once a
    // station appears on two dates, and the import rejects a repeated serial.
    let blockIndex = 0;

    return days.flatMap((day) =>
        day.stations.flatMap((station) => {
            const prefix = (station.code || station.name.slice(0, 2)).toUpperCase();
            // Mirrors ImportCostCalculator on the backend, so a template filled from
            // live station data validates cleanly instead of tripping the price check.
            const importCost =
                station.price != null && station.commissionRate != null
                    ? Math.round(station.price * (1 - station.commissionRate))
                    : 9000;
            const numberBase = 100000 + blockIndex * 10000;
            blockIndex += 1;

            return Array.from({ length: TEMPLATE_SERIALS_PER_STATION }, (_, ticketIndex) => {
                const numberOffset = Math.floor(ticketIndex / SERIALS_PER_NUMBER);
                const numbers = String(numberBase + numberOffset).padStart(6, '0');
                return {
                    stationCode: station.code ?? '',
                    stationName: station.name,
                    drawDate: day.drawDate,
                    numbers,
                    serial: `${prefix}${numbers}${String((ticketIndex % SERIALS_PER_NUMBER) + 1)}`,
                    importCost,
                    salePrice: station.price ?? '',
                    commissionPercent:
                        station.commissionRate != null ? station.commissionRate * 100 : '',
                };
            });
        })
    );
};

// ----------------------------------------------------------- letterhead

const mergeAcross = (sheet: ExcelJS.Worksheet, row: number, from: number, to: number) => {
    sheet.mergeCells(row, from, row, to);
};

/** Label / value pair as an accounting form prints it, label bold on the left. */
const writeField = (
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

/**
 * Writes the document head: issuer, title, and the party block naming the
 * supplier. Ends on a blank row so the table below reads as its own block.
 *
 * @returns the 1-based row the column headers should be written to
 */
const buildLetterhead = (
    sheet: ExcelJS.Worksheet,
    supplier: ImportBatchTemplateSupplier | undefined,
    issuerInfo: ImportBatchTemplateIssuer,
    days: ImportBatchTemplateDay[]
): number => {
    const drawDates = days.map((day) => day.drawDate).join(' · ');
    mergeAcross(sheet, 1, COL.index, COL.numbers);
    const issuer = sheet.getCell(1, COL.index);
    issuer.value = issuerInfo.legalName;
    issuer.font = { bold: true, size: 12, color: { argb: BRAND } };

    mergeAcross(sheet, 1, COL.serial, COL.lineTotal);
    const formCode = sheet.getCell(1, COL.serial);
    formCode.value = FORM_CODE;
    formCode.font = { italic: true, size: 10, color: { argb: MUTED } };
    formCode.alignment = { horizontal: 'right' };

    mergeAcross(sheet, 2, COL.index, COL.numbers);
    const address = sheet.getCell(2, COL.index);
    address.value = `Địa chỉ: ${issuerInfo.address ?? '—'}`;
    address.font = { size: 10, color: { argb: MUTED } };

    mergeAcross(sheet, 2, COL.serial, COL.lineTotal);
    const docNumber = sheet.getCell(2, COL.serial);
    docNumber.value = 'Số phiếu: ...........................';
    docNumber.font = { size: 10, color: { argb: MUTED } };
    docNumber.alignment = { horizontal: 'right' };

    mergeAcross(sheet, 4, COL.index, COL.lineTotal);
    const title = sheet.getCell(4, COL.index);
    title.value = 'PHIẾU GIAO NHẬN VÉ XỔ SỐ';
    title.font = { bold: true, size: 16, color: { argb: INK } };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(4).height = 28;

    mergeAcross(sheet, 5, COL.index, COL.lineTotal);
    const subtitle = sheet.getCell(5, COL.index);
    subtitle.value =
        days.length > 1
            ? `Ngày quay thưởng: ${drawDates} (${days.length} ngày)`
            : `Ngày quay thưởng: ${drawDates}`;
    subtitle.font = { italic: true, size: 11, color: { argb: MUTED } };
    subtitle.alignment = { horizontal: 'center' };

    // Party block. The labels here are the ones SupplierIdentityScanner reads, so
    // renaming one silently turns the supplier check off for this template.
    // Left column is the supplier (bên giao), right column is us (bên nhận).
    // Every receiving-side label carries a qualifier such as "bên nhận" or
    // "người nhập" — SupplierIdentityScanner skips those, so our own tax code is
    // never compared against the supplier's. Drop the qualifier and the check
    // starts rejecting correct files.
    //
    // The operator's own name, phone and email are deliberately absent here,
    // unlike on an exported batch: a blank template has nobody to name yet, and a
    // row of dots is noise. The server fills those fields in when it exports a
    // real batch — see ImportBatchDocumentWriter.
    const partyRows: Array<[string, string | undefined, string, string | undefined]> = [
        ['Nhà cung cấp:', supplier?.name, 'Bên nhận:', issuerInfo.legalName],
        ['Mã nhà cung cấp:', supplier?.code, 'Mã số thuế bên nhận:', issuerInfo.taxCode],
        ['Mã số thuế:', supplier?.taxCode, 'SĐT bên nhận:', issuerInfo.phone],
        ['Người liên hệ:', supplier?.contactName, 'Email bên nhận:', issuerInfo.email],
        ['Số điện thoại:', supplier?.contactPhone, 'Ngày quay:', drawDates],
        ['Email:', supplier?.contactEmail, 'Ngày lập phiếu:', dayjs().format('DD/MM/YYYY')],
        ['Địa chỉ:', supplier?.address, '', undefined],
    ];

    partyRows.forEach(([leftLabel, leftValue, rightLabel, rightValue], offset) => {
        const row = FIRST_PARTY_ROW + offset;
        writeField(sheet, row, COL.index, COL.stationCode, COL.numbers, leftLabel, leftValue);
        if (rightLabel) {
            writeField(sheet, row, COL.serial, COL.importCost, COL.lineTotal, rightLabel, rightValue);
        }
        sheet.getRow(row).height = 18;
        for (let column = COL.index; column <= COL.lineTotal; column++) {
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

/** 1-based row the label/value block starts on, after the title and subtitle. */
const FIRST_PARTY_ROW = 7;

// ---------------------------------------------------------------- table

const styleHeaderRow = (row: ExcelJS.Row, columnCount: number) => {
    row.height = 30;
    for (let column = 1; column <= columnCount; column++) {
        const cell = row.getCell(column);
        cell.font = { bold: true, color: { argb: HEADER_TEXT }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = mediumBorder;
    }
};

const LEFT_ALIGNED_COLUMNS: number[] = [COL.stationName, COL.serial, COL.image];

const buildTicketSheet = (
    workbook: ExcelJS.Workbook,
    days: ImportBatchTemplateDay[],
    supplier: ImportBatchTemplateSupplier | undefined,
    issuerInfo: ImportBatchTemplateIssuer
) => {
    const sheet = workbook.addWorksheet('Phiếu nhập vé', {
        pageSetup: {
            paperSize: 9,
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
        },
    });
    COLUMN_WIDTHS.forEach((width, index) => {
        sheet.getColumn(index + 1).width = width;
    });

    const headerRowNumber = buildLetterhead(sheet, supplier, issuerInfo, days);

    const headerRow = sheet.getRow(headerRowNumber);
    TICKET_HEADERS.forEach((label, index) => {
        headerRow.getCell(index + 1).value = label;
    });
    styleHeaderRow(headerRow, COLUMN_COUNT);
    // Everything above the table scrolls away; the column labels stay put.
    sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];

    const rows = buildTicketRows(days);
    const firstDataRow = headerRowNumber + 1;

    rows.forEach((ticket, index) => {
        const rowNumber = firstDataRow + index;
        const row = sheet.getRow(rowNumber);
        row.getCell(COL.index).value = index + 1;
        row.getCell(COL.stationCode).value = ticket.stationCode;
        row.getCell(COL.stationName).value = ticket.stationName;
        row.getCell(COL.drawDate).value = ticket.drawDate;
        row.getCell(COL.numbers).value = ticket.numbers;
        row.getCell(COL.serial).value = ticket.serial;
        row.getCell(COL.image).value = '';
        row.getCell(COL.importCost).value = ticket.importCost;
        row.getCell(COL.salePrice).value = ticket.salePrice;
        row.getCell(COL.commission).value = ticket.commissionPercent;
        // A live formula, so correcting a price updates the line total the way an
        // accountant expects. The backend ignores this column.
        row.getCell(COL.lineTotal).value = { formula: `H${rowNumber}` };

        for (let column = 1; column <= COLUMN_COUNT; column++) {
            const cell = row.getCell(column);
            cell.border = thinBorder;
            cell.alignment = {
                vertical: 'middle',
                horizontal: LEFT_ALIGNED_COLUMNS.includes(column) ? 'left' : 'center',
            };
            if (index % 2 === 1) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
            }
        }
        row.getCell(COL.importCost).numFmt = MONEY_FORMAT;
        row.getCell(COL.salePrice).numFmt = MONEY_FORMAT;
        row.getCell(COL.commission).numFmt = PERCENT_FORMAT;
        row.getCell(COL.lineTotal).numFmt = MONEY_FORMAT;
    });

    const lastDataRow = firstDataRow + rows.length - 1;
    buildTotalsRow(sheet, firstDataRow, lastDataRow, rows, days);
    buildSignatureBlock(sheet, lastDataRow + 3);

    sheet.autoFilter = {
        from: { row: headerRowNumber, column: 1 },
        to: { row: headerRowNumber, column: COLUMN_COUNT },
    };
    return sheet;
};

/**
 * Closes the table the way a delivery note does. It sits below the last ticket
 * and names no station, which is how the backend recognises the table has ended
 * and stops reading rows.
 */
const buildTotalsRow = (
    sheet: ExcelJS.Worksheet,
    firstDataRow: number,
    lastDataRow: number,
    rows: TicketRow[],
    days: ImportBatchTemplateDay[]
) => {
    const rowNumber = lastDataRow + 1;
    const row = sheet.getRow(rowNumber);

    // Each draw date becomes its own import batch, so a multi-day file needs the
    // per-date counts spelled out - the grand total alone reconciles nothing.
    const perDay = days
        .map((day) => {
            const count = rows.filter((ticket) => ticket.drawDate === day.drawDate).length;
            return `${day.drawDate}: ${count.toLocaleString('vi-VN')}`;
        })
        .join(' · ');
    const total = rows.length.toLocaleString('vi-VN');

    mergeAcross(sheet, rowNumber, COL.index, COL.serial);
    row.getCell(COL.index).value =
        days.length > 1
            ? `TỔNG CỘNG: ${total} tờ vé  (${perDay})`
            : `TỔNG CỘNG: ${total} tờ vé`;
    row.getCell(COL.lineTotal).value = {
        formula: `SUM(K${firstDataRow}:K${lastDataRow})`,
    };

    for (let column = 1; column <= COLUMN_COUNT; column++) {
        const cell = row.getCell(column);
        cell.font = { bold: true, size: 11, color: { argb: INK } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } };
        cell.border = mediumBorder;
        cell.alignment = { vertical: 'middle', horizontal: column === COL.index ? 'left' : 'center' };
    }
    row.getCell(COL.lineTotal).numFmt = MONEY_FORMAT;
    row.height = 24;
};

const SIGNATURE_ROLES: Array<[string, number, number]> = [
    ['NGƯỜI GIAO VÉ', COL.index, COL.drawDate],
    ['THỦ KHO NHẬN VÉ', COL.numbers, COL.image],
    ['KẾ TOÁN', COL.importCost, COL.lineTotal],
];

const buildSignatureBlock = (sheet: ExcelJS.Worksheet, startRow: number) => {
    SIGNATURE_ROLES.forEach(([role, from, to]) => {
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

// -------------------------------------------------------- station sheet

/**
 * Column set of the per-station summary. Mirrors ImportBatchDocumentWriter's
 * STATION_HEADERS on the server, so an exported batch and a blank template line
 * up field for field when an operator compares them.
 */
const STATION_HEADERS = [
    'STT',
    'Mã đài',
    'Nhà đài',
    'Ngày quay',
    'Lịch quay',
    'Loại lô',
    'Trạng thái nhập',
    'Tiến độ',
    'SL khai báo',
    'SL đã nhập',
    'Giá bán',
    'Hoa hồng (%)',
    'Giá vốn',
    'Tổng giá vốn',
] as const;

const STATION_WIDTHS = [6, 10, 22, 13, 26, 18, 16, 12, 13, 13, 13, 13, 13, 16];

/**
 * The stations of the document, one row each.
 *
 * <p>Deliberately on its own sheet: its header row also names Mã đài / Nhà đài /
 * Ngày quay, so placed above the tickets it would be detected as the import
 * header, and placed below them it would be read as ticket rows.
 */
const buildStationSheet = (
    workbook: ExcelJS.Workbook,
    days: ImportBatchTemplateDay[]
) => {
    const sheet = workbook.addWorksheet('Danh sách đài');
    STATION_WIDTHS.forEach((width, index) => {
        sheet.getColumn(index + 1).width = width;
    });

    const title = sheet.getRow(1);
    sheet.mergeCells(1, 1, 1, STATION_HEADERS.length);
    title.getCell(1).value = 'CÁC NHÀ ĐÀI TRONG PHIẾU';
    title.getCell(1).font = { bold: true, size: 14, color: { argb: INK } };
    title.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    title.height = 24;

    const headerRow = sheet.getRow(3);
    STATION_HEADERS.forEach((label, index) => {
        headerRow.getCell(index + 1).value = label;
    });
    styleHeaderRow(headerRow, STATION_HEADERS.length);
    sheet.views = [{ state: 'frozen', ySplit: 3 }];

    let rowNumber = 4;
    let ordinal = 0;
    days.forEach((day) => {
        day.stations.forEach((station) => {
            const salePrice = station.price ?? '';
            const commissionPercent =
                station.commissionRate != null ? station.commissionRate * 100 : '';
            const importCost =
                station.price != null && station.commissionRate != null
                    ? Math.round(station.price * (1 - station.commissionRate))
                    : '';
            const declared = TEMPLATE_SERIALS_PER_STATION;

            const row = sheet.getRow(rowNumber);
            ordinal += 1;
            row.getCell(1).value = ordinal;
            row.getCell(2).value = station.code ?? '';
            row.getCell(3).value = station.name;
            row.getCell(4).value = day.drawDate;
            row.getCell(5).value = station.drawSchedule ?? '';
            row.getCell(6).value = 'Nhập mới';
            row.getCell(7).value = 'Chưa nhập';
            row.getCell(8).value = `0/${declared}`;
            row.getCell(9).value = declared;
            row.getCell(10).value = 0;
            row.getCell(11).value = salePrice;
            row.getCell(12).value = commissionPercent;
            row.getCell(13).value = importCost;
            row.getCell(14).value = importCost === '' ? '' : importCost * declared;

            const zebra = ordinal % 2 === 0;
            for (let column = 1; column <= STATION_HEADERS.length; column++) {
                const cell = row.getCell(column);
                cell.border = thinBorder;
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: column === 3 || column === 5 ? 'left' : 'center',
                };
                if (zebra) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
                }
            }
            [9, 10, 11, 13, 14].forEach((column) => {
                row.getCell(column).numFmt = MONEY_FORMAT;
            });
            row.getCell(12).numFmt = PERCENT_FORMAT;

            rowNumber += 1;
        });
    });

    const totalStations = days.reduce((sum, day) => sum + day.stations.length, 0);
    const totals = sheet.getRow(rowNumber);
    sheet.mergeCells(rowNumber, 1, rowNumber, 8);
    totals.getCell(1).value = `TỔNG CỘNG ${totalStations} nhà đài`;
    totals.getCell(9).value = totalStations * TEMPLATE_SERIALS_PER_STATION;
    for (let column = 1; column <= STATION_HEADERS.length; column++) {
        const cell = totals.getCell(column);
        cell.font = { bold: true, size: 11, color: { argb: INK } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } };
        cell.border = mediumBorder;
        cell.alignment = { vertical: 'middle', horizontal: column === 1 ? 'left' : 'center' };
    }
    totals.getCell(9).numFmt = MONEY_FORMAT;
    totals.height = 24;

    return sheet;
};

// ------------------------------------------------------------- guidance

const GUIDE_ROWS: Array<[string, string]> = [
    ['STT', 'Số thứ tự dòng, chỉ để dễ đối chiếu khi in. Hệ thống bỏ qua cột này.'],
    ['Mã đài', 'Mã nghiệp vụ của đài. Ưu tiên dùng mã vì khớp chính xác. Để trống được nếu không rõ, hệ thống sẽ khớp theo tên.'],
    ['Nhà đài', 'Tên đài xổ số. Bắt buộc khi không có mã đài.'],
    ['Ngày quay', 'Định dạng DD/MM/YYYY. Mỗi ngày quay trong tệp sẽ thành một phiếu nhập riêng. Nhập từ tệp chỉ tạo được phiếu cho ngày quay hôm nay.'],
    ['Dãy số', 'Bộ số in trên vé. Các dòng cùng dãy số sẽ được gộp thành một loại vé.'],
    ['Số sê-ri', `Sê-ri của tờ vé. Nếu muốn gộp nhiều tờ vào một dòng thì ngăn cách bằng dấu "${IMPORT_BATCH_FILE_SERIAL_SEPARATOR}". Mỗi sê-ri là một tờ vé vật lý và phải duy nhất trong cả tệp.`],
    ['Ảnh vé', 'Đường dẫn ảnh, để trống nếu không có. Nhiều ảnh ngăn cách như cột sê-ri.'],
    ['Giá nhập', 'Số tiền thực trả cho một tờ vé sau khi trừ hoa hồng, đơn vị đồng. Hệ thống đối chiếu với Giá bán × (1 − Hoa hồng) của đài.'],
    ['Giá bán', 'Giá bán niêm yết một tờ vé, đơn vị đồng.'],
    ['Hoa hồng (%)', 'Tỷ lệ hoa hồng của đài, nhập theo phần trăm. Ví dụ 10 nghĩa là 10%.'],
    ['Thành tiền', 'Công thức Excel, tự tính theo Giá nhập. Hệ thống bỏ qua cột này.'],
];

const NOTES = [
    `Tệp này đã điền sẵn ${TEMPLATE_SERIALS_PER_STATION} tờ vé cho mỗi đài có lịch quay, tính riêng cho từng ngày quay có trong phiếu. Dùng nhập được ngay, nhưng nên sửa lại số liệu theo lô vé thực tế trước khi tải lên.`,
    'Mỗi dòng là một tờ vé vật lý. Các dòng trùng Dãy số sẽ được gộp thành một loại vé khi nhập.',
    'Không đổi tên hoặc xoá dòng tiêu đề của bảng — hệ thống nhận diện cột dựa vào đó.',
    'Không sửa khối thông tin nhà cung cấp ở đầu phiếu. Hệ thống đối chiếu mã số thuế, mã nhà cung cấp, số điện thoại và tên nhà cung cấp trong tệp với nhà cung cấp bạn chọn lúc tải lên, lệch là chặn nhập.',
    'Có thể thêm hoặc bớt dòng vé trong bảng, nhưng phải giữ khối tổng cộng và chữ ký nằm dưới bảng.',
    'Tệp có thể chứa nhiều ngày quay, nhưng nhập từ tệp chỉ tạo phiếu cho ngày quay hôm nay. Các ngày khác vẫn hiện ở bước xem trước và được đánh dấu ngoài phạm vi.',
    'Ngày quay đã qua không nhập được — vé của ngày hôm qua chỉ dùng để đối chiếu. Nếu phát hiện thiếu vé so với biên lai, phần bù sẽ do quản trị viên tạo khi đối soát nhà cung cấp, không nhập lại bằng tệp. Ngày quay chưa tới thì tải lại đúng tệp này vào ngày đó.',
    'Mỗi nhà cung cấp có khung giờ cho phép nhập riêng. Đã đến giờ kiểm vé chuẩn bị trả thì không nhập thêm được cho ngày đó.',
    'Nếu Giá nhập, Giá bán hoặc Hoa hồng trong tệp lệch với cấu hình đài trên hệ thống, bước xem trước sẽ báo để bạn đối chiếu.',
];

const buildGuideSheet = (workbook: ExcelJS.Workbook) => {
    const sheet = workbook.addWorksheet('Hướng dẫn');
    sheet.columns = [
        { header: 'Cột', width: 16 },
        { header: 'Ý nghĩa và quy tắc nhập', width: 96 },
    ];
    styleHeaderRow(sheet.getRow(1), 2);

    GUIDE_ROWS.forEach(([column, meaning], index) => {
        const row = sheet.addRow([column, meaning]);
        row.eachCell((cell, col) => {
            cell.border = thinBorder;
            cell.alignment = { vertical: 'top', wrapText: col === 2 };
            if (col === 1) {
                cell.font = { bold: true };
            }
            if (index % 2 === 1) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
            }
        });
    });

    sheet.addRow([]);
    const noteHeader = sheet.addRow(['Lưu ý', '']);
    noteHeader.getCell(1).font = { bold: true, size: 12 };
    NOTES.forEach((note, index) => {
        const row = sheet.addRow([`${index + 1}.`, note]);
        row.eachCell((cell, col) => {
            cell.border = thinBorder;
            cell.alignment = { vertical: 'top', wrapText: col === 2 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NOTE_BG } };
        });
    });
    return sheet;
};

// ---------------------------------------------------------------- entry

/** Drops draw dates that have no scheduled station; an empty day prints nothing. */
const usableDays = (days?: ImportBatchTemplateDay[]): ImportBatchTemplateDay[] => {
    const filled = (days ?? []).filter((day) => day.stations.length > 0);
    return filled.length > 0
        ? filled
        : [{ drawDate: dayjs().format('DD/MM/YYYY'), stations: FALLBACK_STATIONS }];
};

export const buildImportBatchFileTemplateWorkbook = (
    days?: ImportBatchTemplateDay[],
    supplier?: ImportBatchTemplateSupplier,
    issuer?: ImportBatchTemplateIssuer
): ExcelJS.Workbook => {
    const workbook = new ExcelJS.Workbook();
    const resolvedIssuer = issuer ?? FALLBACK_ISSUER;
    workbook.creator = resolvedIssuer.legalName;
    workbook.created = new Date();

    // No cap: the file is meant to cover every station drawing on each date, not
    // to illustrate a few. Three southern stations a day means ~300 rows per day.
    const resolvedDays = usableDays(days);
    buildTicketSheet(workbook, resolvedDays, supplier, resolvedIssuer);
    buildStationSheet(workbook, resolvedDays);
    buildGuideSheet(workbook);
    return workbook;
};

/**
 * File name stem, so a one-day and a two-day download never overwrite each other.
 *
 * <p>Reversed by hand rather than through dayjs: parsing DD/MM/YYYY needs the
 * customParseFormat plugin, and without it dayjs reads 06/07 as June 7th.
 */
const fileNameStem = (days: ImportBatchTemplateDay[]): string => {
    const stamps = days.map((day) => {
        const [d, m, y] = day.drawDate.split('/');
        return `${y}${m}${d}`;
    });
    return stamps.length > 1 ? `${stamps[0]}-den-${stamps[stamps.length - 1]}` : stamps[0];
};

export const downloadImportBatchFileTemplate = async (
    days?: ImportBatchTemplateDay[],
    supplier?: ImportBatchTemplateSupplier,
    issuer?: ImportBatchTemplateIssuer
): Promise<void> => {
    const resolved = usableDays(days);
    const workbook = buildImportBatchFileTemplateWorkbook(resolved, supplier, issuer);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const supplierSlug = supplier?.code ? `-${supplier.code.toLowerCase()}` : '';
    link.download = `phieu-nhap-ve${supplierSlug}-${fileNameStem(resolved)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
