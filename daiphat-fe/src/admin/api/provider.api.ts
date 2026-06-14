import { apiApp } from '../../api';
import { ApiResponse, PageResponse } from '../config/type';

const BASE_URL = '/lottery-stations';

export const getProviders = async (params?: any): Promise<ApiResponse<PageResponse<any>>> => {
    const response = await apiApp.get(BASE_URL, { params });
    const result = response.data?.data;
    
    // Map BE response to match FE expectations
    const recordList = (result?.recordList || []).map((item: any) => ({
        ...item,
        _id: item.id,
        avatar: item.thumbnailUrl,
        status: item.status ? item.status.toLowerCase() : 'draft'
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
        item.status = item.status ? item.status.toLowerCase() : 'draft';
    }
    return response.data;
};

export const createProvider = async (data: any): Promise<any> => {
    const payload = {
        name: data.name,
        province: data.province || '',
        region: data.region || '',
        type: data.type || 'TRADITIONAL',
        numberLength: data.numberLength || 6,
        minNumber: data.minNumber,
        maxNumber: data.maxNumber,
        price: data.price || 10000,
        drawSchedule: data.drawSchedule || '',
        drawTime: data.drawTime || '',
        nextDrawDate: data.nextDrawDate || null,
        description: data.description || '',
        displayOrder: data.displayOrder || 0,
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
        type: data.type || 'TRADITIONAL',
        numberLength: data.numberLength || 6,
        minNumber: data.minNumber,
        maxNumber: data.maxNumber,
        price: data.price || 10000,
        drawSchedule: data.drawSchedule || '',
        drawTime: data.drawTime || '',
        nextDrawDate: data.nextDrawDate || null,
        description: data.description || '',
        displayOrder: data.displayOrder || 0,
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
