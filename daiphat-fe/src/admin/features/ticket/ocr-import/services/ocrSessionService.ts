import { apiApp } from '../../../../../api';
import { ApiResponse } from '../../../../../types/api.type';
import type { OcrSessionResponse } from '../types/ocrSession.type';

const BASE_URL = '/lottery-tickets/ocr-sessions';

export const createOcrSession = async (params?: {
    importBatchId?: number | null;
    importBatchLineId?: number | null;
}): Promise<ApiResponse<OcrSessionResponse>> => {
    const res = await apiApp.post(BASE_URL, params || {});
    return res.data;
};

export const getOcrSession = async (sessionCode: string): Promise<ApiResponse<OcrSessionResponse>> => {
    const res = await apiApp.get(`${BASE_URL}/${sessionCode}`);
    return res.data;
};

export const closeOcrSession = async (sessionCode: string): Promise<ApiResponse<void>> => {
    const res = await apiApp.post(`${BASE_URL}/${sessionCode}/close`);
    return res.data;
};
