"use client";

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
    getPublicStationsByDrawDate,
    getPublicStationsToday,
    getPublicStationsTomorrow,
} from '@/shared/station/scheduleApi';
import { publicStationsQueryKeys } from '@/constants/queryKeys';
import { detailQueryDefaults } from '@/shared/react-query/createAppQueryClient';

export const useStationsToday = () =>
    useQuery({
        queryKey: publicStationsQueryKeys.today(),
        queryFn: () => getPublicStationsToday(),
        ...detailQueryDefaults,
    });

export const useStationsTomorrow = () =>
    useQuery({
        queryKey: publicStationsQueryKeys.tomorrow(),
        queryFn: () => getPublicStationsTomorrow(),
        ...detailQueryDefaults,
    });

export const useStationsByDrawDate = (drawDate?: string | string[]) => {
    const drawDates = Array.isArray(drawDate)
        ? drawDate.filter(Boolean)
        : drawDate
          ? [drawDate]
          : [];

    return useQuery({
        queryKey: publicStationsQueryKeys.byDrawDate(drawDates),
        queryFn: () => getPublicStationsByDrawDate(drawDates),
        enabled: drawDates.length > 0,
        placeholderData: keepPreviousData,
        ...detailQueryDefaults,
    });
};
