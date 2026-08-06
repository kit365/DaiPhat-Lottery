import { apiApp } from '../../api';
import Cookies from 'js-cookie';
import { ApiResponse } from '../config/type';
import { STORAGE_KEYS } from '../../constants/storage.constants';
import { prefixAdmin } from '../constants/routes';

const BASE_URL = `/${prefixAdmin}/setting`;

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getSettingGeneral = async (): Promise<ApiResponse<any>> => {
    throw new Error(
        'getSettingGeneral đã ngừng dùng. Dùng GET /admin/system-configs?configType=GENERAL_SETTING.'
    );
};


/** @deprecated Dùng PUT /admin/system-configs/{id} qua generalSettingService */
export const updateSettingGeneral = async (_data: any): Promise<ApiResponse<any>> => {
    throw new Error(
        'updateSettingGeneral đã ngừng dùng. Dùng PUT /admin/system-configs/{id}.'
    );
};

/** Lấy thông tin API hãng vận chuyển */
export const getSettingShipping = async (): Promise<ApiResponse<any>> => {
    const response = await apiApp.get(`${BASE_URL}/api-shipping`, withAuth());
    return response.data;
};

/** Cập nhật API hãng vận chuyển */
export const updateSettingShipping = async (data: any): Promise<ApiResponse<any>> => {
    const response = await apiApp.patch(`${BASE_URL}/api-shipping`, data, withAuth());
    return response.data;
};

/** Lấy thông tin API cổng thanh toán */
export const getSettingPayment = async (): Promise<ApiResponse<any>> => {
    const response = await apiApp.get(`${BASE_URL}/api-payment`, withAuth());
    return response.data;
};

/** Cập nhật API cổng thanh toán */
export const updateSettingPayment = async (data: any): Promise<ApiResponse<any>> => {
    const response = await apiApp.patch(`${BASE_URL}/api-payment`, data, withAuth());
    return response.data;
};

/** Lấy thông tin API đăng nhập MXH */
export const getSettingLoginSocial = async (): Promise<ApiResponse<any>> => {
    const response = await apiApp.get(`${BASE_URL}/api-login-social`, withAuth());
    return response.data;
};

/** Cập nhật API đăng nhập MXH */
export const updateSettingLoginSocial = async (data: any): Promise<ApiResponse<any>> => {
    const response = await apiApp.patch(`${BASE_URL}/api-login-social`, data, withAuth());
    return response.data;
};

/** Lấy thông tin API mật khẩu ứng dụng */
export const getSettingAppPassword = async (): Promise<ApiResponse<any>> => {
    const response = await apiApp.get(`${BASE_URL}/api-app-password`, withAuth());
    return response.data;
};

/** Cập nhật API mật khẩu ứng dụng */
export const updateSettingAppPassword = async (data: any): Promise<ApiResponse<any>> => {
    const response = await apiApp.patch(`${BASE_URL}/api-app-password`, data, withAuth());
    return response.data;
};

/** Lấy thông tin cấu hình tích điểm */
export const getSettingPoint = async (): Promise<ApiResponse<any>> => {
    const response = await apiApp.get(`${BASE_URL}/point`, withAuth());
    return response.data;
};

/** Cập nhật cấu hình tích điểm */
export const updateSettingPoint = async (data: any): Promise<ApiResponse<any>> => {
    const response = await apiApp.patch(`${BASE_URL}/point`, data, withAuth());
    return response.data;
};

/** Lấy thông tin trang tĩnh theo key */
export const getSettingPage = async (key: string): Promise<ApiResponse<any>> => {
    const response = await apiApp.get(`${BASE_URL}/page/${key}`, withAuth());
    return response.data;
};

/** Cập nhật trang tĩnh theo key */
export const updateSettingPage = async (key: string, data: any): Promise<ApiResponse<any>> => {
    const response = await apiApp.patch(`${BASE_URL}/page/${key}`, data, withAuth());
    return response.data;
};

