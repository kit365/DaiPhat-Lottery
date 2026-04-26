import { useState, useEffect } from 'react';
import { DisplayType, LotteryResult } from '../types/lottery';
import { lotteryService } from '../services/lotteryService';

export const useLottery = (initialProvince: string = "TP. Hồ Chí Minh") => {
  const [selectedProvince, setSelectedProvince] = useState(initialProvince);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // Null means latest
  const [displayType, setDisplayType] = useState<DisplayType>('full');
  const [showLoto, setShowLoto] = useState(true);
  const [selectedDigit, setSelectedDigit] = useState<string | null>(null);
  const [hoveredDigit, setHoveredDigit] = useState<string | null>(null);
  const [lotteryData, setLotteryData] = useState<LotteryResult | null>(null);
  const [historyData, setHistoryData] = useState<LotteryResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch history whenever province changes
  useEffect(() => {
    const fetchHistory = async () => {
      const res = await lotteryService.getHistoryByProvince(selectedProvince);
      if (res.success && res.data) {
        setHistoryData(res.data);
      } else {
        setHistoryData([]);
      }
    };
    fetchHistory();
    setSelectedDate(null); // Reset date to latest when province changes
  }, [selectedProvince]);

  // Fetch specific result whenever province or date changes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let res;
        if (selectedDate) {
          res = await lotteryService.getResultByDate(selectedProvince, selectedDate);
        } else {
          res = await lotteryService.getResultsByProvince(selectedProvince);
        }
        
        if (res.success && res.data) {
          setLotteryData(res.data);
        } else {
          setLotteryData(null);
          setError(res.message || "Không thể tải dữ liệu");
        }
      } catch (err) {
        setError("Lỗi kết nối máy chủ");
        setLotteryData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedProvince, selectedDate]);

  return {
    selectedProvince,
    setSelectedProvince,
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
    historyData,
    isLoading,
    error
  };
};
