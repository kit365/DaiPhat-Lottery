import Cookies from 'js-cookie';
import { apiApp } from '../../api';
import { STORAGE_KEYS } from '../../constants/storage.constants';
import { ApiResponse, PageResponse } from '../../types/api.type';
import {
    GetStaffRefundsParams,
    RefundRequestAdminDetailResponse,
    RefundRequestResponse,
    TransferRefundRequestRequest,
} from '../../types/refund.type';

const STAFF_BASE = '/staff/refund-requests';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const refundAdminApi = {
    getStaffRefunds: async (
        params: GetStaffRefundsParams
    ): Promise<ApiResponse<PageResponse<RefundRequestResponse>>> => {
        const response = await apiApp.get(STAFF_BASE, { ...withAuth(), params });
        return response.data;
    },

    getRefundById: async (id: number): Promise<ApiResponse<RefundRequestAdminDetailResponse>> => {
        const response = await apiApp.get(`${STAFF_BASE}/${id}`, withAuth());
        return response.data;
    },

    transferRefund: async (
        id: number,
        data: TransferRefundRequestRequest
    ): Promise<ApiResponse<RefundRequestResponse>> => {
        const response = await apiApp.patch(`${STAFF_BASE}/${id}/transfer`, data, withAuth());
        return response.data;
    },

    requestBankInfoUpdate: async (
        id: number,
        data: { operatorNote: string }
    ): Promise<ApiResponse<RefundRequestResponse>> => {
        const response = await apiApp.patch(
            `${STAFF_BASE}/${id}/request-bank-info-update`,
            data,
            withAuth()
        );
        return response.data;
    },

    cancelOrderWithRefund: async (
        orderId: string,
        data: { cancelReason: string }
    ): Promise<ApiResponse<RefundRequestResponse>> => {
        const response = await apiApp.post(
            `/staff/orders/${orderId}/cancel-with-refund`,
            data,
            withAuth()
        );
        return response.data;
    },

    uploadTransferEvidence: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiApp.post(`${STAFF_BASE}/transfer-evidence/upload`, formData, {
            ...withAuth(),
            headers: {
                ...withAuth().headers,
                'Content-Type': 'multipart/form-data',
            },
        });

        const url = response.data?.data?.url;
        if (!url) {
            throw new Error(response.data?.message || 'Không nhận được URL ảnh từ server');
        }
        return url;
    },
};
