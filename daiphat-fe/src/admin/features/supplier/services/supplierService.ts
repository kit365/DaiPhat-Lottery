import Cookies from 'js-cookie';
import { apiApp } from '../../../../api';
import { ApiResponse, PageResponse } from '../../../../types/api.type';
import { STORAGE_KEYS } from '../../../../constants/storage.constants';
import type {
    CreateLotterySupplierPayload,
    LotterySupplier,
    SupplierListParams,
    UpdateLotterySupplierPayload,
} from '../types/supplier.type';

const BASE_URL = '/lottery-suppliers';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getSuppliers = async (
    params?: SupplierListParams
): Promise<ApiResponse<PageResponse<LotterySupplier>>> => {
    const response = await apiApp.get(BASE_URL, {
        ...withAuth(),
        params,
    });
    return response.data;
};

export const getActiveSuppliers = async (): Promise<LotterySupplier[]> => {
    const response = await getSuppliers({
        page: 1,
        size: 1000,
        isActive: true,
        sortBy: 'name',
        direction: 'asc',
    });
    return response.data?.recordList ?? [];
};

export const getSupplierById = async (
    id: number | string
): Promise<ApiResponse<LotterySupplier>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`, withAuth());
    return response.data;
};

export const createSupplier = async (
    payload: CreateLotterySupplierPayload
): Promise<ApiResponse<LotterySupplier>> => {
    const response = await apiApp.post(BASE_URL, payload, withAuth());
    return response.data;
};

export const updateSupplier = async (
    id: number | string,
    payload: UpdateLotterySupplierPayload
): Promise<ApiResponse<LotterySupplier>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, payload, withAuth());
    return response.data;
};
