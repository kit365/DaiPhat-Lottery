import { apiApp } from '../../../../api';
import { ApiResponse } from '../../../../types/api.type';
import {
    PrizeStructureResponse,
    PrizeStructureSyncRequest,
    PrizeStructureSyncResponse,
} from '../types/prize-structure';

const BASE_URL = '/prize-structures';

export const syncPrizeStructures = async (
    data: PrizeStructureSyncRequest
): Promise<ApiResponse<PrizeStructureSyncResponse>> => {
    const response = await apiApp.post(`${BASE_URL}/regions/sync`, data);
    return response.data;
};

export const replacePrizeStructures = async (
    region: string,
    items: Omit<PrizeStructureResponse, 'id' | 'regionId' | 'regionCode' | 'createdAt' | 'updatedAt'>[]
): Promise<ApiResponse<PrizeStructureResponse[]>> => {
    const response = await apiApp.put(`${BASE_URL}/regions/${region}`, items);
    return response.data;
};

export const getPrizeStructuresByRegion = async (
    region: string
): Promise<ApiResponse<PrizeStructureResponse[]>> => {
    const response = await apiApp.get(`${BASE_URL}/regions/${region}`);
    return response.data;
};
