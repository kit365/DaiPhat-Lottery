import { isAxiosError } from 'axios';
import type {
    ImportBatchFileGroup,
    ImportBatchFileIssue,
    ImportBatchFileIssueCode,
    ImportBatchFileMapping,
    ImportBatchFileRow,
} from '../types/importBatch.type';

export const FILE_IMPORT_TIMEOUT_MESSAGE =
    'Hệ thống đang tạo phiếu và vé từ tệp lâu hơn thời gian chờ. Hãy kiểm tra danh sách phiếu nhập trước khi gửi lại, tránh tạo trùng.';

export const fileImportRequestErrorMessage = (error: unknown, fallback: string): string => {
    if (
        isAxiosError(error) &&
        (error.code === 'ECONNABORTED' ||
            error.code === 'ETIMEDOUT' ||
            /timeout of \d+ms exceeded/i.test(error.message ?? ''))
    ) {
        return FILE_IMPORT_TIMEOUT_MESSAGE;
    }
    const fromApi = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
    if (fromApi?.trim()) {
        return fromApi;
    }
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    return fallback;
};

/** A draw date is only offered for import when it will produce at least one line. */
export const isGroupSelectable = (group: ImportBatchFileGroup): boolean =>
    group.status === 'IMPORTABLE' && (group.stations?.length ?? 0) > 0;

/** A problem row lifted out of its draw-date group, for the review table. */
export interface ImportBatchFileAnomaly {
    drawDate?: string;
    row: ImportBatchFileRow;
}

const MERGE_ONLY_ISSUE_CODES = new Set<ImportBatchFileIssueCode>([
    'NUMBERS_MERGED_INTO_ROW',
    'NUMBERS_DUPLICATED_IN_GROUP',
]);

/**
 * Every row the operator should look at, gathered across all draw dates.
 *
 * <p>Rows that are merely outside the importable window are excluded: a weekly
 * file always contains those, and listing them would bury the rows that really
 * are wrong. Only issues the file itself caused (unreadable date, unknown
 * station, bad lottery number, duplicate serial, unusable image) show up here.
 */
export const collectAnomalies = (groups: ImportBatchFileGroup[]): ImportBatchFileAnomaly[] =>
    groups.flatMap((group) =>
        group.rows
            .filter((row) => {
                const actionable = row.issues.filter((issue) => {
                    if (issue.severity !== 'ERROR' && issue.severity !== 'WARNING') {
                        return false;
                    }
                    return !(row.mergedIntoRowNumber != null && MERGE_ONLY_ISSUE_CODES.has(issue.code));
                });
                return actionable.length > 0;
            })
            .map((row) => ({ drawDate: group.drawDate, row }))
    );

export interface PreviewSerialEntry {
    serial: string;
    image: string | null;
    stationName?: string | null;
    status: ImportBatchFileRow['status'];
    issues: ImportBatchFileIssue[];
    sourceRowNumber: number;
    sourceRow: ImportBatchFileRow;
}

/** One lottery number after consecutive one-serial file lines have been folded. */
export interface PreviewTicketLine {
    row: ImportBatchFileRow;
    sourceRowNumbers: number[];
    mergedRows: ImportBatchFileRow[];
    /** Error/unusable tickets folded into this lottery number for display. */
    attachedRows: ImportBatchFileRow[];
    priceVariance: boolean;
}

const FILE_VALUE_ALIASES = {
    stationCode: ['mã đài', 'ma dai', 'station code', 'stationcode'],
    stationName: ['nhà đài', 'nha dai', 'station'],
    numbers: ['dãy số', 'day so', 'numbers'],
    serials: ['sê-ri', 'se-ri', 'serial'],
    importCost: ['giá nhập', 'gia nhap', 'giá vốn', 'gia von', 'import cost'],
    salePrice: ['giá bán', 'gia ban', 'sale price'],
    commission: ['hoa hồng', 'hoa hong', 'commission'],
};

const normalizeHeader = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9%]/g, '');

const cell = (row: ImportBatchFileRow, column?: string | null): string => {
    if (!column) {
        return '';
    }
    return String(row.rawValues?.[column] ?? '').trim();
};

const cellByAlias = (row: ImportBatchFileRow, aliases: string[]): string => {
    const entries = Object.entries(row.rawValues ?? {});
    for (const alias of aliases) {
        const wanted = normalizeHeader(alias);
        const match = entries.find(([key]) => normalizeHeader(key).includes(wanted));
        if (match && String(match[1] ?? '').trim()) {
            return String(match[1]).trim();
        }
    }
    return '';
};

export const readPreviewFileValue = (
    row: ImportBatchFileRow,
    mappingColumn: string | null | undefined,
    aliases: string[]
): string => cell(row, mappingColumn) || cellByAlias(row, aliases);

export const readPreviewFileValues = (
    row: ImportBatchFileRow,
    mapping?: ImportBatchFileMapping | null
) => ({
    stationCode: readPreviewFileValue(row, mapping?.stationCodeColumn, FILE_VALUE_ALIASES.stationCode),
    stationName: readPreviewFileValue(row, mapping?.stationColumn, FILE_VALUE_ALIASES.stationName),
    numbers: readPreviewFileValue(row, mapping?.numbersColumn, FILE_VALUE_ALIASES.numbers),
    serials: readPreviewFileValue(row, mapping?.serialsColumn, FILE_VALUE_ALIASES.serials),
    importCost: readPreviewFileValue(row, mapping?.importCostColumn, FILE_VALUE_ALIASES.importCost),
    salePrice: readPreviewFileValue(row, mapping?.salePriceColumn, FILE_VALUE_ALIASES.salePrice),
    commission: readPreviewFileValue(row, mapping?.commissionRateColumn, FILE_VALUE_ALIASES.commission),
});

const splitSerials = (value: string, separator?: string | null) =>
    value
        .split(separator || ';')
        .map((item) => item.trim())
        .filter(Boolean);

/** Out-of-window rows skip resolution, so station/number/serials only exist in the file cells. */
export const hydratePreviewRowFromFile = (
    row: ImportBatchFileRow,
    mapping?: ImportBatchFileMapping | null
): ImportBatchFileRow => {
    const fileValues = readPreviewFileValues(row, mapping);
    const serials = row.serialNumbers?.length
        ? row.serialNumbers
        : splitSerials(fileValues.serials, mapping?.serialSeparator);
    return {
        ...row,
        numbers: row.numbers || fileValues.numbers || row.numbers,
        stationName: row.stationName || fileValues.stationName || row.stationName,
        serialNumbers: serials.length ? serials : row.serialNumbers,
        serialCount: row.serialCount ?? (serials.length || null),
    };
};

export const hasDrawDateIssue = (row: ImportBatchFileRow) =>
    row.issues.some(
        (issue) => issue.code === 'DRAW_DATE_OUT_OF_WINDOW' || issue.code === 'DRAW_DATE_INVALID'
    );

export const isDrawDateOutsideWindow = (
    drawDate: string | undefined,
    windowFrom?: string | null,
    windowTo?: string | null
) => {
    if (!drawDate) {
        return true;
    }
    if (windowFrom && drawDate < windowFrom) {
        return true;
    }
    if (windowTo && drawDate > windowTo) {
        return true;
    }
    return false;
};

const sameFileValue = (left: string, right: string) =>
    normalizeHeader(left) === normalizeHeader(right);

export const hasPreviewPriceVariance = (
    keeper: ImportBatchFileRow,
    mergedRows: ImportBatchFileRow[],
    mapping?: ImportBatchFileMapping | null
): boolean => {
    if (mergedRows.length === 0) {
        return false;
    }
    const base = readPreviewFileValues(keeper, mapping);
    return mergedRows.some((row) => {
        const other = readPreviewFileValues(row, mapping);
        return (
            !sameFileValue(base.importCost, other.importCost)
            || !sameFileValue(base.salePrice, other.salePrice)
            || !sameFileValue(base.commission, other.commission)
        );
    });
};

export const formatRowNumberRange = (rowNumbers: number[]): string => {
    const sorted = [...new Set(rowNumbers.filter((value) => Number.isFinite(value)))].sort(
        (left, right) => left - right
    );
    if (sorted.length === 0) {
        return '—';
    }
    const ranges: string[] = [];
    let from = sorted[0];
    let to = sorted[0];
    for (let index = 1; index < sorted.length; index += 1) {
        if (sorted[index] === to + 1) {
            to = sorted[index];
            continue;
        }
        ranges.push(from === to ? `#${from}` : `#${from}–${to}`);
        from = sorted[index];
        to = sorted[index];
    }
    ranges.push(from === to ? `#${from}` : `#${from}–${to}`);
    return ranges.join(', ');
};

/**
 * The file prints one serial per line, so the same lottery number occupies
 * several consecutive rows. The backend already folds serials into the first
 * row of the same station; this hides those leftover skipped lines, then also
 * folds an error ticket into the successful ticket that already carries the
 * same lottery number so the preview stays one row per dãy số.
 */
export const groupPreviewTicketRows = (
    rows: ImportBatchFileRow[],
    mapping?: ImportBatchFileMapping | null
): PreviewTicketLine[] => {
    const hydrated = rows.map((row) => hydratePreviewRowFromFile(row, mapping));
    const mergedByTarget = new Map<number, ImportBatchFileRow[]>();
    hydrated.forEach((row) => {
        if (row.mergedIntoRowNumber == null) {
            return;
        }
        const list = mergedByTarget.get(row.mergedIntoRowNumber) ?? [];
        list.push(row);
        mergedByTarget.set(row.mergedIntoRowNumber, list);
    });

    const keepers = hydrated
        .filter((row) => row.mergedIntoRowNumber == null)
        .map((row) => {
            const mergedRows = mergedByTarget.get(row.rowNumber) ?? [];
            return {
                row,
                mergedRows,
                attachedRows: [] as ImportBatchFileRow[],
                sourceRowNumbers: [row.rowNumber, ...mergedRows.map((item) => item.rowNumber)],
                priceVariance: hasPreviewPriceVariance(row, mergedRows, mapping),
            };
        });

    return foldTicketsByLotteryNumber(keepers, mapping);
};

const isSuccessfulStatus = (status: ImportBatchFileRow['status']) =>
    status === 'OK' || status === 'WARNING';

const successfulStationId = (line: PreviewTicketLine) =>
    isSuccessfulStatus(line.row.status) ? line.row.lotteryStationId ?? null : null;

const canShareLotteryNumber = (left: PreviewTicketLine, right: PreviewTicketLine) => {
    const numbers = left.row.numbers?.trim();
    if (!numbers || numbers !== right.row.numbers?.trim()) {
        return false;
    }
    const leftStation = successfulStationId(left);
    const rightStation = successfulStationId(right);
    return !(leftStation != null && rightStation != null && leftStation !== rightStation);
};

const mergeTicketLines = (
    primary: PreviewTicketLine,
    incoming: PreviewTicketLine,
    mapping?: ImportBatchFileMapping | null
): PreviewTicketLine => {
    const keepIncoming = !isSuccessfulStatus(primary.row.status) && isSuccessfulStatus(incoming.row.status);
    const keeper = keepIncoming ? incoming : primary;
    const extra = keepIncoming ? primary : incoming;
    const attachedRows = [...keeper.attachedRows, extra.row, ...extra.attachedRows];
    const priceRows = [...keeper.mergedRows, ...extra.mergedRows, extra.row, ...extra.attachedRows];

    return {
        row: keeper.row,
        mergedRows: keeper.mergedRows,
        attachedRows,
        sourceRowNumbers: [...keeper.sourceRowNumbers, ...extra.sourceRowNumbers],
        priceVariance:
            keeper.priceVariance
            || extra.priceVariance
            || hasPreviewPriceVariance(keeper.row, priceRows, mapping),
    };
};

const foldTicketsByLotteryNumber = (
    lines: PreviewTicketLine[],
    mapping?: ImportBatchFileMapping | null
): PreviewTicketLine[] => {
    const folded: PreviewTicketLine[] = [];
    lines.forEach((line) => {
        if (!line.row.numbers?.trim()) {
            folded.push(line);
            return;
        }
        const index = folded.findIndex((item) => canShareLotteryNumber(item, line));
        if (index < 0) {
            folded.push(line);
            return;
        }
        folded[index] = mergeTicketLines(folded[index], line, mapping);
    });
    return folded;
};

const NOTES_HIDDEN_ON_GROUPED_ROW = new Set<ImportBatchFileIssueCode>([
    'NUMBERS_MERGED_INTO_ROW',
    'NUMBERS_DUPLICATED_IN_GROUP',
]);

export const listPreviewSerials = (line: PreviewTicketLine): PreviewSerialEntry[] => {
    const fromRow = (source: ImportBatchFileRow): PreviewSerialEntry[] =>
        (source.serialNumbers ?? []).map((serial, index) => ({
            serial,
            image: source.ticketImages?.[index] ?? null,
            stationName: source.stationName,
            status: source.status,
            issues: source.issues.filter((issue) => !NOTES_HIDDEN_ON_GROUPED_ROW.has(issue.code)),
            sourceRowNumber: source.rowNumber,
            sourceRow: source,
        }));

    return [line.row, ...line.attachedRows].flatMap(fromRow);
};

/**
 * How a row reads on screen. Wider than the row's own status because a row can
 * be faultless in itself and still not be importable — the whole draw date may
 * be blocked, and calling such a row "Hợp lệ" tells the operator the opposite of
 * what will happen when they press the button.
 */
export type PreviewDisplayStatus = ImportBatchFileRow['status'] | 'BLOCKED';

/** Group-level rules that stop every row of the draw date, in plain words. */
const GROUP_BLOCKING_NOTE: Partial<Record<ImportBatchFileIssueCode, string>> = {
    SUPPLIER_RETURN_CUT_OFF_PASSED: 'Quá giờ nhận vé của NCC',
    SUPPLIER_IMPORT_NOT_ALLOWED: 'Chưa tới giờ nhận vé của NCC',
    SUPPLIER_IDENTITY_MISMATCH: 'Tệp không phải của NCC đã chọn',
    STATION_PRICING_MISMATCH: 'Giá trong tệp lệch cấu hình đài',
    PARTIAL_IMPORT_DISABLED: 'Còn dòng lỗi, không cho nhập dở dang',
    NO_VALID_ROW: 'Ngày quay này không có dòng hợp lệ',
};

/**
 * Why this whole draw date cannot be imported, or null when it can.
 *
 * <p>Reported against every row of the group because that is where the operator
 * is looking. The row itself carries no fault, so the note names the group's
 * reason rather than inventing a row-level one.
 */
export const resolveGroupBlockingNote = (
    group?: ImportBatchFileGroup
): { short: string; full: string } | null => {
    if (!group || group.status !== 'BLOCKED') {
        return null;
    }
    const blocking = group.groupIssues.find(
        (issue) => issue.severity === 'ERROR' && GROUP_BLOCKING_NOTE[issue.code]
    );
    if (!blocking) {
        const anyError = group.groupIssues.find((issue) => issue.severity === 'ERROR');
        return anyError ? { short: anyError.message, full: anyError.message } : null;
    }
    return {
        short: GROUP_BLOCKING_NOTE[blocking.code] as string,
        full: blocking.message,
    };
};

export const previewTicketDisplayStatus = (
    line: PreviewTicketLine,
    group?: ImportBatchFileGroup
): PreviewDisplayStatus => {
    // The group's verdict outranks the row's: a row that will not be imported
    // must not display as valid, whatever its own contents say.
    if (resolveGroupBlockingNote(group)) {
        return 'BLOCKED';
    }
    const serials = listPreviewSerials(line);
    if (serials.some((item) => item.status === 'ERROR') && isSuccessfulStatus(line.row.status)) {
        return 'WARNING';
    }
    if (hasDrawDateIssue(line.row) || line.attachedRows.some(hasDrawDateIssue)) {
        return 'WARNING';
    }
    return line.row.status;
};

const SHORT_ISSUE_NOTE: Partial<Record<ImportBatchFileIssueCode, string>> = {
    DRAW_DATE_OUT_OF_WINDOW: 'Ngoài phạm vi hôm nay/ngày mai',
    DRAW_DATE_INVALID: 'Không đọc được ngày quay',
    STATION_NOT_FOUND: 'Không tìm thấy đài',
    STATION_CODE_NOT_FOUND: 'Mã đài không tồn tại',
    STATION_NOT_ELIGIBLE: 'Đài không quay ngày này',
    STATION_SCHEDULE_MISMATCH: 'Lịch quay không khớp',
    STATION_INACTIVE: 'Đài đang ngừng hoạt động',
    STATION_AMBIGUOUS: 'Tên đài khớp nhiều đài',
    STATION_DRAFT_EXISTS: 'Đài đã có phiếu nháp',
    DUPLICATE_STATION_IN_GROUP: 'Đài trùng trong ngày, đã cộng gộp',
    QUANTITY_INVALID: 'Số lượng không đọc được',
    QUANTITY_NOT_POSITIVE: 'Số lượng phải > 0',
    IMPORT_COST_MISMATCH: 'Giá vốn lệch hệ thống',
    STATION_PRICING_MISMATCH: 'Giá lệch hệ thống',
    LATE_IMPORT_WARNING: 'Nhập muộn so với giờ quay',
    NUMBERS_REQUIRED: 'Thiếu dãy số',
    NUMBERS_INVALID: 'Dãy số không hợp lệ',
    NUMBERS_LENGTH_INVALID: 'Độ dài dãy số sai',
    NUMBERS_DUPLICATED_IN_GROUP: 'Dãy số trùng, đã gộp sê-ri',
    NUMBERS_MERGED_INTO_ROW: 'Đã gộp vào dòng cùng dãy số',
    SERIALS_REQUIRED: 'Thiếu sê-ri',
    SERIAL_DUPLICATED_IN_FILE: 'Sê-ri trùng trong tệp',
    SERIAL_ALREADY_IMPORTED: 'Sê-ri đã có trong hệ thống',
    QUANTITY_ABOVE_SERIAL_COUNT: 'Khai báo nhiều hơn số sê-ri',
    QUANTITY_BELOW_SERIAL_COUNT: 'Sê-ri nhiều hơn số khai báo',
    TICKET_IMAGE_INVALID: 'Ảnh vé không hợp lệ',
    TICKET_IMAGE_COUNT_MISMATCH: 'Số ảnh không khớp số sê-ri',
    MISSING_REQUIRED_COLUMN: 'Thiếu cột bắt buộc',
    SUPPLIER_RETURN_CUT_OFF_PASSED: 'Quá giờ nhận vé',
    SUPPLIER_IMPORT_NOT_ALLOWED: 'Chưa đến giờ nhập',
    NO_VALID_ROW: 'Không có dòng hợp lệ',
    DRAFT_ALREADY_EXISTS: 'Đã có phiếu nhập',
    PARTIAL_IMPORT_DISABLED: 'Không cho nhập một phần',
    SUPPLIER_IDENTITY_MISMATCH: 'Tệp không khớp NCC',
    SUPPLIER_IDENTITY_NOT_DECLARED: 'Tệp không ghi NCC',
};

export const formatPreviewIssueNote = (issue: ImportBatchFileIssue): string =>
    SHORT_ISSUE_NOTE[issue.code] ?? issue.message;

export const collectPreviewRowNotes = (
    line: PreviewTicketLine,
    group?: ImportBatchFileGroup
): { short: string; full: string } => {
    const notes: Array<{ short: string; full: string }> = [];

    // First, because it is the reason nothing on this row will be imported.
    const blocked = resolveGroupBlockingNote(group);
    if (blocked) {
        notes.push(blocked);
    }

    notes.push(...line.row.issues
        .filter((issue) => !NOTES_HIDDEN_ON_GROUPED_ROW.has(issue.code))
        .map((issue) => ({
            short: formatPreviewIssueNote(issue),
            full: issue.message,
        })));

    if (line.priceVariance) {
        notes.push({
            short: 'Giá/HH lệch giữa các dòng gộp',
            full: 'Giá nhập, giá bán hoặc hoa hồng trên các dòng cùng dãy số không giống nhau.',
        });
    }

    const errorSerials = listPreviewSerials(line).filter((item) => item.status === 'ERROR');
    if (line.attachedRows.length > 0 && errorSerials.length > 0) {
        const errorNotes = [...new Set(
            errorSerials.flatMap((item) => item.issues.map((issue) => formatPreviewIssueNote(issue)))
        )];
        notes.push({
            short: `${errorSerials.length} sê-ri lỗi${errorNotes.length ? ` · ${errorNotes.join(' · ')}` : ''}`,
            full: errorSerials
                .map((item) => `${item.serial}: ${item.issues.map((issue) => issue.message).join('; ') || 'Lỗi'}`)
                .join('\n'),
        });
    }

    return {
        short: notes.map((note) => note.short).join(' · ') || '',
        full: notes.map((note) => note.full).filter(Boolean).join('\n'),
    };
};
