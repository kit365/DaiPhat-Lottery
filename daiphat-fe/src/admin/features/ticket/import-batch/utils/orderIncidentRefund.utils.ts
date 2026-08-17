import { OrderDetailStatus, OrderReceiveType, OrderStatus, OrderType, ORDER_TYPE_LABELS } from '../../../../../types/order.type';
import { TransactionStatus } from '../../../../../types/transaction.type';

export type RefundIncidentDraftItem = {
    orderDetailId: number;
    serialId: number;
    serialNumber?: string;
    ticketNumbers?: string;
    reason: 'DAMAGED' | 'LOST';
    damagedReason?: string;
    damagedEvidenceUrl?: string;
};

export type OrderAllocatedSerialView = {
    id: number;
    serialNumber?: string;
    status?: string;
    statusDisplayName?: string;
    ticketImg?: string;
    ticketId?: number;
    isIncident: boolean;
    incidentReason?: 'DAMAGED' | 'LOST';
    damagedReason?: string;
    damagedEvidenceUrl?: string;
};

export type OrderDetailLineView = {
    orderDetailId: number;
    numbers?: string;
    stationName?: string;
    drawDate?: string;
    unitPrice: number;
    quantity: number;
    lineSubtotal: number;
    status?: string;
    ticketImg?: string;
    serials: OrderAllocatedSerialView[];
    incidentSerialCount: number;
};

export { ORDER_TYPE_LABELS };

export const ORDER_RECEIVE_TYPE_LABELS: Record<string, string> = {
    [OrderReceiveType.COUNTER_PICKUP]: 'Nhận tại quầy',
};

const collectAllocatedSerialIds = (detail: any): number[] => {
    const fromIds: number[] = Array.isArray(detail?.allocatedSerialIds)
        ? detail.allocatedSerialIds
              .map((id: any) => Number(id))
              .filter((id: number) => Number.isFinite(id) && id > 0)
        : [];
    if (fromIds.length > 0) {
        return Array.from(new Set(fromIds));
    }

    const fromSerials: number[] = Array.isArray(detail?.allocatedSerials)
        ? detail.allocatedSerials
              .map((row: any) => Number(row?.id ?? row?.lotteryTicketSerialId))
              .filter((id: number) => Number.isFinite(id) && id > 0)
        : [];
    if (fromSerials.length > 0) {
        return Array.from(new Set(fromSerials));
    }

    const primary =
        detail?.lotteryTicketSerialId ??
        detail?.lotteryTicketSerial?.id ??
        detail?.ticketSerial?.id;
    return primary != null && Number(primary) > 0 ? [Number(primary)] : [];
};

/** Strict match only: serial must belong to the detail's allocated set (or primary serial). */
export const resolveOrderDetailIdForIncident = (
    detail: any,
    serialId: number,
    _ticketNumbers?: string
): number | null => {
    const rawId = detail?.id;
    if (rawId == null || !Number.isFinite(serialId) || serialId <= 0) return null;

    const allocatedIds = collectAllocatedSerialIds(detail);
    if (allocatedIds.includes(serialId)) {
        return Number(rawId);
    }

    const replacedSerialId =
        detail?.replacedByTicketSerialId ??
        detail?.replacedByTicketSerial?.id ??
        detail?.replaceTicketSerial?.id;
    if (replacedSerialId != null && Number(replacedSerialId) === serialId) {
        return Number(rawId);
    }

    return null;
};

export const dedupeIncidentsByOrderDetailId = (
    incidents: RefundIncidentDraftItem[]
): RefundIncidentDraftItem[] => {
    const byDetailId = new Map<number, RefundIncidentDraftItem>();
    incidents.forEach((incident) => {
        if (incident.orderDetailId > 0 && !byDetailId.has(incident.orderDetailId)) {
            byDetailId.set(incident.orderDetailId, incident);
        }
    });
    return Array.from(byDetailId.values());
};

export const isOrderCancelled = (order: any): boolean => {
    const status = order?.status;
    return status === OrderStatus.CANCELLED || status === 'CANCELLED';
};

export const isOrderAwaitingPayment = (order: any): boolean => {
    if (isOrderCancelled(order)) {
        return false;
    }
    const status = order?.status;
    if (status === OrderStatus.PENDING_PAYMENT || status === 'PENDING_PAYMENT') {
        return true;
    }
    const transactions = order?.transactions || [];
    const hasCompletedPayment = transactions.some(
        (tx: any) =>
            tx?.type !== 'REFUND' &&
            (tx?.status === TransactionStatus.COMPLETED || !!tx?.paidAt)
    );
    return !hasCompletedPayment && transactions.some((tx: any) => tx?.status === TransactionStatus.PENDING);
};

/** All allocated serial IDs on ACTIVE order-details. */
export const collectActiveAllocatedSerialIds = (order: any): number[] => {
    const details = Array.isArray(order?.orderDetails) ? order.orderDetails : [];
    const ids: number[] = [];
    details.forEach((detail: any) => {
        if (!isActiveOrderDetail(detail?.status)) return;
        collectAllocatedSerialIds(detail).forEach((id) => ids.push(id));
    });
    return Array.from(new Set(ids));
};

/**
 * Full-order cancel is allowed only when every allocated serial on ACTIVE details
 * is included in the incident set (i.e. the reported serials are the last remaining ones).
 */
export const canFullyCancelOrderForIncidents = (
    order: any,
    incidents: Array<{ serialId?: number | null }>
): boolean => {
    if (!order || isOrderCancelled(order) || isOrderAwaitingPayment(order)) {
        return false;
    }
    const status = order?.status;
    if (
        status !== OrderStatus.PREPARING &&
        status !== 'PREPARING' &&
        status !== OrderStatus.PENDING_PICKUP &&
        status !== 'PENDING_PICKUP'
    ) {
        return false;
    }
    const activeSerialIds = collectActiveAllocatedSerialIds(order);
    if (activeSerialIds.length === 0) {
        return false;
    }
    const incidentSerialIds = new Set(
        (incidents || [])
            .map((inc) => Number(inc?.serialId))
            .filter((id) => Number.isFinite(id) && id > 0)
    );
    return activeSerialIds.every((id) => incidentSerialIds.has(id));
};

/** Paid PREPARING / PENDING_PICKUP with scoped incident amount → create ORDER_DETAIL refund (no order cancel). */
export const shouldCreatePartialRefundForIncidents = (
    order: any,
    incidents: RefundIncidentDraftItem[]
): boolean => {
    if (!order || isOrderCancelled(order) || isOrderAwaitingPayment(order)) {
        return false;
    }
    if (canFullyCancelOrderForIncidents(order, incidents)) {
        return false;
    }
    const status = order?.status;
    if (
        status !== OrderStatus.PREPARING &&
        status !== 'PREPARING' &&
        status !== OrderStatus.PENDING_PICKUP &&
        status !== 'PENDING_PICKUP'
    ) {
        return false;
    }
    return resolveIncidentOrderRefundAmount(order, incidents) > 0;
};

export const resolveOrderPaymentLabel = (order: any): string | null => {
    if (isOrderCancelled(order)) {
        return 'Đơn đã hủy — không hoàn thêm';
    }
    const transactions = order?.transactions || [];
    const payment = transactions.find(
        (tx: any) =>
            tx?.type !== 'REFUND' &&
            (tx?.status === TransactionStatus.COMPLETED || tx?.paidAt)
    );
    if (!payment) {
        return transactions.some((tx: any) => tx?.status === TransactionStatus.PENDING)
            ? 'Chờ thanh toán'
            : null;
    }
    return payment.paidAt ? 'Đã thanh toán' : 'Đã ghi nhận thanh toán';
};

const findAllocatedSerialRow = (detail: any, serialId: number): any | null => {
    const allocated = Array.isArray(detail?.allocatedSerials) ? detail.allocatedSerials : [];
    return (
        allocated.find(
            (row: any) => Number(row?.id ?? row?.lotteryTicketSerialId) === serialId
        ) || null
    );
};

/**
 * Build refund-scoped lines from incident serials that actually belong to an order-detail.
 * Does not invent rows from fuzzy ticket-number matching.
 */
export const buildOrderDetailLineViews = (
    order: any,
    incidents: RefundIncidentDraftItem[]
): OrderDetailLineView[] => {
    const details = Array.isArray(order?.orderDetails) ? order.orderDetails : [];
    const detailsById = new Map<number, any>();
    details.forEach((detail: any) => {
        const id = Number(detail?.id);
        if (Number.isFinite(id) && id > 0) {
            detailsById.set(id, detail);
        }
    });

    const grouped = new Map<number, RefundIncidentDraftItem[]>();
    incidents.forEach((incident) => {
        if (!incident.orderDetailId || incident.orderDetailId <= 0) return;
        if (!incident.serialId || incident.serialId <= 0) return;
        const detail = detailsById.get(incident.orderDetailId);
        if (!detail) return;
        // Keep only serials that still belong to this detail allocation.
        if (!collectAllocatedSerialIds(detail).includes(incident.serialId)) return;
        const list = grouped.get(incident.orderDetailId) || [];
        list.push(incident);
        grouped.set(incident.orderDetailId, list);
    });

    return Array.from(grouped.entries()).map(([orderDetailId, detailIncidents]) => {
        const detail = detailsById.get(orderDetailId);
        const unitPrice = Number(detail?.price ?? 0);
        const serials: OrderAllocatedSerialView[] = detailIncidents.map((incident) => {
            const row = findAllocatedSerialRow(detail, incident.serialId);
            return {
                id: incident.serialId,
                serialNumber: row?.serialNumber || incident.serialNumber,
                status: row?.status,
                statusDisplayName: row?.statusDisplayName,
                ticketImg: row?.ticketImg || detail?.ticketImg,
                ticketId:
                    row?.ticketId != null
                        ? Number(row.ticketId)
                        : detail?.lotteryTicketId != null
                          ? Number(detail.lotteryTicketId)
                          : undefined,
                isIncident: true,
                incidentReason: incident.reason,
                damagedReason: incident.damagedReason,
                damagedEvidenceUrl: incident.damagedEvidenceUrl,
            };
        });
        const quantity = serials.length;
        return {
            orderDetailId,
            numbers: detail?.numbers,
            stationName: detail?.stationName,
            drawDate: detail?.drawDate,
            unitPrice,
            quantity,
            lineSubtotal: unitPrice * quantity,
            status: detail?.status,
            ticketImg: detail?.ticketImg,
            serials,
            incidentSerialCount: quantity,
        };
    });
};

/**
 * Expected refund = unit price × serials that are both in the incident set and allocated on the order.
 * Unpaid / PENDING_PAYMENT / already CANCELLED → 0.
 */
export const resolveIncidentOrderRefundAmount = (
    order: any,
    incidents: RefundIncidentDraftItem[]
): number => {
    if (isOrderAwaitingPayment(order) || isOrderCancelled(order)) {
        return 0;
    }
    const scopedLines = buildOrderDetailLineViews(order, incidents);
    return sumIncidentSerialUnitPrices(scopedLines, true);
};

export const sumIncidentSerialUnitPrices = (
    lines: OrderDetailLineView[],
    onlyIncident = true
): number =>
    lines.reduce((sum, line) => {
        const serials = onlyIncident ? line.serials.filter((s) => s.isIncident) : line.serials;
        if (serials.length === 0) return sum;
        return sum + line.unitPrice * serials.length;
    }, 0);

export const countScopedRefundSerials = (lines: OrderDetailLineView[]): number =>
    lines.reduce((sum, line) => sum + line.serials.length, 0);

export const isActiveOrderDetail = (status?: string | null): boolean =>
    status === OrderDetailStatus.ACTIVE || status === 'ACTIVE';
