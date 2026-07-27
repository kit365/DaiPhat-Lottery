/**
 * Ticket quantity = count of every associated LotteryTicketSerial (any status).
 * Falls back to persisted `quantity` when serials are not loaded (e.g. list rows).
 */
export const resolveTicketSerialQuantity = (ticket?: {
    quantity?: number | null;
    serials?: Array<{ status?: string | null }> | null;
} | null): number => {
    const serials = ticket?.serials;
    if (Array.isArray(serials) && serials.length > 0) {
        return serials.length;
    }
    const quantity = ticket?.quantity;
    return typeof quantity === 'number' && Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
};

/** @deprecated Use resolveTicketSerialQuantity — name kept for existing imports. */
export const resolveAvailableTicketQuantity = resolveTicketSerialQuantity;
