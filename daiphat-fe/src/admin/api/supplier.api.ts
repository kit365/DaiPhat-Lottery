import Cookies from 'js-cookie';
import { apiApp } from '../../api';
import { ApiResponse, PageResponse } from '../config/type';
import { STORAGE_KEYS } from '../../constants/storage.constants';

const BASE_URL = '/lottery-suppliers';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export type LotterySupplierType = 'LOTTERY_COMPANY' | 'DISTRIBUTOR';

export interface LotterySupplier {
    id: number;
    name: string;
    code: string;
    type: LotterySupplierType;
    typeLabel?: string;
    contactName?: string;
    contactPhone: string;
    contactEmail?: string;
    address?: string;
    taxCode?: string;
    paymentTermDays?: number;
    defaultImportCost?: number;
    isActive: boolean;
    missingActivationFields?: string[];
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateLotterySupplierPayload {
    name: string;
    code: string;
    type: LotterySupplierType;
    contactName?: string;
    contactPhone: string;
    contactEmail?: string;
    address?: string;
    taxCode?: string;
    paymentTermDays?: number | null;
    defaultImportCost?: number | null;
    isActive?: boolean;
}

export type UpdateLotterySupplierPayload = CreateLotterySupplierPayload & {
    isActive: boolean;
};

export interface SupplierListParams {
    page?: number;
    size?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    direction?: string;
}

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
    const response = await getSuppliers({ page: 1, size: 1000, isActive: true, sortBy: 'name', direction: 'asc' });
    return response.data?.recordList ?? [];
};

export const getSupplierById = async (id: number | string): Promise<ApiResponse<LotterySupplier>> => {
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
