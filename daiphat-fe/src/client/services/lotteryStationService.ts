import { ApiResponse } from '../../admin/config/type';
import { apiApp } from '../../api';
import {
  LotteryStationDraw,
  LotteryStationDrawApiResponse,
  LotteryStationSchedulePublicResponse,
  formatDisplayDateToApi,
  mapStationDrawToClient,
} from '../types/lottery';

const BASE_URL = '/lottery-stations';

export const lotteryStationService = {
  async getScheduleForDate(date: string): Promise<LotteryStationDraw[]> {
    const response = await apiApp.get<ApiResponse<LotteryStationDrawApiResponse[]>>(`${BASE_URL}/schedule`, {
      params: {
        drawDate: formatDisplayDateToApi(date),
      },
    });

    return (response.data.data || []).map(mapStationDrawToClient);
  },

  async getPublicSchedule(params?: {
    region?: string;
    stationId?: number;
    stationIds?: number[];
    drawDate?: string;
  }): Promise<LotteryStationSchedulePublicResponse[]> {
    const response = await apiApp.get<ApiResponse<LotteryStationSchedulePublicResponse[]>>(`${BASE_URL}/schedule/all`, {
      params: {
        region: params?.region,
        stationId: params?.stationId,
        stationIds: params?.stationIds,
        drawDate: params?.drawDate,
      },
    });
    return response.data.data || [];
  },
};
