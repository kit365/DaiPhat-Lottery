import { apiApp } from "../../api/index";

const API_AUTH = "/client/auth";

export const login = async (data: any) => {
    try {
        const response = await apiApp.post(`${API_AUTH}/login`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const register = async (data: any) => {
    try {
        const response = await apiApp.post(`${API_AUTH}/register`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const logout = async () => {
    try {
        const response = await apiApp.post(`${API_AUTH}/logout`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const forgotPassword = async (data: any) => {
    try {
        const response = await apiApp.post(`${API_AUTH}/forgot-password`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const verifyOTP = async (data: any) => {
    try {
        const response = await apiApp.post(`${API_AUTH}/otp-password`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const resetPassword = async (data: any) => {
    try {
        const response = await apiApp.post(`${API_AUTH}/reset-password`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};
export const getMe = async () => {
    try {
        const response = await apiApp.get(`${API_AUTH}/me`);
        return response.data;
    } catch (error) {
        throw error;
    }
};
