import { normalizeTicketStatus } from './ticket-status.config';

export type SerialStatusFilterOption = {
    value: string;
    label: string;
};

export const SERIAL_STATUS_FILTER_OPTIONS: SerialStatusFilterOption[] = [
    { value: 'IN_STOCK', label: 'Trong kho' },
    { value: 'RESERVED', label: 'Đang giữ' },
    { value: 'PROXY_HOLDING', label: 'Giữ hộ' },
    { value: 'SOLD', label: 'Đã bán' },
    { value: 'EXPIRED', label: 'Hết hạn' },
    { value: 'ISSUER_FAULT', label: 'Lỗi nhà đài' },
    { value: 'INTERNAL_FAULT', label: 'Lỗi nội bộ' },
];

export const SERIAL_CONDITION_FILTER_OPTIONS: SerialStatusFilterOption[] = [
    { value: 'DAMAGED', label: 'Hư hỏng' },
    { value: 'LOST', label: 'Thất lạc' },
    { value: 'VOIDED', label: 'Đã hủy' },
];

/** Lọc trạng thái sê-ri — chỉ các giá trị thực sự có trong danh sách sê-ri hiện tại. */
export const buildSerialStatusFilterOptions = (
    serials: Array<{ status?: string | null; faultedBy?: string | null }>
): SerialStatusFilterOption[] => {
    const presentStatuses = new Set<string>();

    serials.forEach((serial) => {
        const normalized = normalizeTicketStatus(serial.status);
        if (normalized) {
            presentStatuses.add(normalized);
        }
        const faultedBy = normalizeTicketStatus(serial.faultedBy);
        if (faultedBy) {
            presentStatuses.add(faultedBy);
        }
    });

    return SERIAL_STATUS_FILTER_OPTIONS.filter((option) => presentStatuses.has(option.value));
};

/** Lọc tình trạng vật lý / hủy sê-ri — chỉ các giá trị thực sự có trong danh sách. */
export const buildSerialConditionFilterOptions = (
    serials: Array<{ ticketCondition?: string | null }>
): SerialStatusFilterOption[] => {
    const presentConditions = new Set<string>();

    serials.forEach((serial) => {
        const normalized = normalizeTicketStatus(serial.ticketCondition);
        if (normalized === 'DAMAGED' || normalized === 'LOST' || normalized === 'VOIDED') {
            presentConditions.add(normalized);
        }
    });

    return SERIAL_CONDITION_FILTER_OPTIONS.filter((option) => presentConditions.has(option.value));
};
