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
    'Mã đài',
    'Nhà đài',
    'Ngày quay',
    'Dãy số',
    'Số sê-ri',
    'Ảnh vé',
    'Giá nhập',
    'Giá bán',
    'Hoa hồng (%)',
] as const;

const COLUMN_WIDTHS = [10, 22, 14, 12, 34, 30, 14, 14, 14];

/** Station facts the template pre-fills so the file is usable as-is. */
export type ImportBatchTemplateStation = {
    name: string;
    code?: string;
    price?: number;
    commissionRate?: number;
};

const BRAND = 'FFEE1314';
const HEADER_TEXT = 'FFFFFFFF';
const BORDER = 'FFCBD5E1';
const ZEBRA = 'FFF8FAFC';
const NOTE_BG = 'FFFFF9E6';

const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: BORDER } },
    left: { style: 'thin', color: { argb: BORDER } },
    bottom: { style: 'thin', color: { argb: BORDER } },
    right: { style: 'thin', color: { argb: BORDER } },
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

/**
 * A ready-to-import dataset rather than a two-line sample: every scheduled
 * station gets exactly {@link TEMPLATE_SERIALS_PER_STATION} physical tickets, so
 * the file can be downloaded and uploaded straight back to populate a draw date.
 *
 * <p>One row is one physical ticket. Rows sharing a lottery number are merged
 * into a single lottery_tickets record on import, which is why the serials
 * repeat the number in groups of {@link SERIALS_PER_NUMBER}.
 */
const buildTicketRows = (stations: ImportBatchTemplateStation[], drawDate: string) =>
    stations.flatMap((station, stationIndex) => {
        const prefix = (station.code || station.name.slice(0, 2)).toUpperCase();
        // Mirrors ImportCostCalculator on the backend, so a template filled from
        // live station data validates cleanly instead of tripping the price check.
        const importCost =
            station.price != null && station.commissionRate != null
                ? Math.round(station.price * (1 - station.commissionRate))
                : 9000;
        const salePrice = station.price ?? '';
        const commissionPercent =
            station.commissionRate != null ? station.commissionRate * 100 : '';
        // Distinct block per station keeps every serial unique across the file.
        const numberBase = 100000 + stationIndex * 10000;

        return Array.from({ length: TEMPLATE_SERIALS_PER_STATION }, (_, ticketIndex) => {
            const numberOffset = Math.floor(ticketIndex / SERIALS_PER_NUMBER);
            const numbers = String(numberBase + numberOffset).padStart(6, '0');
            const serial = `${prefix}${numbers}${String(ticketIndex % SERIALS_PER_NUMBER + 1)}`;
            return [
                station.code ?? '',
                station.name,
                drawDate,
                numbers,
                serial,
                '',
                importCost,
                salePrice,
                commissionPercent,
            ];
        });
    });

const GUIDE_ROWS: Array<[string, string]> = [
    ['Mã đài', 'Mã nghiệp vụ của đài. Ưu tiên dùng mã vì khớp chính xác. Để trống được nếu không rõ, hệ thống sẽ khớp theo tên.'],
    ['Nhà đài', 'Tên đài xổ số. Bắt buộc khi không có mã đài.'],
    ['Ngày quay', 'Định dạng DD/MM/YYYY. Chỉ nhập được cho hôm nay hoặc ngày mai.'],
    ['Dãy số', 'Bộ số in trên vé. Các dòng cùng dãy số sẽ được gộp thành một loại vé.'],
    ['Số sê-ri', `Sê-ri của tờ vé. Nếu muốn gộp nhiều tờ vào một dòng thì ngăn cách bằng dấu "${IMPORT_BATCH_FILE_SERIAL_SEPARATOR}". Mỗi sê-ri là một tờ vé vật lý và phải duy nhất trong cả tệp.`],
    ['Ảnh vé', 'Đường dẫn ảnh, để trống nếu không có. Nhiều ảnh ngăn cách như cột sê-ri.'],
    ['Giá nhập', 'Số tiền thực trả cho một tờ vé sau khi trừ hoa hồng, đơn vị đồng. Hệ thống đối chiếu với Giá bán × (1 − Hoa hồng) của đài.'],
    ['Giá bán', 'Giá bán niêm yết một tờ vé, đơn vị đồng.'],
    ['Hoa hồng (%)', 'Tỷ lệ hoa hồng của đài, nhập theo phần trăm. Ví dụ 10 nghĩa là 10%.'],
];

const NOTES = [
    `Tệp này đã điền sẵn ${TEMPLATE_SERIALS_PER_STATION} tờ vé cho mỗi đài có lịch quay trong ngày, dùng nhập được ngay. Sửa lại số liệu theo lô vé thực tế trước khi tải lên.`,
    'Mỗi dòng là một tờ vé vật lý. Các dòng trùng Dãy số sẽ được gộp thành một loại vé khi nhập.',
    'Không đổi tên hoặc xoá dòng tiêu đề — hệ thống nhận diện cột dựa vào đó.',
    'Không nhập vé cho ngày quay đã qua.',
    'Mỗi nhà cung cấp có khung giờ cho phép nhập riêng. Đã đến giờ kiểm vé chuẩn bị trả thì không nhập thêm được cho ngày đó.',
    'Nếu Giá nhập, Giá bán hoặc Hoa hồng trong tệp lệch với cấu hình đài trên hệ thống, bước xem trước sẽ báo để bạn đối chiếu.',
];

const styleHeaderRow = (row: ExcelJS.Row) => {
    row.height = 26;
    row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: HEADER_TEXT }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = thinBorder;
    });
};

const buildTicketSheet = (
    workbook: ExcelJS.Workbook,
    stations: ImportBatchTemplateStation[],
    drawDate: string
) => {
    const sheet = workbook.addWorksheet('Nhập vé', {
        views: [{ state: 'frozen', ySplit: 1 }],
    });
    sheet.columns = TICKET_HEADERS.map((header, index) => ({
        header,
        width: COLUMN_WIDTHS[index],
    }));
    styleHeaderRow(sheet.getRow(1));

    buildTicketRows(stations, drawDate).forEach((values, index) => {
        const row = sheet.addRow(values);
        row.eachCell({ includeEmpty: true }, (cell, col) => {
            cell.border = thinBorder;
            cell.alignment = { vertical: 'middle', horizontal: col === 2 || col === 5 ? 'left' : 'center' };
            if (index % 2 === 1) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
            }
        });
        // Money and percentage columns read as numbers, not text.
        row.getCell(7).numFmt = '#,##0';
        row.getCell(8).numFmt = '#,##0';
        row.getCell(9).numFmt = '0.##';
    });

    sheet.autoFilter = { from: 'A1', to: { row: 1, column: TICKET_HEADERS.length } };
    return sheet;
};

const buildGuideSheet = (workbook: ExcelJS.Workbook) => {
    const sheet = workbook.addWorksheet('Hướng dẫn');
    sheet.columns = [
        { header: 'Cột', width: 16 },
        { header: 'Ý nghĩa và quy tắc nhập', width: 96 },
    ];
    styleHeaderRow(sheet.getRow(1));

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

export const buildImportBatchFileTemplateWorkbook = (
    stations?: ImportBatchTemplateStation[]
): ExcelJS.Workbook => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DaiPhat Lottery';
    workbook.created = new Date();

    // No cap: the file is meant to cover every station drawing that day, not to
    // illustrate a few. Three southern stations a day means ~300 rows.
    const usable = stations && stations.length > 0 ? stations : FALLBACK_STATIONS;
    buildTicketSheet(workbook, usable, dayjs().format('DD/MM/YYYY'));
    buildGuideSheet(workbook);
    return workbook;
};

export const downloadImportBatchFileTemplate = async (
    stations?: ImportBatchTemplateStation[]
): Promise<void> => {
    const workbook = buildImportBatchFileTemplateWorkbook(stations);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mau-nhap-ve-chi-tiet-${dayjs().format('YYYYMMDD')}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
