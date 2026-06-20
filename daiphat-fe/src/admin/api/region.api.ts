import { apiApp } from '../../api';
import { ApiResponse } from '../config/type';
import { LotteryRegionResponse, UpdateLotteryRegionRequest } from '../pages/region/types/region';

const BASE_URL = '/lottery-regions';

export const getRegions = async (): Promise<ApiResponse<LotteryRegionResponse[]>> => {
    const response = await apiApp.get(BASE_URL);
    return response.data;
};

export const getRegionByCode = async (code: string): Promise<ApiResponse<LotteryRegionResponse>> => {
    const response = await apiApp.get(`${BASE_URL}/${code}`);
    return response.data;
};

export const updateRegion = async (code: string, data: UpdateLotteryRegionRequest): Promise<ApiResponse<LotteryRegionResponse>> => {
    const response = await apiApp.put(`${BASE_URL}/${code}`, data);
    return response.data;
};
