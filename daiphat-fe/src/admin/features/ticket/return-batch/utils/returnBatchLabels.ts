import type { ReturnBatchLineStatus, ReturnBatchStatus } from '../types/returnBatch.type';

export const RETURN_BATCH_STATUS_LABELS: Record<ReturnBatchStatus, string> = {
    PENDING: 'Đang chuẩn bị trả vé',
    RETURNED: 'Đã giao trả nhà cung cấp',
    CONFIRMED: 'Nhà cung cấp đã xác nhận',
};

export const RETURN_BATCH_LINE_STATUS_LABELS: Record<ReturnBatchLineStatus, string> = {
    PENDING: 'Đang đợi đi trả vé',
    SUCCESS: 'Trả vé thành công',
    REJECTED_BY_SUPPLIER: 'Nhà cung cấp từ chối',
    PULLED_FOR_SALE: 'Đã lấy bán trong lúc trả',
};

export const getReturnBatchStatusLabel = (
    status?: ReturnBatchStatus | null,
    statusLabel?: string | null
) => statusLabel || (status ? RETURN_BATCH_STATUS_LABELS[status] : '—');

export const getReturnBatchLineStatusLabel = (
    status?: ReturnBatchLineStatus | null,
    statusLabel?: string | null
) => statusLabel || (status ? RETURN_BATCH_LINE_STATUS_LABELS[status] : '—');

export const getReturnBatchStatusBadgeClass = (status?: ReturnBatchStatus | null) => {
    switch (status) {
        case 'PENDING':
            return 'admin-status-badge--pending';
        case 'RETURNED':
            return 'admin-status-badge--active';
        case 'CONFIRMED':
            return 'admin-status-badge--success';
        default:
            return 'admin-status-badge--draft';
    }
};

export const getReturnBatchLineStatusBadgeClass = (status?: ReturnBatchLineStatus | null) => {
    switch (status) {
        case 'PENDING':
            return 'admin-status-badge--pending';
        case 'SUCCESS':
            return 'admin-status-badge--success';
        case 'REJECTED_BY_SUPPLIER':
            return 'admin-status-badge--inactive';
        case 'PULLED_FOR_SALE':
            return 'admin-status-badge--active';
        default:
            return 'admin-status-badge--draft';
    }
};

export const getReturnBatchStatusChipColor = (
    status?: ReturnBatchStatus | null
): 'default' | 'warning' | 'info' | 'success' => {
    if (status === 'PENDING') return 'warning';
    if (status === 'RETURNED') return 'info';
    if (status === 'CONFIRMED') return 'success';
    return 'default';
};

export const isReturnBatchEditable = (status?: ReturnBatchStatus | null) =>
    status === 'PENDING' || status === 'RETURNED';

export const canAttachSerials = (batchStatus?: ReturnBatchStatus | null, lineStatus?: ReturnBatchLineStatus | null) =>
    batchStatus === 'PENDING' && lineStatus === 'PENDING';
