import { ApiResponse } from '../../admin/config/type';
import { apiApp } from '../../api';
import {
  LotteryStationDraw,
  LotteryStationDrawApiResponse,
  formatDisplayDateToApi,
  mapStationDrawToClient,
} from '../types/lottery';

const BASE_URL = '/lottery-stations';

export const lotteryStationService = {
  async getScheduleForDate(date: string): Promise<LotteryStationDraw[]> {
    try {
      const response = await apiApp.get<ApiResponse<LotteryStationDrawApiResponse[]>>(`${BASE_URL}/schedule`, {
        params: {
          drawDate: formatDisplayDateToApi(date),
        },
      });

      return (response.data?.data || []).map(mapStationDrawToClient);
    } catch (error) {
      console.warn('Failed to fetch schedule for date:', error);
      return [];
    }
  },
};
