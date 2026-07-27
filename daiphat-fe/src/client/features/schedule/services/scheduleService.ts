import { apiApp } from '../../../../api';
import type { ApiResponse } from '../../../../types/api.type';
import type { LotteryStationSchedule, ScheduleQueryParams } from '../types/schedule.types';

const SCHEDULE_API_URL = '/lottery-stations/schedule/all';

export const getPublicSchedule = async (
    params?: ScheduleQueryParams,
): Promise<LotteryStationSchedule[]> => {
    const response = await apiApp.get<ApiResponse<LotteryStationSchedule[]>>(SCHEDULE_API_URL, { params });
    return response.data.data || [];
};

export const getDrawingToday = async (region?: string): Promise<LotteryStationSchedule[]> => {
    const response = await apiApp.get<ApiResponse<LotteryStationSchedule[]>>('/lottery-stations/schedule/today', {
        params: region ? { region } : undefined,
    });
    return response.data.data || [];
};
