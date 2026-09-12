import { apiApp } from '../../api';
import { ApiResponse, EnumOptionResponse, PageResponse } from '../../types/api.type';
import {
    CreatePrizePayoutRequest,
    GetMyPrizePayoutsParams,
    PrizePayoutPreviewResponse,
    PrizePayoutRequestResponse,
} from '../../types/prize-payout.type';

const BASE_URL = '/prize-payout-requests';

export const prizePayoutService = {
    create: async (data: CreatePrizePayoutRequest): Promise<ApiResponse<PrizePayoutRequestResponse>> => {
        const response = await apiApp.post(BASE_URL, data);
        return response.data;
    },

    preview: async (params: {
        orderDetailId?: number;
        serialId?: number;
    }): Promise<ApiResponse<PrizePayoutPreviewResponse>> => {
        const response = await apiApp.get(`${BASE_URL}/preview`, { params });
        return response.data;
    },

    getMyRequests: async (
        params: GetMyPrizePayoutsParams
    ): Promise<ApiResponse<PageResponse<PrizePayoutRequestResponse>>> => {
        const response = await apiApp.get(`${BASE_URL}/my`, { params });
        return response.data;
    },

    getById: async (id: number): Promise<ApiResponse<PrizePayoutRequestResponse>> => {
        const response = await apiApp.get(`${BASE_URL}/${id}`, {
            skipGlobalErrorToast: true,
        } as any);
        return response.data;
    },

    cancel: async (id: number): Promise<ApiResponse<PrizePayoutRequestResponse>> => {
        const response = await apiApp.patch(`${BASE_URL}/${id}/cancel`);
        return response.data;
    },

    uploadRecipientIdImage: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiApp.post(`${BASE_URL}/recipient-id/upload`, formData);
        const url = response.data?.data?.url;
        if (!url) {
            throw new Error(response.data?.message || 'Không nhận được URL ảnh CCCD từ server');
        }
        return url;
    },

    getStatuses: async (): Promise<ApiResponse<EnumOptionResponse[]>> => {
        const response = await apiApp.get(`${BASE_URL}/statuses`);
        return response.data;
    },

    getPendingCount: async (): Promise<ApiResponse<number>> => {
        const response = await apiApp.get(`${BASE_URL}/pending-count`);
        return response.data;
    },
};
