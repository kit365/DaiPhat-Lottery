import { apiApp } from '../../../../api';
import { ApiResponse } from '../../../config/type';
import Cookies from 'js-cookie';
import { STORAGE_KEYS } from '../../../../constants/storage.constants';
import {
    LotteryResultResponse,
    LotteryResultDetailResponse,
    ManagementLotteryResultBoardResponse,
    PageResponse,
    DrawResultFilter,
    SyncDrawResultsRequest,
    SyncDrawResultsResponse
} from '../types/draw-result';

const BASE_URL = '/lottery-results';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getAllLotteryResults = async (params: DrawResultFilter): Promise<ApiResponse<PageResponse<LotteryResultResponse>>> => {
    const response = await apiApp.get(BASE_URL, {
        params,
        ...withAuth()
    });
    return response.data;
};

export const getLotteryResultDetails = async (id: number): Promise<ApiResponse<LotteryResultDetailResponse[]>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}/details`, {
        ...withAuth()
    });
    return response.data;
};

export const getLotteryResultsManagementBoard = async (
    params: DrawResultFilter
): Promise<ApiResponse<ManagementLotteryResultBoardResponse>> => {
    const drawDate = params.drawDate || params.fromDate;
    const toDate = params.dateMode === 'range'
        ? (params.toDate || drawDate)
        : drawDate;

    const response = await apiApp.get(`${BASE_URL}/management/board`, {
        params: {
            region: params.region,
            fromDate: drawDate,
            toDate,
            source: params.source || 'MINH_NGOC',
        },
        ...withAuth()
    });
    return response.data;
};

export const syncLotteryResults = async (
    request: SyncDrawResultsRequest
): Promise<ApiResponse<SyncDrawResultsResponse>> => {
    const response = await apiApp.post(`${BASE_URL}/management/sync`, request, {
        ...withAuth()
    });
    return response.data;
};
