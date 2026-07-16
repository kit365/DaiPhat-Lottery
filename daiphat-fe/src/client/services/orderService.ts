import { apiApp } from '../../api';
import { CreateOnlineOrderRequest, OrderFilterParams, OrderResponse } from '../../types/order.type';
import { ApiResponse, PageResponse } from '../../types/api.type';

const BASE_URL = '/orders';

const normalizeOrderFilterParams = (params?: OrderFilterParams) => {
    if (!params) return undefined;
    const normalized = { ...params } as Record<string, any>;

    (['status', 'orderType', 'receiveType'] as const).forEach((key) => {
        const value = normalized[key];
        if (Array.isArray(value)) {
            normalized[key] = value.length > 0 ? value.join(',') : undefined;
        }
    });

    return normalized;
};

export const orderService = {
    /**
     * Creates an online order for tickets
     */
    createOnlineOrder: async (data: CreateOnlineOrderRequest): Promise<ApiResponse<OrderResponse>> => {
        const response = await apiApp.post(`${BASE_URL}/online`, data);
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
    }
};
