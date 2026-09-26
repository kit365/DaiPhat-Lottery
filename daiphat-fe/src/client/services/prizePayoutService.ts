import { apiApp } from '../../api';
import { ApiResponse, EnumOptionResponse, PageResponse } from '../../types/api.type';
import {
    CreatePrizePayoutRequest,
    GetMyPrizePayoutsParams,
    PrizePayoutPreviewResponse,
    PrizePayoutRequestResponse,
    PrizePayoutRequestStatus,
} from '../../types/prize-payout.type';

const BASE_URL = '/prize-payout-requests';

/**
 * Create runs CCCD download + OCR on the server, which routinely exceeds the global 15s axios timeout.
 * Kept at the Next proxy's default (120s) so the browser never gives up while the server still commits.
 */
const CREATE_TIMEOUT_MS = 120_000;

/** Statuses that block a new request for the same serial (mirrors BE BLOCKING_STATUSES). */
const ACTIVE_REQUEST_STATUSES = new Set<string>([
    PrizePayoutRequestStatus.PENDING,
    PrizePayoutRequestStatus.APPROVED,
    PrizePayoutRequestStatus.COMPLETED,
]);

export const prizePayoutService = {
    create: async (data: CreatePrizePayoutRequest): Promise<ApiResponse<PrizePayoutRequestResponse>> => {
        const response = await apiApp.post(BASE_URL, data, {
            skipGlobalErrorToast: true,
            timeout: CREATE_TIMEOUT_MS,
        } as any);
        return response.data;
    },

    /** The customer's own active request for this ticket, if one already exists. */
    findActiveRequestForTicket: async (ticket: {
        orderDetailId?: number;
        serialId?: number;
    }): Promise<PrizePayoutRequestResponse | null> => {
        const response = await apiApp.get(`${BASE_URL}/my`, {
            params: { page: 1, limit: 20 },
            skipGlobalErrorToast: true,
        } as any);
        const records: PrizePayoutRequestResponse[] = response.data?.data?.recordList ?? [];
        return (
            records.find(
                (request) =>
                    ACTIVE_REQUEST_STATUSES.has(request.status) &&
                    ((ticket.serialId != null && request.serialId === ticket.serialId) ||
                        (ticket.orderDetailId != null && request.orderDetailId === ticket.orderDetailId))
            ) ?? null
        );
    },

    preview: async (params: {
        orderDetailId?: number;
        serialId?: number;
    }): Promise<ApiResponse<PrizePayoutPreviewResponse>> => {
        const response = await apiApp.get(`${BASE_URL}/preview`, {
            params,
            skipGlobalErrorToast: true,
        } as any);
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
        const response = await apiApp.post(`${BASE_URL}/recipient-id/upload`, formData, {
            skipGlobalErrorToast: true,
            timeout: CREATE_TIMEOUT_MS,
        } as any);
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
