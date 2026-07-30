import Cookies from 'js-cookie';
import { apiApp } from '../../api';
import { STORAGE_KEYS } from '../../constants/storage.constants';
import { ApiResponse } from '../../types/api.type';
import {
    CompletePrizePayoutRequest,
    GetStaffPrizePayoutsParams,
    PrizePayoutRequestResponse,
    PrizePayoutStaffListResponse,
    RejectPrizePayoutRequest,
} from '../../types/prize-payout.type';

const STAFF_BASE = '/staff/prize-payout-requests';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const prizePayoutAdminApi = {
    getStaffRequests: async (
        params: GetStaffPrizePayoutsParams
    ): Promise<ApiResponse<PrizePayoutStaffListResponse>> => {
        const response = await apiApp.get(STAFF_BASE, { ...withAuth(), params });
        return response.data;
    },

    getById: async (id: number): Promise<ApiResponse<PrizePayoutRequestResponse>> => {
        const response = await apiApp.get(`${STAFF_BASE}/${id}`, withAuth());
        return response.data;
    },

    complete: async (
        id: number,
        data: CompletePrizePayoutRequest
    ): Promise<ApiResponse<PrizePayoutRequestResponse>> => {
        const response = await apiApp.patch(`${STAFF_BASE}/${id}/complete`, data, withAuth());
        return response.data;
    },

    reject: async (
        id: number,
        data: RejectPrizePayoutRequest
    ): Promise<ApiResponse<PrizePayoutRequestResponse>> => {
        const response = await apiApp.patch(`${STAFF_BASE}/${id}/reject`, data, withAuth());
        return response.data;
    },

    uploadTransferEvidence: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiApp.post(`${STAFF_BASE}/transfer-evidence/upload`, formData, withAuth());
        const url = response.data?.data?.url;
        if (!url) {
            throw new Error(response.data?.message || 'Không nhận được URL ảnh từ server');
        }
        return url;
    },
};
