import { apiApp } from '@/api';

const BASE_URL = '/admin/schedules';

export const getMySchedules = async (params?: { startDate?: string; endDate?: string }) => {
    const response = await apiApp.get(`${BASE_URL}/my-schedule`, { params });
    return response.data;
};

export const getSchedules = async (params?: Record<string, unknown>) => {
    const response = await apiApp.get(BASE_URL, { params });
    return response.data;
};

export const getCalendarData = async (month: number, year: number, departmentId?: string) => {
    const response = await apiApp.get(`${BASE_URL}/calendar`, {
        params: { month, year, departmentId },
    });
    return response.data;
};

export const createSchedule = async (data: Record<string, unknown>) => {
    const response = await apiApp.post(BASE_URL, data);
    return response.data;
};

export const bulkCreateSchedules = async (data: Record<string, unknown>) => {
    const response = await apiApp.post(`${BASE_URL}/bulk`, data);
    return response.data;
};

export const updateSchedule = async (id: string, data: Record<string, unknown>) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}`, data);
    return response.data;
};

export const deleteSchedule = async (id: string) => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};

export const bulkDeleteSchedules = async (data: Record<string, unknown>) => {
    const response = await apiApp.post(`${BASE_URL}/bulk-delete`, data);
    return response.data;
};

export const checkInSchedule = async (id: string) => {
    const response = await apiApp.patch(`${BASE_URL}/check-in/${id}`, {});
    return response.data;
};

export const checkOutSchedule = async (id: string) => {
    const response = await apiApp.patch(`${BASE_URL}/check-out/${id}`, {});
    return response.data;
};
