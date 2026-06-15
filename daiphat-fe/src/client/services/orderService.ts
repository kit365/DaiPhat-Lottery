import { apiApp } from '../../api';
import { CreateOnlineOrderRequest, GetMyOrdersParams, OrderResponse } from '../../types/order.type';
import { ApiResponse, PageResponse } from '../../types/api.type';

const BASE_URL = '/orders';

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
    getMyOrders: async (params: GetMyOrdersParams): Promise<ApiResponse<PageResponse<OrderResponse>>> => {
        const response = await apiApp.get(`${BASE_URL}/my-orders`, { params });
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
        const response = await apiApp.get(`${BASE_URL}/my-orders/${id}`);
        return response.data;
    }
};
