import { apiApp } from '../../../../api';
import { withAuthHeaders } from '../../../../api/authHeaders';
import { OrderFilterParams, OrderResponse } from '../../../../types/order.type';
import { ApiResponse, PageResponse } from '../../../../types/api.type';
import type {
    ConfirmOrderHandoverRequest,
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
    params?: OrderFilterParams,
    options?: { skipGlobalErrorToast?: boolean }
): Promise<ApiResponse<PageResponse<OrderResponse>>> => {
    const response = await apiApp.get(`/orders`, {
        ...withAuthHeaders(),
        params: normalizeOrderFilterParams(params),
        skipGlobalErrorToast: options?.skipGlobalErrorToast,
    } as any);
    return response.data;
};

export const getOrderDetail = async (id: string): Promise<ApiResponse<OrderResponse>> => {
    const response = await apiApp.get(`/orders/${id}`, withAuthHeaders());
    return response.data;
};

export const updateOrderStatus = async (id: string, status: string, reason?: string) => {
    const response = await apiApp.patch(`/orders/${id}/status`, { status, reason }, withAuthHeaders());
    return response.data;
};

export const uploadOrderHandoverEvidence = async (id: string, file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiApp.post(`/orders/${id}/handover/evidence`, formData, {
        timeout: 60_000,
        skipGlobalErrorToast: true,
    } as any);
    const url = response.data?.data?.url;
    if (!url) throw new Error(response.data?.message || 'Không nhận được URL ảnh bàn giao.');
    return url;
};

export const confirmOrderHandover = async (
    id: string,
    data: ConfirmOrderHandoverRequest,
): Promise<ApiResponse<OrderResponse>> => {
    const response = await apiApp.post(`/orders/${id}/handover`, data, withAuthHeaders());
    return response.data;
};

export const createOrder = async (data: unknown) => {
    const response = await apiApp.post(`/orders/direct`, data, withAuthHeaders());
    return response.data;
};

export const getReplacementCandidates = async (orderId: string, detailId: number) => {
    const response = await apiApp.get(
        `/orders/${orderId}/details/${detailId}/replacements`,
        withAuthHeaders()
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
        withAuthHeaders()
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
        withAuthHeaders()
    );
    return response.data;
};

export const reviewPaymentTimeoutComplaint = async (
    id: string,
    data: { approved: boolean; reason?: string },
): Promise<ApiResponse<OrderResponse>> => {
    const response = await apiApp.post(
        `/orders/${id}/payment-timeout-complaint/review`,
        data,
        withAuthHeaders(),
    );
    return response.data;
};

export const getPendingPaymentTimeoutComplaintCount = async (): Promise<ApiResponse<number>> => {
    const response = await apiApp.get(
        `/orders/payment-timeout-complaints/pending-count`,
        withAuthHeaders(),
    );
    return response.data;
};
