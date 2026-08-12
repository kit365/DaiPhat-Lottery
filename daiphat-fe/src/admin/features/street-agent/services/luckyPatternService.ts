import { apiApp } from '../../../../api';
import { ApiResponse } from '../../../../types/api.type';
import { LuckyPatternConfig, UpsertLuckyPatternConfigPayload } from '../types/street-agent.type';

const BASE_URL = '/lucky-pattern-configs';

export const getLuckyPatternConfigs = async (): Promise<ApiResponse<LuckyPatternConfig[]>> => {
    const response = await apiApp.get(BASE_URL);
    return response.data;
};

export const createLuckyPatternConfig = async (
    data: UpsertLuckyPatternConfigPayload
): Promise<ApiResponse<LuckyPatternConfig>> => {
    const response = await apiApp.post(BASE_URL, data);
    return response.data;
};

export const updateLuckyPatternConfig = async (
    id: number | string,
    data: UpsertLuckyPatternConfigPayload
): Promise<ApiResponse<LuckyPatternConfig>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, data);
    return response.data;
};

export const recomputeLuckyPatterns = async (): Promise<ApiResponse<null>> => {
    const response = await apiApp.post(`${BASE_URL}/recompute`);
    return response.data;
};
