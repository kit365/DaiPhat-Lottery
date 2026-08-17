import { apiApp } from '../../api';
import { ApiResponse } from '../../types/api.type';
import {
    CreateUserBankAccountRequest,
    UpdateUserBankAccountRequest,
    UserBankAccountResponse
} from '../../types/refund.type';

const BASE_URL = '/users/me/bank-accounts';

/** Hook `useBankAccount` tự hiển thị toast — tránh trùng với interceptor axios. */
const MUTATION_REQUEST = { skipGlobalErrorToast: true } as const;

export const bankAccountService = {
    getMyAccounts: async (): Promise<ApiResponse<UserBankAccountResponse[]>> => {
        const response = await apiApp.get(BASE_URL);
        return response.data;
    },

    create: async (data: CreateUserBankAccountRequest): Promise<ApiResponse<UserBankAccountResponse>> => {
        const response = await apiApp.post(BASE_URL, data, MUTATION_REQUEST);
        return response.data;
    },

    update: async (id: number, data: UpdateUserBankAccountRequest): Promise<ApiResponse<UserBankAccountResponse>> => {
        const response = await apiApp.put(`${BASE_URL}/${id}`, data, MUTATION_REQUEST);
        return response.data;
    },

    delete: async (id: number): Promise<ApiResponse<void>> => {
        const response = await apiApp.delete(`${BASE_URL}/${id}`, MUTATION_REQUEST);
        return response.data;
    },

    setDefault: async (id: number): Promise<ApiResponse<UserBankAccountResponse>> => {
        const response = await apiApp.patch(`${BASE_URL}/${id}/default`, undefined, MUTATION_REQUEST);
        return response.data;
    }
};
