export type ReturnBatchStatus = 'PENDING' | 'RETURNED' | 'CONFIRMED';

export type ReturnBatchLineStatus =
    | 'PENDING'
    | 'SUCCESS'
    | 'REJECTED_BY_SUPPLIER'
    | 'PULLED_FOR_SALE';

export interface ReturnBatchLine {
    id: number;
    returnBatchId: number;
    lotteryStationId: number;
    lotteryStationName?: string | null;
    status: ReturnBatchLineStatus;
    statusLabel?: string | null;
    totalQuantity: number;
    totalReturnValue: number;
    attachedSerialCount?: number | null;
}

export interface ReturnBatch {
    id: number;
    lotterySupplierId: number;
    supplierName?: string | null;
    supplierCode?: string | null;
    drawDate: string;
    supplierSettlementId?: number | null;
    returnReceiptUrl?: string | null;
    totalQuantity: number;
    totalReturnValue: number;
    returnedBy?: string | null;
    returnedAt?: string | null;
    confirmedAt?: string | null;
    status: ReturnBatchStatus;
    statusLabel?: string | null;
    note?: string | null;
    lines?: ReturnBatchLine[];
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface ReturnBatchListParams {
    page?: number;
    size?: number;
    lotterySupplierId?: number;
    supplierSettlementId?: number;
    status?: ReturnBatchStatus;
    drawDateFrom?: string;
    drawDateTo?: string;
    search?: string;
    sortBy?: string;
    direction?: string;
}

export interface CreateReturnBatchPayload {
    supplierId: number;
    drawDate: string;
    note?: string | null;
    lines: { lotteryStationId: number }[];
}

export interface UpdateReturnBatchPayload {
    note?: string | null;
    returnReceiptUrl?: string | null;
    addLines?: { lotteryStationId: number }[];
}

export interface AttachReturnSerialItem {
    serialId: number;
    manualOverride?: boolean;
    overrideReason?: string | null;
    overrideEvidenceUrl?: string | null;
}

export interface AttachReturnSerialsPayload {
    serials: AttachReturnSerialItem[];
}

export interface ConfirmReturnBatchPayload {
    returnReceiptUrl?: string | null;
}
