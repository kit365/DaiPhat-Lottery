import Cookies from 'js-cookie';
import { apiApp } from '../../../../../api';
import { ApiResponse, PageResponse } from '../../../../../types/api.type';
import { STORAGE_KEYS } from '../../../../../constants/storage.constants';
import type {
    AttachReturnSerialsPayload,
    ConfirmReturnBatchPayload,
    CreateReturnBatchPayload,
    ReturnBatch,
    ReturnBatchLineStatus,
    ReturnBatchListParams,
    UpdateReturnBatchPayload,
} from '../types/returnBatch.type';

const BASE_URL = '/return-batches';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getReturnBatches = async (
    params?: ReturnBatchListParams
): Promise<ApiResponse<PageResponse<ReturnBatch>>> => {
    const response = await apiApp.get(BASE_URL, {
        ...withAuth(),
        params,
    });
    return response.data;
};

export const getReturnBatchById = async (
    id: number | string
): Promise<ApiResponse<ReturnBatch>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`, withAuth());
    return response.data;
};

export const createReturnBatch = async (
    payload: CreateReturnBatchPayload
): Promise<ApiResponse<ReturnBatch>> => {
    const response = await apiApp.post(BASE_URL, payload, withAuth());
    return response.data;
};

export const updateReturnBatch = async (
    id: number | string,
    payload: UpdateReturnBatchPayload
): Promise<ApiResponse<ReturnBatch>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, payload, withAuth());
    return response.data;
};

export const attachReturnSerials = async (
    batchId: number | string,
    lineId: number | string,
    payload: AttachReturnSerialsPayload
): Promise<ApiResponse<ReturnBatch>> => {
    const response = await apiApp.post(
        `${BASE_URL}/${batchId}/lines/${lineId}/serials`,
        payload,
        withAuth()
    );
    return response.data;
};

export const detachReturnSerial = async (
    batchId: number | string,
    lineId: number | string,
    serialId: number | string
): Promise<ApiResponse<ReturnBatch>> => {
    const response = await apiApp.delete(
        `${BASE_URL}/${batchId}/lines/${lineId}/serials/${serialId}`,
        withAuth()
    );
    return response.data;
};

export const updateReturnBatchLineStatus = async (
    batchId: number | string,
    lineId: number | string,
    status: ReturnBatchLineStatus
): Promise<ApiResponse<ReturnBatch>> => {
    const response = await apiApp.post(
        `${BASE_URL}/${batchId}/lines/${lineId}/status`,
        { status },
        withAuth()
    );
    return response.data;
};

export const markReturnBatchReturned = async (
    id: number | string
): Promise<ApiResponse<ReturnBatch>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/mark-returned`, {}, withAuth());
    return response.data;
};

export const confirmReturnBatch = async (
    id: number | string,
    payload?: ConfirmReturnBatchPayload
): Promise<ApiResponse<ReturnBatch>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/confirm`, payload ?? {}, withAuth());
    return response.data;
};
