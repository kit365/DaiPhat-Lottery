import { apiApp } from '../../api';
import { ApiResponse } from '../../types/api.type';
import { VietQrBankResponse } from '../../types/refund.type';

const BASE_URL = '/banks';

export const bankCatalogService = {
    getBanks: async (): Promise<ApiResponse<VietQrBankResponse[]>> => {
        const response = await apiApp.get(BASE_URL);
        return response.data;
    }
};
