/** Keep string values stable — orders counter & import-batch invalidate these. */
export const QUERY_KEYS = {
    TICKETS: 'tickets',
    TICKET_DETAIL: 'ticket',
    EXPIRED_TICKETS: 'expired-tickets',
} as const;
