import { apiApp } from '@/api';
import type { ApiResponse } from '@/types/api.type';
import type {
    AdminDashboardKpis,
    AdminDashboardDailyRevenuePoint,
    AdminDashboardOrderStatus,
    AdminDashboardSerialStatus,
    AdminDashboardTopStation,
    AdminDashboardRecentOrder,
    AdminDashboardActionItem,
    AdminDashboardInventoryRisk,
    AdminDashboardReconciliation,
} from '../types/admin-dashboard.type';

const BASE_URL = '/admin/dashboard';

const EMPTY_ADMIN_DASHBOARD_KPIS: AdminDashboardKpis = {
    soldTicketQuantity: 0,
    ticketSalesRevenue: 0,
    reconciliationAmount: 0,
    actionItemCount: 0,
};

const toFiniteNumber = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export interface AdminDashboardQuery {
    businessDate?: string;
}

export interface AdminDashboardRecentOrdersQuery extends AdminDashboardQuery {
    limit?: number;
}

export interface AdminDashboardTopStationsQuery extends AdminDashboardQuery {
    fromDate?: string;
    toDate?: string;
    limit?: number;
}

export interface AdminDashboardReconciliationsQuery extends AdminDashboardQuery {
    limit?: number;
}

export const getAdminDashboardKpis = async (
    query: AdminDashboardQuery = {},
): Promise<ApiResponse<AdminDashboardKpis>> => {
    try {
        const response = await apiApp.get<ApiResponse<AdminDashboardKpis>>(
            `${BASE_URL}/kpis`,
            {
                params: query,
                skipGlobalErrorToast: true,
            } as Parameters<typeof apiApp.get>[1] & { skipGlobalErrorToast?: boolean },
        );
        const payload = response.data;
        const raw = payload?.data;
        return {
            success: payload?.success === true || payload?.isSuccess === true,
            data: {
                soldTicketQuantity: toFiniteNumber(raw?.soldTicketQuantity),
                ticketSalesRevenue: toFiniteNumber(raw?.ticketSalesRevenue),
                reconciliationAmount: toFiniteNumber(raw?.reconciliationAmount),
                actionItemCount: toFiniteNumber(raw?.actionItemCount),
            },
        };
    } catch {
        // A KPI read failure must not surface as a dashboard-wide error or revive demo values.
        return {
            success: false,
            data: EMPTY_ADMIN_DASHBOARD_KPIS,
        };
    }
};

const EMPTY_ORDER_STATUS: AdminDashboardOrderStatus[] = [];
const EMPTY_SERIAL_STATUS: AdminDashboardSerialStatus[] = [];
const EMPTY_TOP_STATIONS: AdminDashboardTopStation[] = [];
const EMPTY_RECENT_ORDERS: AdminDashboardRecentOrder[] = [];
const EMPTY_DAILY_REVENUE: AdminDashboardDailyRevenuePoint[] = [];
const EMPTY_ACTION_ITEMS: AdminDashboardActionItem[] = [];
const EMPTY_INVENTORY_RISKS: AdminDashboardInventoryRisk[] = [];
const EMPTY_RECONCILIATIONS: AdminDashboardReconciliation[] = [];

const isSuccessful = (payload?: ApiResponse<unknown>) =>
    payload?.success === true || payload?.isSuccess === true;

const toStringValue = (value: unknown, fallback = '') =>
    value === null || value === undefined ? fallback : String(value);

export const getAdminDashboardOrderStatus = async (
    query: AdminDashboardQuery = {},
): Promise<ApiResponse<AdminDashboardOrderStatus[]>> => {
    try {
        const response = await apiApp.get<ApiResponse<AdminDashboardOrderStatus[]>>(
            `${BASE_URL}/order-status`,
            {
                params: query,
                skipGlobalErrorToast: true,
            } as Parameters<typeof apiApp.get>[1] & { skipGlobalErrorToast?: boolean },
        );
        const payload = response.data;
        const raw = Array.isArray(payload?.data) ? payload.data : EMPTY_ORDER_STATUS;
        return {
            success: isSuccessful(payload),
            data: raw.map((item) => ({
                status: toStringValue(item?.status),
                label: toStringValue(item?.label, toStringValue(item?.status, '—')),
                count: toFiniteNumber(item?.count),
            })),
        };
    } catch {
        return { success: false, data: EMPTY_ORDER_STATUS };
    }
};

export const getAdminDashboardSerialStatus = async (
    query: AdminDashboardQuery = {},
): Promise<ApiResponse<AdminDashboardSerialStatus[]>> => {
    try {
        const response = await apiApp.get<ApiResponse<AdminDashboardSerialStatus[]>>(
            `${BASE_URL}/serial-status`,
            {
                params: query,
                skipGlobalErrorToast: true,
            } as Parameters<typeof apiApp.get>[1] & { skipGlobalErrorToast?: boolean },
        );
        const payload = response.data;
        const raw = Array.isArray(payload?.data) ? payload.data : EMPTY_SERIAL_STATUS;
        return {
            success: isSuccessful(payload),
            data: raw.map((item) => ({
                status: toStringValue(item?.status),
                label: toStringValue(item?.label, toStringValue(item?.status, '—')),
                count: toFiniteNumber(item?.count),
            })),
        };
    } catch {
        return { success: false, data: EMPTY_SERIAL_STATUS };
    }
};

export const getAdminDashboardTopStations = async (
    query: AdminDashboardTopStationsQuery = {},
): Promise<ApiResponse<AdminDashboardTopStation[]>> => {
    try {
        const response = await apiApp.get<ApiResponse<AdminDashboardTopStation[]>>(
            `${BASE_URL}/top-stations`,
            {
                params: query,
                skipGlobalErrorToast: true,
            } as Parameters<typeof apiApp.get>[1] & { skipGlobalErrorToast?: boolean },
        );
        const payload = response.data;
        const raw = Array.isArray(payload?.data) ? payload.data : EMPTY_TOP_STATIONS;
        return {
            success: isSuccessful(payload),
            data: raw.map((item) => ({
                stationId: toStringValue(item?.stationId),
                stationName: toStringValue(item?.stationName, '—'),
                soldQuantity: toFiniteNumber(item?.soldQuantity),
            })),
        };
    } catch {
        return { success: false, data: EMPTY_TOP_STATIONS };
    }
};

export const getAdminDashboardRecentOrders = async (
    query: AdminDashboardRecentOrdersQuery = {},
): Promise<ApiResponse<AdminDashboardRecentOrder[]>> => {
    try {
        const response = await apiApp.get<ApiResponse<AdminDashboardRecentOrder[]>>(
            `${BASE_URL}/recent-orders`,
            {
                params: query,
                skipGlobalErrorToast: true,
            } as Parameters<typeof apiApp.get>[1] & { skipGlobalErrorToast?: boolean },
        );
        const payload = response.data;
        const raw = Array.isArray(payload?.data) ? payload.data : EMPTY_RECENT_ORDERS;
        return {
            success: isSuccessful(payload),
            data: raw.map((item) => ({
                id: toStringValue(item?.id),
                orderCode: toStringValue(item?.orderCode, '—'),
                customerName: toStringValue(item?.customerName, 'Khách lẻ'),
                total: toFiniteNumber(item?.total),
                status: toStringValue(item?.status, '—'),
                createdAt: toStringValue(item?.createdAt),
            })),
        };
    } catch {
        return { success: false, data: EMPTY_RECENT_ORDERS };
    }
};

export const getAdminDashboardDailyRevenue = async (
    query: AdminDashboardQuery = {},
): Promise<ApiResponse<AdminDashboardDailyRevenuePoint[]>> => {
    try {
        const response = await apiApp.get<ApiResponse<AdminDashboardDailyRevenuePoint[]>>(
            `${BASE_URL}/daily-revenue`,
            {
                params: query,
                skipGlobalErrorToast: true,
            } as Parameters<typeof apiApp.get>[1] & { skipGlobalErrorToast?: boolean },
        );
        const payload = response.data;
        const raw = Array.isArray(payload?.data) ? payload.data : EMPTY_DAILY_REVENUE;
        return {
            success: isSuccessful(payload),
            data: raw.map((point) => ({
                date: toStringValue(point?.date),
                amount: toFiniteNumber(point?.amount),
            })),
        };
    } catch {
        return { success: false, data: EMPTY_DAILY_REVENUE };
    }
};

export const getAdminDashboardActionItems = async (
    query: AdminDashboardQuery = {},
): Promise<ApiResponse<AdminDashboardActionItem[]>> => {
    try {
        const response = await apiApp.get<ApiResponse<AdminDashboardActionItem[]>>(
            `${BASE_URL}/action-items`,
            {
                params: query,
                skipGlobalErrorToast: true,
            } as Parameters<typeof apiApp.get>[1] & { skipGlobalErrorToast?: boolean },
        );
        const payload = response.data;
        const raw = Array.isArray(payload?.data) ? payload.data : EMPTY_ACTION_ITEMS;
        return {
            success: isSuccessful(payload),
            data: raw.map((item) => ({
                type: toStringValue(item?.type),
                priority: toStringValue(item?.priority),
                quantity: toFiniteNumber(item?.quantity),
                deadlineAt: item?.deadlineAt ? String(item.deadlineAt) : null,
                target: item?.target
                    ? {
                        module: item.target.module ?? null,
                        status: item.target.status ?? null,
                        entityId: item.target.entityId === null || item.target.entityId === undefined
                            ? null
                            : String(item.target.entityId),
                    }
                    : null,
            })),
        };
    } catch {
        return { success: false, data: EMPTY_ACTION_ITEMS };
    }
};

export const getAdminDashboardInventoryRisks = async (
    query: AdminDashboardQuery = {},
): Promise<ApiResponse<AdminDashboardInventoryRisk[]>> => {
    try {
        const response = await apiApp.get<ApiResponse<AdminDashboardInventoryRisk[]>>(
            `${BASE_URL}/inventory-risks`,
            {
                params: query,
                skipGlobalErrorToast: true,
            } as Parameters<typeof apiApp.get>[1] & { skipGlobalErrorToast?: boolean },
        );
        const payload = response.data;
        const raw = Array.isArray(payload?.data) ? payload.data : EMPTY_INVENTORY_RISKS;
        return {
            success: isSuccessful(payload),
            data: raw.map((item) => ({
                stationId: toStringValue(item?.stationId),
                stationName: toStringValue(item?.stationName, '—'),
                drawDate: toStringValue(item?.drawDate),
                sellableQuantity: toFiniteNumber(item?.sellableQuantity),
                vendorHeldQuantity: toFiniteNumber(item?.vendorHeldQuantity),
                risk: toStringValue(item?.risk),
            })),
        };
    } catch {
        return { success: false, data: EMPTY_INVENTORY_RISKS };
    }
};

export const getAdminDashboardReconciliations = async (
    query: AdminDashboardReconciliationsQuery = {},
): Promise<ApiResponse<AdminDashboardReconciliation[]>> => {
    try {
        const response = await apiApp.get<ApiResponse<AdminDashboardReconciliation[]>>(
            `${BASE_URL}/reconciliations`,
            {
                params: { ...query, limit: query.limit ?? 5 },
                skipGlobalErrorToast: true,
            } as Parameters<typeof apiApp.get>[1] & { skipGlobalErrorToast?: boolean },
        );
        const payload = response.data;
        const raw = Array.isArray(payload?.data) ? payload.data : EMPTY_RECONCILIATIONS;
        return {
            success: isSuccessful(payload),
            data: raw.map((item) => ({
                subjectType: toStringValue(item?.subjectType),
                subjectName: toStringValue(item?.subjectName, 'Đối soát'),
                settlementId: item?.settlementId === null || item?.settlementId === undefined
                    ? null
                    : String(item.settlementId),
                periodFrom: item?.periodFrom ? String(item.periodFrom) : null,
                periodTo: item?.periodTo ? String(item.periodTo) : null,
                discrepancyAmount: toFiniteNumber(item?.discrepancyAmount),
                status: toStringValue(item?.status),
            })),
        };
    } catch {
        return { success: false, data: EMPTY_RECONCILIATIONS };
    }
};
