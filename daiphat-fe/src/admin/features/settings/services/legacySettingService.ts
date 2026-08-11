import { apiApp } from '@/api';
import type { ApiResponse } from '@/types/api.type';
import { prefixAdmin } from '@/admin/constants/routes';

const BASE_URL = `/${prefixAdmin}/setting`;

export const getSettingShipping = async (): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.get(`${BASE_URL}/api-shipping`);
    return response.data;
};

export const updateSettingShipping = async (data: unknown): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.patch(`${BASE_URL}/api-shipping`, data);
    return response.data;
};

export const getSettingPayment = async (): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.get(`${BASE_URL}/api-payment`);
    return response.data;
};

export const updateSettingPayment = async (data: unknown): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.patch(`${BASE_URL}/api-payment`, data);
    return response.data;
};

export const getSettingLoginSocial = async (): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.get(`${BASE_URL}/api-login-social`);
    return response.data;
};

export const updateSettingLoginSocial = async (data: unknown): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.patch(`${BASE_URL}/api-login-social`, data);
    return response.data;
};

export const getSettingAppPassword = async (): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.get(`${BASE_URL}/api-app-password`);
    return response.data;
};

export const updateSettingAppPassword = async (data: unknown): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.patch(`${BASE_URL}/api-app-password`, data);
    return response.data;
};

export const getSettingPoint = async (): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.get(`${BASE_URL}/point`);
    return response.data;
};

export const updateSettingPoint = async (data: unknown): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.patch(`${BASE_URL}/point`, data);
    return response.data;
};

export const getSettingPage = async (key: string): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.get(`${BASE_URL}/page/${key}`);
    return response.data;
};

export const updateSettingPage = async (key: string, data: unknown): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.patch(`${BASE_URL}/page/${key}`, data);
    return response.data;
};
