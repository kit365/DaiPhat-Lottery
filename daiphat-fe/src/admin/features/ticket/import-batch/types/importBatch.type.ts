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
