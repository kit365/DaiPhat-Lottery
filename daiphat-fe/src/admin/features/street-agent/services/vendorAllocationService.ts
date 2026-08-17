import { apiApp } from '../../../../api';
import { ApiResponse, PageResponse } from '../../../../types/api.type';
import {
    ConfirmVendorAllocationPayload,
    ConfirmVendorReturnInspectionPayload,
    ConfirmVendorNoReturnPayload,
    CreateVendorAllocationDraftPayload,
    ReplaceVendorAllocationReturnsPayload,
    ReturnVendorAllocationSerialsPayload,
    VendorAllocationBatch,
    VendorAllocationBatchListParams,
    VendorAllocationCandidate,
    VendorAllocationSuggestion,
    VendorConfirmationQuote,
    VendorSettlementPreview,
    SettleVendorAllocationPayload,
} from '../types/street-agent.type';

export class VendorAllocationQuoteStaleError extends Error {
    readonly code = 'SAG_028';
    constructor() {
        super('Báo giá cọc đã thay đổi. Vui lòng tải lại trước khi xác nhận bàn giao.');
        this.name = 'VendorAllocationQuoteStaleError';
    }
}

const BASE_URL = '/vendor-allocations';

export const getVendorAllocationCandidates = async (
    profileId: number | string,
    businessDate: string
): Promise<ApiResponse<VendorAllocationCandidate[]>> => {
    const response = await apiApp.get(`${BASE_URL}/candidates`, {
        params: { profileId, businessDate },
        skipGlobalErrorToast: true,
    });
    return response.data;
};

export const getVendorAllocationSuggestion = async (
    profileId: number | string,
    businessDate: string,
    requestedQuantity?: number,
    faceValue?: number
): Promise<ApiResponse<VendorAllocationSuggestion>> => {
    const response = await apiApp.get(`${BASE_URL}/suggestions`, {
        params: { profileId, businessDate, requestedQuantity, faceValue },
        skipGlobalErrorToast: true,
    });
    return response.data;
};

export const getOpenVendorAllocationBatch = async (
    profileId: number | string
): Promise<ApiResponse<VendorAllocationBatch | null>> => {
    const response = await apiApp.get(`${BASE_URL}/open`, {
        params: { profileId },
    });
    return response.data;
};

export const listVendorAllocationBatches = async (
    params: VendorAllocationBatchListParams
): Promise<ApiResponse<PageResponse<VendorAllocationBatch>>> => {
    const response = await apiApp.get(BASE_URL, {
        params: {
            profileId: params.profileId,
            status: params.status,
            businessDateFrom: params.businessDateFrom,
            businessDateTo: params.businessDateTo,
            search: params.search || undefined,
            page: params.page ?? 1,
            size: params.size ?? 10,
        },
        paramsSerializer: {
            indexes: null,
        },
    });
    return response.data;
};

export const createVendorAllocationDraft = async (
    data: CreateVendorAllocationDraftPayload
): Promise<ApiResponse<VendorAllocationBatch>> => {
    const response = await apiApp.post(`${BASE_URL}/drafts`, data);
    return response.data;
};

export const getVendorAllocationBatch = async (
    id: number | string
): Promise<ApiResponse<VendorAllocationBatch>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`);
    return response.data;
};

export const getVendorConfirmationQuote = async (
    id: number | string
): Promise<ApiResponse<VendorConfirmationQuote>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}/confirmation-quote`, {
        headers: { 'Cache-Control': 'no-store' },
        skipGlobalErrorToast: true,
    });
    return response.data;
};

export const confirmVendorAllocation = async (
    id: number | string,
    data: ConfirmVendorAllocationPayload
): Promise<ApiResponse<VendorAllocationBatch>> => {
    try {
        const response = await apiApp.post(`${BASE_URL}/${id}/confirm`, data);
        return response.data;
    } catch (error: any) {
        if (error?.response?.status === 409 && error?.response?.data?.code === 'SAG_028') {
            throw new VendorAllocationQuoteStaleError();
        }
        throw error;
    }
};

export const openVendorAllocationReturnSession = async (
    id: number | string
): Promise<ApiResponse<VendorAllocationBatch>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/return-session`);
    return response.data;
};

export const returnVendorAllocationSerials = async (
    id: number | string,
    data: ReturnVendorAllocationSerialsPayload
): Promise<ApiResponse<VendorAllocationBatch>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/returns`, data);
    return response.data;
};

export const replaceVendorAllocationReturns = async (
    id: number | string,
    data: ReplaceVendorAllocationReturnsPayload
): Promise<ApiResponse<VendorAllocationBatch>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}/returns`, data);
    return response.data;
};

export const removeVendorAllocationReturnSerial = async (
    id: number | string,
    serialId: number | string
): Promise<ApiResponse<VendorAllocationBatch>> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}/returns/${serialId}`);
    return response.data;
};

export const confirmVendorReturnInspection = async (
    id: number | string,
    data: ConfirmVendorReturnInspectionPayload
): Promise<ApiResponse<VendorAllocationBatch>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/return-inspection/confirm`, data);
    return response.data;
};

export const confirmVendorNoReturn = async (
    id: number | string,
    data: ConfirmVendorNoReturnPayload = {}
): Promise<ApiResponse<VendorAllocationBatch>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/return-inspection/confirm-no-return`, data);
    return response.data;
};

export const reopenVendorReturnInspection = async (
    id: number | string
): Promise<ApiResponse<VendorAllocationBatch>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/return-inspection/reopen`);
    return response.data;
};

export const getVendorAllocationSettlementPreview = async (
    id: number | string
): Promise<ApiResponse<VendorSettlementPreview>> => {
    // Preview is a read model whose business 409s are rendered by the page.
    // Do not let the global interceptor show a second toast during a status
    // transition (for example, immediately after a successful settlement).
    const response = await apiApp.get(`${BASE_URL}/${id}/settlement-preview`, {
        skipGlobalErrorToast: true,
    });
    return response.data;
};

export const settleVendorAllocation = async (
    id: number | string,
    data: SettleVendorAllocationPayload
): Promise<ApiResponse<VendorAllocationBatch>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/settle`, data);
    return response.data;
};

export const cancelVendorAllocation = async (
    id: number | string
): Promise<ApiResponse<null>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/cancel`);
    return response.data;
};
