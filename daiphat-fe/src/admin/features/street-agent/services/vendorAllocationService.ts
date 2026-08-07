import { apiApp } from '../../../../api';
import { ApiResponse, PageResponse } from '../../../../types/api.type';
import {
    ConfirmVendorAllocationPayload,
    CreateVendorAllocationDraftPayload,
    ReturnVendorAllocationSerialsPayload,
    VendorAllocationBatch,
    VendorAllocationBatchListParams,
    VendorAllocationCandidate,
    VendorAllocationSuggestion,
    VendorSettlementPreview,
} from '../types/street-agent.type';

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
    businessDate: string
): Promise<ApiResponse<VendorAllocationSuggestion>> => {
    const response = await apiApp.get(`${BASE_URL}/suggestions`, {
        params: { profileId, businessDate },
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

export const confirmVendorAllocation = async (
    id: number | string,
    data: ConfirmVendorAllocationPayload
): Promise<ApiResponse<VendorAllocationBatch>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/confirm`, data);
    return response.data;
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

export const getVendorAllocationSettlementPreview = async (
    id: number | string
): Promise<ApiResponse<VendorSettlementPreview>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}/settlement-preview`);
    return response.data;
};

export const settleVendorAllocation = async (
    id: number | string
): Promise<ApiResponse<VendorAllocationBatch>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/settle`);
    return response.data;
};

export const cancelVendorAllocation = async (
    id: number | string
): Promise<ApiResponse<null>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/cancel`);
    return response.data;
};
