import Cookies from 'js-cookie';
import { apiApp } from '../../../../../api';
import { ApiResponse, PageResponse } from '../../../../../types/api.type';
import { STORAGE_KEYS } from '../../../../../constants/storage.constants';
import type {
    SupplierSettlement,
    SupplierSettlementListParams,
} from '../types/supplierSettlement.type';

const BASE_URL = '/supplier-settlements';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getSupplierSettlements = async (
    params?: SupplierSettlementListParams
): Promise<ApiResponse<PageResponse<SupplierSettlement>>> => {
    const response = await apiApp.get(BASE_URL, {
        ...withAuth(),
        params,
    });
    return response.data;
};

export const getSupplierSettlementById = async (
    id: number | string
): Promise<ApiResponse<SupplierSettlement>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`, withAuth());
    return response.data;
};
