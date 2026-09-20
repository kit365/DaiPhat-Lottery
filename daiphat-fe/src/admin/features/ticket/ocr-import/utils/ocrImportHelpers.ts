import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { ImportBatch, ImportBatchLine } from '../../import-batch/types/importBatch.type';
import {
    DEFAULT_RETURN_BUFFER_MINUTES,
    isImportIntakeClosed,
} from '../../import-batch/utils/importBatchDrawDate';
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
    formatVietnameseErrorMessage,
    normalizeOcrScanErrorMessage,
    normalizeOcrWarningList,
    OCR_SOFT_FAIL_MESSAGE,
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

export type FilterEligibleOcrBatchesArgs = {
    supplierId: number | null;
    returnCutOffTime?: string | null;
    returnBufferMinutes?: number;
    now?: Dayjs;
};

/** Editable drafts for the selected supplier that are still within intake giờ hạn. */
export const filterEligibleOcrBatches = (
    options: OcrBatchOption[],
    {
        supplierId,
        returnCutOffTime,
        returnBufferMinutes = DEFAULT_RETURN_BUFFER_MINUTES,
        now = dayjs(),
    }: FilterEligibleOcrBatchesArgs
): OcrBatchOption[] => {
    if (supplierId == null || supplierId <= 0) {
        return [];
    }
    return options.filter((option) => {
        if (option.supplierId !== supplierId) {
            return false;
        }
        return !isImportIntakeClosed(
            returnCutOffTime ?? undefined,
            option.drawDate,
            returnBufferMinutes,
            now
        );
    });
};

/** Same-supplier editable drafts blocked only by intake deadline (for empty-state hint). */
export const countOcrBatchesBlockedByIntake = (
    options: OcrBatchOption[],
    {
        supplierId,
        returnCutOffTime,
        returnBufferMinutes = DEFAULT_RETURN_BUFFER_MINUTES,
        now = dayjs(),
    }: FilterEligibleOcrBatchesArgs
): number => {
    if (supplierId == null || supplierId <= 0) {
        return 0;
    }
    return options.filter(
        (option) =>
            option.supplierId === supplierId &&
            isImportIntakeClosed(
                returnCutOffTime ?? undefined,
                option.drawDate,
                returnBufferMinutes,
                now
            )
    ).length;
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

export const OCR_SERIAL_PATTERN = /^(?:[A-Za-z]\d{4,19}|\d{4,19}[A-Za-z])$/;
export const OCR_BATCH_CODE_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9\-]{2,24}$/;

/** True when value is digits with exactly one letter at start or end. */
export const isOcrSerialNumberShape = (value?: string | null): boolean =>
    Boolean(value?.trim() && OCR_SERIAL_PATTERN.test(value.trim()));

/** Production lot/ký hiệu — not serial-shaped. */
export const isOcrBatchCodeShape = (value?: string | null): boolean => {
    const cleaned = value?.trim() ?? '';
    if (!cleaned || isOcrSerialNumberShape(cleaned)) {
        return false;
    }
    return OCR_BATCH_CODE_PATTERN.test(cleaned);
};

/**
 * Keep serialNumber vs batchCode from swapping: batch-shaped values that landed
 * in serialNumber are moved to batchCode (and vice versa when serial is empty).
 */
export const reconcileOcrSerialAndBatchCode = (
    serialNumber?: string | null,
    batchCode?: string | null
): { serialNumber: string; batchCode: string | null } => {
    let serial = serialNumber?.trim() || '';
    let batch = batchCode?.trim() || null;

    const serialOk = isOcrSerialNumberShape(serial);
    const batchOk = isOcrBatchCodeShape(batch);

    if (serial && !serialOk && isOcrBatchCodeShape(serial)) {
        if (!batchOk) {
            batch = serial;
        }
        serial = '';
    }

    if (batch && isOcrSerialNumberShape(batch) && !isOcrSerialNumberShape(serial)) {
        serial = batch;
        batch = null;
    }

    return { serialNumber: serial, batchCode: batch };
};

export type OcrFieldUiStatus = 'valid' | 'invalid' | 'uncertain' | 'corrected' | 'unreadable';

export type OcrRowValidationContext = {
    /** Station IDs allowed for this ticket's drawDate (must draw that day). */
    allowedStationIds?: Set<number> | null;
    stationPriceById?: Map<number, number> | null;
    /** Expected draw date from import batch */
    batchDrawDate?: string | null;
};

export const formatDenomination = (value?: string | number | null): string => {
    if (value == null) return '';
    const digits = String(value).replace(/[^\d]/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('vi-VN');
};

export const evaluateOcrFieldUiStatus = (
    row: OcrReviewRow,
    fieldKey: OcrFieldKey,
    ctx?: OcrRowValidationContext
): { status: OcrFieldUiStatus; message?: string } => {
    const validation = row.fieldValidations[fieldKey];
    const detail = row.fields?.[fieldKey];
    const detailFailures = detail?.validationFailures;
    const ruleFailures = validation?.ruleFailures ?? detailFailures ?? [];
    const hardFail = ruleFailures.find((f) => f.severity === 'HARD_FAIL');
    const softFail = ruleFailures.find((f) => f.severity === 'SOFT_WARNING');
    const wasEdited =
        row.edited &&
        (fieldKey === 'numbers' ||
            fieldKey === 'serialNumber' ||
            fieldKey === 'drawDate' ||
            fieldKey === 'stationName' ||
            fieldKey === 'batchCode' ||
            fieldKey === 'ticketType');

    const unreadabilityMessage =
        validation?.status === 'UNREADABLE'
            ? validation.message || detail?.validationMessage || 'Không nhận diện được trường này.'
            : detail?.validationStatus === 'UNREADABLE'
              ? detail.validationMessage || 'Không nhận diện được trường này.'
              : null;

    if (hardFail && !wasEdited) {
        return {
            status: 'invalid',
            message: formatVietnameseErrorMessage(hardFail.message || validation?.message || 'Không thỏa quy tắc kiểm tra dữ liệu.'),
        };
    }
    if (softFail && !wasEdited && validation?.status !== 'MISMATCHED') {
        // Soft warning surfaces as uncertain unless already mismatched.
        if (!validation || validation.status === 'MATCHED' || validation.status === 'UNCERTAIN') {
            return {
                status: 'uncertain',
                message: formatVietnameseErrorMessage(softFail.message || validation?.message) || undefined,
            };
        }
    }

    if (fieldKey === 'batchCode') {
        if (wasEdited) {
            return { status: 'corrected' };
        }
        // batchCode is optional, so when not present on ticket, don't show warning
        return { status: 'valid' };
    }

    if (fieldKey === 'serialNumber') {
        const serial = row.serialNumber.trim();
        if (!serial) {
            return {
                status: unreadabilityMessage ? 'unreadable' : 'invalid',
                message: unreadabilityMessage
                    ? formatVietnameseErrorMessage(unreadabilityMessage)
                    : 'Vui lòng nhập số sê-ri.',
            };
        }
        if (!OCR_SERIAL_PATTERN.test(serial)) {
            return {
                status: 'invalid',
                message:
                    'Số sê-ri gồm chữ số và đúng 1 chữ cái ở đầu hoặc cuối (ví dụ A123456, 123456B). Không chấp nhận chữ cái ở giữa.',
            };
        }
        if (row.duplicate) {
            return { status: 'invalid', message: 'Số sê-ri đã tồn tại trong hệ thống (trùng vé).' };
        }
        if (wasEdited) {
            return { status: 'corrected' };
        }
        if (validation?.status === 'UNREADABLE') {
            return { status: 'unreadable', message: formatVietnameseErrorMessage(validation.message) || undefined };
        }
        if (validation?.status === 'MISMATCHED' || validation?.status === 'NOT_FOUND') {
            return { status: 'invalid', message: formatVietnameseErrorMessage(validation.message) || undefined };
        }
        return { status: 'valid' };
    }

    if (fieldKey === 'numbers') {
        const numbers = row.numbers.trim();
        if (!numbers) {
            return {
                status: unreadabilityMessage ? 'unreadable' : 'invalid',
                message: unreadabilityMessage
                    ? formatVietnameseErrorMessage(unreadabilityMessage)
                    : 'Vui lòng nhập dãy số dự thưởng.',
            };
        }
        if (!/^\d+$/.test(numbers)) {
            return { status: 'invalid', message: 'Dãy số chỉ được chứa chữ số.' };
        }
        if (wasEdited) {
            return { status: 'corrected' };
        }
        if (validation?.status === 'MISMATCHED' || validation?.status === 'NOT_FOUND') {
            return { status: 'invalid', message: formatVietnameseErrorMessage(validation.message) || undefined };
        }
        if (validation?.status === 'UNREADABLE') {
            return { status: 'unreadable', message: formatVietnameseErrorMessage(validation.message) || undefined };
        }
        return { status: 'valid' };
    }

    if (fieldKey === 'drawDate') {
        if (!row.drawDate?.trim()) {
            return {
                status: unreadabilityMessage ? 'unreadable' : 'invalid',
                message: unreadabilityMessage
                    ? formatVietnameseErrorMessage(unreadabilityMessage)
                    : 'Vui lòng chọn ngày mở thưởng.',
            };
        }
        if (ctx?.batchDrawDate) {
            const rowDateFormatted = dayjs(row.drawDate).format('YYYY-MM-DD');
            const batchDateFormatted = dayjs(ctx.batchDrawDate).format('YYYY-MM-DD');
            if (rowDateFormatted !== batchDateFormatted) {
                return {
                    status: 'invalid',
                    message: `Ngày mở thưởng (${dayjs(row.drawDate).format('DD/MM/YYYY')}) không khớp với ngày quay của phiếu (${dayjs(ctx.batchDrawDate).format('DD/MM/YYYY')}).`,
                };
            }
        }
        if (wasEdited) {
            return { status: 'corrected' };
        }
        if (validation?.status === 'MISMATCHED') {
            return { status: 'invalid', message: formatVietnameseErrorMessage(validation.message) || undefined };
        }
        if (validation?.status === 'UNREADABLE') {
            return { status: 'unreadable', message: formatVietnameseErrorMessage(validation.message) || undefined };
        }
        return { status: 'valid' };
    }

    if (fieldKey === 'stationName') {
        if (row.stationId == null || !Number.isFinite(row.stationId)) {
            const ocrHint = row.stationName?.trim() || detail?.value?.trim() || null;
            return {
                status: unreadabilityMessage ? 'unreadable' : 'invalid',
                message:
                    unreadabilityMessage
                        ? formatVietnameseErrorMessage(unreadabilityMessage)
                        : (ocrHint
                            ? `OCR nhận "${ocrHint}" nhưng chưa khớp đài trong hệ thống — vui lòng chọn thủ công.`
                            : 'Vui lòng chọn nhà đài.'),
            };
        }
        if (ctx?.allowedStationIds && !ctx.allowedStationIds.has(row.stationId)) {
            return {
                status: 'invalid',
                message: 'Đài OCR không mở thưởng vào ngày phiếu nhập — vui lòng kiểm tra lại.',
            };
        }
        if (wasEdited) {
            return { status: 'corrected' };
        }
        // Keep OCR station selected; surface batch/schedule disagreements for review.
        if (validation?.status === 'MISMATCHED' || validation?.status === 'NOT_FOUND') {
            return { status: 'invalid', message: formatVietnameseErrorMessage(validation.message) || undefined };
        }
        if (validation?.status === 'UNREADABLE') {
            return { status: 'unreadable', message: formatVietnameseErrorMessage(validation.message) || undefined };
        }
        if (validation?.status === 'UNCERTAIN') {
            return { status: 'uncertain', message: formatVietnameseErrorMessage(validation.message) || undefined };
        }
        return { status: 'valid' };
    }

    if (fieldKey === 'ticketType') {
        const parsed = parseTicketPriceNumber(row.ticketType);
        if (row.stationId != null && ctx?.stationPriceById?.has(row.stationId)) {
            const expected = ctx.stationPriceById.get(row.stationId);
            if (expected != null && expected > 0) {
                if (parsed == null) {
                    return {
                        status: 'invalid',
                        message: `Vui lòng nhập mệnh giá (chuẩn: ${expected.toLocaleString('vi-VN')} đ).`,
                    };
                }
                if (Math.abs(expected - parsed) > 0.01) {
                    return {
                        status: 'invalid',
                        message: `Mệnh giá (${parsed.toLocaleString('vi-VN')} đ) không khớp với giá nhà đài (${expected.toLocaleString('vi-VN')} đ).`,
                    };
                }
            }
        }
        if (row.ticketType?.trim() && (parsed == null || parsed <= 0)) {
            return {
                status: 'invalid',
                message: 'Mệnh giá không hợp lệ.',
            };
        }
        if (wasEdited) {
            return { status: 'corrected' };
        }
        if (validation?.status === 'MISMATCHED') {
            return { status: 'invalid', message: formatVietnameseErrorMessage(validation.message) || undefined };
        }
        if (validation?.status === 'UNREADABLE') {
            return { status: 'unreadable', message: formatVietnameseErrorMessage(validation.message) || undefined };
        }
        if (validation?.status === 'UNCERTAIN') {
            return { status: 'uncertain', message: formatVietnameseErrorMessage(validation.message) || undefined };
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
    if (row.duplicate) {
        return false;
    }

    const requiredFields: OcrFieldKey[] = [
        'stationName',
        'numbers',
        'serialNumber',
        'drawDate',
        'ticketType',
    ];
    for (const field of requiredFields) {
        const result = evaluateOcrFieldUiStatus(row, field, ctx);
        if (result.status === 'invalid' || result.status === 'unreadable') {
            return false;
        }
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
    const reconciled = reconcileOcrSerialAndBatchCode(
        ticket.extracted?.serialNumber?.trim() ?? ticket.fields?.serialNumber?.value?.trim() ?? '',
        ticket.extracted?.batchCode ?? ticket.fields?.batchCode?.value ?? null
    );
    return {
        key: `${scanId ?? 'local'}-${ticket.ticketIndex}-${ticket.ocrScanResultId ?? sourceImageId}`,
        sourceImageId,
        sourceFileName,
        sourcePreviewUrl: sourcePreviewUrl ?? ticket.sourceImageUrl ?? null,
        scanId: scanId ?? null,
        ticketIndex: ticket.ticketIndex,
        ocrScanResultId: ticket.ocrScanResultId ?? null,
        status,
        confidence: ticket.confidence ?? 0,
        adjustedConfidence: ticket.adjustedConfidence ?? null,
        bbox: ticket.bbox ?? null,
        imageWidth: ticket.imageWidth ?? scanImageWidth ?? null,
        imageHeight: ticket.imageHeight ?? scanImageHeight ?? null,
        numbers: ticket.extracted?.numbers?.trim() ?? ticket.fields?.numbers?.value?.trim() ?? '',
        serialNumber: reconciled.serialNumber,
        stationId: ticket.resolvedStationId ?? null,
        stationName:
            ticket.extracted?.stationName ??
            ticket.fields?.stationName?.value ??
            null,
        drawDate: ticket.resolvedDrawDate ?? ticket.extracted?.drawDate ?? null,
        ticketType:
            formatDenomination(
                ticket.extracted?.ticketType ?? ticket.fields?.ticketType?.value ?? null
            ) || null,
        batchCode: reconciled.batchCode,
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
        croppedImageUrl: ticket.croppedImageUrl ?? null,
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
        message: 'Không nhận diện được trường này do ảnh bị mờ hoặc bị che khuất.',
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
        croppedImageUrl: null,
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
    if (images.length > 0) {
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
    }

    // Resume path: images were not restored as File blobs, but rows may still
    // carry durable sourcePreviewUrl / croppedImageBase64 from a prior scan.
    const byImageId = new Map<string, OcrReviewImageGroup>();
    for (const row of rows) {
        const imageId = row.sourceImageId || `row-${row.key}`;
        const existing = byImageId.get(imageId);
        const previewUrl = row.sourcePreviewUrl || '';
        if (!existing) {
            byImageId.set(imageId, {
                imageId,
                fileName: row.sourceFileName || 'Ảnh đã quét',
                previewUrl,
                rows: [row],
                imageStatus: row.status === 'FAILED' ? 'error' : 'done',
                imageError: row.businessValidationErrors?.[0] ?? null,
            });
        } else {
            existing.rows.push(row);
            if (!existing.previewUrl && previewUrl) {
                existing.previewUrl = previewUrl;
            }
        }
    }
    return Array.from(byImageId.values());
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
            return 'Hợp lệ';
        case 'NEEDS_REVIEW':
            return 'Cần kiểm tra';
        case 'INVALID':
            return 'Không hợp lệ';
        default:
            return '—';
    }
};

export const getScanLogEventLabel = (
    eventType: string
): { label: string; color: 'success' | 'error' | 'warning' | 'info' | 'default' } => {
    switch (eventType) {
        case 'SCAN_STARTED':
            return { label: 'Bắt đầu quét', color: 'info' };
        case 'OCR_COMPLETED':
            return { label: 'Nhận diện xong', color: 'success' };
        case 'OCR_FAILED':
            return { label: 'Lỗi nhận diện', color: 'error' };
        case 'SCAN_COMPLETED':
            return { label: 'Hoàn tất quét', color: 'success' };
        case 'VERIFY_PASSED':
            return { label: 'Kiểm tra hợp lệ', color: 'success' };
        case 'VERIFY_FAILED':
            return { label: 'Kiểm tra không đạt', color: 'error' };
        case 'INVALID_TICKET':
            return { label: 'Vé không hợp lệ', color: 'error' };
        case 'TICKET_CREATED':
            return { label: 'Tạo vé thành công', color: 'success' };
        case 'TICKET_FOUND':
            return { label: 'Tìm thấy vé', color: 'info' };
        case 'TICKET_NOT_FOUND':
            return { label: 'Không tìm thấy vé', color: 'warning' };
        case 'MANUAL_INPUT':
        case 'MANUAL_OVERRIDE':
            return { label: 'Chỉnh sửa tay', color: 'info' };
        case 'AUTO_IMPORTED':
            return { label: 'Đã nhập tự động', color: 'success' };
        case 'IMAGE_UPLOADED':
            return { label: 'Tải ảnh lên', color: 'default' };
        default: {
            const formatted = eventType.replace(/_/g, ' ').toLowerCase();
            return { label: formatted.charAt(0).toUpperCase() + formatted.slice(1), color: 'default' };
        }
    }
};

export const getScanLogMethodLabel = (method?: string | null): string => {
    if (!method) return '—';
    switch (method) {
        case 'OCR_SCAN':
            return 'Nhận diện OCR';
        case 'QR_SCAN':
            return 'Quét mã QR';
        case 'MANUAL':
        case 'MANUAL_INPUT':
            return 'Nhập thủ công';
        default:
            return method;
    }
};

export const buildTicketOverlayLabel = (row: OcrReviewRow): string => {
    const serial = row.serialNumber?.trim() || '—';
    const numbers = row.numbers?.trim() || '—';
    return `#${row.ticketIndex + 1} - Sê-ri: ${serial} - Số: ${numbers}`;
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
    return `${grouped} đ`;
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
    'drawDate',
    'numbers',
    'serialNumber',
    'batchCode',
    'ticketType',
] as const;

export type OcrFieldKey = (typeof OCR_FIELD_KEYS)[number];

export const OCR_FIELD_LABELS: Record<OcrFieldKey, string> = {
    stationName: 'Nhà đài',
    drawDate: 'Ngày mở thưởng',
    numbers: 'Dãy số vé',
    serialNumber: 'Số sê-ri',
    batchCode: 'Mã lô (Ký hiệu)',
    ticketType: 'Mệnh giá',
};

/**
 * Convert verbose OCR / business error messages into concise 2-4 word phrases
 * so inline table cells don't expand horizontally or force horizontal scrolling.
 */
export const toShortFieldHint = (message?: string | null): string => {
    if (!message) return '';
    const text = message.trim();
    const lower = text.toLowerCase();

    // Dãy số
    if (lower.includes('nhập dãy số') || lower.includes('thiếu dãy số') || lower.includes('chưa có dãy số')) {
        return 'Thiếu dãy số';
    }
    if (lower.includes('chỉ được chứa chữ số') || lower.includes('dãy số không hợp lệ')) {
        return 'Chỉ nhập số';
    }
    if (lower.includes('đúng 6 chữ số') || lower.includes('phải gồm 6')) {
        return 'Phải đủ 6 số';
    }

    // Số sê-ri
    if (lower.includes('nhập số sê-ri') || lower.includes('thiếu số sê-ri') || lower.includes('chưa có số sê-ri')) {
        return 'Thiếu số sê-ri';
    }
    if (lower.includes('ít nhất 1 chữ cái') || lower.includes('sai định dạng sê-ri') || lower.includes('số sê-ri gồm')) {
        return 'Sai dạng sê-ri';
    }
    if (lower.includes('trùng vé') || lower.includes('đã tồn tại trong hệ thống') || lower.includes('trùng số sê-ri')) {
        return 'Trùng vé';
    }

    // Mệnh giá
    if (lower.includes('mệnh giá') || lower.includes('không khớp với giá')) {
        return 'Lệch mệnh giá';
    }

    // Ngày mở thưởng & lịch quay
    if (lower.includes('không mở thưởng vào ngày') || lower.includes('lịch mở thưởng')) {
        return 'Sai lịch quay';
    }
    if (lower.includes('chọn ngày mở thưởng') || lower.includes('thiếu ngày')) {
        return 'Thiếu ngày quay';
    }
    if (lower.includes('ngày mở thưởng không đúng định dạng') || lower.includes('ngày không hợp lệ')) {
        return 'Sai ngày quay';
    }

    // Nhà đài
    if (
        lower.includes('nhà đài') ||
        lower.includes('chọn nhà đài') ||
        lower.includes('chưa chọn đài') ||
        lower.includes('chưa nhận diện được đài') ||
        lower.includes('chọn đài')
    ) {
        return 'Chưa chọn đài';
    }

    // Ký hiệu / Lô
    if (lower.includes('ký hiệu') || lower.includes('mã lô')) {
        return 'Lỗi mã lô';
    }

    // Unreadable / blur / low confidence
    if (
        lower.includes('không thể đọc rõ') ||
        lower.includes('không nhận diện được') ||
        lower.includes('bị che') ||
        lower.includes('bị mờ') ||
        lower.includes('không rõ')
    ) {
        return 'Ảnh mờ/bị che';
    }
    if (lower.includes('độ tin cậy') || lower.includes('confidence')) {
        return 'Tin cậy thấp';
    }

    if (text.length <= 16) {
        return text;
    }

    return `${text.slice(0, 15)}…`;
};

