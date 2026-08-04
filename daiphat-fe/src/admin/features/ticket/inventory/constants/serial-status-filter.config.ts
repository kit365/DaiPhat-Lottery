import { normalizeTicketStatus } from './ticket-status.config';

export type SerialStatusFilterOption = {
    value: string;
    label: string;
};

export const SERIAL_STATUS_FILTER_OPTIONS: SerialStatusFilterOption[] = [
    { value: 'IN_STOCK', label: 'Trong kho' },
    { value: 'RESERVED', label: 'Đang giữ' },
    { value: 'SOLD', label: 'Đã bán' },
    { value: 'EXPIRED', label: 'Hết hạn' },
    { value: 'DAMAGED', label: 'Hư hỏng' },
    { value: 'LOST', label: 'Thất lạc' },
    { value: 'ISSUER_FAULT', label: 'Lỗi nhà đài' },
    { value: 'INTERNAL_FAULT', label: 'Lỗi nội bộ' },
];

/** Lọc trạng thái sê-ri — chỉ các giá trị thực sự có trong danh sách sê-ri hiện tại. */
export const buildSerialStatusFilterOptions = (
    serials: Array<{ status?: string | null }>
): SerialStatusFilterOption[] => {
    const presentStatuses = new Set<string>();

    serials.forEach((serial) => {
        const normalized = normalizeTicketStatus(serial.status);
        if (normalized) {
            presentStatuses.add(normalized);
        }
    });

    return SERIAL_STATUS_FILTER_OPTIONS.filter((option) => presentStatuses.has(option.value));
};
