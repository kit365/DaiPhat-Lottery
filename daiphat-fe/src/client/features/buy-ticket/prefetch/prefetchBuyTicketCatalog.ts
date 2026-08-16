import type { QueryClient } from '@tanstack/react-query';

import { publicStationsQueryKeys } from '@/constants/queryKeys';
import {
    DEFAULT_SOUTHERN_DRAW_TIME,
    isTodayDrawPassed,
    todayIsoVn,
    tomorrowIsoVn,
} from '@/client/utils/sellableDrawDate.util';
import {
    getPublicStationsByDrawDate,
    getPublicStationsToday,
    getPublicStationsTomorrow,
    type PublicStationSchedule,
} from '@/shared/station/scheduleApi';

import { buyTicketListQueryKey, type BuyTicketListQueryParams } from '../constants/queryKeys';
import { fetchAllPublicBuyTickets } from '../services/buyTicketService';

const stationIdsFromSchedule = (stations: PublicStationSchedule[]): string[] =>
    stations
        .map((station) => String(station.id ?? station._id ?? ''))
        .filter(Boolean);

const dedupeCatalogTargets = (
    targets: BuyTicketListQueryParams[],
): BuyTicketListQueryParams[] => {
    const seen = new Set<string>();

    return targets.filter((target) => {
        const key = JSON.stringify(buyTicketListQueryKey(target));
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return target.stationIds.length > 0 && Boolean(target.drawDate);
    });
};

/** Các tổ hợp ngày quay + toàn bộ đài đang bán (hôm nay, ngày mai, và cả hai ngày). */
export const buildBuyTicketCatalogTargets = (
    todayStations: PublicStationSchedule[],
    tomorrowStations: PublicStationSchedule[],
    now: Date = new Date(),
): BuyTicketListQueryParams[] => {
    const todayIso = todayIsoVn(now);
    const tomorrowIso = tomorrowIsoVn(now);
    const todayIds = stationIdsFromSchedule(todayStations);
    const tomorrowIds = stationIdsFromSchedule(tomorrowStations);
    const todaySellable = !isTodayDrawPassed(DEFAULT_SOUTHERN_DRAW_TIME, now);

    const targets: BuyTicketListQueryParams[] = [];

    if (todaySellable && todayIds.length > 0) {
        targets.push({ stationIds: todayIds, drawDate: todayIso });
    }

    if (tomorrowIds.length > 0) {
        targets.push({ stationIds: tomorrowIds, drawDate: tomorrowIso });
    }

    const sellableDates = todaySellable ? [todayIso, tomorrowIso] : [tomorrowIso];
    const allStationIds = [...new Set([...todayIds, ...tomorrowIds])];

    if (sellableDates.length > 1 && allStationIds.length > 0) {
        targets.push({
            stationIds: allStationIds,
            drawDate: sellableDates.join(','),
        });
    }

    return dedupeCatalogTargets(targets);
};

const prefetchBuyTicketList = (
    queryClient: QueryClient,
    params: BuyTicketListQueryParams,
): Promise<unknown> =>
    queryClient.prefetchQuery({
        queryKey: buyTicketListQueryKey(params),
        queryFn: async () => ({
            data: await fetchAllPublicBuyTickets(params),
        }),
    });

/**
 * Prefetch toàn bộ vé public theo tất cả đài (hôm nay + ngày mai).
 * Dùng chung query key với `useBuyTicketList` để vào /tickets có data ngay.
 */
export const prefetchBuyTicketCatalog = async (
    queryClient: QueryClient,
): Promise<void> => {
    const [todayStations, tomorrowStations] = await Promise.all([
        queryClient
            .ensureQueryData({
                queryKey: publicStationsQueryKeys.today(),
                queryFn: getPublicStationsToday,
            })
            .catch((): PublicStationSchedule[] => []),
        queryClient
            .ensureQueryData({
                queryKey: publicStationsQueryKeys.tomorrow(),
                queryFn: getPublicStationsTomorrow,
            })
            .catch((): PublicStationSchedule[] => []),
    ]);

    const targets = buildBuyTicketCatalogTargets(todayStations, tomorrowStations);

    await Promise.allSettled(targets.map((params) => prefetchBuyTicketList(queryClient, params)));
};

/** Hỗ trợ ngày quay tùy chỉnh (ISO) nếu UI chọn ngoài today/tomorrow. */
export const prefetchBuyTicketCatalogForDrawDates = async (
    queryClient: QueryClient,
    drawDates: string[],
): Promise<void> => {
    const normalizedDates = [...new Set(drawDates.filter(Boolean))];
    if (normalizedDates.length === 0) {
        return prefetchBuyTicketCatalog(queryClient);
    }

    const stations = await queryClient
        .ensureQueryData({
            queryKey: publicStationsQueryKeys.byDrawDate(normalizedDates),
            queryFn: () => getPublicStationsByDrawDate(normalizedDates),
        })
        .catch((): PublicStationSchedule[] => []);

    const stationIds = stationIdsFromSchedule(stations);
    if (stationIds.length === 0) {
        return;
    }

    await prefetchBuyTicketList(queryClient, {
        stationIds,
        drawDate: normalizedDates.join(','),
    });
};
