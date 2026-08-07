export type ReturnBatchStatus =
    | 'PENDING_INSPECTION'
    | 'INSPECTING'
    | 'PENDING_HANDOVER'
    | 'HANDED_OVER'
    | 'CANCELLED';

export type ReturnBatchLineStatus =
    | 'PENDING'
    | 'SUCCESS'
    | 'REJECTED_BY_SUPPLIER'
    | 'PULLED_FOR_SALE';

export type ReturnDeliveryMode = 'RETAILER_DELIVERS' | 'SUPPLIER_COLLECTS';

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
    batchCode?: string | null;
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
    cancelReason?: string | null;
    cancelledAt?: string | null;
    returnCutOffTime?: string | null;
    returnBufferMinutes?: number | null;
    returnReminderMinutes?: number | null;
    inspectionWindowStartAt?: string | null;
    reminderTriggerAt?: string | null;
    returnCutOffAt?: string | null;
    minutesUntilCutoff?: number | null;
    inspectionExpired?: boolean;
    inInspectionWindow?: boolean;
    urgentReminder?: boolean;
    lines?: ReturnBatchLine[];
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface InspectableReturnSerial {
    serialId: number;
    serialNumber: string;
    status: string;
    statusLabel?: string | null;
    ticketCondition?: string | null;
    ticketConditionDisplayName?: string | null;
    ticketId: number;
    ticketNumbers?: string | null;
    drawDate?: string | null;
    lotteryStationId?: number | null;
    lotteryStationName?: string | null;
    returnBatchLineId?: number | null;
    importBatchLineId?: number | null;
    importCost?: number | null;
    ticketPrice?: number | null;
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

export interface AttachReturnSerialItem {
    serialId: number;
    manualOverride?: boolean;
    overrideReason?: string | null;
    overrideEvidenceUrl?: string | null;
}

export interface AttachReturnSerialsPayload {
    serials: AttachReturnSerialItem[];
}

export interface ConfirmReturnInspectionPayload {
    deliveryMode: ReturnDeliveryMode;
    serialIds: number[];
    returnReceiptUrl?: string | null;
    note?: string | null;
    returnEvidenceUrl?: string | null;
}

export interface ConfirmReturnHandoverPayload {
    returnReceiptUrl?: string | null;
    note?: string | null;
}

export const RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE =
    'The inspection period for this Return Batch has expired. Please return to the Return Batch List page.';
