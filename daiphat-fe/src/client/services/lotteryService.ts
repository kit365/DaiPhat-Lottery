import type { ApiResponse } from '@/types/api.type';
import { apiApp } from '../../api';
import {
  LotteryBoardData,
  LotteryResultLiveDetailsApiResponse,
  LotteryResultLiveSummaryApiResponse,
  TicketCheckResult,
  formatApiDateToDisplay,
  mapResultSummaryToLotteryResult,
  mergeResultWithLiveDetails,
} from '../types/lottery';
import { normalizeTicketNumberForCheck, toApiDrawDate } from '../utils/ticketCheck.util';

const BASE_URL = '/lottery-results';
const DEFAULT_REGION = 'MIEN_NAM';

export const lotteryService = {
  async getBoard(date: string, region: string = DEFAULT_REGION): Promise<ApiResponse<LotteryBoardData>> {
    const resolvedRegion = region?.trim() || DEFAULT_REGION;
    try {
      const response = await apiApp.get<ApiResponse<LotteryResultLiveSummaryApiResponse>>(`${BASE_URL}/board`, {
        params: {
          region: resolvedRegion,
          drawDate: toApiDrawDate(date),
        },
      });

      const liveBoard = response.data?.data;
      const results = (liveBoard?.results || []).map(mapResultSummaryToLotteryResult);

      return {
        ...response.data,
        data: {
          region: liveBoard?.region || resolvedRegion,
          drawDate: formatApiDateToDisplay(liveBoard?.drawDate || toApiDrawDate(date)),
          drawDateIso: liveBoard?.drawDate || toApiDrawDate(date),
          results,
          availableProvinces: results.map((item) => item.province),
        },
      };
    } catch (error) {
      console.warn('Failed to fetch lottery board:', error);
      return {
        success: false,
        message: 'Không thể kết nối đến máy chủ',
        timestamp: new Date().toISOString(),
        data: {
          region: resolvedRegion,
          drawDate: formatApiDateToDisplay(toApiDrawDate(date)),
          drawDateIso: toApiDrawDate(date),
          results: [],
          availableProvinces: [],
        },
      };
    }
  },

  async getDetails(resultIds: number[]) {
    try {
      const response = await apiApp.get<ApiResponse<LotteryResultLiveDetailsApiResponse>>(`${BASE_URL}/details`, {
        params: {
          resultIds,
        },
        paramsSerializer: {
          indexes: null,
        },
      });

      return response.data?.data?.results || [];
    } catch (error) {
      console.warn('Failed to fetch lottery details:', error);
      return [];
    }
  },
  mergeBoardWithDetails(boardResults: LotteryBoardData['results'], resultItems: LotteryResultLiveDetailsApiResponse['results']) {
    const liveItemByResultId = new Map(resultItems.map((item) => [item.result.id, item]));
    return boardResults.map((result) => mergeResultWithLiveDetails(result, result.id ? liveItemByResultId.get(result.id) : undefined));
  },
  async checkWinning(
    stationId: number,
    drawDate: string,
    ticketNumber: string,
    region?: string | null
  ): Promise<TicketCheckResult> {
    try {
      const response = await apiApp.get<ApiResponse<TicketCheckResult>>(`${BASE_URL}/check`, {
        params: {
          stationId,
          drawDate: toApiDrawDate(drawDate),
          ticketNumber: normalizeTicketNumberForCheck(ticketNumber, region),
        },
      });
      return response.data?.data as TicketCheckResult;
    } catch (error) {
      console.warn('Failed to check winning ticket:', error);
      throw error;
    }
  }
};
