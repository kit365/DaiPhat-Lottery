import { API_PREFIX, API_VERSION } from '@/api/api.constants';
import type { LotteryStationSchedule } from '@/client/features/schedule/types/schedule.types';
import type { ApiResponse } from '@/types/api.type';

const getBackendBase = () =>
    (
        process.env.BACKEND_UPSTREAM ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        'http://localhost:8080'
    ).replace(/\/$/, '');

export async function fetchPublicScheduleServer(
    params?: { region?: string }
): Promise<LotteryStationSchedule[]> {
    try {
        const url = new URL(`${getBackendBase()}${API_PREFIX}${API_VERSION}/lottery-stations/schedule/all`);
        if (params?.region) {
            url.searchParams.set('region', params.region);
        }

        const response = await fetch(url.toString(), { cache: 'no-store' });
        if (!response.ok) {
            return [];
        }

        const payload = (await response.json()) as ApiResponse<LotteryStationSchedule[]>;
        return payload.data || [];
    } catch {
        return [];
    }
}
