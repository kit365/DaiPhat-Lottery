import { apiApp } from '../../api';
import { ApiResponse, PageResponse } from '../config/type';

const BASE_URL = '/lottery-stations';

const FE_TO_BACKEND_DAY: Record<string, string> = {
    T2: 'MONDAY',
    T3: 'TUESDAY',
    T4: 'WEDNESDAY',
    T5: 'THURSDAY',
    T6: 'FRIDAY',
    T7: 'SATURDAY',
    CN: 'SUNDAY',
};

const BACKEND_TO_FE_DAY: Record<string, string> = {
    MONDAY: 'T2',
    TUESDAY: 'T3',
    WEDNESDAY: 'T4',
    THURSDAY: 'T5',
    FRIDAY: 'T6',
    SATURDAY: 'T7',
    SUNDAY: 'CN',
};

const normalizeDrawDaysFromBackend = (drawDays?: string[]) =>
    Array.isArray(drawDays)
        ? drawDays.map((day) => BACKEND_TO_FE_DAY[day] || day)
        : [];

const normalizeDrawDaysForBackend = (drawDays?: string[]) =>
    Array.isArray(drawDays)
        ? drawDays.map((day) => FE_TO_BACKEND_DAY[day] || day)
        : [];

const mapDrawSchedule = (drawDays?: string[]) =>
    normalizeDrawDaysFromBackend(drawDays).join(', ');

export const getProviders = async (params?: any): Promise<ApiResponse<PageResponse<any>>> => {
    const response = await apiApp.get(BASE_URL, { params });
    const result = response.data?.data;
    
    // Map BE response to match FE expectations
    const recordList = (result?.recordList || []).map((item: any) => ({
        ...item,
        _id: item.id,
        avatar: item.thumbnailUrl,
        drawDays: normalizeDrawDaysFromBackend(item.drawDays),
        drawSchedule: mapDrawSchedule(item.drawDays),
        status: item.status ? item.status.toLowerCase() : 'active'
    }));

    return {
        success: true,
        message: response.data?.message || "",
        timestamp: response.data?.timestamp || new Date().toISOString(),
        data: {
            recordList,
            pagination: result?.pagination || {
                totalRecords: recordList.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            },
            statusCounts: {
                all: result?.pagination?.totalRecords || recordList.length,
                active: recordList.filter((b: any) => b.status === 'active').length,
                inactive: recordList.filter((b: any) => b.status === 'inactive').length,
            }
        }
    };
};

export const getProviderById = async (id: string | number): Promise<any> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`);
    const item = response.data?.data;
    if (item) {
        item._id = item.id;
        item.avatar = item.thumbnailUrl;
        item.drawDays = normalizeDrawDaysFromBackend(item.drawDays);
        item.drawSchedule = mapDrawSchedule(item.drawDays);
        item.status = item.status ? item.status.toLowerCase() : 'active';
    }
    return response.data;
};

export const createProvider = async (data: any): Promise<any> => {
    const payload = {
        name: data.name,
        province: data.province || '',
        region: data.region || '',
        price: data.price || 10000,
        drawDays: normalizeDrawDaysForBackend(data.drawDays),
        drawTime: data.drawTime || '',
        image: data.image || '',
        description: data.description || '',
        status: data.status ? data.status.toUpperCase() : 'ACTIVE',
    };
    const response = await apiApp.post(BASE_URL, payload);
    return response.data;
};

export const updateProvider = async (id: string | number, data: any): Promise<any> => {
    const payload = {
        name: data.name,
        province: data.province || '',
        region: data.region || '',
        price: data.price || 10000,
        drawDays: normalizeDrawDaysForBackend(data.drawDays),
        drawTime: data.drawTime || '',
        image: data.image || '',
        description: data.description || '',
        status: data.status ? data.status.toUpperCase() : 'ACTIVE',
    };
    const response = await apiApp.put(`${BASE_URL}/${id}`, payload);
    return response.data;
};

export const deleteProvider = async (id: string | number): Promise<any> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};

export const forceDeleteProvider = async (id: string | number): Promise<any> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};

export const getStationsToday = async (): Promise<any> => {
    const response = await apiApp.get(`${BASE_URL}/schedule/today`);
    const result = response.data?.data || [];
    // Map BE response to match FE expectations for dynamicProvinces
    return result.map((item: any) => ({
        ...item,
        id: item.id || item._id,
        avatar: item.thumbnailUrl || item.avatar,
        drawDays: normalizeDrawDaysFromBackend(item.drawDays),
        drawSchedule: mapDrawSchedule(item.drawDays),
        status: item.status ? item.status.toLowerCase() : 'active'
    }));
};

export const getStationsTomorrow = async (): Promise<any> => {
    const response = await apiApp.get(`${BASE_URL}/schedule/tomorrow`);
    const result = response.data?.data || [];
    // Map BE response to match FE expectations for dynamicProvinces
    return result.map((item: any) => ({
        ...item,
        id: item.id || item._id,
        avatar: item.thumbnailUrl || item.avatar,
        drawDays: normalizeDrawDaysFromBackend(item.drawDays),
        drawSchedule: mapDrawSchedule(item.drawDays),
        status: item.status ? item.status.toLowerCase() : 'active'
    }));
};

export const uploadProviderImage = async (id: string | number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiApp.post(`${BASE_URL}/${id}/image`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const syncProviders = async (data: any): Promise<any> => {
    const response = await apiApp.post(`${BASE_URL}/sync`, data);
    return response.data;
};
