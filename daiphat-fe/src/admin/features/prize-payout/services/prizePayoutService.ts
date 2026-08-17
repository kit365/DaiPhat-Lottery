import { apiApp } from '@/api';
import { withAuthHeaders } from '@/api/authHeaders';
import type { ApiResponse } from '@/types/api.type';
import type {
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
} from '@/types/prize-payout.type';
import type { UserBankAccountResponse } from '@/types/refund.type';
import { mapContractPdfErrorMessage } from '@/admin/shared/contracts';

const STAFF_BASE = '/staff/prize-payout-requests';

const getUploadErrorMessage = (error: unknown, fallback: string) => {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return err?.response?.data?.message || err?.message || fallback;
};

const blobRequestConfig = () =>
    ({
        ...withAuthHeaders(),
        responseType: 'blob' as const,
        skipGlobalErrorToast: true,
    }) as Parameters<typeof apiApp.get>[1] & { skipGlobalErrorToast?: boolean };

const openPdfBlob = async (blob: Blob, fileName: string): Promise<void> => {
    const contentType = String(blob.type || '').toLowerCase();
    if (!contentType.includes('pdf')) {
        let message = 'Không mở được hợp đồng PDF';
        try {
            const parsed = JSON.parse(await blob.text());
            if (parsed?.message) message = parsed.message;
            if (parsed?.errorCode) {
                message = mapContractPdfErrorMessage(
                    `${parsed.errorCode} ${parsed.message || ''}`,
                    message,
                );
            } else {
                message = mapContractPdfErrorMessage(message);
            }
        } catch {
            // keep default
        }
        throw new Error(mapContractPdfErrorMessage(message));
    }
    const objectUrl = URL.createObjectURL(blob);
    const opened = window.open(objectUrl, '_blank');
    if (opened) {
        opened.opener = null;
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        return;
    }
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
};

export const prizePayoutAdminApi = {
    getStaffRequests: async (
        params: GetStaffPrizePayoutsParams,
    ): Promise<ApiResponse<PrizePayoutStaffListResponse>> => {
        const response = await apiApp.get(STAFF_BASE, { params });
        return response.data;
    },

    getById: async (id: number): Promise<ApiResponse<PrizePayoutRequestResponse>> => {
        const response = await apiApp.get(`${STAFF_BASE}/${id}`);
        return response.data;
    },

    lookup: async (params: {
        orderCode?: string;
        stationId?: number;
        drawDate?: string;
        serialNumber?: string;
    }): Promise<ApiResponse<PrizePayoutLookupResponse>> => {
        const response = await apiApp.get(`${STAFF_BASE}/lookup`, { params });
        return response.data;
    },

    lookupStationsByDrawDate: async (
        drawDate: string,
    ): Promise<ApiResponse<Array<{ id: number; name: string }>>> => {
        const response = await apiApp.get(`${STAFF_BASE}/lookup-stations`, { params: { drawDate } });
        return response.data;
    },

    preview: async (params: {
        orderDetailId?: number;
        serialId?: number;
        serialNumber?: string;
        orderCode?: string;
    }): Promise<ApiResponse<PrizePayoutPreviewResponse>> => {
        const response = await apiApp.get(`${STAFF_BASE}/preview`, { params });
        return response.data;
    },

    createInPerson: async (
        data: CreateStaffPrizePayoutRequest,
    ): Promise<ApiResponse<PrizePayoutRequestResponse>> => {
        const response = await apiApp.post(STAFF_BASE, data);
        return response.data;
    },

    createInPersonBatch: async (
        data: CreateStaffPrizePayoutBatchRequest,
    ): Promise<ApiResponse<PrizePayoutBatchCreateResponse>> => {
        const response = await apiApp.post(`${STAFF_BASE}/batch`, data);
        return response.data;
    },

    approve: async (id: number): Promise<ApiResponse<PrizePayoutRequestResponse>> => {
        const response = await apiApp.patch(`${STAFF_BASE}/${id}/approve`, {});
        return response.data;
    },

    complete: async (
        id: number,
        data: CompletePrizePayoutRequest,
    ): Promise<ApiResponse<PrizePayoutRequestResponse>> => {
        const response = await apiApp.patch(`${STAFF_BASE}/${id}/complete`, data);
        return response.data;
    },

    reject: async (
        id: number,
        data: RejectPrizePayoutRequest,
    ): Promise<ApiResponse<PrizePayoutRequestResponse>> => {
        const response = await apiApp.patch(`${STAFF_BASE}/${id}/reject`, data);
        return response.data;
    },

    uploadTransferEvidence: async (file: File): Promise<string> => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await apiApp.post(`${STAFF_BASE}/transfer-evidence/upload`, formData);
            const url = response.data?.data?.url;
            if (!url) {
                throw new Error(response.data?.message || 'Không nhận được URL ảnh từ server');
            }
            return url;
        } catch (error) {
            throw new Error(getUploadErrorMessage(error, 'Tải ảnh biên lai thất bại'));
        }
    },

    uploadRecipientIdImage: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiApp.post(`${STAFF_BASE}/recipient-id/upload`, formData);
        const url = response.data?.data?.url;
        if (!url) {
            throw new Error(response.data?.message || 'Không nhận được URL ảnh từ server');
        }
        return url;
    },

    uploadConfirmationContract: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiApp.post(`${STAFF_BASE}/confirmation-contract/upload`, formData);
        const url = response.data?.data?.url;
        if (!url) {
            throw new Error(response.data?.message || 'Không nhận được URL ảnh từ server');
        }
        return url;
    },

    openConfirmationContractPreview: async (payload: {
        orderDetailIds: number[];
        recipientFullName: string;
        recipientIdNumber: string;
    }): Promise<void> => {
        const response = await apiApp.post(`${STAFF_BASE}/confirmation-contract/preview`, payload, blobRequestConfig());
        await openPdfBlob(response.data as Blob, 'hop-dong-xac-nhan-tra-thuong.pdf');
    },

    openConfirmationContractPdf: async (id: number): Promise<void> => {
        const response = await apiApp.get(`${STAFF_BASE}/${id}/confirmation-contract/pdf`, blobRequestConfig());
        await openPdfBlob(response.data as Blob, `hop-dong-xac-nhan-tra-thuong-${id}.pdf`);
    },

    getCustomerBankAccounts: async (userId: string): Promise<ApiResponse<UserBankAccountResponse[]>> => {
        const response = await apiApp.get(`/staff/users/${userId}/bank-accounts`);
        return response.data;
    },
};
