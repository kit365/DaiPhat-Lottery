import { useState, useEffect } from 'react';
import { DisplayType, LotteryResult } from '../types/lottery';
import { lotteryService } from '../services/lotteryService';

export const useLottery = (initialProvinces: string[] = ["TP. Hồ Chí Minh", "Đồng Tháp", "Cà Mau"]) => {
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>(initialProvinces);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // Null means latest
  const [displayType, setDisplayType] = useState<DisplayType>('full');
  const [showLoto, setShowLoto] = useState(true);
  const [selectedDigit, setSelectedDigit] = useState<string | null>(null);
  const [hoveredDigit, setHoveredDigit] = useState<string | null>(null);
  const [lotteryData, setLotteryData] = useState<LotteryResult[]>([]);
  const [historyData, setHistoryData] = useState<LotteryResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch history whenever province changes (using first selected province for now)
  useEffect(() => {
    const fetchHistory = async () => {
      if (selectedProvinces.length === 0) return;
      const res = await lotteryService.getHistoryByProvince(selectedProvinces[0]);
      if (res.success && res.data) {
        setHistoryData(res.data);
      } else {
        setHistoryData([]);
      }
    };
    fetchHistory();
    setSelectedDate(null); // Reset date to latest when province changes
  }, [selectedProvinces]);

  // Fetch specific result whenever province or date changes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (selectedProvinces.length === 0) {
          setLotteryData([]);
          setIsLoading(false);
          return;
        }

        const promises = selectedProvinces.map(prov => 
          selectedDate 
            ? lotteryService.getResultByDate(prov, selectedDate)
            : lotteryService.getResultsByProvince(prov)
        );
        
        const results = await Promise.all(promises);
        const validData = results.map(r => r.data).filter(Boolean) as LotteryResult[];
        
        if (validData.length > 0) {
          setLotteryData(validData);
        } else {
          setLotteryData([]);
          setError("Không thể tải dữ liệu");
        }
      } catch (err) {
        setError("Lỗi kết nối máy chủ");
        setLotteryData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedProvinces, selectedDate]);

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
    historyData,
    isLoading,
    error
  };
};
