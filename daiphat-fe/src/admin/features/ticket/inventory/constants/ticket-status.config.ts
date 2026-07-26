export type TicketStatusOption = {
    value: string;
    label: string;
};

/** Trạng thái vé số (aggregate) — khớp enum LotteryTicketStatus trên backend */
export const TICKET_STATUS_OPTIONS: TicketStatusOption[] = [
    { value: "IMPORTING", label: "Đang nhập lô" },
    { value: "IN_STOCK", label: "Trong kho" },
    { value: "SOLD_OUT", label: "Hết hàng" },
    { value: "EXPIRED", label: "Hết hạn" },
];

/**
 * Không còn transition thủ công — cả 4 trạng thái đều do hệ thống suy ra
 * từ trạng thái sê-ri và thời điểm cắt sổ.
 */
export const TICKET_STATUS_TRANSITIONS: Record<string, string[]> = {};

export const normalizeTicketStatus = (status?: string | null): string => {
    if (!status) return "";
    return status.toUpperCase().replace(/-/g, "_");
};

export const getTicketStatusLabel = (status?: string | null): string => {
    const normalized = normalizeTicketStatus(status);
    return TICKET_STATUS_OPTIONS.find((opt) => opt.value === normalized)?.label || status || "";
};

/** Không còn transition thủ công — chỉ trả về chính trạng thái hiện tại */
export const getAllowedTicketStatusTransitions = (currentStatus?: string | null): string[] => {
    const normalized = normalizeTicketStatus(currentStatus);
    if (!normalized) return [];
    return [normalized];
};

export const canTransitionTicketStatus = (
    fromStatus?: string | null,
    toStatus?: string | null,
): boolean => {
    const from = normalizeTicketStatus(fromStatus);
    const to = normalizeTicketStatus(toStatus);
    if (!from || !to) return true;
    return from === to;
};

export const getTicketStatusTransitionHint = (_currentStatus?: string | null): string => {
    return "Trạng thái này do hệ thống tự tính từ sê-ri và thời điểm cắt sổ, không thể đổi thủ công.";
};
