import { apiApp } from "../../api";
import { ApiResponse, BaseQueryParams, PageResponse } from "../config/type";

const BASE_URL = "/street-agent-profiles";

export interface StreetAgentProfile {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    cccd: string;
    imageUrl?: string;
    contactAddress?: string;
    contactProvince?: string;
    coverageArea?: string;
    commissionRate?: number;
    contractStartDate?: string;
    contractEndDate?: string;
    depositBalance?: number;
    depositAdjustmentReason?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    lastModifiedBy?: string;
}

export const getStreetAgentProfiles = async (
    params?: BaseQueryParams & { search?: string; status?: string }
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
