/**
 * Ticket quantity = count of associated LotteryTicketSerial that still exist as inventory.
 * VOIDED serials are replacements leftovers and are excluded.
 * Falls back to persisted `quantity` when serials are not loaded (e.g. list rows).
 */
export const isVoidedTicketCondition = (condition?: string | null): boolean =>
    (condition || '').toUpperCase().replace(/-/g, '_') === 'VOIDED';

export const resolveTicketSerialQuantity = (ticket?: {
    quantity?: number | null;
    serials?: Array<{ status?: string | null; ticketCondition?: string | null }> | null;
} | null): number => {
    const serials = ticket?.serials;
    if (Array.isArray(serials) && serials.length > 0) {
        return serials.filter((serial) => !isVoidedTicketCondition(serial.ticketCondition)).length;
    }
    const quantity = ticket?.quantity;
    return typeof quantity === 'number' && Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
};

/** @deprecated Use resolveTicketSerialQuantity — name kept for existing imports. */
export const resolveAvailableTicketQuantity = resolveTicketSerialQuantity;
