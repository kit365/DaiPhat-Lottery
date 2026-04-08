import { apiApp } from "../../api";

const BASE_URL = "/api/v1/client/booking/services";

export const getServices = async (params?: any) => {
    const response = await apiApp.get(BASE_URL, { params });
    return response.data;
};

export const getServiceBySlug = async (slug: string) => {
    const response = await apiApp.get(`${BASE_URL}/slug/${slug}`);
    return response.data;
};
