import type { ImportBatch, ImportBatchLine } from '../../import-batch/types/importBatch.type';
import {
    getIncompleteLines,
    isImportBatchEditable,
    isLinePaused,
} from '../../import-batch/utils/importBatchProgress';
import type {
    FieldValidationResult,
    OcrReviewRow,
    ScannedTicket,
    ScannedTicketStatus,
} from '../types/ticketOcr.type';
import {
    normalizeOcrScanErrorMessage,
    normalizeOcrWarningList,
} from './ocrScanErrorMessage';

export type OcrLineOption = {
    key: string;
    batchId: number;
    batchCode: string;
    drawDate: string;
    supplierName?: string;
    lineId: number;
    lineCode?: string;
    stationId: number;
    declareQuantity: number;
    totalQuantity: number;
    status?: string;
};

/** Editable parent import-batches for MANUAL OCR confirm (batch-level, not line). */
export type OcrBatchOption = {
    id: number;
    batchCode: string;
    drawDate: string;
    supplierId?: number;
    supplierName?: string;
    status?: string;
};

export const collectOcrBatchOptions = (batches: ImportBatch[]): OcrBatchOption[] => {
    const options: OcrBatchOption[] = [];
    for (const batch of batches) {
        if (!isImportBatchEditable(batch)) {
            continue;
        }
        const batchCode = batch.batchCode?.trim();
        if (!batchCode) {
            continue;
        }
        options.push({
            id: batch.id,
            batchCode,
            drawDate: batch.drawDate,
            supplierId: batch.supplierId,
            supplierName: batch.supplierName,
            status: batch.status,
        });
    }
    return options;
};

export const collectOcrLineOptions = (batches: ImportBatch[]): OcrLineOption[] => {
    const options: OcrLineOption[] = [];
    for (const batch of batches) {
        if (!isImportBatchEditable(batch)) {
            continue;
        }
        const batchCode = batch.batchCode?.trim();
        if (!batchCode) {
            continue;
        }
        for (const line of getIncompleteLines(batch)) {
            if (isLinePaused(line)) {
                continue;
            }
            options.push({
                key: `${batch.id}-${line.id}`,
                batchId: batch.id,
                batchCode,
                drawDate: batch.drawDate,
                supplierName: batch.supplierName,
                lineId: line.id,
                lineCode: line.batchCode,
                stationId: line.lotteryStationId,
                declareQuantity: line.declareQuantity ?? 0,
                totalQuantity: line.totalQuantity ?? 0,
                status: line.status,
            });
        }
    }
    return options;
};

export const findOcrLineOption = (
    batches: ImportBatch[],
    lineId: number,
    batchCode?: string
): OcrLineOption | null => {
    const options = collectOcrLineOptions(batches);
    return (
        options.find(
            (option) =>
                option.lineId === lineId &&
                (!batchCode || option.batchCode === batchCode)
        ) ??
        options.find((option) => option.lineId === lineId) ??
        null
    );
};

export const createPrefillLineOption = (
    batch: ImportBatch,
    line: ImportBatchLine
): OcrLineOption | null => {
    const batchCode = batch.batchCode?.trim();
    if (!batchCode || !isImportBatchEditable(batch) || isLinePaused(line)) {
        return null;
    }
    return {
        key: `${batch.id}-${line.id}`,
        batchId: batch.id,
        batchCode,
        drawDate: batch.drawDate,
        supplierName: batch.supplierName,
        lineId: line.id,
        lineCode: line.batchCode,
        stationId: line.lotteryStationId,
        declareQuantity: line.declareQuantity ?? 0,
        totalQuantity: line.totalQuantity ?? 0,
        status: line.status,
    };
};

export const OCR_SERIAL_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]{4,10}$/;

export type OcrFieldUiStatus = 'valid' | 'invalid' | 'uncertain' | 'corrected' | 'unreadable';

export type OcrRowValidationContext = {
    /** Station IDs allowed for this ticket's drawDate (must draw that day). */
    allowedStationIds?: Set<number> | null;
    stationPriceById?: Map<number, number> | null;
};

export const evaluateOcrFieldUiStatus = (
    row: OcrReviewRow,
    fieldKey: OcrFieldKey,
    ctx?: OcrRowValidationContext
): { status: OcrFieldUiStatus; message?: string } => {
    const validation = row.fieldValidations[fieldKey];
    const wasEdited =
        row.edited &&
        (fieldKey === 'numbers' ||
            fieldKey === 'serialNumber' ||
            fieldKey === 'drawDate' ||
            fieldKey === 'stationName' ||
            fieldKey === 'batchCode' ||
            fieldKey === 'ticketType');

    if (fieldKey === 'batchCode') {
        if (wasEdited) {
            return { status: 'corrected' };
        }
        if (!row.batchCode?.trim()) {
            return { status: 'uncertain', message: 'Chưa có mã lô sản xuất (có thể bổ sung).' };
        }
        return { status: 'valid' };
    }

    if (fieldKey === 'serialNumber') {
        const serial = row.serialNumber.trim();
        if (!serial) {
            return { status: 'invalid', message: 'Thiếu số serial.' };
        }
        if (!OCR_SERIAL_PATTERN.test(serial)) {
            return {
                status: 'invalid',
                message: 'Serial phải 4–10 ký tự, gồm chữ và số.',
            };
        }
        if (row.duplicate && !row.edited) {
            return { status: 'invalid', message: 'Serial đã tồn tại trong hệ thống.' };
        }
        if (wasEdited) {
            return { status: 'corrected' };
        }
        if (validation?.status === 'UNREADABLE') {
            return { status: 'unreadable', message: validation.message ?? undefined };
        }
        if (validation?.status === 'MISMATCHED' || validation?.status === 'NOT_FOUND') {
            return { status: 'invalid', message: validation.message ?? undefined };
        }
        return { status: 'valid' };
    }

    if (fieldKey === 'numbers') {
        const numbers = row.numbers.trim();
        if (!numbers || !/^\d+$/.test(numbers)) {
            return { status: 'invalid', message: 'Dãy số phải gồm các chữ số.' };
        }
        if (wasEdited) {
            return { status: 'corrected' };
        }
        if (validation?.status === 'MISMATCHED' || validation?.status === 'NOT_FOUND') {
            return { status: 'invalid', message: validation.message ?? undefined };
        }
        if (validation?.status === 'UNREADABLE') {
            return { status: 'unreadable', message: validation.message ?? undefined };
        }
        return { status: 'valid' };
    }

    if (fieldKey === 'drawDate') {
        if (!row.drawDate?.trim()) {
            return { status: 'invalid', message: 'Thiếu ngày xổ.' };
        }
        if (wasEdited) {
            return { status: 'corrected' };
        }
        if (validation?.status === 'MISMATCHED') {
            return { status: 'invalid', message: validation.message ?? undefined };
        }
        if (validation?.status === 'UNREADABLE') {
            return { status: 'unreadable', message: validation.message ?? undefined };
        }
        return { status: 'valid' };
    }

    if (fieldKey === 'stationName') {
        if (row.stationId == null || !Number.isFinite(row.stationId)) {
            return { status: 'invalid', message: 'Chưa chọn nhà đài.' };
        }
        if (ctx?.allowedStationIds && !ctx.allowedStationIds.has(row.stationId)) {
            return {
                status: 'invalid',
                message: 'Nhà đài không xổ vào ngày đã chọn.',
            };
        }
        if (wasEdited) {
            return { status: 'corrected' };
        }
        if (validation?.status === 'MISMATCHED' || validation?.status === 'NOT_FOUND') {
            return { status: 'invalid', message: validation.message ?? undefined };
        }
        if (validation?.status === 'UNREADABLE') {
            return { status: 'unreadable', message: validation.message ?? undefined };
        }
        return { status: 'valid' };
    }

    if (fieldKey === 'ticketType') {
        if (row.stationId != null && ctx?.stationPriceById?.has(row.stationId)) {
            const expected = ctx.stationPriceById.get(row.stationId);
            const parsed = parseTicketPriceNumber(row.ticketType);
            if (expected != null && parsed != null && Math.abs(expected - parsed) > 0.01) {
                return {
                    status: wasEdited ? 'corrected' : 'invalid',
                    message: `Giá OCR không khớp giá nhà đài (${expected.toLocaleString('vi-VN')} VND).`,
                };
            }
        }
        if (wasEdited) {
            return { status: 'corrected' };
        }
        if (validation?.status === 'MISMATCHED') {
            return { status: 'invalid', message: validation.message ?? undefined };
        }
        if (validation?.status === 'UNREADABLE') {
            return { status: 'unreadable', message: validation.message ?? undefined };
        }
        if (validation?.status === 'UNCERTAIN') {
            return { status: 'uncertain', message: validation.message ?? undefined };
        }
        return { status: 'valid' };
    }

    return { status: 'uncertain' };
};

export const parseTicketPriceNumber = (value?: string | null): number | null => {
    if (!value?.trim()) {
        return null;
    }
    const digits = value.replace(/[^\d]/g, '');
    if (!digits) {
        return null;
    }
    return Number(digits);
};

export const canConfirmReviewRow = (
    row: OcrReviewRow,
    ctx?: OcrRowValidationContext
): boolean => {
    if (row.status === 'FAILED') {
        return false;
    }
    const numbers = row.numbers.trim();
    const serial = row.serialNumber.trim();
    const drawDate = row.drawDate?.trim() ?? '';
    if (!numbers || !serial || !drawDate) {
        return false;
    }
    if (row.stationId == null || !Number.isFinite(row.stationId)) {
        return false;
    }
    if (row.duplicate && !row.edited) {
        return false;
    }
    if (row.overallValidationStatus === 'INVALID' && !row.edited) {
        return false;
    }

    const requiredFields: OcrFieldKey[] = [
        'stationName',
        'numbers',
        'serialNumber',
        'drawDate',
    ];
    for (const field of requiredFields) {
        const result = evaluateOcrFieldUiStatus(row, field, ctx);
        if (result.status === 'invalid' || result.status === 'unreadable') {
            // Allow unreadable only if user filled the value manually.
            if (result.status === 'unreadable') {
                const filled =
                    field === 'stationName'
                        ? row.stationId != null
                        : field === 'numbers'
                          ? Boolean(row.numbers.trim())
                          : field === 'serialNumber'
                            ? Boolean(row.serialNumber.trim())
                            : Boolean(row.drawDate?.trim());
                if (!filled || !row.edited) {
                    return false;
                }
                // Still block if serial format invalid after fill.
                if (field === 'serialNumber' && !OCR_SERIAL_PATTERN.test(row.serialNumber.trim())) {
                    return false;
                }
                continue;
            }
            return false;
        }
    }

    // Price mismatch blocks unless edited (user acknowledged).
    const priceStatus = evaluateOcrFieldUiStatus(row, 'ticketType', ctx);
    if (priceStatus.status === 'invalid' && !row.edited) {
        return false;
    }

    return true;
};

export const mapScannedTicketToReviewRow = (
    ticket: ScannedTicket,
    sourceImageId: string,
    sourceFileName: string,
    scanId?: string | null,
    sourcePreviewUrl?: string | null,
    scanImageWidth?: number | null,
    scanImageHeight?: number | null
): OcrReviewRow => {
    const status = (ticket.status ?? 'INCOMPLETE') as ScannedTicketStatus;
    const overall = ticket.overallValidationStatus ?? null;
    return {
        key: `${scanId ?? 'local'}-${ticket.ticketIndex}-${ticket.ocrScanResultId ?? sourceImageId}`,
        sourceImageId,
        sourceFileName,
        sourcePreviewUrl: sourcePreviewUrl ?? null,
        scanId: scanId ?? null,
        ticketIndex: ticket.ticketIndex,
        ocrScanResultId: ticket.ocrScanResultId ?? null,
        status,
        confidence: ticket.confidence ?? 0,
        adjustedConfidence: ticket.adjustedConfidence ?? null,
        bbox: ticket.bbox ?? null,
        imageWidth: ticket.imageWidth ?? scanImageWidth ?? null,
        imageHeight: ticket.imageHeight ?? scanImageHeight ?? null,
        numbers: ticket.extracted?.numbers?.trim() ?? '',
        serialNumber: ticket.extracted?.serialNumber?.trim() ?? '',
        stationId: ticket.resolvedStationId ?? null,
        stationName: ticket.extracted?.stationName ?? null,
        drawDate: ticket.resolvedDrawDate ?? ticket.extracted?.drawDate ?? null,
        ticketType: ticket.extracted?.ticketType ?? null,
        batchCode: ticket.extracted?.batchCode ?? null,
        fieldConfidences: ticket.fieldConfidences ?? {},
        fieldBoxes: ticket.fieldBoxes ?? {},
        fieldValidations: ticket.fieldValidations ?? {},
        fields: ticket.fields ?? {},
        overallValidationStatus: overall,
        missingFields: ticket.missingFields ?? [],
        validationErrors: normalizeOcrWarningList(ticket.validationErrors),
        businessValidationErrors: normalizeOcrWarningList(ticket.businessValidationErrors),
        duplicate: Boolean(ticket.duplicate),
        croppedImageBase64: ticket.croppedImageBase64 ?? null,
        selected:
            (status === 'COMPLETE' || overall === 'VALID') &&
            !ticket.duplicate &&
            overall !== 'INVALID' &&
            status !== 'PARTIAL' &&
            status !== 'FAILED' &&
            status !== 'INCOMPLETE' &&
            ticket.resolvedStationId != null &&
            Boolean(ticket.resolvedDrawDate ?? ticket.extracted?.drawDate),
        edited: false,
    };
};

const OCR_SOFT_FAIL_MESSAGE =
    'Không thể đọc rõ thông tin vé từ ảnh này. Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công.';

/** Synthetic review row when scan HTTP-fails or returns no tickets client-side. */
export const createFailedReviewRow = (
    sourceImageId: string,
    sourceFileName: string,
    sourcePreviewUrl: string | null | undefined,
    reason?: string | null
): OcrReviewRow => {
    const message = normalizeOcrScanErrorMessage(reason) || OCR_SOFT_FAIL_MESSAGE;
    const unreadable: FieldValidationResult = {
        status: 'UNREADABLE',
        message: 'OCR không đọc được trường này. Ảnh có thể bị che / mờ / cắt / chồng.',
    };
    return {
        key: `failed-${sourceImageId}`,
        sourceImageId,
        sourceFileName,
        sourcePreviewUrl: sourcePreviewUrl ?? null,
        scanId: null,
        ticketIndex: 0,
        ocrScanResultId: null,
        status: 'FAILED',
        confidence: 0,
        adjustedConfidence: 0,
        bbox: null,
        imageWidth: null,
        imageHeight: null,
        numbers: '',
        serialNumber: '',
        stationId: null,
        stationName: null,
        drawDate: null,
        ticketType: null,
        batchCode: null,
        fieldConfidences: {},
        fieldBoxes: {},
        fieldValidations: {
            stationName: unreadable,
            serialNumber: unreadable,
            numbers: unreadable,
            drawDate: unreadable,
            ticketType: unreadable,
            batchCode: unreadable,
        },
        fields: {},
        overallValidationStatus: 'NEEDS_REVIEW',
        missingFields: ['stationName', 'serialNumber', 'numbers', 'drawDate'],
        validationErrors: [],
        businessValidationErrors: [message],
        duplicate: false,
        croppedImageBase64: null,
        selected: false,
        edited: false,
    };
};

export type OcrReviewImageGroup = {
    imageId: string;
    fileName: string;
    previewUrl: string;
    rows: OcrReviewRow[];
    imageStatus: 'done' | 'error' | 'pending' | 'scanning';
    imageError?: string | null;
};

/** Keep every uploaded image on review, even when OCR produced zero rows. */
export const buildReviewImageGroups = (
    images: Array<{
        id: string;
        file: { name: string };
        previewUrl: string;
        status: 'pending' | 'scanning' | 'done' | 'error';
        error?: string | null;
    }>,
    rows: OcrReviewRow[]
): OcrReviewImageGroup[] => {
    return images.map((image) => {
        const imageRows = rows.filter((row) => row.sourceImageId === image.id);
        return {
            imageId: image.id,
            fileName: image.file.name,
            previewUrl: image.previewUrl,
            rows: imageRows,
            imageStatus: image.status,
            imageError: image.error ?? null,
        };
    });
};

export const getUnreadableFieldCaption = (
    fieldKey: OcrFieldKey,
    validation?: FieldValidationResult | null
): string => {
    if (validation?.message?.trim()) {
        return validation.message.trim();
    }
    const label = OCR_FIELD_LABELS[fieldKey] ?? fieldKey;
    return `Không thể đọc rõ ${label} — vùng ảnh bị che / mờ / confidence thấp.`;
};

export const getScanStatusBadgeClass = (status: ScannedTicketStatus): string => {
    switch (status) {
        case 'COMPLETE':
            return 'admin-status-badge--success';
        case 'NEEDS_REVIEW':
        case 'PARTIAL':
            return 'admin-status-badge--pending';
        case 'FAILED':
        case 'INCOMPLETE':
        default:
            return 'admin-status-badge--inactive';
    }
};

/** Admin-facing labels: COMPLETE → SUCCESS per soft-fail UX plan. */
export const getScanStatusLabel = (status: ScannedTicketStatus): string => {
    switch (status) {
        case 'COMPLETE':
            return 'SUCCESS';
        case 'NEEDS_REVIEW':
            return 'NEEDS_REVIEW';
        case 'PARTIAL':
            return 'PARTIAL';
        case 'FAILED':
            return 'FAILED';
        case 'INCOMPLETE':
            return 'FAILED';
        default:
            return status;
    }
};

export const getScanStatusLabelVi = (status: ScannedTicketStatus): string => {
    switch (status) {
        case 'COMPLETE':
            return 'Thành công';
        case 'NEEDS_REVIEW':
            return 'Cần kiểm tra';
        case 'PARTIAL':
            return 'Đọc một phần';
        case 'FAILED':
            return 'Không đọc được';
        case 'INCOMPLETE':
            return 'Không hợp lệ';
        default:
            return status;
    }
};

export const getImportOutcomeLabel = (outcome: string): string => {
    switch (outcome) {
        case 'SUCCESS':
            return 'Thành công';
        case 'DUPLICATE':
            return 'Trùng';
        case 'FAILED':
            return 'Thất bại';
        default:
            return outcome;
    }
};

export const formatConfidence = (value: number): string => {
    if (!Number.isFinite(value)) {
        return '—';
    }
    const pct = value <= 1 ? value * 100 : value;
    return `${pct.toFixed(0)}%`;
};

export const getFieldValidationLabel = (status?: string | null): string => {
    switch (status) {
        case 'MATCHED':
            return 'Khớp';
        case 'MISMATCHED':
            return 'Lệch';
        case 'NOT_FOUND':
            return 'Không tìm thấy';
        case 'UNCERTAIN':
            return 'Chưa chắc';
        case 'UNREADABLE':
            return 'Không đọc được';
        default:
            return '—';
    }
};

export const getOcrFieldUiLabel = (status: OcrFieldUiStatus): string => {
    switch (status) {
        case 'valid':
            return 'Hợp lệ';
        case 'invalid':
            return 'Không hợp lệ';
        case 'uncertain':
            return 'Chưa chắc';
        case 'corrected':
            return 'Đã sửa tay';
        case 'unreadable':
            return 'Không đọc được';
        default:
            return '—';
    }
};

export const ocrFieldUiChipColor = (
    status: OcrFieldUiStatus
): 'success' | 'warning' | 'error' | 'default' | 'info' => {
    switch (status) {
        case 'valid':
            return 'success';
        case 'corrected':
            return 'info';
        case 'uncertain':
            return 'warning';
        case 'unreadable':
            return 'info';
        case 'invalid':
            return 'error';
        default:
            return 'default';
    }
};

export const getOverallValidationLabel = (status?: string | null): string => {
    switch (status) {
        case 'VALID':
            return 'Hợp lệ hệ thống';
        case 'NEEDS_REVIEW':
            return 'Cần kiểm tra';
        case 'INVALID':
            return 'Không hợp lệ';
        default:
            return '—';
    }
};

export const buildTicketOverlayLabel = (row: OcrReviewRow): string => {
    const serial = row.serialNumber?.trim() || '—';
    const numbers = row.numbers?.trim() || '—';
    return `#${row.ticketIndex + 1} - Serial: ${serial} - Number: ${numbers}`;
};

export const formatTicketPriceDisplay = (value?: string | null): string => {
    if (!value?.trim()) {
        return '—';
    }
    const trimmed = value.trim();
    if (/vnd/i.test(trimmed) || /\./.test(trimmed)) {
        return trimmed;
    }
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) {
        return trimmed;
    }
    const grouped = Number(digits).toLocaleString('vi-VN');
    return `${grouped} VND`;
};

/** Lower OCR confidence → stronger visual emphasis. */
export type ConfidenceEmphasis = 'high' | 'medium' | 'low';

export const getConfidenceEmphasis = (confidence?: number | null): ConfidenceEmphasis => {
    if (confidence == null || !Number.isFinite(confidence)) {
        return 'medium';
    }
    const value = confidence <= 1 ? confidence : confidence / 100;
    if (value >= 0.85) {
        return 'high';
    }
    if (value >= 0.7) {
        return 'medium';
    }
    return 'low';
};

export const OCR_FIELD_KEYS = [
    'stationName',
    'batchCode',
    'numbers',
    'serialNumber',
    'drawDate',
    'ticketType',
] as const;

export type OcrFieldKey = (typeof OCR_FIELD_KEYS)[number];

export const OCR_FIELD_LABELS: Record<OcrFieldKey, string> = {
    stationName: 'Nhà đài',
    batchCode: 'Batch code',
    numbers: 'Dãy số',
    serialNumber: 'Serial',
    drawDate: 'Ngày xổ',
    ticketType: 'Giá vé',
};
