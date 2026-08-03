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
    EXPIRED = 'EXPIRED',
}

/** Physical / data-entry condition of a lottery ticket serial (orthogonal to lifecycle status). */
export enum TicketCondition {
    GOOD = 'GOOD',
    DAMAGED = 'DAMAGED',
    LOST = 'LOST',
    VOIDED = 'VOIDED',
}

export enum LotteryTicketSerialFaultedBy {
    INTERNAL_FAULT = 'INTERNAL_FAULT',
    ISSUER_FAULT = 'ISSUER_FAULT',
    DATA_ENTRY_FAULT = 'DATA_ENTRY_FAULT',
}

/** How a lottery ticket serial was created — assigned by the system, not user input. */
export enum LotteryTicketSerialInputSource {
    SCAN = 'SCAN',
    MANUAL = 'MANUAL',
}

/** @deprecated Use {@link LotteryTicketSerialInputSource} */
export const LotteryTicketInputSource = LotteryTicketSerialInputSource;
