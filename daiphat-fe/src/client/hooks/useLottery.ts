import { useEffect, useMemo, useRef, useState } from 'react';
import { lotteryService } from '../services/lotteryService';
import { lotteryStationService } from '../services/lotteryStationService';
import {
  EMPTY_PRIZES,
  LotteryResult,
  DisplayType,
  LotteryStationDraw,
  TicketCheckResult,
  buildRecentDateOptions,
  formatDisplayDateToApi,
  getDayOfWeekLabel,
  isTodayDisplayDate,
} from '../types/lottery';

export const useLottery = () => {
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(buildRecentDateOptions(1)[0]);
  const [displayType, setDisplayType] = useState<DisplayType>('full');
  const [showLoto, setShowLoto] = useState(true);
  const [selectedDigit, setSelectedDigit] = useState<string | null>(null);
  const [hoveredDigit, setHoveredDigit] = useState<string | null>(null);
  const [lotteryData, setLotteryData] = useState<LotteryResult[]>([]);
  const [boardData, setBoardData] = useState<LotteryResult[]>([]);
  const [scheduleStations, setScheduleStations] = useState<LotteryStationDraw[]>([]);
  const [availableProvinces, setAvailableProvinces] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isWaitingForResults, setIsWaitingForResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedSelectionRef = useRef(false);
  const loadedDateRef = useRef<string | null>(null);
  const summaryRetryDelayMs = 5000;
  const maxSummaryRetries = 24;

  const availableDates = useMemo(() => {
    const recent = buildRecentDateOptions(14);
    // Cho phép ngày từ deep-link chat (quá khứ ngoài 14 ngày gần nhất).
    if (selectedDate && !recent.includes(selectedDate)) {
      return [selectedDate, ...recent];
    }
    return recent;
  }, [selectedDate]);

  useEffect(() => {
    let isCancelled = false;

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const loadDetailsWithPolling = async (summaryResults: LotteryResult[]) => {
      const resultIds = summaryResults
        .map((result) => result.id)
        .filter((resultId): resultId is number => typeof resultId === 'number');

      if (resultIds.length === 0) {
        return;
      }

      const fetchItems = async () => lotteryService.getDetails(resultIds);
      let resultItems = await fetchItems();
      let mergedBoard = lotteryService.mergeBoardWithDetails(summaryResults, resultItems);

      if (!isCancelled) {
        setBoardData(mergedBoard);
        // Always sync availableProvinces from the merged board to keep names consistent
        const mergedProvinces = mergedBoard.map((item) => item.province);
        setAvailableProvinces(mergedProvinces);
      }

      for (let attempt = 0; attempt < 12; attempt += 1) {
        const pollAfterSeconds = resultItems
          .map((item) => item.pollAfterSeconds)
          .filter((seconds): seconds is number => typeof seconds === 'number' && seconds > 0)
          .reduce<number | null>((min, seconds) => {
            if (min === null) {
              return seconds;
            }
            return Math.min(min, seconds);
          }, null);

        if (pollAfterSeconds === null) {
          break;
        }

        await delay(pollAfterSeconds * 1000);
        if (isCancelled) {
          return;
        }

        resultItems = await fetchItems();
        mergedBoard = lotteryService.mergeBoardWithDetails(summaryResults, resultItems);

        if (!isCancelled) {
          setBoardData(mergedBoard);
          const mergedProvinces = mergedBoard.map((item) => item.province);
          setAvailableProvinces(mergedProvinces);
        }
      }
    };

    const fetchData = async () => {
      const isSameDate = boardData.length > 0 && boardData[0]?.date === selectedDate;
      
      if (isSameDate) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
        if (!isCancelled) {
          setBoardData([]);
        }
      }
      
      setError(null);

      try {
        const fetchSummary = () => lotteryService.getBoard(selectedDate);

        // Board API is the single source of truth for provinces
        // Schedule API is only used for drawTime (countdown)
        const [initialSummaryResult, stationSchedulesResult] = await Promise.allSettled([
          fetchSummary(),
          lotteryStationService.getScheduleForDate(selectedDate),
        ]);

        const stationSchedules = stationSchedulesResult.status === 'fulfilled' ? stationSchedulesResult.value : [];
        let response = initialSummaryResult.status === 'fulfilled' ? initialSummaryResult.value : null;
        let summaryResults = response?.data?.results || [];

        // Province list comes from board API results first, then board API availableProvinces
        const boardProvinces = summaryResults.length > 0
          ? summaryResults.map((r) => r.province)
          : (response?.data?.availableProvinces || []);

        // If board has no results yet but schedule has stations, build placeholders
        // using schedule station names (these will be replaced once board returns data)
        const placeholderBoard = summaryResults.length === 0 && stationSchedules.length > 0
          ? stationSchedules.map((station) => {
              const drawDateIso = formatDisplayDateToApi(selectedDate);
              return {
                stationId: station.id,
                province: station.province,
                date: selectedDate,
                dayOfWeek: getDayOfWeekLabel(drawDateIso),
                drawDateIso,
                status: 'PENDING',
                prizes: { ...EMPTY_PRIZES },
              } as LotteryResult;
            })
          : [];

        const provinces = boardProvinces.length > 0
          ? boardProvinces
          : placeholderBoard.map((p) => p.province);

        if (!isCancelled) {
          setBoardData(summaryResults.length > 0 ? summaryResults : placeholderBoard);
          setScheduleStations(stationSchedules);
          setAvailableProvinces(provinces);
        }

        if (provinces.length > 0 && !isCancelled) {
          const dateChanged = loadedDateRef.current !== selectedDate;
          // Default: always show full board. Reset to all stations on first load / date change.
          // Keep a manual filter only while staying on the same date.
          if (!initializedSelectionRef.current || dateChanged) {
            setSelectedProvinces(provinces);
            initializedSelectionRef.current = true;
            loadedDateRef.current = selectedDate;
          } else {
            const hasAnySelectionMatch = selectedProvinces.some((province) => provinces.includes(province));
            if (!hasAnySelectionMatch) {
              setSelectedProvinces(provinces);
            }
          }
        }

        if (initialSummaryResult.status === 'rejected') {
          if (stationSchedulesResult.status === 'rejected') {
            setError('Không thể tải dữ liệu quay số');
            return;
          }
        }

        if (summaryResults.length === 0) {
          if (placeholderBoard.length > 0) {
            if (!isCancelled) {
              setError(null);
              setIsWaitingForResults(true);
            }

            if (isTodayDisplayDate(selectedDate)) {
              for (let attempt = 0; attempt < maxSummaryRetries; attempt += 1) {
                await delay(summaryRetryDelayMs);
                if (isCancelled) {
                  return;
                }

                try {
                  response = await fetchSummary();
                  summaryResults = response?.data?.results || [];

                  if (summaryResults.length > 0) {
                    const newProvinces = summaryResults.map((r) => r.province);
                    if (!isCancelled) {
                      setBoardData(summaryResults);
                      setAvailableProvinces(newProvinces);
                      setSelectedProvinces(newProvinces);
                      setIsWaitingForResults(false);
                    }
                    await loadDetailsWithPolling(summaryResults);
                    return;
                  }
                } catch {
                  // Keep placeholder board visible while background polling summary.
                }
              }
            }

            if (!isCancelled) {
              setIsWaitingForResults(false);
            }
            return;
          }

          if (!isCancelled) {
            setIsWaitingForResults(false);
          }
          setError(response?.message || 'Chưa có kết quả cho ngày đã chọn');
          return;
        }

        try {
          if (!isCancelled) {
            setIsWaitingForResults(false);
          }
          await loadDetailsWithPolling(summaryResults);
        } catch {
          // Keep summary data so header/station state still renders even if detail sync is not ready.
        }
      } catch {
        if (!isCancelled) {
          setBoardData([]);
          setScheduleStations([]);
          setAvailableProvinces([]);
          setIsWaitingForResults(false);
          setError('Không thể tải kết quả xổ số');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [selectedDate]);

  useEffect(() => {
    if (boardData.length === 0) {
      setLotteryData([]);
      return;
    }

    const boardProvinces = boardData.map((item) => item.province);

    // Empty selection = show full board
    if (selectedProvinces.length === 0) {
      setSelectedProvinces(boardProvinces);
      setAvailableProvinces(boardProvinces);
      setLotteryData(boardData);
      setError(null);
      return;
    }

    const filteredResults = boardData.filter((item) => selectedProvinces.includes(item.province));
    setLotteryData(filteredResults);

    if (filteredResults.length === 0) {
      // Province names might have changed after detail merge - re-sync to full board
      setSelectedProvinces(boardProvinces);
      setAvailableProvinces(boardProvinces);
      setError(null);
      return;
    }

    setError(null);
  }, [boardData, selectedProvinces]);

  const historyData = useMemo(() => {
    if (selectedProvinces.length === 0) {
      return [];
    }

    return boardData.filter((item) => item.province === selectedProvinces[0]).slice(0, 1);
  }, [boardData, selectedProvinces]);

  return {
    selectedProvinces,
    setSelectedProvinces,
    selectedDate,
    setSelectedDate,
    displayType,
    setDisplayType,
    showLoto,
    setShowLoto,
    selectedDigit,
    setSelectedDigit,
    hoveredDigit,
    setHoveredDigit,
    lotteryData,
    boardData,
    historyData,
    availableDates,
    availableProvinces,
    scheduleStations,
    isLoading,
    isRefreshing,
    isWaitingForResults,
    error,
  };
};

export const useCheckWinning = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [checkResult, setCheckResult] = useState<TicketCheckResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const check = async (stationId: number, drawDate: string, ticketNumber: string) => {
    setIsChecking(true);
    setErrorMessage(null);
    setHasChecked(false);
    setCheckResult(null);

    try {
      const results = await lotteryService.checkWinning(stationId, drawDate, ticketNumber);
      setCheckResult(results);
      setHasChecked(true);
      return results;
    } catch (error: any) {
      console.error('Check winning error', error);
      const msg = error?.response?.data?.message || 'Không tìm thấy kết quả quay số của đài này vào ngày đã chọn.';
      setErrorMessage(msg);
      throw error;
    } finally {
      setIsChecking(false);
    }
  };

  const reset = () => {
    setHasChecked(false);
    setCheckResult(null);
    setErrorMessage(null);
  };

  return {
    check,
    reset,
    isChecking,
    hasChecked,
    checkResult,
    errorMessage,
    setErrorMessage,
  };
};
