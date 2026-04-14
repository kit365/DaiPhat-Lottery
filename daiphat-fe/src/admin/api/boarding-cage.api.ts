import { apiApp } from "../../api";
import Cookies from "js-cookie";

const BASE_URL = "/admin/boarding-cage";

const withAuth = () => {
    const token = Cookies.get("tokenAdmin");
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getBoardingCages = async (params?: any) => {
    const response = await apiApp.get(BASE_URL, { ...withAuth(), params });
    return response.data;
};

export const createBoardingCage = async (data: any) => {
    const response = await apiApp.post(`${BASE_URL}/create`, data, withAuth());
    return response.data;
};

export const updateBoardingCage = async (id: string, data: any) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}`, data, withAuth());
    return response.data;
};

export const deleteBoardingCage = async (id: string) => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`, withAuth());
    return response.data;
};

export const restoreBoardingCage = async (id: string) => {
    const response = await apiApp.patch(`${BASE_URL}/restore/${id}`, {}, withAuth());
    return response.data;
};

export const forceDeleteBoardingCage = async (id: string) => {
    const response = await apiApp.delete(`${BASE_URL}/force-delete/${id}`, withAuth());
    return response.data;
};
