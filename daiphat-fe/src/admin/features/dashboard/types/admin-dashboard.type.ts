import type { ApiResponse } from '@/types/api.type';

/** Read-only KPI projection returned by the admin operational dashboard. */
export interface AdminDashboardKpis {
    /** Tickets sold for the selected business date. */
    soldTicketQuantity: number;
    /** Ticket sales revenue for the selected business date. */
    ticketSalesRevenue: number;
    /** Open reconciliation discrepancy; this is not revenue. */
    reconciliationAmount: number;
    /**
     * Number of currently open operational action items.
     * Retained for API compatibility; not displayed on the Ecommerce dashboard.
     */
    actionItemCount: number;
}

/** Order status distribution for the selected business date. */
export interface AdminDashboardOrderStatus {
    status: string;
    label: string;
    count: number;
}

/** Ticket-serial status distribution for the selected business date. */
export interface AdminDashboardSerialStatus {
    status: string;
    label: string;
    count: number;
}

/** Sold serial quantity grouped by station for the selected business date. */
export interface AdminDashboardTopStation {
    stationId: string;
    stationName: string;
    soldQuantity: number;
}

/** Recent order projection for the selected business date. */
export interface AdminDashboardRecentOrder {
    id: string;
    orderCode: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
}

/** Daily completed-order revenue for the selected business date and the preceding 13 days. */
export interface AdminDashboardDailyRevenuePoint {
    date: string;
    amount: number;
}

/** Operational work item for the selected business date. */
export interface AdminDashboardActionItem {
    type: string;
    priority: string;
    quantity: number;
    deadlineAt: string | null;
    target?: {
        module?: string | null;
        status?: string | null;
        entityId?: string | null;
    } | null;
}

/** Inventory risk projection grouped by lottery station and draw date. */
export interface AdminDashboardInventoryRisk {
    stationId: string;
    stationName: string;
    drawDate: string;
    sellableQuantity: number;
    vendorHeldQuantity: number;
    risk: string;
}

/** Supplier reconciliation discrepancy that still needs attention. */
export interface AdminDashboardReconciliation {
    subjectType: string;
    subjectName: string;
    settlementId: string | null;
    periodFrom: string | null;
    periodTo: string | null;
    discrepancyAmount: number;
    status: string;
}

export type DashboardKpisResponse = ApiResponse<AdminDashboardKpis>;
