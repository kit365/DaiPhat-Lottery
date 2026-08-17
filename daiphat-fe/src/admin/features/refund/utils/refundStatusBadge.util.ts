import { REFUND_STATUS_LABELS, RefundRequestStatus } from '@/types/refund.type';

export function getRefundStatusLabel(status: RefundRequestStatus | string): string {
    return REFUND_STATUS_LABELS[status as RefundRequestStatus] || String(status);
}

export function getRefundStatusAdminBadgeModifier(status: RefundRequestStatus | string): string {
    switch (status) {
        case RefundRequestStatus.WAITING_FOR_INFO:
            return 'admin-status-badge--pending';
        case RefundRequestStatus.APPROVED:
        case RefundRequestStatus.READY_TO_PAY:
            return 'admin-status-badge--active';
        case RefundRequestStatus.PAID:
        case RefundRequestStatus.TRANSFERRED:
            return 'admin-status-badge--success';
        case RefundRequestStatus.MANUAL_RESOLUTION:
            return 'admin-status-badge--inactive';
        default:
            return 'admin-status-badge--draft';
    }
}
