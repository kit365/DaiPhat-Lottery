import { apiApp } from '../../api';
import { CreateOnlineOrderRequest, OrderResponse } from '../../types/order.type';
import { ApiResponse } from '../../admin/config/type';

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
     * Gets available order receive types
     */
    getOrderReceiveTypes: async (): Promise<ApiResponse<any[]>> => {
        const response = await apiApp.get(`${BASE_URL}/receive-types`);
        return response.data;
    }
};
