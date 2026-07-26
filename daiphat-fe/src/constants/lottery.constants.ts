export enum LotteryTicketStatus {
    IMPORTING = 'IMPORTING',
    IN_STOCK = 'IN_STOCK',
    SOLD_OUT = 'SOLD_OUT',
    EXPIRED = 'EXPIRED',
}

export enum LotteryTicketSerialStatus {
    IN_STOCK = 'IN_STOCK',
    RESERVED = 'RESERVED',
    SOLD = 'SOLD',
    PROXY_HOLDING = 'PROXY_HOLDING',
    PENDING_RETURN = 'PENDING_RETURN',
    RETURNED = 'RETURNED',
    EXPIRED = 'EXPIRED',
    DAMAGED = 'DAMAGED',
    LOST = 'LOST',
    VOIDED = 'VOIDED',
}

export enum LotteryTicketSerialFaultedBy {
    INTERNAL_FAULT = 'INTERNAL_FAULT',
    ISSUER_FAULT = 'ISSUER_FAULT',
}

/** How a lottery ticket serial was created — assigned by the system, not user input. */
export enum LotteryTicketSerialInputSource {
    SCAN = 'SCAN',
    MANUAL = 'MANUAL',
}

/** @deprecated Use {@link LotteryTicketSerialInputSource} */
export const LotteryTicketInputSource = LotteryTicketSerialInputSource;
