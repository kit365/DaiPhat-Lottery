import type { ImportBatchImportMode } from '../utils/batchTypeLabels';

export type ImportBatchType = 'NEW' | 'SUPPLEMENTARY' | 'ADJUSTMENT';
export type ImportBatchStatus =
    | 'DRAFT'
    | 'RECEIVING'
    | 'PARTIALLY_IMPORTED'
    | 'CANCELLED'
    | 'IMPORTED'
    | 'IN_LEDGER';
export type ImportBatchLineStatus = 'OPEN' | 'IMPORTING' | 'PAUSED' | 'IMPORTED' | 'CANCELLED';

export interface ImportBatchLine {
    id: number;
    lotteryStationId: number;
    batchType: ImportBatchType;
    batchCode?: string;
    declareQuantity: number;
    declaredCostValue?: number;
    totalQuantity: number;
    importCost: number;
    totalCostValue: number;
    status?: ImportBatchLineStatus;
    importedAt?: string;
    cancelReason?: string;
}

export interface ImportBatch {
    id: number;
    batchCode?: string;
    drawDate: string;
    supplierId?: number;
    supplierName?: string;
    supplierSettlementId?: number;
    importMode?: ImportBatchImportMode;
    invoiceEvidenceUrl?: string;
    ticketListImageUrls?: string[];
    status: ImportBatchStatus;
    cancelReason?: string;
    lineCount?: number;
    totalDeclareQuantity?: number;
    totalDeclaredCostValue?: number;
    totalImportedQuantity?: number;
    totalImportedCostValue?: number;
    submittedAt?: string;
    completedAt?: string;
    ledgerAt?: string;
    note?: string;
    lateImportWarning?: boolean;
    warnings?: string[];
    lines: ImportBatchLine[];
    importedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
}

export interface UpdateImportBatchLinePayload {
    id?: number;
    lotteryStationId: number;
    declareQuantity: number;
    importCost: number;
    removed?: boolean;
}

export interface UpdateImportBatchPayload {
    supplierId: number;
    totalDeclareQuantity: number;
    invoiceEvidenceUrl?: string;
    ticketListImageUrls?: string[];
    lines?: UpdateImportBatchLinePayload[];
    removedTicketIds?: number[];
    /** Dedicated Pause & Adjust Quantity flow for PAUSED lines. */
    adjustPausedDeclareQuantity?: boolean;
    /**
     * Operator confirmed completing a PAUSED line (declare quantity equals imported).
     * Required when that adjustment would mark the line IMPORTED.
     */
    confirmPausedLineImported?: boolean;
}

export interface CreateImportBatchLinePayload {
    lotteryStationId: number;
    declareQuantity: number;
    importCost: number;
}

export interface CreateImportBatchPayload {
    drawDate: string;
    supplierId: number;
    importMode: ImportBatchImportMode;
    totalDeclareQuantity: number;
    invoiceEvidenceUrl?: string;
    ticketListImageUrls?: string[];
    note?: string;
    /**
     * When true, bypass the soft duplicate check for an unfinished batch.
     * The backend will still enforce per-station hard conflicts.
     */
    forceCreate?: boolean;
    lines: CreateImportBatchLinePayload[];
}

export interface ImportBatchEligibleStation {
    lotteryStationId: number;
    name: string;
    /** Business code; the exact-match column of an import file. */
    code?: string;
    /** "Thứ 2, Thứ 6 · 16:15" — printed on the delivery note beside the station. */
    drawSchedule?: string;
    resolvedBatchType: ImportBatchType;
    price?: number;
    commissionRate?: number;
}

export interface ImportBatchBlockedStation {
    lotteryStationId: number;
    name: string;
    existingDraftBatchId?: number;
    blockedReason?: string;
}

export interface ImportBatchEligibleStationsResult {
    eligible: ImportBatchEligibleStation[];
    blocked: ImportBatchBlockedStation[];
}

export interface ImportBatchClassificationPreview {
    resolvedBatchType: ImportBatchType;
    lateImportWarning: boolean;
    warnings: string[];
}

export interface ImportBatchListParams {
    page?: number;
    size?: number;
    lotteryStationId?: number;
    drawDate?: string;
    drawDateFrom?: string;
    drawDateTo?: string;
    status?: ImportBatchStatus;
    batchType?: ImportBatchType;
    sortBy?: string;
    direction?: string;
}

export interface ImportBatchTimePolicy {
    returnBufferMinutes: number;
}

export interface ImportBatchReductionTicket {
    id: number;
    numbers?: string;
    serialNumber?: string;
    serialCount: number;
    status?: string;
}

export interface ImportBatchReductionLine {
    lineId: number;
    lotteryStationId: number;
    stationName: string;
    status: ImportBatchLineStatus;
    deletable: boolean;
    importedQuantity: number;
    tickets: ImportBatchReductionTicket[];
}

export interface ImportBatchReductionTicketsResult {
    totalImportedQuantity: number;
    removableImportedQuantity: number;
    lines: ImportBatchReductionLine[];
}

export interface ImportBatchLineEntrySerial {
    id: number;
    serialNumber: string;
    ticketImg?: string;
    status?: string;
    ticketCondition?: string;
    ticketConditionDisplayName?: string;
    returnBatchLineId?: number | null;
}

export interface ImportBatchLineEntryTicket {
    id: number;
    numbers: string;
    status?: string;
    serials: ImportBatchLineEntrySerial[];
}

export interface ImportBatchLineEntryTicketsResult {
    importBatchId: number;
    importBatchLineId: number;
    tickets: ImportBatchLineEntryTicket[];
}

/* ------------------------------------------------------------------ *
 * Creating import batches from a supplier .csv / .xlsx file
 * ------------------------------------------------------------------ */

export type ImportBatchFileNumberStyle = 'AUTO' | 'VN' | 'EN';

export type ImportBatchFileRowStatus = 'OK' | 'WARNING' | 'ERROR' | 'SKIPPED';

export type ImportBatchFileGroupStatus = 'IMPORTABLE' | 'OUT_OF_WINDOW' | 'BLOCKED';

export type ImportBatchFileIssueSeverity = 'WARNING' | 'ERROR' | 'SKIPPED';

export type ImportBatchFileIssueCode =
    | 'DRAW_DATE_OUT_OF_WINDOW'
    | 'DRAFT_ALREADY_EXISTS'
    | 'SUPPLIER_IMPORT_NOT_ALLOWED'
    | 'SUPPLIER_RETURN_CUT_OFF_PASSED'
    | 'NO_VALID_ROW'
    | 'MISSING_REQUIRED_COLUMN'
    | 'DRAW_DATE_INVALID'
    | 'STATION_NOT_FOUND'
    | 'STATION_CODE_NOT_FOUND'
    | 'STATION_NOT_ELIGIBLE'
    | 'STATION_DRAFT_EXISTS'
    | 'QUANTITY_INVALID'
    | 'QUANTITY_NOT_POSITIVE'
    | 'STATION_AMBIGUOUS'
    | 'DUPLICATE_STATION_IN_GROUP'
    | 'IMPORT_COST_MISMATCH'
    | 'LATE_IMPORT_WARNING'
    | 'NUMBERS_REQUIRED'
    | 'NUMBERS_INVALID'
    | 'NUMBERS_LENGTH_INVALID'
    | 'NUMBERS_DUPLICATED_IN_GROUP'
    | 'NUMBERS_MERGED_INTO_ROW'
    | 'SERIALS_REQUIRED'
    | 'SERIAL_DUPLICATED_IN_FILE'
    | 'SERIAL_ALREADY_IMPORTED'
    | 'QUANTITY_ABOVE_SERIAL_COUNT'
    | 'QUANTITY_BELOW_SERIAL_COUNT'
    | 'TICKET_IMAGE_INVALID'
    | 'TICKET_IMAGE_COUNT_MISMATCH'
    | 'STATION_PRICING_MISMATCH'
    | 'STATION_SCHEDULE_MISMATCH'
    | 'PARTIAL_IMPORT_DISABLED'
    | 'SUPPLIER_IDENTITY_MISMATCH'
    | 'SUPPLIER_IDENTITY_NOT_DECLARED'
    | 'STATION_INACTIVE';

/**
 * Which column of the uploaded file feeds which field. Columns are addressed by
 * header label, with 'COL:n' as the fallback for a file without headers.
 * Every parsing knob may be omitted, in which case the backend detects it.
 */
export interface ImportBatchFileMapping {
    headerRowIndex?: number;
    delimiter?: string | null;
    charset?: string | null;
    numberStyle?: ImportBatchFileNumberStyle;
    dateFormat?: string | null;
    /** Omit for a single-day file, then set fallbackDrawDate instead. */
    drawDateColumn?: string | null;
    fallbackDrawDate?: string | null;
    /**
     * Station business code. Preferred over stationColumn: a code is exact, so a
     * file this system exported never needs name matching.
     */
    stationCodeColumn?: string | null;
    /** Required before preview; nullable while the operator is still tagging columns. */
    stationColumn?: string | null;
    /** Required only when no serial column is mapped; a cross-check otherwise. */
    quantityColumn?: string | null;
    /** The lottery number itself. Mapping this and serialsColumn imports the tickets. */
    numbersColumn?: string | null;
    /** One cell holding every serial of that lottery number. */
    serialsColumn?: string | null;
    /** One image URL for the row, or one per serial in the same order. */
    ticketImageColumn?: string | null;
    /** Separator inside the serial and image cells; defaults to ";". */
    serialSeparator?: string | null;
    importCostColumn?: string | null;
    salePriceColumn?: string | null;
    commissionRateColumn?: string | null;
}

/** True when the mapping carries the tickets themselves, not just quantities. */
export const mappingImportsTickets = (mapping: ImportBatchFileMapping | null): boolean =>
    !!mapping?.numbersColumn && !!mapping?.serialsColumn;

export interface ImportBatchFileStationSuggestion {
    lotteryStationId: number;
    name: string;
    score: number;
}

export interface ImportBatchFileIssue {
    column?: string | null;
    code: ImportBatchFileIssueCode;
    severity: ImportBatchFileIssueSeverity;
    message: string;
    suggestions?: ImportBatchFileStationSuggestion[];
}

export interface ImportBatchFileRow {
    rowNumber: number;
    rawValues: Record<string, string>;
    drawDate?: string;
    lotteryStationId?: number | null;
    stationName?: string | null;
    resolvedBatchType?: ImportBatchType | null;
    /** The lottery number; only present when the file carries tickets. */
    numbers?: string | null;
    serialNumbers?: string[] | null;
    /** One entry per serial, null where there is no usable image. */
    ticketImages?: (string | null)[] | null;
    /** What the supplier says it delivered, read from the quantity column. */
    declareQuantity?: number | null;
    /** How many tickets this row actually creates. */
    serialCount?: number | null;
    importCost?: number | null;
    status: ImportBatchFileRowStatus;
    issues: ImportBatchFileIssue[];
    /**
     * Set when this line handed its serials to an earlier line carrying the same
     * lottery number — that line's row number.
     *
     * <p>A file prints one serial per line, so a four-ticket number occupies four
     * consecutive lines and only the first becomes a ticket. Without this the
     * preview shows the same serial twice and looks like a duplicate.
     */
    mergedIntoRowNumber?: number | null;
}

/** All rows of one draw date - the unit that becomes a single import batch. */
/** One import batch line that will be created for a station. */
export interface ImportBatchFileStationSummary {
    lotteryStationId: number;
    stationName?: string | null;
    /** Distinct lottery numbers. */
    ticketCount: number;
    /** Tickets the file actually carries. */
    serialCount: number;
    /** What the supplier declared; this is what the import batch line records. */
    declaredQuantity: number;
    importCost: number;
    declaredCostValue: number;
}

export interface ImportBatchFileGroup {
    drawDate?: string;
    status: ImportBatchFileGroupStatus;
    importMode?: ImportBatchImportMode;
    totalDeclareQuantity: number;
    totalSerialCount?: number;
    totalDeclaredCostValue: number;
    ticketCount?: number;
    existingEditableBatchId?: number | null;
    stations: ImportBatchFileStationSummary[];
    groupIssues: ImportBatchFileIssue[];
    rows: ImportBatchFileRow[];
    /** Non-empty means the group is blocked until station pricing is reconciled. */
    pricingMismatches?: ImportBatchFilePricingMismatch[];
    /** Stations in the file whose weekly schedule excludes this draw date. */
    scheduleMismatches?: ImportBatchFileScheduleMismatch[];
}

export type BackendDayOfWeek =
    | 'MONDAY'
    | 'TUESDAY'
    | 'WEDNESDAY'
    | 'THURSDAY'
    | 'FRIDAY'
    | 'SATURDAY'
    | 'SUNDAY';

/**
 * A station the file names on a weekday its schedule does not cover.
 *
 * <p>Distinct from "station not found": the station is real, so the usual fix is
 * to correct its schedule rather than the file — which is why the current and
 * required weekdays both come back.
 */
export interface ImportBatchFileScheduleMismatch {
    lotteryStationId: number;
    stationName: string;
    stationCode?: string;
    /** DD/MM/YYYY. */
    drawDate: string;
    currentDrawDays: BackendDayOfWeek[];
    requiredDrawDays: BackendDayOfWeek[];
    /** Current plus required — adds a day rather than dropping the existing ones. */
    suggestedDrawDays: BackendDayOfWeek[];
    /** False when the station is switched off, which is a different repair. */
    active: boolean;
}

/**
 * One station whose Giá nhập / Giá bán / Hoa hồng in the uploaded file disagree
 * with the station record. `importCostExpected` is Giá bán × (1 − Hoa hồng), the
 * figure the backend actually writes onto the import batch line.
 */
export interface ImportBatchFilePricingMismatch {
    lotteryStationId: number;
    stationName: string;
    /** Line of the file the disagreeing figures came from, for locating the cell. */
    rowNumber?: number;
    salePriceInFile?: number;
    salePriceInSystem?: number;
    salePriceMismatch: boolean;
    /** Percentage, e.g. 10 for 10%. */
    commissionRateInFile?: number;
    commissionRateInSystem?: number;
    commissionRateMismatch: boolean;
    importCostInFile?: number;
    importCostExpected?: number;
    importCostMismatch: boolean;
}

/**
 * One identifying field read out of the file's letterhead and compared with the
 * selected supplier. `blocking` marks the identifiers that pin down a legal
 * entity — a disagreement there stops the import, while a changed contact person
 * only warns.
 */
export interface ImportBatchFileSupplierIdentityField {
    field: string;
    label: string;
    valueInFile?: string;
    valueInSystem?: string;
    matched: boolean;
    blocking: boolean;
}

/** Whether the party named in the file is the supplier chosen in the dialog. */
export interface ImportBatchFileSupplierIdentity {
    /** False for files from older templates, which carry no letterhead. */
    declared: boolean;
    mismatched: boolean;
    fields: ImportBatchFileSupplierIdentityField[];
}

export interface ImportBatchFileInspectResult {
    detectedHeaders: string[];
    sampleRows: Record<string, string>[];
    totalRows: number;
    fileHash: string;
    headerSignature: string;
    /** True when a saved mapping for this supplier and layout was applied. */
    profileMatched: boolean;
    suggestedMapping: ImportBatchFileMapping;
}

export interface ImportBatchFilePreviewResult {
    appliedMapping: ImportBatchFileMapping;
    detectedHeaders: string[];
    fileHash: string;
    windowFrom: string;
    windowTo: string;
    importsTickets: boolean;
    totalRows: number;
    importableRows: number;
    skippedRows: number;
    errorRows: number;
    supplierIdentity?: ImportBatchFileSupplierIdentity;
    groups: ImportBatchFileGroup[];
}

export interface ImportBatchFileImportItemResult {
    drawDate: string;
    success: boolean;
    importBatchId?: number;
    batchCode?: string;
    lineCount?: number;
    ticketCount?: number;
    declaredSerialCount?: number;
    /** Smaller than declared means the batch was left partially imported on purpose. */
    importedSerialCount?: number;
    errorCode?: string;
    message?: string;
}

export interface ImportBatchFileImportResult {
    /** History row for this run. */
    jobId?: number | null;
    requestedCount: number;
    createdCount: number;
    failedCount: number;
    items: ImportBatchFileImportItemResult[];
}

/**
 * The file is uploaded again instead of the resolved rows being sent back, so the
 * backend re-reads and re-validates everything rather than trusting this copy.
 */
export interface ImportBatchFileCommitPayload {
    supplierId: number;
    fileHash: string;
    mapping: ImportBatchFileMapping;
    drawDates: string[];
    forceCreateDrawDates?: string[];
    /** Shared invoice/receipt file URL (image or document). */
    invoiceEvidenceUrl?: string | null;
    /** Extra ticket-list evidence URLs (images or documents). */
    ticketListImageUrls?: string[] | null;
    /**
     * When true (default), also attach the imported CSV/XLSX as ticket-list evidence
     * on each created batch.
     */
    useOriginalFileAsTicketListEvidence?: boolean;
}

/** A column mapping remembered for one supplier and one file layout. */
export interface ImportBatchFileMappingProfile {
    id: number;
    supplierId: number;
    supplierName?: string | null;
    /** Fingerprint of the header row; one supplier may have several templates. */
    headerSignature: string;
    /** Null when the stored JSON no longer parses - the row is still listed so it can be deleted. */
    mapping?: ImportBatchFileMapping | null;
    useCount: number;
    lastUsedAt?: string | null;
    createdAt?: string | null;
}

/** MANDATORY = luôn bắt buộc, CONDITIONAL = bắt buộc tuỳ dạng tệp, OPTIONAL = tuỳ chọn. */
export type ImportBatchFileFieldRequirement = 'MANDATORY' | 'CONDITIONAL' | 'OPTIONAL';

/** One field the importer can read, as described by the configuration endpoint. */
export interface ImportBatchFileFieldRule {
    /** Mapping key, e.g. "serialsColumn". */
    field: string;
    label: string;
    requirement: ImportBatchFileFieldRequirement;
    /** True when one cell holds several values separated by the configured separator. */
    list: boolean;
    /** Header spellings the system detects on its own. */
    aliases: string[];
    note: string;
}

/** Rules currently in force for reading a supplier file. */
export interface ImportBatchFileConfig {
    /** system_config key holding the editable half. */
    configKey: string;
    /** Always ROW; transposed files are not supported. */
    readingDirection: string;
    readingDirectionNote: string;
    fields: ImportBatchFileFieldRule[];
    maxFileSizeMb: number;
    maxRows: number;
    serialSeparator: string;
    storeOriginalFile: boolean;
    allowPartialImport: boolean;
    allowedExtensions: string[];
    drawDateWindowFrom: string;
    drawDateWindowTo: string;
    supportedDateFormats: string[];
    /** Rules that come from the data model, not from settings. */
    fixedRules: string[];
}

export type ImportBatchFileJobStatus =
    | 'PENDING'
    | 'PROCESSING'
    | 'COMPLETED'
    | 'PARTIAL_SUCCESS'
    | 'FAILED';

/** One row of the file-import history. */
export interface ImportBatchFileJob {
    id: number;
    fileName?: string;
    fileHash: string;
    /** The supplier's upload, kept as settlement evidence. */
    originalFileUrl?: string | null;
    supplierId: number;
    supplierName?: string | null;
    status: ImportBatchFileJobStatus;
    statusLabel?: string;
    importsTickets: boolean;
    requestedDrawDates?: string;
    requestedCount: number;
    createdCount: number;
    failedCount: number;
    declaredQuantity: number;
    importedQuantity: number;
    errorCode?: string | null;
    errorMessage?: string | null;
    startedAt?: string;
    finishedAt?: string;
}
