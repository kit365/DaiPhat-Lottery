import { apiApp } from '../../api';
import { ApiResponse, EnumOptionResponse, PageResponse } from '../../types/api.type';
import {
    CreateOrderRefundRequest,
    CreateRefundRequestRequest,
    GetMyRefundsParams,
    RefundRequestResponse
} from '../../types/refund.type';

const BASE_URL = '/refund-requests';
const ORDERS_URL = '/orders';

export const refundService = {
    create: async (data: CreateRefundRequestRequest): Promise<ApiResponse<RefundRequestResponse>> => {
        const response = await apiApp.post(BASE_URL, data);
        return response.data;
    },

    createOrderRefund: async (
        orderId: string,
        data: CreateOrderRefundRequest
    ): Promise<ApiResponse<RefundRequestResponse>> => {
        const response = await apiApp.post(`${ORDERS_URL}/${orderId}/refund`, data);
        return response.data;
    },

    getMyRequests: async (params: GetMyRefundsParams): Promise<ApiResponse<PageResponse<RefundRequestResponse>>> => {
        const response = await apiApp.get(`${BASE_URL}/my`, { params });
        return response.data;
    },

    getById: async (id: number): Promise<ApiResponse<RefundRequestResponse>> => {
        const response = await apiApp.get(`${BASE_URL}/${id}`, {
            skipGlobalErrorToast: true,
        } as any);
        return response.data;
    },

    cancel: async (id: number): Promise<ApiResponse<RefundRequestResponse>> => {
        const response = await apiApp.patch(`${BASE_URL}/${id}/cancel`);
        return response.data;
    },

    attachBankAccount: async (
        id: number,
        data: { bankAccountId: number }
    ): Promise<ApiResponse<RefundRequestResponse>> => {
        const response = await apiApp.patch(`${BASE_URL}/${id}/bank-account`, data);
        return response.data;
    },

    getStatuses: async (): Promise<ApiResponse<EnumOptionResponse[]>> => {
        const response = await apiApp.get(`${BASE_URL}/statuses`);
        return response.data;
    },

    getTypes: async (): Promise<ApiResponse<EnumOptionResponse[]>> => {
        const response = await apiApp.get(`${BASE_URL}/types`);
        return response.data;
    }
};
