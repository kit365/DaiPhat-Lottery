import { useState, useEffect, useMemo } from 'react';
import { lotteryStationService } from '../services/lotteryStationService';
import { LotteryStationSchedulePublicResponse } from '../types/lottery';

export interface ScheduleByDay {
  dayId: string;
  dayLabel: string;
  stationsByRegion: Record<string, LotteryStationSchedulePublicResponse[]>;
}

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_LABELS: Record<string, string> = {
  'MONDAY': 'Thứ 2',
  'TUESDAY': 'Thứ 3',
  'WEDNESDAY': 'Thứ 4',
  'THURSDAY': 'Thứ 5',
  'FRIDAY': 'Thứ 6',
  'SATURDAY': 'Thứ 7',
  'SUNDAY': 'Chủ Nhật',
};

export const useLotterySchedule = (region?: string) => {
  const [data, setData] = useState<LotteryStationSchedulePublicResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await lotteryStationService.getPublicSchedule(region);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError('Không thể tải lịch mở thưởng. Vui lòng thử lại sau.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [region]);

  const availableRegions = useMemo(() => {
    const regions = new Set(data.map(st => st.region));
    return ['MIEN_NAM', 'MIEN_TRUNG', 'MIEN_BAC'].filter(r => regions.has(r));
  }, [data]);

  const regionDrawTimes = useMemo(() => {
    const times: Record<string, string> = {};
    availableRegions.forEach(reg => {
      const stations = data.filter(st => st.region === reg);
      const sortedTimes = [...new Set(stations.map(st => st.drawTime).filter(Boolean))].sort();
      if (sortedTimes.length > 0) {
        times[reg] = sortedTimes.length === 1 
          ? sortedTimes[0] 
          : `${sortedTimes[0]} - ${sortedTimes[sortedTimes.length - 1]}`;
      } else {
        times[reg] = '--:--';
      }
    });
    return times;
  }, [availableRegions, data]);

  const scheduleByDay = useMemo(() => {
    const result: ScheduleByDay[] = DAYS.map(dayId => ({
      dayId,
      dayLabel: DAY_LABELS[dayId],
      stationsByRegion: {},
    }));

    // Initialize arrays
    result.forEach(day => {
      availableRegions.forEach(reg => {
        day.stationsByRegion[reg] = [];
      });
    });

    data.forEach(station => {
      if (!station.drawDays) return;
      station.drawDays.forEach(day => {
        const dayRecord = result.find(r => r.dayId === day);
        if (dayRecord && dayRecord.stationsByRegion[station.region]) {
          dayRecord.stationsByRegion[station.region].push(station);
        }
      });
    });

    // Only return days that have at least one station
    return result.filter(day => {
      return availableRegions.some(reg => day.stationsByRegion[reg].length > 0);
    });
  }, [data, availableRegions]);

  return {
    data,
    availableRegions,
    regionDrawTimes,
    scheduleByDay,
    isLoading,
    error,
  };
};
