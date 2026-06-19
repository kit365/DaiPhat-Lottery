import { apiApp } from '../../api';
import { PrizeStructureSyncRequest, PrizeStructureSyncResponse, PrizeStructureResponse } from '../pages/prize-structure/types/prize-structure';

const BASE_URL = '/prize-structures';

export const syncPrizeStructure = async (data: PrizeStructureSyncRequest): Promise<{ data: PrizeStructureSyncResponse; message?: string }> => {
    const response = await apiApp.post(`${BASE_URL}/regions/sync`, data);
    return response.data;
};

export const getPrizeStructuresByRegion = async (region: string): Promise<{ data: PrizeStructureResponse[] }> => {
    const response = await apiApp.get(`${BASE_URL}/regions/${region}`);
    return response.data;
};
