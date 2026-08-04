import type { ReturnBatchLineStatus, ReturnBatchStatus } from '../types/returnBatch.type';

export const RETURN_BATCH_STATUS_LABELS: Record<ReturnBatchStatus, string> = {
    PENDING_INSPECTION: 'Chờ kiểm tra vé',
    INSPECTING: 'Đang kiểm tra vé',
    PENDING_HANDOVER: 'Chờ bàn giao nhà cung cấp',
    HANDED_OVER: 'Đã bàn giao nhà cung cấp',
    CANCELLED: 'Đã hủy',
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
        case 'PENDING_INSPECTION':
            return 'admin-status-badge--pending';
        case 'INSPECTING':
            return 'admin-status-badge--active';
        case 'PENDING_HANDOVER':
            return 'admin-status-badge--active';
        case 'HANDED_OVER':
            return 'admin-status-badge--success';
        case 'CANCELLED':
            return 'admin-status-badge--inactive';
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
): 'default' | 'warning' | 'info' | 'success' | 'error' => {
    if (status === 'PENDING_INSPECTION') return 'warning';
    if (status === 'INSPECTING') return 'info';
    if (status === 'PENDING_HANDOVER') return 'warning';
    if (status === 'HANDED_OVER') return 'success';
    if (status === 'CANCELLED') return 'error';
    return 'default';
};

/** Show the primary "Inspect Tickets" CTA (starts inspection). */
export const canStartInspection = (status?: ReturnBatchStatus | string | null) =>
    status === 'PENDING_INSPECTION';

/** Re-open inspection dialog while work is in progress. */
export const canContinueInspection = (status?: ReturnBatchStatus | string | null) =>
    status === 'INSPECTING';

export const isOpenForInspection = (status?: ReturnBatchStatus | null) =>
    canStartInspection(status) || canContinueInspection(status);

/** View-only access to the inspection screen after cancel / expiry. */
export const canViewInspection = (status?: ReturnBatchStatus | string | null) =>
    isOpenForInspection(status as ReturnBatchStatus) || status === 'CANCELLED';

export const canAttachSerials = (
    batchStatus?: ReturnBatchStatus | null,
    lineStatus?: ReturnBatchLineStatus | null
) => isOpenForInspection(batchStatus) && lineStatus === 'PENDING';

export const formatMinutesUntilCutoff = (minutes?: number | null): string => {
    if (minutes == null || Number.isNaN(minutes)) return '—';
    if (minutes <= 0) return '0 phút';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h <= 0) return `${m} phút`;
    if (m === 0) return `${h} giờ`;
    return `${h} giờ ${m} phút`;
};
