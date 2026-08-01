import { apiApp } from '../../../../../api';
import { withAuthHeaders } from '../../../../../api/authHeaders';
import { ApiResponse, PageResponse } from '../../../../../types/api.type';
import type {
    AttachReturnSerialsPayload,
    ConfirmReturnHandoverPayload,
    ConfirmReturnInspectionPayload,
    InspectableReturnSerial,
    ReturnBatch,
    ReturnBatchLineStatus,
    ReturnBatchListParams,
    UpdateReturnBatchPayload,
} from '../types/returnBatch.type';

const BASE_URL = '/return-batches';

export const getReturnBatches = async (
    params?: ReturnBatchListParams
): Promise<ApiResponse<PageResponse<ReturnBatch>>> => {
    const response = await apiApp.get(BASE_URL, {
        ...withAuthHeaders(),
        params,
    });
    return response.data;
};

export const getReturnBatchById = async (
    id: number | string
): Promise<ApiResponse<ReturnBatch>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`, withAuthHeaders());
    return response.data;
};

export const getInspectableReturnSerials = async (
    id: number | string
): Promise<ApiResponse<InspectableReturnSerial[]>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}/inspectable-serials`, withAuthHeaders());
    return response.data;
};

export const updateReturnBatch = async (
    id: number | string,
    payload: UpdateReturnBatchPayload
): Promise<ApiResponse<ReturnBatch>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, payload, withAuthHeaders());
    return response.data;
};

export const confirmReturnInspection = async (
    id: number | string,
    payload: ConfirmReturnInspectionPayload
): Promise<ApiResponse<ReturnBatch>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/confirm-inspection`, payload, withAuthHeaders());
    return response.data;
};

export const confirmReturnHandover = async (
    id: number | string,
    payload?: ConfirmReturnHandoverPayload
): Promise<ApiResponse<ReturnBatch>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/confirm-handover`, payload ?? {}, withAuthHeaders());
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
        withAuthHeaders()
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
        withAuthHeaders()
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
        withAuthHeaders()
    );
    return response.data;
};
