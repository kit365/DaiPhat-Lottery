import { apiApp } from '../../api';
import Cookies from 'js-cookie';
import { STORAGE_KEYS } from '../../constants/storage.constants';
const BASE_URL = '/admin/order';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

import { OrderFilterParams, OrderResponse } from '../../../types/order.type';
import { ApiResponse, PageResponse } from '../../../types/api.type';

const normalizeOrderFilterParams = (params?: OrderFilterParams) => {
    if (!params) return undefined;
    const normalized = { ...params } as Record<string, any>;

    (['status', 'orderType', 'receiveType'] as const).forEach((key) => {
        const value = normalized[key];
        if (Array.isArray(value)) {
            normalized[key] = value.length > 0 ? value.join(',') : undefined;
        }
    });

    return normalized;
};

export const getOrders = async (params?: OrderFilterParams): Promise<ApiResponse<PageResponse<OrderResponse>>> => {
    const response = await apiApp.get(`/orders`, {
        ...withAuth(),
        params: normalizeOrderFilterParams(params)
    });
    return response.data;
};

export const getOrderDetail = async (id: string): Promise<ApiResponse<OrderResponse>> => {
    const response = await apiApp.get(`/orders/${id}`, withAuth());
    return response.data;
};


export const updateOrderStatus = async (id: string, status: string) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}/status`, { status }, withAuth());
    return response.data;
};

export const createOrder = async (data: any) => {
    const response = await apiApp.post(`${BASE_URL}/create`, data, withAuth());
    return response.data;
};

export const updateOrder = async (id: string, data: any) => {
    const response = await apiApp.patch(`${BASE_URL}/edit/${id}`, data, withAuth());
    return response.data;
};

export const exportInvoicePdf = async (orderCode: string, phone: string) => {
    const response = await apiApp.get(`/client/order/export-pdf`, {
        ...withAuth(),
        params: { orderCode, phone },
        responseType: 'blob'
    });
    return response.data;
};
