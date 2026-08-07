"use client";

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
    getPublicStationsByDrawDate,
    getPublicStationsToday,
    getPublicStationsTomorrow,
} from '@/shared/station/scheduleApi';

const QUERY_KEYS = {
    STATIONS_TODAY: 'public-stations-today',
    STATIONS_TOMORROW: 'public-stations-tomorrow',
    STATIONS_BY_DRAW_DATE: 'public-stations-by-draw-date',
} as const;

export const useStationsToday = () =>
    useQuery({
        queryKey: [QUERY_KEYS.STATIONS_TODAY],
        queryFn: () => getPublicStationsToday(),
    });

export const useStationsTomorrow = () =>
    useQuery({
        queryKey: [QUERY_KEYS.STATIONS_TOMORROW],
        queryFn: () => getPublicStationsTomorrow(),
    });

export const useStationsByDrawDate = (drawDate?: string | string[]) => {
    const drawDates = Array.isArray(drawDate)
        ? drawDate.filter(Boolean)
        : drawDate
          ? [drawDate]
          : [];

    return useQuery({
        queryKey: [QUERY_KEYS.STATIONS_BY_DRAW_DATE, drawDates],
        queryFn: () => getPublicStationsByDrawDate(drawDates),
        enabled: drawDates.length > 0,
        placeholderData: keepPreviousData,
    });
};
