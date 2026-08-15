import { API_PREFIX, API_VERSION } from '@/api/api.constants';
import type { ApiResponse } from '@/types/api.type';

export type PublicStationSchedule = {
    id: number;
    _id?: number | string;
    name: string;
    province?: string;
    region?: string;
    price?: number;
    drawDays?: string[] | string;
    drawTime?: string;
    drawSchedule?: string;
    thumbnailUrl?: string;
    avatar?: string;
    image?: string;
    description?: string;
    status?: string;
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
    Array.isArray(drawDays) ? drawDays.map((day) => BACKEND_TO_FE_DAY[day] || day) : [];

const toDrawDaysArray = (drawDays?: string[] | string) => {
    if (Array.isArray(drawDays)) return drawDays;
    if (typeof drawDays === 'string') {
        return drawDays.split(',').map((d) => d.trim()).filter(Boolean);
    }
    return [];
};

const mapStation = (item: PublicStationSchedule): PublicStationSchedule => {
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

const getBackendBase = () => {
    if (typeof window !== 'undefined') {
        return '';
    }
    const upstream =
        process.env.BACKEND_UPSTREAM ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        'http://localhost:8080';
    return upstream.replace(/\/$/, '');
};

const apiRoot = () => `${getBackendBase()}${API_PREFIX}${API_VERSION}`;

const buildScheduleRequestUrl = (path: string, params?: Record<string, string>): string => {
    const pathname = `${apiRoot()}${path}`;
    const url =
        typeof window !== 'undefined' && !getBackendBase()
            ? new URL(pathname, window.location.origin)
            : new URL(pathname);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value) url.searchParams.set(key, value);
        });
    }

    return url.toString();
};

async function fetchScheduleJson<T>(path: string, params?: Record<string, string>): Promise<T> {
    const response = await fetch(buildScheduleRequestUrl(path, params), {
        ...(typeof window === 'undefined' ? { next: { revalidate: 60 } } : { credentials: 'include' }),
    });

    if (!response.ok) {
        throw new Error(`Schedule API failed: ${response.status}`);
    }

    const payload = (await response.json()) as ApiResponse<T>;
    return payload.data as T;
}

export const getPublicStationsToday = async (): Promise<PublicStationSchedule[]> => {
    const result = await fetchScheduleJson<PublicStationSchedule[]>('/lottery-stations/schedule/today');
    return (result || []).map(mapStation);
};

export const getPublicStationsTomorrow = async (): Promise<PublicStationSchedule[]> => {
    const result = await fetchScheduleJson<PublicStationSchedule[]>('/lottery-stations/schedule/tomorrow');
    return (result || []).map(mapStation);
};

export const getPublicStationsByDrawDate = async (
    drawDate: string | string[]
): Promise<PublicStationSchedule[]> => {
    const drawDates = Array.isArray(drawDate) ? drawDate.filter(Boolean) : [drawDate].filter(Boolean);

    const batches = await Promise.all(
        drawDates.map((value) =>
            fetchScheduleJson<PublicStationSchedule[]>('/lottery-stations/schedule', {
                drawDate: value,
            })
        )
    );

    const seen = new Set<number>();
    return batches
        .flatMap((batch) => (batch || []).map(mapStation))
        .filter((station) => {
            if (seen.has(station.id)) return false;
            seen.add(station.id);
            return true;
        });
};
