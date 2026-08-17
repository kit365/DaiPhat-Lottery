import dayjs from 'dayjs';
import type {
    SettlementDiscrepancyItem,
    SettlementStationPricing,
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

export const weightedStationNetUnitPrice = (
    rows?: SettlementStationPricing[] | null
): number | null => {
    if (!rows?.length) {
        return null;
    }
    const totalQty = rows.reduce((sum, row) => sum + Number(row.importedQuantity || 0), 0);
    const weighted = rows.reduce(
        (sum, row) => sum + Number(row.netUnitPrice || 0) * Number(row.importedQuantity || 0),
        0
    );
    if (totalQty <= 0 || weighted <= 0) {
        return null;
    }
    return weighted / totalQty;
};

export const getDetectedDiscrepancyItems = (
    settlement?: SupplierSettlement | null,
    options?: { afterCommissionUnitPrice?: number | null }
): SettlementDiscrepancyItem[] => {
    let items: SettlementDiscrepancyItem[] = [];
    if (Array.isArray(settlement?.discrepancyItems) && settlement.discrepancyItems.length > 0) {
        items = settlement.discrepancyItems.filter((item) => item?.type && item?.direction && Number(item.difference) !== 0);
    } else {
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
    }

    const afterHh = options?.afterCommissionUnitPrice;
    const reconciled = Number(settlement?.reconciledTicketUnitPrice ?? settlement?.actualTicketPrice ?? 0);
    if (afterHh != null && afterHh > 0 && reconciled > 0) {
        items = items.filter((item) => item.type !== 'IMPORT_UNIT_PRICE');
        const item = signedItem('IMPORT_UNIT_PRICE', reconciled - afterHh, 'VND');
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

/** Live returned qty: matching snapshot, or handed-over batch totals if the snapshot is stale. */
export const resolveLiveSystemReturnQuantity = (
    settlement?: { systemReturnQuantity?: number | null } | null,
    returnBatches?: Array<{ status?: string | null; totalQuantity?: number | null }> | null
): number => {
    const snapshot = settlement?.systemReturnQuantity ?? 0;
    const handedOver = (returnBatches || [])
        .filter((batch) => isReturnBatchHandedOver(batch.status))
        .reduce((sum, batch) => sum + (batch.totalQuantity ?? 0), 0);
    return Math.max(snapshot, handedOver);
};

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

/** True when locked and no active return-batch has been handed over yet. */
export const isReturnMatchingForfeitedToAgent = (
    returnBatches?: Array<{ status?: string | null }> | null
): boolean => {
    if (!isReturnReconciliationLocked(returnBatches)) {
        return false;
    }
    const activeBatches = (returnBatches || []).filter(
        (batch) => batch.status && batch.status !== 'CANCELLED'
    );
    return activeBatches.every((batch) => !isReturnBatchHandedOver(batch.status));
};

/** Normalize LocalTime JSON (string, [h, m], or { hour, minute }) to "HH:mm". */
export const toCutOffTimeString = (value?: unknown): string => {
    if (typeof value === 'string' && value.trim()) {
        const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
        if (match) {
            return `${match[1].padStart(2, '0')}:${match[2]}`;
        }
        return value.trim().slice(0, 5);
    }
    if (Array.isArray(value) && value.length >= 2) {
        const hour = String(Number(value[0]) || 0).padStart(2, '0');
        const minute = String(Number(value[1]) || 0).padStart(2, '0');
        return `${hour}:${minute}`;
    }
    if (value && typeof value === 'object') {
        const record = value as { hour?: unknown; minute?: unknown };
        if (record.hour != null || record.minute != null) {
            const hour = String(Number(record.hour) || 0).padStart(2, '0');
            const minute = String(Number(record.minute) || 0).padStart(2, '0');
            return `${hour}:${minute}`;
        }
    }
    return '14:30';
};

/**
 * Checks whether a return batch or settlement period is past the return cutoff deadline.
 */
export const isReturnBatchOverdue = (
    batch?: {
        drawDate?: string | null;
        returnCutOffTime?: string | null;
        returnCutOffAt?: string | null;
        inspectionExpired?: boolean | null;
    } | null,
    supplierCutOffTime?: string | null,
    fallbackDate?: string | null
): boolean => {
    if (!batch && !fallbackDate) return false;
    if (batch?.inspectionExpired === true) return true;
    if (typeof batch?.returnCutOffAt === 'string' && batch.returnCutOffAt) {
        return dayjs().isAfter(dayjs(batch.returnCutOffAt));
    }
    const targetDate = batch?.drawDate || fallbackDate;
    if (!targetDate) return false;
    const cleanTime = toCutOffTimeString(batch?.returnCutOffTime || supplierCutOffTime);
    const dateStr = dayjs(targetDate).format('YYYY-MM-DD');
    const cutoffDateTime = dayjs(`${dateStr}T${cleanTime}:00`);
    return dayjs().isAfter(cutoffDateTime);
};

/**
 * Formats the return cutoff time and date for clear user display.
 * E.g. "14:30 ngày 14/08/2026" or "14:30"
 */
export const getReturnBatchCutOffDisplay = (
    batch?: {
        drawDate?: string | null;
        returnCutOffTime?: string | null;
        returnCutOffAt?: string | null;
    } | null,
    supplierCutOffTime?: string | null,
    fallbackDate?: string | null
): string => {
    const cleanTime = toCutOffTimeString(batch?.returnCutOffTime || supplierCutOffTime);
    const targetDate = batch?.drawDate || fallbackDate;
    if (targetDate) {
        return `${cleanTime} ngày ${dayjs(targetDate).format('DD/MM/YYYY')}`;
    }
    return cleanTime;
};

export const getDiscrepancyItemLabel = (item: SettlementDiscrepancyItem): string => {
    const diff = Number(item.difference ?? 0);
    const signed = `${diff > 0 ? '+' : ''}${item.unit === 'VND' ? diff.toLocaleString('vi-VN') : diff.toLocaleString('vi-VN')}`;
    if (item.type === 'IMPORT_QUANTITY') {
        return item.direction === 'NEGATIVE'
            ? `Hệ thống ghi thừa nhập · âm (${signed} vé)`
            : `Hệ thống ghi thiếu nhập · dương (${signed} vé)`;
    }
    if (item.type === 'RETURN_QUANTITY') {
        return item.direction === 'NEGATIVE'
            ? `Hệ thống ghi thừa trả · âm (${signed} vé)`
            : `Hệ thống ghi thiếu trả · dương (${signed} vé)`;
    }
    return item.direction === 'NEGATIVE'
        ? `Giảm giá · âm (${signed} VNĐ/vé)`
        : `Tăng giá · dương (${signed} VNĐ/vé)`;
};
