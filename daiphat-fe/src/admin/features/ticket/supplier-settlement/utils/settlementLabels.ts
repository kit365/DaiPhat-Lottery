import type {
    SettlementDiscrepancyItem,
    SupplierSettlement,
    SupplierSettlementDiscrepancyDirection,
    SupplierSettlementDiscrepancyType,
    SupplierSettlementReconciliationPhase,
    SupplierSettlementStatus,
} from '../types/supplierSettlement.type';

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
    if (status === 'RECEIPT_OVERDUE') {
        return 'Quá hạn biên lai';
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
    if (status === 'RECEIPT_OVERDUE') {
        return 'admin-status-badge--pending';
    }
    if (status === 'CLOSED') {
        return 'admin-status-badge--inactive';
    }
    return '';
};

export const getReconciliationPhaseLabel = (
    phase?: SupplierSettlementReconciliationPhase | null,
    phaseLabel?: string | null
): string => {
    if (phaseLabel) {
        return phaseLabel;
    }
    switch (phase) {
        case 'MATCHING':
            return 'Đối chiếu số liệu';
        case 'DISCREPANCY_DETECTED':
            return 'Phát hiện chênh lệch';
        case 'RESOLVING_IMPORT_DISCREPANCY':
            return 'Xử lý chênh lệch nhập';
        case 'RESOLVING_RETURN_DISCREPANCY':
            return 'Xử lý chênh lệch trả';
        case 'READY_FOR_RECALCULATION':
            return 'Sẵn sàng tính lại';
        case 'RECALCULATED':
            return 'Đã tính lại';
        case 'PAYMENT_DISCREPANCY':
            return 'Chênh lệch thanh toán';
        case 'COMPLETED':
            return 'Hoàn tất đối soát';
        default:
            return '—';
    }
};

export const getDiscrepancyTypeLabel = (
    type?: SupplierSettlementDiscrepancyType | null
): string => {
    switch (type) {
        case 'IMPORT_UNIT_PRICE':
            return 'Chênh lệch giá nhập mỗi vé';
        case 'IMPORT_QUANTITY':
            return 'Chênh lệch số lượng nhập';
        case 'RETURN_QUANTITY':
            return 'Chênh lệch số lượng trả';
        default:
            return '—';
    }
};

const signedItem = (
    type: SupplierSettlementDiscrepancyType,
    difference: number,
    unit: 'TICKET' | 'VND'
): SettlementDiscrepancyItem | null => {
    if (!difference) {
        return null;
    }
    const direction: SupplierSettlementDiscrepancyDirection = difference > 0 ? 'POSITIVE' : 'NEGATIVE';
    return { type, direction, difference, unit };
};

export const getDetectedDiscrepancyItems = (
    settlement?: SupplierSettlement | null
): SettlementDiscrepancyItem[] => {
    if (Array.isArray(settlement?.discrepancyItems) && settlement.discrepancyItems.length > 0) {
        return settlement.discrepancyItems.filter((item) => item?.type && item?.direction && Number(item.difference) !== 0);
    }
    const items: SettlementDiscrepancyItem[] = [];
    if (settlement?.actualTicketImportQuantity != null && settlement?.systemImportQuantity != null) {
        const item = signedItem(
            'IMPORT_QUANTITY',
            Number(settlement.actualTicketImportQuantity) - Number(settlement.systemImportQuantity),
            'TICKET'
        );
        if (item) items.push(item);
    }
    if (settlement?.actualReturnTicketQuantity != null && settlement?.systemReturnQuantity != null) {
        const item = signedItem(
            'RETURN_QUANTITY',
            Number(settlement.actualReturnTicketQuantity) - Number(settlement.systemReturnQuantity),
            'TICKET'
        );
        if (item) items.push(item);
    }
    const original = Number(settlement?.originalTicketUnitPrice ?? 0);
    const reconciled = Number(settlement?.reconciledTicketUnitPrice ?? settlement?.actualTicketPrice ?? original);
    if (original && reconciled) {
        const item = signedItem('IMPORT_UNIT_PRICE', reconciled - original, 'VND');
        if (item) items.push(item);
    }
    return items;
};

export const getDetectedDiscrepancyTypes = (
    settlement?: SupplierSettlement | null
): SupplierSettlementDiscrepancyType[] => {
    const fromItems = getDetectedDiscrepancyItems(settlement).map((item) => item.type);
    if (fromItems.length > 0) {
        return fromItems;
    }
    if (Array.isArray(settlement?.discrepancyTypes)) {
        return settlement.discrepancyTypes;
    }
    return [];
};

/** Return-batch has completed handover (Đã bàn giao) or a later terminal receive status. */
export const isReturnBatchHandedOver = (status?: string | null): boolean =>
    status === 'HANDED_OVER' || status === 'RECEIVED';

/**
 * Lock return matching until every non-cancelled related return-batch from BE
 * has reached Đã bàn giao (or later). No open return-batch → not locked.
 */
export const isReturnReconciliationLocked = (
    returnBatches?: Array<{ status?: string | null }> | null
): boolean => {
    const activeBatches = (returnBatches || []).filter(
        (batch) => batch.status && batch.status !== 'CANCELLED'
    );
    if (activeBatches.length === 0) {
        return false;
    }
    return activeBatches.some((batch) => !isReturnBatchHandedOver(batch.status));
};

export const getDiscrepancyItemLabel = (item: SettlementDiscrepancyItem): string => {
    const diff = Number(item.difference ?? 0);
    const signed = `${diff > 0 ? '+' : ''}${item.unit === 'VND' ? diff.toLocaleString('vi-VN') : diff.toLocaleString('vi-VN')}`;
    if (item.type === 'IMPORT_QUANTITY') {
        return item.direction === 'NEGATIVE'
            ? `Thiếu nhập · âm (${signed} vé)`
            : `Thừa nhập · dương (${signed} vé)`;
    }
    if (item.type === 'RETURN_QUANTITY') {
        return item.direction === 'NEGATIVE'
            ? `Thiếu trả · âm (${signed} vé)`
            : `Thừa trả · dương (${signed} vé)`;
    }
    return item.direction === 'NEGATIVE'
        ? `Giảm giá · âm (${signed} VNĐ/vé)`
        : `Tăng giá · dương (${signed} VNĐ/vé)`;
};
