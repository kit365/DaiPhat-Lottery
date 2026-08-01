"use client";

import { useState, useEffect, useMemo } from 'react';
import { getPublicSchedule } from '../services/scheduleService';
import type { LotteryStationSchedule } from '../types/schedule.types';

export interface ScheduleByDay {
  dayId: string;
  dayLabel: string;
  stationsByRegion: Record<string, LotteryStationSchedule[]>;
}

export interface UseLotteryScheduleOptions {
  region?: string;
  stationId?: number;
  stationIds?: number[];
  highlightDate?: string;
}

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Thứ 2',
  TUESDAY: 'Thứ 3',
  WEDNESDAY: 'Thứ 4',
  THURSDAY: 'Thứ 5',
  FRIDAY: 'Thứ 6',
  SATURDAY: 'Thứ 7',
  SUNDAY: 'Chủ Nhật',
};

const DAY_OF_WEEK_MAP = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const SCHEDULE_CACHE_TTL_MS = 60_000;
const scheduleResponseCache = new Map<string, { data: LotteryStationSchedule[]; cachedAt: number }>();

const buildScheduleCacheKey = ({
  region,
  normalizedStationIds,
  highlightDate,
  isSingleStationView,
}: {
  region?: string;
  normalizedStationIds?: number[];
  highlightDate?: string;
  isSingleStationView: boolean;
}): string =>
  JSON.stringify({
    region: region ?? null,
    stationIds: normalizedStationIds ?? null,
    highlightDate: isSingleStationView ? null : (highlightDate ?? null),
  });

const readScheduleCache = (key: string): LotteryStationSchedule[] | null => {
  const entry = scheduleResponseCache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.cachedAt > SCHEDULE_CACHE_TTL_MS) {
    scheduleResponseCache.delete(key);
    return null;
  }
  return entry.data;
};

const toDayIdFromDate = (dateIso?: string): string | null => {
  if (!dateIso) {
    return null;
  }
  const date = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return DAY_OF_WEEK_MAP[date.getDay()];
};

export const useLotterySchedule = ({
  region,
  stationId,
  stationIds,
  highlightDate,
}: UseLotteryScheduleOptions = {}) => {
  const normalizedStationIds = useMemo(() => {
    if (stationIds && stationIds.length > 0) {
      return stationIds;
    }
    if (stationId != null) {
      return [stationId];
    }
    return undefined;
  }, [stationId, stationIds]);

  const isSingleStationView = normalizedStationIds != null && normalizedStationIds.length >= 1;

  const cacheKey = useMemo(
    () =>
      buildScheduleCacheKey({
        region,
        normalizedStationIds,
        highlightDate,
        isSingleStationView,
      }),
    [region, normalizedStationIds, highlightDate, isSingleStationView]
  );

  const [data, setData] = useState<LotteryStationSchedule[]>(
    () => readScheduleCache(cacheKey) ?? []
  );
  const [isLoading, setIsLoading] = useState(() => readScheduleCache(cacheKey) == null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      const cached = readScheduleCache(cacheKey);
      if (cached) {
        setData(cached);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await getPublicSchedule({
          region,
          stationId: normalizedStationIds?.length === 1 ? normalizedStationIds[0] : undefined,
          stationIds: normalizedStationIds && normalizedStationIds.length > 1 ? normalizedStationIds : undefined,
          drawDate: isSingleStationView ? undefined : highlightDate,
        });
        if (isMounted) {
          scheduleResponseCache.set(cacheKey, { data: result, cachedAt: Date.now() });
          setData(result);
        }
      } catch {
        if (isMounted) {
          setError('Không thể tải lịch mở thưởng. Vui lòng thử lại sau.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [cacheKey, region, normalizedStationIds, highlightDate, isSingleStationView]);

  const availableRegions = useMemo(() => {
    const regions = new Set(data.map((st) => st.region));
    return ['MIEN_NAM', 'MIEN_TRUNG', 'MIEN_BAC'].filter((r) => regions.has(r));
  }, [data]);

  const regionDrawTimes = useMemo(() => {
    const times: Record<string, string> = {};
    availableRegions.forEach((reg) => {
      const stations = data.filter((st) => st.region === reg);
      const sortedTimes = [...new Set(stations.map((st) => st.drawTime).filter(Boolean))].sort();
      if (sortedTimes.length > 0) {
        times[reg] =
          sortedTimes.length === 1
            ? sortedTimes[0]
            : `${sortedTimes[0]} - ${sortedTimes[sortedTimes.length - 1]}`;
      } else {
        times[reg] = '--:--';
      }
    });
    return times;
  }, [availableRegions, data]);

  const highlightDayId = useMemo(() => toDayIdFromDate(highlightDate), [highlightDate]);
  // Một đài có thể quay nhiều thứ/tuần — luôn hiện đủ lịch, không lọc theo ngày kết quả.
  const showFullWeek = !highlightDate || isSingleStationView;

  const scheduleByDay = useMemo(() => {
    const result: ScheduleByDay[] = DAYS.map((dayId) => ({
      dayId,
      dayLabel: DAY_LABELS[dayId],
      stationsByRegion: {},
    }));

    result.forEach((day) => {
      availableRegions.forEach((reg) => {
        day.stationsByRegion[reg] = [];
      });
    });

    data.forEach((station) => {
      if (!station.drawDays) return;
      station.drawDays.forEach((day) => {
        const dayRecord = result.find((r) => r.dayId === day);
        if (dayRecord && dayRecord.stationsByRegion[station.region]) {
          dayRecord.stationsByRegion[station.region].push(station);
        }
      });
    });

    const daysWithData = result.filter((day) =>
      availableRegions.some((reg) => day.stationsByRegion[reg].length > 0)
    );

    if (!showFullWeek && highlightDayId) {
      return daysWithData.filter((day) => day.dayId === highlightDayId);
    }

    return daysWithData;
  }, [data, availableRegions, highlightDayId, showFullWeek]);

  const todayDayName = useMemo(() => DAY_OF_WEEK_MAP[new Date().getDay()], []);

  return {
    data,
    availableRegions,
    regionDrawTimes,
    scheduleByDay,
    highlightDayId,
    todayDayName,
    showFullWeek,
    isLoading,
    error,
  };
};
