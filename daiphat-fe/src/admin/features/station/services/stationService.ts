import { apiApp } from '../../../../api';
import { ApiResponse, PageResponse } from '../../../../types/api.type';
import {
    Station,
    StationQueryParams,
    CreateStationRequest,
    UpdateStationRequest,
    SyncStationPreviewParams,
    SyncStationConfirmRequest,
} from '../types/station.type';

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

const toDrawDaysArray = (drawDays?: string[] | string) => {
    if (Array.isArray(drawDays)) return drawDays;
    if (typeof drawDays === 'string') {
        return drawDays.split(',').map((d) => d.trim()).filter(Boolean);
    }
    return [];
};

const mapStation = (item: Station): Station => {
    const drawDays = normalizeDrawDaysFromBackend(toDrawDaysArray(item.drawDays));
    return {
        ...item,
        _id: item.id,
        avatar: item.thumbnailUrl,
        drawDays,
        drawSchedule: drawDays.join(', '),
        status: item.status ? item.status.toLowerCase() : 'active',
    };
};

export const getStations = async (
    params?: StationQueryParams
): Promise<ApiResponse<PageResponse<Station>>> => {
    const requestParams = params
        ? (() => {
              const { limit, ...rest } = params;
              return {
                  ...rest,
                  // LotteryStationController uses `size`; the UI model uses `limit`.
                  size: limit,
                  drawDay: params.drawDay
                      ? String(params.drawDay)
                            .split(',')
                            .map((d) => FE_TO_BACKEND_DAY[d.trim()] || d.trim())
                            .filter(Boolean)
                            .join(',')
                      : undefined,
              };
          })()
        : undefined;

    const response = await apiApp.get(BASE_URL, { params: requestParams });
    const result = response.data?.data;
    const recordList = (result?.recordList || []).map(mapStation);

    return {
        ...response.data,
        success: response.data?.success ?? true,
        message: response.data?.message || '',
        timestamp: response.data?.timestamp || new Date().toISOString(),
        data: {
            recordList,
            pagination: result?.pagination || {
                totalRecords: recordList.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10,
                isFirst: true,
                isLast: true,
            },
            statusCounts: {
                all: result?.pagination?.totalRecords || recordList.length,
                active: recordList.filter((b) => b.status === 'active').length,
                inactive: recordList.filter((b) => b.status === 'inactive').length,
            },
        },
    };
};

export const getStationById = async (
    id: string | number
): Promise<ApiResponse<Station>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`);
    const item = response.data?.data;
    if (item) {
        Object.assign(item, mapStation(item));
    }
    return response.data;
};

export const createStation = async (
    data: CreateStationRequest
): Promise<ApiResponse<Station>> => {
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

export const updateStation = async (
    id: string | number,
    data: UpdateStationRequest
): Promise<ApiResponse<Station>> => {
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

/**
 * Corrects only a station's weekly draw schedule.
 *
 * <p>Deliberately not updateStation: that sends the whole record, and a caller
 * that never loaded the price or region would blank them. Reached from the
 * file-import preview when a file names a station on a weekday its schedule does
 * not cover.
 */
export const updateStationSchedule = async (payload: {
    lotteryStationId: number;
    /** Backend day names, e.g. MONDAY. */
    drawDays: string[];
    drawTime?: string;
}): Promise<ApiResponse<Station>> => {
    const response = await apiApp.put(`${BASE_URL}/schedule`, payload);
    return response.data;
};

export const bulkUpdateStationPricing = async (
    items: Array<{ lotteryStationId: number; importCost: number; commissionRate: number }>
): Promise<ApiResponse<Station[]>> => {
    const response = await apiApp.put(`${BASE_URL}/pricing`, { items });
    return response.data;
};

/**
 * Corrects only station commission rates.
 *
 * Deliberately not bulkUpdateStationPricing: that writes lottery_stations.price
 * (sale price). Matching uses NCC defaultImportCost and must not overwrite sale price.
 */
export const bulkUpdateStationCommissions = async (
    items: Array<{ lotteryStationId: number; commissionRate: number }>
): Promise<ApiResponse<Station[]>> => {
    const response = await apiApp.put(`${BASE_URL}/commissions`, { items });
    return response.data;
};

export const deleteStation = async (
    id: string | number
): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};

export const getStationsToday = async (): Promise<Station[]> => {
    const response = await apiApp.get(`${BASE_URL}/schedule/today`);
    const result = response.data?.data || [];
    return result.map(mapStation);
};

export const getStationsTomorrow = async (): Promise<Station[]> => {
    const response = await apiApp.get(`${BASE_URL}/schedule/tomorrow`);
    const result = response.data?.data || [];
    return result.map(mapStation);
};

export const getStationsByDrawDate = async (
    drawDate: string | string[]
): Promise<Station[]> => {
    const drawDates = Array.isArray(drawDate)
        ? drawDate.filter(Boolean)
        : [drawDate].filter(Boolean);

    const responses = await Promise.all(
        drawDates.map((value) =>
            apiApp.get(`${BASE_URL}/schedule`, {
                params: { drawDate: value },
            })
        )
    );

    const mapped = responses.flatMap((response) => {
        const result = response.data?.data || [];
        return result.map(mapStation);
    });

    const seen = new Set<string>();
    return mapped.filter((item) => {
        const key = String(item.id || item._id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

export const uploadStationImage = async (
    id: string | number,
    file: File
): Promise<ApiResponse<Station>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiApp.post(`${BASE_URL}/${id}/image`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

/** Asks the backend for a free station code derived from a name. */
export const suggestStationCode = async (
    name: string,
    excludeStationId?: number
): Promise<string> => {
    const response = await apiApp.get(`${BASE_URL}/suggest-code`, {
        params: { name, ...(excludeStationId != null ? { excludeStationId } : {}) },
    });
    return response.data?.data ?? '';
};

export const previewSyncStations = async (
    data: SyncStationPreviewParams
): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.post(`${BASE_URL}/sync`, data);
    return response.data;
};

export const confirmSyncStations = async (
    data: SyncStationConfirmRequest
): Promise<ApiResponse<unknown>> => {
    const response = await apiApp.post(`${BASE_URL}/sync/confirm`, data);
    return response.data;
};
