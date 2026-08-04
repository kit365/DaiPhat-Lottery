import type { SupplierSettlementStatus } from '../types/supplierSettlement.type';

export const getSupplierSettlementStatusLabel = (
    status?: SupplierSettlementStatus | null,
    statusLabel?: string | null
): string => {
    if (statusLabel) {
        return statusLabel;
    }
    if (status === 'OPEN') {
        return 'Đang mở';
    }
    if (status === 'CLOSED') {
        return 'Đã chốt';
    }
    return '—';
};

export const getSupplierSettlementStatusModifier = (
    status?: SupplierSettlementStatus | null
): string => {
    if (status === 'OPEN') {
        return 'admin-status-badge--active';
    }
    if (status === 'CLOSED') {
        return 'admin-status-badge--inactive';
    }
    return '';
};
