import { apiApp } from "../../api/index";

const API_ORDER = "/api/v1/client/order";

export const createOrder = async (data: any) => {
    try {
        const response = await apiApp.post(`${API_ORDER}/create`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};


export const getOrderSuccess = async (orderCode: string, phone: string) => {
    try {
        const response = await apiApp.get(`${API_ORDER}/success?orderCode=${orderCode}&phone=${phone}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const exportInvoicePdf = async (orderCode: string, phone: string) => {
    try {
        const response = await apiApp.get(`${API_ORDER}/export-pdf`, {
            params: { orderCode, phone },
            responseType: 'blob'
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const cancelOrder = async (id: string, reason?: string) => {
    try {
        const response = await apiApp.patch(`${API_ORDER}/${id}/cancel`, { reason });
        return response.data;
    } catch (error) {
        throw error;
    }
};
export const confirmReceipt = async (id: string) => {
    try {
        const response = await apiApp.patch(`${API_ORDER}/${id}/confirm-receipt`);
        return response.data;
    } catch (error) {
        throw error;
    }
};
