import { apiApp } from '../../api';
import { CreateOnlineOrderRequest, OrderFilterParams, OrderResponse } from '../../types/order.type';
import { PendingPaymentReminderResponse } from '../../types/transaction.type';
import { ApiResponse, PageResponse } from '../../types/api.type';

const BASE_URL = '/orders';

const normalizeOrderFilterParams = (params?: OrderFilterParams) => {
    if (!params) return undefined;

    const normalized: Record<string, string | number> = {};

    const page = params.page;
    if (page != null && page > 0) {
        normalized.page = page;
    }

    const size = params.size ?? params.limit;
    if (size != null && size > 0) {
        normalized.size = size;
    }

    (['status', 'orderType', 'receiveType'] as const).forEach((key) => {
        const value = params[key];
        if (value == null || value === '') return;
        if (Array.isArray(value)) {
            if (value.length > 0) {
                normalized[key] = value.join(',');
            }
            return;
        }
        normalized[key] = value;
    });

    if (params.fromDate) {
        normalized.fromDate = params.fromDate;
    }
    if (params.toDate) {
        normalized.toDate = params.toDate;
    }

    const search = params.search?.trim();
    if (search) {
        normalized.search = search;
    }

    if (params.sortBy) {
        normalized.sortBy = params.sortBy;
    }
    if (params.direction) {
        normalized.direction = params.direction;
    }

    return normalized;
};

export const orderService = {
    /**
     * Creates an online order for tickets
     */
    createOnlineOrder: async (data: CreateOnlineOrderRequest): Promise<ApiResponse<OrderResponse>> => {
        const response = await apiApp.post(`${BASE_URL}/online`, data, {
            skipGlobalErrorToast: true,
        } as Parameters<typeof apiApp.post>[2]);
        return response.data;
    },

    /**
     * Gets my orders with pagination and filtering
     */
    getMyOrders: async (params: OrderFilterParams): Promise<ApiResponse<PageResponse<OrderResponse>>> => {
        const response = await apiApp.get(`${BASE_URL}/my-orders`, {
            params: normalizeOrderFilterParams(params)
        });
        return response.data;
    },

    getPendingPaymentReminder: async (): Promise<ApiResponse<PendingPaymentReminderResponse | null>> => {
        const response = await apiApp.get(`${BASE_URL}/my-orders/pending-payment-reminder`, {
            skipGlobalErrorToast: true,
        } as any);
        return response.data;
    },
    
    /**
     * Gets available order receive types
     */
    getOrderReceiveTypes: async (): Promise<ApiResponse<any[]>> => {
        const response = await apiApp.get(`${BASE_URL}/receive-types`);
        return response.data;
    },
    
    /**
     * Gets available order statuses
     */
    getOrderStatuses: async (): Promise<ApiResponse<any[]>> => {
        const response = await apiApp.get(`${BASE_URL}/statuses`);
        return response.data;
    },

    /**
     * Gets details of a specific order by ID
     */
    getMyOrderDetail: async (id: string): Promise<ApiResponse<OrderResponse>> => {
        const response = await apiApp.get(`${BASE_URL}/my-orders/${id}`, {
            skipGlobalErrorToast: true,
        } as any);
        return response.data;
    },

    getRefundEligibility: async (orderId: string) => {
        const response = await apiApp.get(`${BASE_URL}/my-orders/${orderId}/refund-eligibility`);
        return response.data;
    },

    /** Upload proof for an order cancelled by the automatic payment timeout. */
    submitPaymentTimeoutComplaint: async (
        id: string,
        file: File,
    ): Promise<ApiResponse<OrderResponse>> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiApp.post(`${BASE_URL}/my-orders/${id}/payment-timeout-complaint`, formData, {
            timeout: 60_000,
            skipGlobalErrorToast: true,
        } as any);
        return response.data;
    },
};
