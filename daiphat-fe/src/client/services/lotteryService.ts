import { ApiResponse } from '../../admin/config/type';
import { apiApp } from '../../api';
import {
  LotteryBoardData,
  LotteryResultLiveDetailsApiResponse,
  LotteryResultLiveSummaryApiResponse,
  TicketCheckResult,
  formatApiDateToDisplay,
  formatDisplayDateToApi,
  mapResultSummaryToLotteryResult,
  mergeResultWithLiveDetails,
} from '../types/lottery';

const BASE_URL = '/lottery-results';
const DEFAULT_REGION = 'MIEN_NAM';

export const lotteryService = {
  async getBoard(date: string): Promise<ApiResponse<LotteryBoardData>> {
    const response = await apiApp.get<ApiResponse<LotteryResultLiveSummaryApiResponse>>(`${BASE_URL}/board`, {
      params: {
        region: DEFAULT_REGION,
        drawDate: formatDisplayDateToApi(date),
      },
    });

    const liveBoard = response.data.data;
    const results = (liveBoard?.results || []).map(mapResultSummaryToLotteryResult);

    return {
      ...response.data,
      data: {
        region: liveBoard?.region || DEFAULT_REGION,
        drawDate: formatApiDateToDisplay(liveBoard?.drawDate || formatDisplayDateToApi(date)),
        drawDateIso: liveBoard?.drawDate || formatDisplayDateToApi(date),
        results,
        availableProvinces: results.map((item) => item.province),
      },
    };
  },

  async getDetails(resultIds: number[]) {
    const response = await apiApp.get<ApiResponse<LotteryResultLiveDetailsApiResponse>>(`${BASE_URL}/details`, {
      params: {
        resultIds,
      },
      paramsSerializer: {
        indexes: null,
      },
    });

    return response.data.data?.results || [];
  },
  mergeBoardWithDetails(boardResults: LotteryBoardData['results'], resultItems: LotteryResultLiveDetailsApiResponse['results']) {
    const liveItemByResultId = new Map(resultItems.map((item) => [item.result.id, item]));
    return boardResults.map((result) => mergeResultWithLiveDetails(result, result.id ? liveItemByResultId.get(result.id) : undefined));
  },
  async checkWinning(stationId: number, drawDate: string, ticketNumber: string): Promise<TicketCheckResult> {
    const response = await apiApp.get<ApiResponse<TicketCheckResult>>(`${BASE_URL}/check`, {
      params: {
        stationId,
        drawDate: formatDisplayDateToApi(drawDate),
        ticketNumber,
      },
    });
    return response.data.data as TicketCheckResult;
  }
};
