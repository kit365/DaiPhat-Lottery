const SERIAL_STATUS_LABELS: Record<string, string> = {
    IN_STOCK: 'Trong kho',
    RESERVED: 'Đang giữ chỗ',
    PROXY_HOLDING: 'Đại lý giữ hộ',
    SOLD: 'Đã bán',
    EXPIRED: 'Hết hạn',
};

const TICKET_CONDITION_LABELS: Record<string, string> = {
    GOOD: 'Tốt',
    DAMAGED: 'Hỏng',
    LOST: 'Thất lạc',
    VOIDED: 'Đã hủy',
};

/** Admin chip modifier for lottery-ticket-serial status (order detail tables). */
export function resolveLotteryTicketSerialAdminBadge(
    status?: string | null,
    statusDisplayName?: string | null,
    ticketCondition?: string | null,
    ticketConditionDisplayName?: string | null
): { label: string; modifier: string } {
    const condition = (ticketCondition || '').toUpperCase();
    if (condition === 'DAMAGED' || condition === 'LOST' || condition === 'VOIDED') {
        const label =
            ticketConditionDisplayName ||
            TICKET_CONDITION_LABELS[condition] ||
            condition;
        return { label, modifier: 'admin-status-badge--inactive' };
    }

    const normalized = (status || '').toUpperCase();
    const label = statusDisplayName || SERIAL_STATUS_LABELS[normalized] || status || '—';
    switch (normalized) {
        case 'IN_STOCK':
            return { label, modifier: 'admin-status-badge--success' };
        case 'RESERVED':
        case 'PROXY_HOLDING':
            return { label, modifier: 'admin-status-badge--pending' };
        case 'SOLD':
            return { label, modifier: 'admin-status-badge--active' };
        case 'EXPIRED':
            return { label, modifier: 'admin-status-badge--draft' };
        default:
            return { label, modifier: 'admin-status-badge--draft' };
    }
}
