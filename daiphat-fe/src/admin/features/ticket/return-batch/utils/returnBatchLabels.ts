import type { ReturnBatchLineStatus, ReturnBatchStatus } from '../types/returnBatch.type';

export const RETURN_BATCH_STATUS_LABELS: Record<ReturnBatchStatus, string> = {
    PENDING_INSPECTION: 'Chờ kiểm tra vé',
    INSPECTING: 'Đang kiểm tra vé',
    PENDING_HANDOVER: 'Chờ bàn giao nhà cung cấp',
    HANDED_OVER: 'Đã bàn giao nhà cung cấp',
    CANCELLED: 'Đã hủy',
};

export const RETURN_BATCH_LINE_STATUS_LABELS: Record<ReturnBatchLineStatus, string> = {
    PENDING: 'Chờ kiểm tra',
    INSPECTING: 'Đang kiểm tra',
    INSPECTED: 'Đã kiểm tra',
    CANCELLED: 'Đã hủy',
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
        case 'INSPECTING':
            return 'admin-status-badge--active';
        case 'INSPECTED':
            return 'admin-status-badge--success';
        case 'CANCELLED':
            return 'admin-status-badge--inactive';
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

export interface ReturnBatchStatusColorTheme {
    main: string;
    bg: string;
    border: string;
    text: string;
    label: string;
}

/**
 * Returns color theme matching the tone of KPI cards:
 * - PENDING_INSPECTION: amber (#f59e0b) - Chờ kiểm tra vé
 * - INSPECTING: blue/cyan (#0284c7) - Đang kiểm tra
 * - PENDING_HANDOVER: orange (#ea580c) - Chờ bàn giao
 * - HANDED_OVER: green (#22c55e) - Đã bàn giao
 * - CANCELLED: red (#ef4444) - Đã hủy
 */
export const getReturnBatchStatusColorTheme = (
    status?: ReturnBatchStatus | null
): ReturnBatchStatusColorTheme => {
    switch (status) {
        case 'PENDING_INSPECTION':
            return {
                main: '#f59e0b',
                bg: '#fef3c7',
                border: '#fde68a',
                text: '#b45309',
                label: 'Chờ kiểm tra vé',
            };
        case 'INSPECTING':
            return {
                main: '#0284c7',
                bg: '#e0f2fe',
                border: '#bae6fd',
                text: '#0369a1',
                label: 'Đang kiểm tra vé',
            };
        case 'PENDING_HANDOVER':
            return {
                main: '#ea580c',
                bg: '#ffedd5',
                border: '#fed7aa',
                text: '#c2410c',
                label: 'Chờ bàn giao NCC',
            };
        case 'HANDED_OVER':
            return {
                main: '#22c55e',
                bg: '#dcfce7',
                border: '#86efac',
                text: '#15803d',
                label: 'Đã bàn giao',
            };
        case 'CANCELLED':
            return {
                main: '#ef4444',
                bg: '#fee2e2',
                border: '#fca5a5',
                text: '#b91c1c',
                label: 'Đã hủy',
            };
        default:
            return {
                main: '#94a3b8',
                bg: '#f1f5f9',
                border: '#e2e8f0',
                text: '#475569',
                label: '—',
            };
    }
};

export const getReturnBatchLineStatusColorTheme = (
    status?: ReturnBatchLineStatus | null
): ReturnBatchStatusColorTheme => {
    switch (status) {
        case 'PENDING':
            return {
                main: '#f59e0b',
                bg: '#fef3c7',
                border: '#fde68a',
                text: '#b45309',
                label: 'Chờ kiểm tra',
            };
        case 'INSPECTING':
            return {
                main: '#0284c7',
                bg: '#e0f2fe',
                border: '#bae6fd',
                text: '#0369a1',
                label: 'Đang kiểm tra',
            };
        case 'INSPECTED':
            return {
                main: '#22c55e',
                bg: '#dcfce7',
                border: '#86efac',
                text: '#15803d',
                label: 'Đã kiểm tra',
            };
        case 'CANCELLED':
            return {
                main: '#ef4444',
                bg: '#fee2e2',
                border: '#fca5a5',
                text: '#b91c1c',
                label: 'Đã hủy',
            };
        default:
            return {
                main: '#94a3b8',
                bg: '#f1f5f9',
                border: '#e2e8f0',
                text: '#475569',
                label: '—',
            };
    }
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
) => isOpenForInspection(batchStatus) && (lineStatus === 'PENDING' || lineStatus === 'INSPECTING');

export const formatMinutesUntilCutoff = (minutes?: number | null): string => {
    if (minutes == null || Number.isNaN(minutes)) return '—';
    if (minutes <= 0) return '0 phút';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h <= 0) return `${m} phút`;
    if (m === 0) return `${h} giờ`;
    return `${h} giờ ${m} phút`;
};

export const RETURN_CUTOFF_EXCEEDED_REASON = 'Return cutoff time exceeded.';

/** Human-readable cancellation reason shown in return batch detail */
export const formatReturnBatchCancelReason = (cancelReason?: string | null) => {
    if (!cancelReason?.trim()) return undefined;
    if (
        cancelReason === RETURN_CUTOFF_EXCEEDED_REASON ||
        cancelReason.toLowerCase().includes('return cutoff time exceeded')
    ) {
        return 'Tự động hủy do đã quá hạn chót trả vé nhà cung cấp.';
    }
    return cancelReason;
};

/** User-facing alert message when a return batch is cancelled */
export const getReturnBatchCancelledAlertMessage = (
    cancelReason?: string | null
) => {
    const isCutoff =
        cancelReason === RETURN_CUTOFF_EXCEEDED_REASON ||
        Boolean(cancelReason?.toLowerCase().includes('return cutoff time exceeded'));

    if (isCutoff) {
        return {
            title: 'Phiếu trả vé đã tự động bị hủy do quá hạn chót',
            description:
                'Phiếu trả vé đã bị hủy do đã quá hạn chót trả vé cho nhà cung cấp (sau giờ cắt chốt). Toàn bộ vé trong phiếu này không thể tiếp tục thực hiện kiểm đếm hoặc bàn giao.',
        };
    }

    return {
        title: 'Phiếu trả vé đã bị hủy',
        description:
            cancelReason ||
            'Phiếu trả vé đã bị hủy. Không thể tiếp tục kiểm tra hoặc bàn giao vé cho phiếu này.',
    };
};

