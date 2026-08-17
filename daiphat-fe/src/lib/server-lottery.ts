import { API_PREFIX, API_VERSION } from '@/api/api.constants';
import {
    buildRecentDateOptions,
    EMPTY_PRIZES,
    formatApiDateToDisplay,
    formatDisplayDateToApi,
    mapResultSummaryToLotteryResult,
    mapStationDrawToClient,
    type LotteryBoardData,
    type LotteryResult,
    type LotteryResultLiveSummaryApiResponse,
    type LotteryStationDraw,
    type LotteryStationDrawApiResponse,
} from '@/client/types/lottery';
import type { ApiResponse } from '@/types/api.type';

const DEFAULT_REGION = 'MIEN_NAM';

const getBackendBase = () =>
    (
        process.env.BACKEND_UPSTREAM ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        'http://localhost:8080'
    ).replace(/\/$/, '');

const apiRoot = () => `${getBackendBase()}${API_PREFIX}${API_VERSION}`;

async function serverGet<T>(path: string, params?: Record<string, string>): Promise<T | null> {
    try {
        const url = new URL(`${apiRoot()}${path}`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value) url.searchParams.set(key, value);
            });
        }

        const response = await fetch(url.toString(), { cache: 'no-store' });
        if (!response.ok) {
            return null;
        }

        const payload = (await response.json()) as ApiResponse<T>;
        return payload.data ?? null;
    } catch {
        return null;
    }
}

export type HomeServerInitialData = {
    selectedDate: string;
    boardData: LotteryResult[];
    scheduleStations: LotteryStationDraw[];
    availableProvinces: string[];
    selectedProvinces: string[];
};

export async function fetchHomeInitialData(
    displayDate?: string
): Promise<HomeServerInitialData> {
    const selectedDate = displayDate || buildRecentDateOptions(1)[0];
    const drawDateIso = formatDisplayDateToApi(selectedDate);

    const [boardPayload, schedulePayload] = await Promise.all([
        serverGet<LotteryResultLiveSummaryApiResponse>('/lottery-results/board', {
            region: DEFAULT_REGION,
            drawDate: drawDateIso,
        }),
        serverGet<LotteryStationDrawApiResponse[]>('/lottery-stations/schedule', {
            drawDate: drawDateIso,
        }),
    ]);

    const summaryResults = (boardPayload?.results || []).map(mapResultSummaryToLotteryResult);
    const scheduleStations = (schedulePayload || []).map(mapStationDrawToClient);

    const boardProvinces =
        summaryResults.length > 0
            ? summaryResults.map((item) => item.province)
            : scheduleStations.map((station) => station.province);

    const boardData: LotteryResult[] =
        summaryResults.length > 0
            ? summaryResults
            : scheduleStations.map((station) => ({
                  stationId: station.id,
                  province: station.province,
                  date: selectedDate,
                  dayOfWeek: '',
                  drawDateIso,
                  status: 'PENDING',
                  prizes: { ...EMPTY_PRIZES },
              }));

    const availableProvinces = boardProvinces.filter(Boolean);

    return {
        selectedDate,
        boardData,
        scheduleStations,
        availableProvinces,
        selectedProvinces: availableProvinces,
    };
}

export async function fetchLotteryBoardServer(displayDate: string): Promise<LotteryBoardData | null> {
    const drawDateIso = formatDisplayDateToApi(displayDate);
    const boardPayload = await serverGet<LotteryResultLiveSummaryApiResponse>(
        '/lottery-results/board',
        { region: DEFAULT_REGION, drawDate: drawDateIso }
    );

    if (!boardPayload) {
        return null;
    }

    const results = (boardPayload.results || []).map(mapResultSummaryToLotteryResult);

    return {
        region: boardPayload.region || DEFAULT_REGION,
        drawDate: formatApiDateToDisplay(boardPayload.drawDate || drawDateIso),
        drawDateIso: boardPayload.drawDate || drawDateIso,
        results,
        availableProvinces: results.map((item) => item.province),
    };
}
