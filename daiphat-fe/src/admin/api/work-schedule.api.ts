import { apiApp } from "../../api";
import Cookies from "js-cookie";

const BASE_URL = "/api/v1/admin/schedules";

const withAuth = () => {
    const token = Cookies.get("tokenAdmin");
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getMySchedules = async (params?: { startDate?: string; endDate?: string }) => {
    const response = await apiApp.get(`${BASE_URL}/my-schedule`, { ...withAuth(), params });
    return response.data;
};

export const getSchedules = async (params?: any) => {
    const response = await apiApp.get(BASE_URL, { ...withAuth(), params });
    return response.data;
};

export const getCalendarData = async (month: number, year: number, departmentId?: string) => {
    const response = await apiApp.get(`${BASE_URL}/calendar`, {
        ...withAuth(),
        params: { month, year, departmentId }
    });
    return response.data;
};

export const createSchedule = async (data: any) => {
    const response = await apiApp.post(BASE_URL, data, withAuth());
    return response.data;
};

export const bulkCreateSchedules = async (data: any) => {
    const response = await apiApp.post(`${BASE_URL}/bulk`, data, withAuth());
    return response.data;
};

export const updateSchedule = async (id: string, data: any) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}`, data, withAuth());
    return response.data;
};

export const deleteSchedule = async (id: string) => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`, withAuth());
    return response.data;
};

export const bulkDeleteSchedules = async (data: any) => {
    const response = await apiApp.post(`${BASE_URL}/bulk-delete`, data, withAuth());
    return response.data;
};

export const checkInSchedule = async (id: string) => {
    const response = await apiApp.patch(`${BASE_URL}/check-in/${id}`, {}, withAuth());
    return response.data;
};

export const checkOutSchedule = async (id: string) => {
    const response = await apiApp.patch(`${BASE_URL}/check-out/${id}`, {}, withAuth());
    return response.data;
};
