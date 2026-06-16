import { apiApp } from '../../api';
import {
    CancelPaymentRequest,
    PaymentResult,
    PendingPaymentCountdownResult,
    ProcessPaymentRequest
} from '../../types/transaction.type';
import { ApiResponse } from '../../admin/config/type';

const BASE_URL = '/transactions';

export const transactionService = {
    /**
     * Generates the payment checkout URL
     */
    processPayment: async (orderId: string, data: ProcessPaymentRequest): Promise<ApiResponse<PaymentResult>> => {
        const response = await apiApp.post(`${BASE_URL}/${orderId}/payment`, data);
        return response.data;
    },

    cancelPayment: async (orderId: string, data: CancelPaymentRequest): Promise<ApiResponse<any>> => {
        const response = await apiApp.post(`${BASE_URL}/${orderId}/payment/cancel`, data);
        return response.data;
    },

    getPendingPaymentCountdown: async (orderId: string): Promise<ApiResponse<PendingPaymentCountdownResult>> => {
        const response = await apiApp.get(`${BASE_URL}/${orderId}/payment/countdown`);
        return response.data;
    },
    
    /**
     * Gets available transaction types
     */
    getTransactionTypes: async (): Promise<ApiResponse<any[]>> => {
        const response = await apiApp.get(`${BASE_URL}/types`);
        return response.data;
    }
};
