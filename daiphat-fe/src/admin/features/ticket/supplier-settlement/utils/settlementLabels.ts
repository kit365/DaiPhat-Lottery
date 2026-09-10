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
        return 'Trễ hạn thanh toán';
    }
    if (status === 'COMPLETED' || status === 'CLOSED') {
        return 'Đã thanh toán';
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
    if (status === 'COMPLETED' || status === 'CLOSED') {
        return 'admin-status-badge--success';
    }
    return '';
};

export const getReconciliationPhaseBadgeModifier = (
    phase?: SupplierSettlementReconciliationPhase | null
): string => {
    switch (phase) {
        case 'MATCHING':
            return 'admin-status-badge--active';
        case 'DISCREPANCY_DETECTED':
        case 'RESOLVING_IMPORT_DISCREPANCY':
        case 'RESOLVING_RETURN_DISCREPANCY':
        case 'READY_FOR_RECALCULATION':
            return 'admin-status-badge--pending';
        case 'RECALCULATED':
        case 'COMPLETED':
            return 'admin-status-badge--success';
        case 'PAYMENT_DISCREPANCY':
            return 'admin-status-badge--inactive';
        default:
            return 'admin-status-badge--draft';
    }
};

export const getMatchBadgeModifier = (ok: boolean): string =>
    ok ? 'admin-status-badge--success' : 'admin-status-badge--pending';

export const getDiscrepancyItemBadgeModifier = (
    resolved: boolean,
    direction?: SupplierSettlementDiscrepancyDirection | null
): string => {
    if (resolved) {
        return 'admin-status-badge--success';
    }
    if (direction === 'NEGATIVE') {
        return 'admin-status-badge--pending';
    }
    return 'admin-status-badge--inactive';
};

export const getQtyDiffBadgeModifier = (
    matching: boolean,
    positiveDiff: boolean,
    empty?: boolean
): string => {
    if (empty) {
        return 'admin-status-badge--draft';
    }
    if (matching) {
        return 'admin-status-badge--success';
    }
    if (positiveDiff) {
        return 'admin-status-badge--inactive';
    }
    return 'admin-status-badge--pending';
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

export const SUPPLIER_SETTLEMENT_DISCREPANCY_TYPES: SupplierSettlementDiscrepancyType[] = [
    'IMPORT_UNIT_PRICE',
    'IMPORT_QUANTITY',
    'RETURN_QUANTITY',
];

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

/** Live discrepancy items while typing matching actuals (same enum as BE). */
export const buildLiveDiscrepancyItems = (params: {
    unitPriceDiff: number;
    importQtyDiff: number;
    returnQtyDiff: number;
    detectUnitPrice: boolean;
    detectImportQty: boolean;
    detectReturnQty: boolean;
}): SettlementDiscrepancyItem[] => {
    const items: SettlementDiscrepancyItem[] = [];
    if (params.detectUnitPrice) {
        const item = signedItem('IMPORT_UNIT_PRICE', params.unitPriceDiff, 'VND');
        if (item) items.push(item);
    }
    if (params.detectImportQty) {
        const item = signedItem('IMPORT_QUANTITY', params.importQtyDiff, 'TICKET');
        if (item) items.push(item);
    }
    if (params.detectReturnQty) {
        const item = signedItem('RETURN_QUANTITY', params.returnQtyDiff, 'TICKET');
        if (item) items.push(item);
    }
    return items;
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

/** Live imported qty used as matching baseline — must match backend `countImportedTicketsBySettlementId` (non-VOIDED serials). */
export const resolveLiveSystemImportQuantity = (
    settlement?: { systemImportQuantity?: number | null } | null,
    importBatches?: Array<{
        totalImportedQuantity?: number | null;
        totalDeclareQuantity?: number | null;
    }> | null,
    inventoryByStation?: Array<{ importedQuantity?: number | null }> | null
): number => {
    const snapshot = Number(settlement?.systemImportQuantity ?? 0) || 0;
    const fromInventory = (inventoryByStation || []).reduce(
        (sum, row) => sum + (Number(row.importedQuantity) || 0),
        0
    );
    const fromBatches = (importBatches || []).reduce((sum, batch) => {
        const imported = Number(batch.totalImportedQuantity);
        return sum + (Number.isFinite(imported) && imported > 0 ? imported : 0);
    }, 0);
    // Inventory already excludes VOIDED serials, same as confirmMatching.
    // Declared qty and a stale snapshot can still be 1.500 after 12 tickets were voided.
    if (fromInventory > 0) {
        return fromInventory;
    }
    if (fromBatches > 0) {
        return fromBatches;
    }
    return snapshot;
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

/** True when locked and no active return-batch has been handed over yet (status-only). */
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

export type ReturnOverdueContext = {
    isReturnExpired?: boolean | null;
    periodTo?: string | null;
    periodFrom?: string | null;
    supplierReturnCutOffTime?: string | null;
};

/**
 * Past return cutoff AND at least one active return-batch is not yet HANDED_OVER/RECEIVED.
 * Remaining inventory cannot be returned; agent bears the cost.
 */
export const isReturnMatchingOverdueUnhanded = (
    settlement?: ReturnOverdueContext | null,
    returnBatches?: Array<{
        status?: string | null;
        drawDate?: string | null;
        returnCutOffTime?: string | null;
        returnCutOffAt?: string | null;
        inspectionExpired?: boolean | null;
    }> | null
): boolean => {
    if (!isReturnReconciliationLocked(returnBatches)) {
        return false;
    }
    if (settlement?.isReturnExpired) {
        return true;
    }
    const activeBatches = (returnBatches || []).filter(
        (batch) => batch.status && batch.status !== 'CANCELLED'
    );
    const fallbackDate = settlement?.periodTo || settlement?.periodFrom || null;
    if (activeBatches.length === 0) {
        return isReturnBatchOverdue(null, settlement?.supplierReturnCutOffTime, fallbackDate);
    }
    return activeBatches.some(
        (batch) =>
            !isReturnBatchHandedOver(batch.status)
            && isReturnBatchOverdue(batch, settlement?.supplierReturnCutOffTime, fallbackDate)
    );
};

export type ReturnMatchingLockBlocker = {
    batchId?: number | null;
    batchCode: string;
    status: string;
    message: string;
};

export type ReturnMatchingLockDetails = {
    /** Non-cancelled return batches still waiting (inspection / handover). */
    locked: boolean;
    /**
     * Block return matching inputs / discrepancy actions:
     * pending return-batch handling, all CANCELLED, or return period expired.
     */
    inputsLocked: boolean;
    overdue: boolean;
    /** Non-cancelled return batches linked to the settlement. */
    hasActiveReturnBatches: boolean;
    /** Any linked return batch, including CANCELLED. */
    hasAnyReturnBatches: boolean;
    /** Linked batches exist but every one is CANCELLED. */
    allCancelled: boolean;
    cancelledBatchCodes: string[];
    blockers: ReturnMatchingLockBlocker[];
    /** Single summary line for tooltips / short alerts. */
    summaryMessage: string;
    /** Info banner when there is nothing active to reconcile on the return side. */
    emptyStateMessage: string | null;
};

const returnBatchDisplayCode = (batch: {
    id?: number | null;
    batchCode?: string | null;
}): string => batch.batchCode?.trim() || (batch.id != null ? `#${batch.id}` : 'phiếu trả');

/** Status-specific lock copy for a single non-handed-over return batch. */
export const getReturnBatchLockMessage = (
    status?: string | null,
    batchCode?: string
): string => {
    const code = batchCode || 'phiếu trả';
    switch (status) {
        case 'PENDING_INSPECTION':
            return `Phiếu ${code} đang chờ kiểm tra vé — chưa thể đối chiếu / xử lý chênh lệch trả.`;
        case 'INSPECTING':
            return `Phiếu ${code} đang kiểm tra vé — hoàn tất kiểm tra rồi bàn giao trước khi tiếp tục.`;
        case 'PENDING_HANDOVER':
            return `Phiếu ${code} đã kiểm tra nhưng chưa bàn giao NCC — hoàn tất bàn giao trước khi tiếp tục.`;
        default:
            return `Phiếu ${code} chưa hoàn tất bàn giao — chưa thể đối chiếu / xử lý chênh lệch trả.`;
    }
};

/**
 * Lock details for matching + discrepancy UI: per-batch blockers and overdue override copy.
 */
export const getReturnMatchingLockDetails = (
    returnBatches?: Array<{
        id?: number | null;
        batchCode?: string | null;
        status?: string | null;
        drawDate?: string | null;
        returnCutOffTime?: string | null;
        returnCutOffAt?: string | null;
        inspectionExpired?: boolean | null;
    }> | null,
    overdueContext?: ReturnOverdueContext | null,
    cutOffTimeDisplay?: string | null
): ReturnMatchingLockDetails => {
    const allBatches = (returnBatches || []).filter((batch) => Boolean(batch?.status));
    const cancelledBatches = allBatches.filter((batch) => batch.status === 'CANCELLED');
    const activeBatches = allBatches.filter((batch) => batch.status !== 'CANCELLED');
    const pendingBatches = activeBatches.filter((batch) => !isReturnBatchHandedOver(batch.status));
    const locked = pendingBatches.length > 0;
    const expired = Boolean(overdueContext?.isReturnExpired);
    const allCancelled = allBatches.length > 0 && activeBatches.length === 0;
    const inputsLocked = locked || allCancelled || expired;
    const overdue = locked
        ? isReturnMatchingOverdueUnhanded(overdueContext, returnBatches)
        : expired;
    const cancelledBatchCodes = cancelledBatches.map((batch) => returnBatchDisplayCode(batch));

    const blockers: ReturnMatchingLockBlocker[] = pendingBatches.map((batch) => {
        const batchCode = returnBatchDisplayCode(batch);
        const status = String(batch.status || '');
        return {
            batchId: batch.id,
            batchCode,
            status,
            message: getReturnBatchLockMessage(status, batchCode),
        };
    });

    let summaryMessage = '';
    if (overdue || expired) {
        summaryMessage = cutOffTimeDisplay
            ? `Đã quá giờ trả vé (chốt ${cutOffTimeDisplay}). Các vé còn tồn kho không được trả và đại lý phải chịu khoản này.`
            : 'Đã quá giờ trả vé. Các vé còn tồn kho không được trả và đại lý phải chịu khoản này.';
    } else if (allCancelled) {
        summaryMessage =
            cancelledBatchCodes.length > 0
                ? `Các phiếu trả đã hủy (${cancelledBatchCodes.join(', ')}) — không thể nhập điều chỉnh SL trả.`
                : 'Các phiếu trả đã hủy — không thể nhập điều chỉnh SL trả.';
    } else if (blockers.length === 1) {
        summaryMessage = blockers[0].message;
    } else if (blockers.length > 1) {
        summaryMessage = `Có ${blockers.length} phiếu trả chưa sẵn sàng để đối chiếu / xử lý chênh lệch trả.`;
    }

    let emptyStateMessage: string | null = null;
    if (!locked && activeBatches.length === 0) {
        if (allCancelled) {
            const codes = cancelledBatchCodes.join(', ');
            emptyStateMessage =
                `Có ${cancelledBatches.length} phiếu trả trong kỳ nhưng tất cả đã hủy`
                + (codes ? ` (${codes})` : '')
                + (expired || overdue
                    ? ' do quá hạn trả.'
                    : '.')
                + ' SL trả hệ thống = 0 (chỉ tính phiếu đã bàn giao / đã nhận). Ô nhập SL trả bị khóa — không thể điều chỉnh.';
        } else if (!expired) {
            emptyStateMessage =
                'Không có phiếu trả gắn với kỳ đối soát này — SL trả hệ thống = 0. Có thể nhập thực tế SL trả nếu cần đối chiếu.';
        }
    }

    return {
        locked,
        inputsLocked,
        overdue,
        hasActiveReturnBatches: activeBatches.length > 0,
        hasAnyReturnBatches: allBatches.length > 0,
        allCancelled,
        cancelledBatchCodes,
        blockers,
        summaryMessage,
        emptyStateMessage,
    };
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
        // difference = actual − system: dương = HT thiếu ghi nhận nhập; âm = HT thừa ghi nhận nhập
        return item.direction === 'NEGATIVE'
            ? `Thừa nhập · âm (${signed} vé)`
            : `Thiếu nhập · dương (${signed} vé)`;
    }
    if (item.type === 'RETURN_QUANTITY') {
        // difference = actual − system: dương = thừa trả; âm = thiếu trả
        return item.direction === 'NEGATIVE'
            ? `Thiếu trả · âm (${signed} vé)`
            : `Thừa trả · dương (${signed} vé)`;
    }
    return item.direction === 'NEGATIVE'
        ? `Giảm giá · âm (${signed} VNĐ/vé)`
        : `Tăng giá · dương (${signed} VNĐ/vé)`;
};
