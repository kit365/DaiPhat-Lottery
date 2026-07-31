import { apiApp } from '../../api';
import { ApiResponse, EnumOptionResponse, PageResponse } from '../../types/api.type';
import {
    CreatePrizePayoutRequest,
    GetMyPrizePayoutsParams,
    PrizePayoutRequestResponse,
} from '../../types/prize-payout.type';

const BASE_URL = '/prize-payout-requests';

export const prizePayoutService = {
    create: async (data: CreatePrizePayoutRequest): Promise<ApiResponse<PrizePayoutRequestResponse>> => {
        const response = await apiApp.post(BASE_URL, data);
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

    getStatuses: async (): Promise<ApiResponse<EnumOptionResponse[]>> => {
        const response = await apiApp.get(`${BASE_URL}/statuses`);
        return response.data;
    },

    getPendingCount: async (): Promise<ApiResponse<number>> => {
        const response = await apiApp.get(`${BASE_URL}/pending-count`);
        return response.data;
    },
};
