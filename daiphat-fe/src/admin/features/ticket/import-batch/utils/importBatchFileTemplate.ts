import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import {
    COL,
    DELIVERY_SIGNATURE_ROLES,
    DOCUMENT_PAGE_SETUP,
    FALLBACK_ISSUER,
    IMPORT_BATCH_TICKET_HEADERS,
    INK,
    LEFT_ALIGNED_COLUMNS,
    MONEY_FORMAT,
    NOTE_BG,
    TOTAL_BG,
    mediumBorder,
    PERCENT_FORMAT,
    TICKET_COLUMN_COUNT,
    TICKET_COLUMN_WIDTHS,
    ZEBRA,
    buildLetterhead,
    buildSignatureBlock,
    buildTotalsRow,
    mergeAcross,
    styleHeaderRow,
    thinBorder,
    type ImportBatchTemplateIssuer,
    type ImportBatchTemplateSupplier,
} from './importBatchDocumentLayout';

export {
    IMPORT_BATCH_TICKET_HEADERS,
    type ImportBatchTemplateIssuer,
    type ImportBatchTemplateSupplier,
};

export const IMPORT_BATCH_FILE_ACCEPT = '.csv,.xlsx';

/** Separator the backend expects inside the serial and image cells. */
export const IMPORT_BATCH_FILE_SERIAL_SEPARATOR = ';';

/**
 * Header labels the backend's auto-detection recognises, so a file built from the
 * template needs no manual column mapping at all. Keep in sync with
 * ImportBatchFileMappingDetector.
 */
const TICKET_HEADERS = IMPORT_BATCH_TICKET_HEADERS;
const COLUMN_WIDTHS = TICKET_COLUMN_WIDTHS;
const COLUMN_COUNT = TICKET_COLUMN_COUNT;

/** Station facts the template pre-fills so the file is usable as-is. */
export type ImportBatchTemplateStation = {
    name: string;
    code?: string;
    price?: number;
    commissionRate?: number;
    /** "Thứ 2, Thứ 6 · 16:15" — what makes a draw date plausible for this station. */
    drawSchedule?: string;
};

const FORM_CODE = 'Mẫu số: 01-VT/NV';

const FALLBACK_STATIONS: ImportBatchTemplateStation[] = [
    { name: 'Tiền Giang', code: 'TG', price: 10000, commissionRate: 0.1 },
    { name: 'Kiên Giang', code: 'KG', price: 10000, commissionRate: 0.1 },
    { name: 'Vĩnh Long', code: 'VL', price: 10000, commissionRate: 0.1 },
];

/** Physical tickets the template carries for each station. */
export const TEMPLATE_SERIALS_PER_STATION = 100;

/** Serials printed under one lottery number, mirroring how a booklet arrives. */
const SERIALS_PER_NUMBER = 4;



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

// ---------------------------------------------------------------- table

const buildTicketSheet = (
    workbook: ExcelJS.Workbook,
    days: ImportBatchTemplateDay[],
    supplier: ImportBatchTemplateSupplier | undefined,
    issuerInfo: ImportBatchTemplateIssuer
) => {
    const sheet = workbook.addWorksheet('Phiếu nhập vé', {
        pageSetup: DOCUMENT_PAGE_SETUP,
    });
    COLUMN_WIDTHS.forEach((width, index) => {
        sheet.getColumn(index + 1).width = width;
    });

    const drawDates = days.map((day) => day.drawDate).join(' · ');
    const headerRowNumber = buildLetterhead(sheet, {
        title: 'PHIẾU GIAO NHẬN VÉ XỔ SỐ',
        subtitle:
            days.length > 1
                ? `Ngày quay thưởng: ${drawDates} (${days.length} ngày)`
                : `Ngày quay thưởng: ${drawDates}`,
        formCode: FORM_CODE,
        supplier,
        issuer: issuerInfo,
        drawDates,
        lastColumn: COL.importCost,
    });

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
        row.getCell(COL.salePrice).value = ticket.salePrice;
        row.getCell(COL.commission).value = ticket.commissionPercent;
        row.getCell(COL.importCost).value = ticket.importCost;

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
        row.getCell(COL.salePrice).numFmt = MONEY_FORMAT;
        row.getCell(COL.commission).numFmt = PERCENT_FORMAT;
        row.getCell(COL.importCost).numFmt = MONEY_FORMAT;
    });

    const lastDataRow = firstDataRow + rows.length - 1;
    // Each draw date becomes its own import batch, so a multi-day file needs the
    // per-date counts spelled out - the grand total alone reconciles nothing.
    const perDay = days
        .map((day) => {
            const count = rows.filter((ticket) => ticket.drawDate === day.drawDate).length;
            return `${day.drawDate}: ${count.toLocaleString('vi-VN')}`;
        })
        .join(' · ');
    const total = rows.length.toLocaleString('vi-VN');
    buildTotalsRow(
        sheet,
        lastDataRow + 1,
        days.length > 1
            ? `TỔNG CỘNG: ${total} tờ vé  (${perDay})`
            : `TỔNG CỘNG: ${total} tờ vé`,
        COL.importCost
        // No figure closes the row: Giá nhập is a unit price, and a column of
        // unit prices does not add up to anything an accountant would sign.
    );
    buildSignatureBlock(sheet, lastDataRow + 3, DELIVERY_SIGNATURE_ROLES);

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
    ['Ngày quay', 'Định dạng DD/MM/YYYY. Mỗi ngày quay trong tệp sẽ thành một phiếu nhập riêng. Chỉ tạo được phiếu cho hôm nay hoặc ngày mai.'],
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
