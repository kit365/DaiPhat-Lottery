type TicketSerialQuantityInput = {
    status?: string | null;
    ticketCondition?: string | null;
    returnBatchLineId?: number | string | null;
    deletedAt?: string | null;
};

type TicketQuantityInput = {
    quantity?: number | null;
    serials?: TicketSerialQuantityInput[] | null;
};

export const isVoidedTicketCondition = (condition?: string | null): boolean =>
    (condition || '').toUpperCase().replace(/-/g, '_') === 'VOIDED';

/** Physical serial total, including reserved and sold tickets, for inventory history. */
export const resolveTicketSerialQuantity = (ticket?: TicketQuantityInput | null): number => {
    if (Array.isArray(ticket?.serials)) {
        return ticket.serials.filter((serial) => !serial.deletedAt
            && !isVoidedTicketCondition(serial.ticketCondition)).length;
    }
    const quantity = ticket?.quantity;
    return typeof quantity === 'number' && Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
};

/** Matches the backend's sellable-serial predicate; reservations are unavailable. */
export const isAvailableTicketSerial = (serial: TicketSerialQuantityInput): boolean =>
    (serial.status || '').toUpperCase() === 'IN_STOCK'
    && (!serial.ticketCondition || serial.ticketCondition.toUpperCase() === 'GOOD')
    && serial.returnBatchLineId == null
    && !serial.deletedAt;

/** API quantity is sellable stock, never the total number of physical serials. */
export const resolveAvailableTicketQuantity = (ticket?: TicketQuantityInput | null): number => {
    const quantity = ticket?.quantity;
    if (typeof quantity === 'number' && Number.isFinite(quantity)) {
        return Math.max(0, quantity);
    }
    return ticket?.serials?.filter(isAvailableTicketSerial).length ?? 0;
};
