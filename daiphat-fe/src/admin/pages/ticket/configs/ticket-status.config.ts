export type TicketStatusOption = {
    value: string;
    label: string;
};

/** Trạng thái vé số — khớp enum LotteryTicketStatus trên backend */
export const TICKET_STATUS_OPTIONS: TicketStatusOption[] = [
    { value: "IN_STOCK", label: "Trong kho" },
    { value: "SOLD_OUT", label: "Hết hàng" },
    { value: "EXPIRED", label: "Hết hạn" },
    { value: "RESERVED", label: "Đang giữ chỗ" },
    { value: "SOLD", label: "Đã bán" },
    { value: "PROXY_HOLDING", label: "Đại lý giữ hộ" },
    { value: "PENDING_RETURN", label: "Chờ trả nhà đài" },
    { value: "RETURNED", label: "Đã trả nhà đài" },
    { value: "INTERNAL_FAULT", label: "Nhân viên làm hỏng" },
    { value: "ISSUER_FAULT", label: "Lỗi in ấn từ nhà cung cấp" },
];

/**
 * Luồng chuyển trạng thái hợp lệ — khớp LotteryTicketModel (reserve, sellOnline, …).
 * Key = trạng thái hiện tại, value = các trạng thái có thể chọn.
 */
export const TICKET_STATUS_TRANSITIONS: Record<string, string[]> = {
    IN_STOCK: ["RESERVED", "SOLD", "PROXY_HOLDING", "INTERNAL_FAULT", "ISSUER_FAULT"],
    SOLD_OUT: ["SOLD", "PROXY_HOLDING", "INTERNAL_FAULT", "ISSUER_FAULT"],
    RESERVED: ["SOLD", "INTERNAL_FAULT", "ISSUER_FAULT"],
    SOLD: ["PENDING_RETURN"],
    PROXY_HOLDING: ["PENDING_RETURN", "INTERNAL_FAULT", "ISSUER_FAULT"],
    PENDING_RETURN: ["RETURNED"],
};

export const normalizeTicketStatus = (status?: string | null): string => {
    if (!status) return "";
    return status.toUpperCase().replace(/-/g, "_");
};

export const getTicketStatusLabel = (status?: string | null): string => {
    const normalized = normalizeTicketStatus(status);
    return TICKET_STATUS_OPTIONS.find((opt) => opt.value === normalized)?.label || status || "";
};

/** Trạng thái hiện tại + các trạng thái được phép chọn trên form sửa */
export const getAllowedTicketStatusTransitions = (currentStatus?: string | null): string[] => {
    const normalized = normalizeTicketStatus(currentStatus);
    if (!normalized) return [];
    const nextStatuses = TICKET_STATUS_TRANSITIONS[normalized] || [];
    return [normalized, ...nextStatuses];
};

export const canTransitionTicketStatus = (
    fromStatus?: string | null,
    toStatus?: string | null,
): boolean => {
    const from = normalizeTicketStatus(fromStatus);
    const to = normalizeTicketStatus(toStatus);
    if (!from || !to || from === to) return true;
    return getAllowedTicketStatusTransitions(from).includes(to);
};

export const getTicketStatusTransitionHint = (currentStatus?: string | null): string => {
    const normalized = normalizeTicketStatus(currentStatus);
    const nextStatuses = TICKET_STATUS_TRANSITIONS[normalized] || [];
    if (nextStatuses.length === 0) {
        return "Trạng thái hiện tại không thể chuyển thủ công.";
    }
    return `Có thể chuyển sang: ${nextStatuses.map(getTicketStatusLabel).join(", ")}.`;
};
