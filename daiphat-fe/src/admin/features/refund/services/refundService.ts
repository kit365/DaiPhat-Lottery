import { apiApp } from '@/api';
import type { ApiResponse, PageResponse } from '@/types/api.type';
import type {
    GetStaffRefundsParams,
    RefundRequestAdminDetailResponse,
    RefundRequestResponse,
    StaffCancelOrderWithRefundRequest,
    TransferRefundRequestRequest,
} from '@/types/refund.type';

const STAFF_BASE = '/staff/refund-requests';

export const refundAdminApi = {
    getStaffRefunds: async (
        params: GetStaffRefundsParams,
    ): Promise<ApiResponse<PageResponse<RefundRequestResponse>>> => {
        const response = await apiApp.get(STAFF_BASE, { params });
        return response.data;
    },

    getRefundById: async (id: number): Promise<ApiResponse<RefundRequestAdminDetailResponse>> => {
        const response = await apiApp.get(`${STAFF_BASE}/${id}`);
        return response.data;
    },

    transferRefund: async (
        id: number,
        data: TransferRefundRequestRequest,
    ): Promise<ApiResponse<RefundRequestResponse>> => {
        const response = await apiApp.patch(`${STAFF_BASE}/${id}/transfer`, data);
        return response.data;
    },

    requestBankInfoUpdate: async (
        id: number,
        data: { operatorNote: string },
    ): Promise<ApiResponse<RefundRequestResponse>> => {
        const response = await apiApp.patch(`${STAFF_BASE}/${id}/request-bank-info-update`, data);
        return response.data;
    },

    cancelOrderWithRefund: async (
        orderId: string,
        data: StaffCancelOrderWithRefundRequest,
    ): Promise<ApiResponse<RefundRequestResponse>> => {
        const response = await apiApp.post(`/staff/orders/${orderId}/cancel-with-refund`, data);
        return response.data;
    },

    uploadTransferEvidence: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiApp.post(`${STAFF_BASE}/transfer-evidence/upload`, formData);
        const url = response.data?.data?.url;
        if (!url) {
            throw new Error(response.data?.message || 'Không nhận được URL ảnh từ server');
        }
        return url;
    },
};
