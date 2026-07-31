import { normalizeTicketStatus } from '../../inventory/constants/ticket-status.config';

/** Ticket aggregate statuses that can be selected in the cancel-lottery-ticket flow. */
export const CANCEL_SELECTABLE_TICKET_STATUSES = new Set(['IMPORTING', 'IN_STOCK']);

/** @deprecated Prefer filter value `SOLD_OUT`. Kept for older filter URLs/state. */
export const CANCEL_FLOW_INVALID_STATUS = 'INVALID';

export const isTicketSelectableForCancel = (status?: string | null): boolean => {
    const normalized = normalizeTicketStatus(status);
    return CANCEL_SELECTABLE_TICKET_STATUSES.has(normalized);
};

export const getCancelFlowTicketStatusLabel = (status?: string | null, statusDisplayName?: string | null): string => {
    const normalized = normalizeTicketStatus(status);
    if (normalized === 'SOLD_OUT') {
        return 'Hết hàng (SOLD_OUT)';
    }
    if (statusDisplayName) {
        return statusDisplayName;
    }
    switch (normalized) {
        case 'IMPORTING':
            return 'Đang nhập lô';
        case 'IN_STOCK':
            return 'Trong kho';
        case 'EXPIRED':
            return 'Hết hạn';
        default:
            return status || '—';
    }
};

export const getCancelFlowTicketStatusFilterValue = (status?: string | null): string => {
    return normalizeTicketStatus(status);
};

export const matchesCancelFlowStatusFilter = (ticketStatus: string | null | undefined, filter: string): boolean => {
    if (filter === 'ALL') {
        return true;
    }
    // Legacy filter value from when SOLD_OUT was labeled INVALID in the cancel flow.
    if (filter === CANCEL_FLOW_INVALID_STATUS) {
        return normalizeTicketStatus(ticketStatus) === 'SOLD_OUT';
    }
    return normalizeTicketStatus(ticketStatus) === filter;
};

export type CancelFlowStatusFilterOption = {
    value: string;
    label: string;
};

const CANCEL_FLOW_TICKET_STATUS_FILTER_ORDER: Array<{ value: string; label: string }> = [
    { value: 'IMPORTING', label: 'Đang nhập lô' },
    { value: 'IN_STOCK', label: 'Trong kho' },
    { value: 'SOLD_OUT', label: 'Hết hàng (SOLD_OUT)' },
    { value: 'EXPIRED', label: 'Hết hạn' },
];

const CANCEL_FLOW_SERIAL_STATUS_FILTER_ORDER: Array<{ value: string; label: string }> = [
    { value: 'SOLD', label: 'Đã bán (sê-ri)' },
    { value: 'RESERVED', label: 'Đang giữ chỗ (sê-ri)' },
    { value: 'DAMAGED', label: 'Hư hỏng (sê-ri)' },
    { value: 'LOST', label: 'Thất lạc (sê-ri)' },
];

/** Lọc trạng thái trong luồng hủy vé — chỉ trạng thái vé/sê-ri thực sự có trong dữ liệu hiện tại. */
export const buildCancelFlowStatusFilterOptions = (
    tickets: Array<{ status?: string | null; serials?: Array<{ status?: string | null }> }>
): CancelFlowStatusFilterOption[] => {
    const ticketFilterValues = new Set<string>();
    const serialStatuses = new Set<string>();

    tickets.forEach((ticket) => {
        const filterValue = getCancelFlowTicketStatusFilterValue(ticket.status);
        if (filterValue) {
            ticketFilterValues.add(filterValue);
        }

        (ticket.serials || []).forEach((serial) => {
            const normalized = normalizeTicketStatus(serial.status);
            if (normalized) {
                serialStatuses.add(normalized);
            }
        });
    });

    const options: CancelFlowStatusFilterOption[] = [];

    CANCEL_FLOW_TICKET_STATUS_FILTER_ORDER.forEach((option) => {
        if (ticketFilterValues.has(option.value)) {
            options.push(option);
        }
    });

    CANCEL_FLOW_SERIAL_STATUS_FILTER_ORDER.forEach((option) => {
        if (serialStatuses.has(option.value)) {
            options.push(option);
        }
    });

    return options;
};
