export type TicketIncidentReason = 'DAMAGED' | 'LOST';

export interface HandleOrderTicketIncidentRequest {
    orderDetailIds: number[];
    reason: TicketIncidentReason;
    note?: string;
}

export interface TicketIncidentItemResult {
    orderDetailId: number;
    outcome: 'REPLACED' | 'NO_REPLACEMENT';
    reason: TicketIncidentReason;
    numbers?: string;
    stationName?: string;
    oldSerialNumber?: string;
    newSerialNumber?: string;
    oldTicketSerialId?: number;
    newTicketSerialId?: number;
    message?: string;
}

export interface HandleOrderTicketIncidentResponse {
    results: TicketIncidentItemResult[];
}

export interface CreatePartialRefundRequest {
    incidents: {
        orderDetailId: number;
        reason: TicketIncidentReason;
        replacementTicketId?: number;
        damagedReason?: string;
        damagedEvidenceUrl?: string;
    }[];
    refundReason?: string;
    /** @deprecated Prefer refundReason. */
    refundNote?: string;
}

export type OrderHandoverDecision = 'HANDED_OVER' | 'REJECTED_BY_CUSTOMER';

export interface OrderHandoverItemRequest {
    orderDetailId: number;
    decision: OrderHandoverDecision;
    reason?: string;
}

export interface ConfirmOrderHandoverRequest {
    items: OrderHandoverItemRequest[];
    handoverEvidenceUrl?: string;
}
