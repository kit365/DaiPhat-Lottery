/** Mirrors backend ScannedTicketStatus (daiphat-be) / TicketStatus (ticket-vision). */
export type ScannedTicketStatus = 'COMPLETE' | 'NEEDS_REVIEW' | 'INCOMPLETE';

/** Mirrors backend ScanImportOutcome. */
export type ScanImportOutcome = 'SUCCESS' | 'DUPLICATE' | 'FAILED';

export interface TicketBoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
    corners?: number[][];
}

export interface ExtractedTicketFields {
    stationName?: string | null;
    stationCode?: string | null;
    serialNumber?: string | null;
    numbers?: string | null;
    drawDate?: string | null;
}

export interface ScannedTicket {
    ticketIndex: number;
    bbox: TicketBoundingBox;
    status: ScannedTicketStatus;
    confidence: number;
    extracted: ExtractedTicketFields;
    fieldConfidences?: Record<string, number>;
    missingFields?: string[];
    validationErrors?: string[];
    businessValidationErrors?: string[];
    duplicate?: boolean;
    resolvedStationId?: number;
    resolvedDrawDate?: string;
    croppedImageBase64?: string | null;
    /**
     * The persisted OCR_Scan_Result row id for this detection (Lottery_Scan_Log
     * audit trail). Echo it back unchanged in ConfirmedScannedTicketPayload —
     * the backend uses it to tell a straight OCR confirmation apart from a
     * manually-corrected one.
     */
    ocrScanResultId?: number | null;
}

export interface TicketScanResult {
    scanId: string;
    ticketCount: number;
    tickets: ScannedTicket[];
    warnings?: string[];
}

/** One row the user reviews/edits before confirming import — client-only state layered on top of ScannedTicket. */
export interface EditableScannedTicket extends ScannedTicket {
    /** Stable key for React lists / editing, independent of array position. */
    clientId: string;
    /** User un-ticked this detection — excluded from the batch-import payload. */
    included: boolean;
    /** Editable copies (start out equal to `extracted`, diverge as the user corrects them). */
    editedNumbers: string;
    editedSerialNumber: string;
}

export interface ConfirmedScannedTicketPayload {
    numbers: string;
    serialNumber: string;
    ticketImageBase64?: string;
    /** Null when this ticket was never detected by OCR (manually added/edited). */
    ocrScanResultId?: number | null;
}

export interface BatchImportScannedTicketsPayload {
    importBatchLineId: number;
    batchCode: string;
    tickets: ConfirmedScannedTicketPayload[];
    isAutoSave?: boolean;
}

export interface ScanBatchImportItemResult {
    numbers?: string;
    serialNumber?: string;
    outcome: ScanImportOutcome;
    message?: string;
    ticketId?: number;
}

export interface ScanBatchImportResult {
    importBatchLineId: number;
    totalRequested: number;
    successCount: number;
    duplicateCount: number;
    failedCount: number;
    results: ScanBatchImportItemResult[];
}
