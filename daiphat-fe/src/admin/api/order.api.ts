import { apiApp } from '../../api';
import Cookies from 'js-cookie';

const BASE_URL = '/admin/order';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

import { mockOrders } from '../data/orders';

export const getOrders = async (params?: any) => {
    return {
        success: true,
        data: {
            recordList: mockOrders,
            pagination: {
                totalRecords: mockOrders.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            }
        }
    };
};



export const getOrderDetail = async (id: string) => {
    const order = mockOrders.find(o => o._id === id) || mockOrders[0];
    return {
        success: true,
        data: order
    };
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
