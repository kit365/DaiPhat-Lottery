import Cookies from 'js-cookie';
import { apiApp } from '../../../../../api';
import { ApiResponse, PageResponse } from '../../../../../types/api.type';
import { STORAGE_KEYS } from '../../../../../constants/storage.constants';
import type {
    SupplierSettlement,
    SupplierSettlementListParams,
    SupplierSettlementOverview,
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

export const getSupplierSettlementOverview = async (
    id: number | string
): Promise<ApiResponse<SupplierSettlementOverview>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}/overview`, withAuth());
    return response.data;
};

export const updateSupplierSettlementReceiptUrl = async (
    id: number | string,
    supplierSettlementReceiptUrl: string
): Promise<ApiResponse<SupplierSettlement>> => {
    const response = await apiApp.post(
        `${BASE_URL}/${id}/receipt`,
        { supplierSettlementReceiptUrl },
        withAuth()
    );
    return response.data;
};
