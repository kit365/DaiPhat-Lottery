import { apiApp } from '../../api';
import { withAuthHeaders } from '../../api/authHeaders';
import { ApiResponse } from '../../types/api.type';
import {
    CompletePrizePayoutRequest,
    CreateStaffPrizePayoutBatchRequest,
    CreateStaffPrizePayoutRequest,
    GetStaffPrizePayoutsParams,
    PrizePayoutBatchCreateResponse,
    PrizePayoutLookupResponse,
    PrizePayoutPreviewResponse,
    PrizePayoutRequestResponse,
    PrizePayoutStaffListResponse,
    RejectPrizePayoutRequest,
} from '../../types/prize-payout.type';
import { UserBankAccountResponse } from '../../types/refund.type';

const STAFF_BASE = '/staff/prize-payout-requests';

const withAuth = () => withAuthHeaders();

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

    lookup: async (params: {
        orderCode?: string;
        stationId?: number;
        drawDate?: string;
        serialNumber?: string;
    }): Promise<ApiResponse<PrizePayoutLookupResponse>> => {
        const response = await apiApp.get(`${STAFF_BASE}/lookup`, { ...withAuth(), params });
        return response.data;
    },

    preview: async (params: {
        orderDetailId?: number;
        serialId?: number;
        serialNumber?: string;
        orderCode?: string;
    }): Promise<ApiResponse<PrizePayoutPreviewResponse>> => {
        const response = await apiApp.get(`${STAFF_BASE}/preview`, { ...withAuth(), params });
        return response.data;
    },

    createInPerson: async (
        data: CreateStaffPrizePayoutRequest
    ): Promise<ApiResponse<PrizePayoutRequestResponse>> => {
        const response = await apiApp.post(STAFF_BASE, data, withAuth());
        return response.data;
    },

    createInPersonBatch: async (
        data: CreateStaffPrizePayoutBatchRequest
    ): Promise<ApiResponse<PrizePayoutBatchCreateResponse>> => {
        const response = await apiApp.post(`${STAFF_BASE}/batch`, data, withAuth());
        return response.data;
    },

    approve: async (id: number): Promise<ApiResponse<PrizePayoutRequestResponse>> => {
        const response = await apiApp.patch(`${STAFF_BASE}/${id}/approve`, {}, withAuth());
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

    uploadRecipientIdImage: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiApp.post(`${STAFF_BASE}/recipient-id/upload`, formData, withAuth());
        const url = response.data?.data?.url;
        if (!url) {
            throw new Error(response.data?.message || 'Không nhận được URL ảnh từ server');
        }
        return url;
    },

    uploadConfirmationContract: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiApp.post(`${STAFF_BASE}/confirmation-contract/upload`, formData, withAuth());
        const url = response.data?.data?.url;
        if (!url) {
            throw new Error(response.data?.message || 'Không nhận được URL ảnh từ server');
        }
        return url;
    },

    getCustomerBankAccounts: async (userId: string): Promise<ApiResponse<UserBankAccountResponse[]>> => {
        const response = await apiApp.get(`/staff/users/${userId}/bank-accounts`, withAuth());
        return response.data;
    },
};
