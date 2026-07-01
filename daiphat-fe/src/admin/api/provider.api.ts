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

const mapStationItem = (item: any) => ({
    ...item,
    _id: item.id,
    avatar: item.thumbnailUrl,
    drawDays: normalizeDrawDaysFromBackend(item.drawDays),
    drawSchedule: mapDrawSchedule(item.drawDays),
    isActive: Boolean(item.isActive),
    missingActivationFields: item.missingActivationFields || [],
    commissionRate: item.commissionRate ?? null,
});

const serializeListFilterParam = (value?: string | string[]) => {
    if (!value) {
        return undefined;
    }
    if (Array.isArray(value)) {
        const normalized = value.filter(Boolean);
        return normalized.length > 0 ? normalized.join(',') : undefined;
    }
    return value;
};

export const getProviders = async (params?: any): Promise<ApiResponse<PageResponse<any>>> => {
    const response = await apiApp.get(BASE_URL, {
        params: {
            ...params,
            region: serializeListFilterParam(params?.region),
            drawDay: serializeListFilterParam(params?.drawDay),
        },
    });
    const result = response.data?.data;

    const recordList = (result?.recordList || []).map(mapStationItem);

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
                active: recordList.filter((b: any) => b.isActive).length,
                inactive: recordList.filter((b: any) => !b.isActive).length,
            }
        }
    };
};

export const getProviderById = async (id: string | number): Promise<any> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`);
    const item = response.data?.data;
    if (item) {
        Object.assign(item, mapStationItem(item));
    }
    return response.data;
};

export const createProvider = async (data: any): Promise<any> => {
    const payload = {
        name: data.name,
        province: data.province || '',
        region: data.region || '',
        price: data.price || 10000,
        commissionRate: data.commissionRate ?? null,
        drawDays: normalizeDrawDaysForBackend(data.drawDays),
        drawTime: data.drawTime || '',
        image: data.image || '',
        description: data.description || '',
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
        commissionRate: data.commissionRate ?? null,
        drawDays: normalizeDrawDaysForBackend(data.drawDays),
        drawTime: data.drawTime || '',
        image: data.image || '',
        description: data.description || '',
        isActive: Boolean(data.isActive),
    };
    const response = await apiApp.put(`${BASE_URL}/${id}`, payload);
    const result = response.data;
    if (result?.data) {
        result.data = mapStationItem(result.data);
    }
    return result;
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
        isActive: Boolean(item.isActive),
    }));
};

export const getStationsTomorrow = async (): Promise<any> => {
    const response = await apiApp.get(`${BASE_URL}/schedule/tomorrow`);
    const result = response.data?.data || [];
    return result.map((item: any) => ({
        ...item,
        id: item.id || item._id,
        avatar: item.thumbnailUrl || item.avatar,
        drawDays: normalizeDrawDaysFromBackend(item.drawDays),
        drawSchedule: mapDrawSchedule(item.drawDays),
        isActive: Boolean(item.isActive),
    }));
};

export const getStationsByDrawDate = async (drawDate: string | string[]): Promise<any> => {
    const drawDates = Array.isArray(drawDate) ? drawDate.filter(Boolean) : [drawDate].filter(Boolean);

    const responses = await Promise.all(
        drawDates.map((value) => apiApp.get(`${BASE_URL}/schedule`, {
            params: { drawDate: value },
        }))
    );

    const mapped = responses.flatMap((response) => {
        const result = response.data?.data || [];
        return result.map((item: any) => ({
            ...item,
            id: item.id || item._id,
            avatar: item.thumbnailUrl || item.avatar,
            drawDays: normalizeDrawDaysFromBackend(item.drawDays),
            drawSchedule: mapDrawSchedule(item.drawDays),
            isActive: Boolean(item.isActive),
        }));
    });

    const seen = new Set<string>();
    return mapped.filter((item: any) => {
        const key = String(item.id || item._id);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
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

export const previewSyncProviders = async (data: {
    source: string;
    region: string;
    defaultPrice: number;
}): Promise<any> => {
    const response = await apiApp.post(`${BASE_URL}/sync`, data);
    return response.data;
};

export const confirmSyncProviders = async (data: {
    source: string;
    region: string;
    defaultPrice: number;
    items: Array<{
        name: string;
        canonicalName: string;
        drawDays: string[];
        drawTime: string;
        commissionRate: number | null;
        action: string;
        existingStationId: number | null;
    }>;
}): Promise<any> => {
    const response = await apiApp.post(`${BASE_URL}/sync/confirm`, data);
    return response.data;
};
