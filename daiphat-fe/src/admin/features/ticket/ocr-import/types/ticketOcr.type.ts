export type ScannedTicketStatus =
    | 'COMPLETE'
    | 'NEEDS_REVIEW'
    | 'PARTIAL'
    | 'INCOMPLETE'
    | 'FAILED';

export type OcrFieldValidationStatus =
    | 'MATCHED'
    | 'MISMATCHED'
    | 'NOT_FOUND'
    | 'UNCERTAIN'
    | 'UNREADABLE';

export type OcrOverallValidationStatus = 'VALID' | 'NEEDS_REVIEW' | 'INVALID';
export type ScanImportOutcome = 'SUCCESS' | 'DUPLICATE' | 'FAILED';

export type OcrConfirmImportMode = 'AUTO' | 'MANUAL';

export type ScanEventType =
    | 'SCAN_STARTED'
    | 'OCR_COMPLETED'
    | 'MANUAL_INPUT'
    | 'VERIFY_PASSED'
    | 'VERIFY_FAILED'
    | 'TICKET_CREATED'
    | 'TICKET_FOUND'
    | 'TICKET_NOT_FOUND'
    | 'INVALID_TICKET'
    | 'SCAN_COMPLETED';

export type ScanMethod = 'QR_SCAN' | 'OCR_SCAN' | 'MANUAL_INPUT';

export interface TicketBoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
    corners?: number[][] | null;
}

export interface FieldValidationResult {
    status: OcrFieldValidationStatus;
    message?: string | null;
    expectedValue?: string | null;
}

export interface OcrFieldDetail {
    fieldName: string;
    value?: string | null;
    confidence?: number | null;
    boundingBox?: TicketBoundingBox | null;
    validationStatus?: OcrFieldValidationStatus | null;
    validationMessage?: string | null;
    expectedValue?: string | null;
}

export interface ExtractedTicketFields {
    stationName?: string | null;
    stationCode?: string | null;
    serialNumber?: string | null;
    numbers?: string | null;
    drawDate?: string | null;
    ticketType?: string | null;
    batchCode?: string | null;
}

export interface ScannedTicket {
    ticketIndex: number;
    bbox?: TicketBoundingBox | null;
    status: ScannedTicketStatus;
    confidence: number;
    adjustedConfidence?: number | null;
    extracted?: ExtractedTicketFields | null;
    fieldConfidences?: Record<string, number> | null;
    fieldBoxes?: Record<string, TicketBoundingBox> | null;
    fieldValidations?: Record<string, FieldValidationResult> | null;
    fields?: Record<string, OcrFieldDetail> | null;
    overallValidationStatus?: OcrOverallValidationStatus | null;
    missingFields?: string[] | null;
    validationErrors?: string[] | null;
    businessValidationErrors?: string[] | null;
    duplicate?: boolean;
    resolvedStationId?: number | null;
    resolvedDrawDate?: string | null;
    croppedImageBase64?: string | null;
    ocrScanResultId?: number | null;
    sourceImageName?: string | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
}

export interface TicketScanResponse {
    scanId: string;
    ticketCount: number;
    tickets: ScannedTicket[];
    warnings?: string[] | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
}

export interface ConfirmedScannedTicketPayload {
    numbers: string;
    serialNumber: string;
    ticketImageBase64?: string | null;
    ocrScanResultId?: number | null;
}

export interface BatchImportScannedTicketsPayload {
    importBatchLineId: number;
    batchCode: string;
    tickets: ConfirmedScannedTicketPayload[];
    isAutoSave?: boolean;
}

export interface OcrConfirmImportTicketPayload {
    numbers: string;
    serialNumber: string;
    stationId: number;
    drawDate: string;
    ticketImageBase64?: string | null;
    ocrScanResultId?: number | null;
}

export interface OcrConfirmImportPayload {
    mode: OcrConfirmImportMode;
    supplierId?: number | null;
    invoiceEvidenceUrl?: string | null;
    ticketListImageUrls?: string[] | null;
    forceCreate?: boolean | null;
    importBatchId?: number | null;
    tickets: OcrConfirmImportTicketPayload[];
}

export interface ScanBatchImportItem {
    numbers?: string | null;
    serialNumber?: string | null;
    outcome: ScanImportOutcome;
    message?: string | null;
    ticketId?: number | null;
}

export interface ScanBatchImportResponse {
    importBatchLineId: number;
    totalRequested: number;
    successCount: number;
    duplicateCount: number;
    failedCount: number;
    results: ScanBatchImportItem[];
}

export interface OcrConfirmImportBatchResult {
    importBatchId?: number | null;
    batchCode?: string | null;
    drawDate?: string | null;
    ticketSuccessCount: number;
    ticketDuplicateCount: number;
    ticketFailedCount: number;
    ticketResults?: ScanBatchImportItem[] | null;
}

export interface OcrConfirmImportResponse {
    mode: OcrConfirmImportMode;
    totalRequested: number;
    successCount: number;
    duplicateCount: number;
    failedCount: number;
    batches: OcrConfirmImportBatchResult[];
}

export interface OcrScanResult {
    id: number;
    scanId: string;
    ticketIndex: number;
    importBatchLineId?: number | null;
    stationId?: number | null;
    sourceImageName?: string | null;
    bbox?: TicketBoundingBox | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
    extractedStationName?: string | null;
    extractedSerialNumber?: string | null;
    extractedNumbers?: string | null;
    extractedDrawDate?: string | null;
    extractedBatchCode?: string | null;
    extractedPrice?: string | null;
    confidence: number;
    adjustedConfidence?: number | null;
    fieldConfidences?: Record<string, number> | null;
    fieldBoxes?: Record<string, TicketBoundingBox> | null;
    fieldValidations?: Record<string, FieldValidationResult> | null;
    overallValidationStatus?: OcrOverallValidationStatus | null;
    status?: ScannedTicketStatus | null;
    missingFields?: string[] | null;
    validationErrors?: string[] | null;
    businessValidationErrors?: string[] | null;
    croppedImageUrl?: string | null;
    scannedBy?: string | null;
    scannedAt?: string | null;
}

export interface LotteryScanLog {
    id: number;
    eventType: ScanEventType;
    ocrScanResultId?: number | null;
    lotteryTicketSerialId?: number | null;
    scannedBy?: string | null;
    scanMethod?: ScanMethod | null;
    isValid?: boolean | null;
    note?: string | null;
    scannedAt?: string | null;
}

export type OcrImageScanStatus = 'pending' | 'scanning' | 'done' | 'error';

export interface OcrQueuedImage {
    id: string;
    file: File;
    previewUrl: string;
    status: OcrImageScanStatus;
    error?: string | null;
    scanId?: string | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
}

export interface OcrReviewRow {
    key: string;
    sourceImageId: string;
    sourceFileName: string;
    sourcePreviewUrl?: string | null;
    scanId?: string | null;
    ticketIndex: number;
    ocrScanResultId?: number | null;
    status: ScannedTicketStatus;
    confidence: number;
    adjustedConfidence?: number | null;
    bbox?: TicketBoundingBox | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
    numbers: string;
    serialNumber: string;
    stationId?: number | null;
    stationName?: string | null;
    drawDate?: string | null;
    ticketType?: string | null;
    batchCode?: string | null;
    fieldConfidences: Record<string, number>;
    fieldBoxes: Record<string, TicketBoundingBox>;
    fieldValidations: Record<string, FieldValidationResult>;
    fields: Record<string, OcrFieldDetail>;
    overallValidationStatus?: OcrOverallValidationStatus | null;
    missingFields: string[];
    validationErrors: string[];
    businessValidationErrors: string[];
    duplicate: boolean;
    croppedImageBase64?: string | null;
    selected: boolean;
    edited: boolean;
}

export const OCR_IMPORT_DRAFT_KEY = 'ocrImportDraft';

export interface OcrImportDraftImageMeta {
    id: string;
    fileName: string;
}

export interface OcrImportDraft {
    step: 'upload' | 'review' | 'importMode' | 'result';
    importMode: OcrConfirmImportMode;
    supplierId: number | null;
    invoiceEvidenceUrl: string;
    ticketListImageUrl: string;
    selectedImportBatchId: number | null;
    forceCreate: boolean;
    draftIntent?: 'USE_EXISTING' | 'CREATE_NEW';
    rows: OcrReviewRow[];
    imageMeta: OcrImportDraftImageMeta[];
    pendingRestore?: boolean;
}
