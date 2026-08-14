"use client";

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
    getPublicStationsByDrawDate,
    getPublicStationsToday,
    getPublicStationsTomorrow,
} from '@/shared/station/scheduleApi';
import { publicStationsQueryKeys } from '@/constants/queryKeys';

export const useStationsToday = () =>
    useQuery({
        queryKey: publicStationsQueryKeys.today(),
        queryFn: () => getPublicStationsToday(),
    });

export const useStationsTomorrow = () =>
    useQuery({
        queryKey: publicStationsQueryKeys.tomorrow(),
        queryFn: () => getPublicStationsTomorrow(),
    });

export const useStationsByDrawDate = (drawDate?: string | string[]) => {
    const drawDates = Array.isArray(drawDate)
        ? drawDate.filter(Boolean)
        : drawDate
          ? [drawDate]
          : [];

    return useQuery({
        queryKey: ['public-stations-by-draw-date', drawDates] as const,
        queryFn: () => getPublicStationsByDrawDate(drawDates),
        enabled: drawDates.length > 0,
        placeholderData: keepPreviousData,
    });
};
