import { apiApp } from '../../../../api';
import Cookies from 'js-cookie';
import { STORAGE_KEYS } from '../../../../constants/storage.constants';
import { OrderFilterParams, OrderResponse } from '../../../../types/order.type';
import { ApiResponse, PageResponse } from '../../../../types/api.type';
import type {
    CreatePartialRefundRequest,
    HandleOrderTicketIncidentRequest,
    HandleOrderTicketIncidentResponse,
} from '../types/order.type';

export type {
    TicketIncidentReason,
    HandleOrderTicketIncidentRequest,
    TicketIncidentItemResult,
    HandleOrderTicketIncidentResponse,
    CreatePartialRefundRequest,
} from '../types/order.type';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

const normalizeOrderFilterParams = (params?: OrderFilterParams) => {
    if (!params) return undefined;
    const normalized = { ...params } as Record<string, unknown>;

    (['status', 'orderType', 'receiveType'] as const).forEach((key) => {
        const value = normalized[key];
        if (Array.isArray(value)) {
            normalized[key] = value.length > 0 ? value.join(',') : undefined;
        }
    });

    if (normalized.limit != null && normalized.size == null) {
        normalized.size = normalized.limit;
        delete normalized.limit;
    }

    return normalized;
};

export const getOrders = async (
    params?: OrderFilterParams
): Promise<ApiResponse<PageResponse<OrderResponse>>> => {
    const response = await apiApp.get(`/orders`, {
        ...withAuth(),
        params: normalizeOrderFilterParams(params),
    });
    return response.data;
};

export const getOrderDetail = async (id: string): Promise<ApiResponse<OrderResponse>> => {
    const response = await apiApp.get(`/orders/${id}`, withAuth());
    return response.data;
};

export const updateOrderStatus = async (id: string, status: string, reason?: string) => {
    const response = await apiApp.patch(`/orders/${id}/status`, { status, reason }, withAuth());
    return response.data;
};

export const createOrder = async (data: unknown) => {
    const response = await apiApp.post(`/orders/direct`, data, withAuth());
    return response.data;
};

export const getReplacementCandidates = async (orderId: string, detailId: number) => {
    const response = await apiApp.get(
        `/orders/${orderId}/details/${detailId}/replacements`,
        withAuth()
    );
    return response.data;
};

export const handleOrderTicketIncidents = async (
    orderId: string,
    data: HandleOrderTicketIncidentRequest
): Promise<ApiResponse<HandleOrderTicketIncidentResponse>> => {
    const response = await apiApp.post(
        `/staff/orders/${orderId}/incident-tickets`,
        data,
        withAuth()
    );
    return response.data;
};

export const createPartialRefund = async (
    orderId: string,
    data: CreatePartialRefundRequest
): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.post(
        `/staff/orders/${orderId}/partial-refund`,
        data,
        withAuth()
    );
    return response.data;
};
