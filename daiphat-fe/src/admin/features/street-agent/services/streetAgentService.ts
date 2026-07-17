import { apiApp } from '../../../../api';
import { ApiResponse, PageResponse } from '../../../../types/api.type';
import { StreetAgentProfile, StreetAgentQueryParams } from '../types/street-agent.type';

const BASE_URL = '/street-agent-profiles';

export const getStreetAgentProfiles = async (
    params?: StreetAgentQueryParams
): Promise<ApiResponse<PageResponse<StreetAgentProfile>>> => {
    const response = await apiApp.get(BASE_URL, { params });
    return response.data;
};

export const getStreetAgentProfileById = async (
    id: number | string
): Promise<ApiResponse<StreetAgentProfile>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`);
    return response.data;
};

export const createStreetAgentProfile = async (
    data: Record<string, unknown>
): Promise<ApiResponse<StreetAgentProfile>> => {
    const response = await apiApp.post(BASE_URL, data);
    return response.data;
};

export const updateStreetAgentProfile = async (
    id: number | string,
    data: Record<string, unknown>
): Promise<ApiResponse<StreetAgentProfile>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, data);
    return response.data;
};
