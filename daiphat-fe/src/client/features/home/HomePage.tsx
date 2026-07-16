import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "../../components/layout/header";

import { useAuthStore } from "../../../stores/useAuthStore";
import { DatePicker } from '../../components/common/DatePicker';
import { buildLotteryCountdownMessage, getCountdownState } from "../../components/home/LotteryCountdown";
import { LeftSidebar } from "../../components/home/LeftSidebar";
import { HomeSidebar } from "../../components/home/HomeSidebar";
import { ResultsMatrix } from "../../components/home/ResultsMatrix";
import { useLottery } from "../../hooks/useLottery";
import { buildCountdownTarget, isTodayDisplayDate } from "../../types/lottery";

export const HomePage = () => {
  const [searchParams] = useSearchParams();

  const {
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
    availableDates,
    availableProvinces,
    scheduleStations,
    isLoading,
    isRefreshing,
    isWaitingForResults,
    error
  } = useLottery();

  const activeDigit = hoveredDigit || selectedDigit;
  const singleProvince = selectedProvinces.length > 0 ? selectedProvinces[0] : '';
  const singleData = lotteryData.length > 0 ? lotteryData[0] : null;
  const isAllProvinceSelected = availableProvinces.length > 0 && selectedProvinces.length === availableProvinces.length;
  const selectedProvinceLabel = useMemo(() => {
    if (selectedProvinces.length === 0) {
      return '';
    }

    if (isAllProvinceSelected || selectedProvinces.length > 2) {
      return 'Các đài miền Nam';
    }

    if (selectedProvinces.length === 2) {
      return `${selectedProvinces[0]} và ${selectedProvinces[1]}`;
    }

    return selectedProvinces[0];
  }, [availableProvinces.length, isAllProvinceSelected, selectedProvinces]);

  const activeScheduleStation = useMemo(() => {
    if (scheduleStations.length === 0) {
      return null;
    }

    return scheduleStations.find((station) => station.province === singleProvince) || scheduleStations[0];
  }, [scheduleStations, singleProvince]);

  const countdownTarget = useMemo(
    () => buildCountdownTarget(selectedDate, activeScheduleStation?.drawTime),
    [selectedDate, activeScheduleStation?.drawTime]
  );
  const [countdownState, setCountdownState] = useState(() => getCountdownState(countdownTarget));

  useEffect(() => {
    setCountdownState(getCountdownState(countdownTarget));

    if (!countdownTarget) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCountdownState(getCountdownState(countdownTarget));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdownTarget]);

  const countdownMessage = useMemo(
    () => buildLotteryCountdownMessage(
      countdownTarget,
      activeScheduleStation?.drawTime || '--:--',
      selectedProvinceLabel,
      countdownState
    ),
    [activeScheduleStation?.drawTime, countdownState, countdownTarget, selectedProvinceLabel]
  );

  const resultStatusMessage = singleData?.status === 'COMPLETED'
    ? `Kết quả ${selectedProvinceLabel || singleData.province} ngày ${singleData.date} đã được cập nhật.`
    : countdownMessage
      ? countdownMessage
    : singleData
      ? `${selectedProvinceLabel || `Đài ${singleData.province}`} đang chờ cập nhật kết quả.`
      : 'Đang cập nhật kết quả mới nhất từ hệ thống.';

  const emptyStateMessage = error || 'Chưa có dữ liệu kết quả cho ngày đã chọn.';
  const hasAnyWinningNumbers = useMemo(() => {
    return lotteryData.some((item) =>
      Boolean(
        item.prizes.special ||
        item.prizes.first ||
        item.prizes.second ||
        item.prizes.fifth ||
        item.prizes.seventh ||
        item.prizes.eighth ||
        item.prizes.third.length > 0 ||
        item.prizes.fourth.length > 0 ||
        item.prizes.sixth.length > 0
      )
    );
  }, [lotteryData]);
  const shouldShowLoadingOverlay = !isTodayDisplayDate(selectedDate)
    && (isLoading || isWaitingForResults)
    && !hasAnyWinningNumbers;

  useEffect(() => {
    const token = searchParams.get("verify_token");
    const authAction = searchParams.get("auth");

    if (token) {
      const { openVerifyModal } = useAuthStore.getState();
      openVerifyModal(token);
    }

    if (authAction === "login") {
      const { openLoginModal } = useAuthStore.getState();
      openLoginModal();
    }

    if (token || authAction) {
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);


  return (
    <div 
      className="relative min-h-screen overflow-x-hidden font-client-main bg-fixed bg-cover bg-center"
      style={{ backgroundImage: 'url("https://i.ibb.co/BVFGYpL1/86f05f70-fcf8-445f-978e-a0539eb2f0de.png")' }}
    >
      <Header />

      <main className="relative z-1">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-8 lg:pt-24 flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
          <div className="hidden lg:block shrink-0">
            <LeftSidebar
              activeProvinces={selectedProvinces}
              setActiveProvinces={setSelectedProvinces}
              onDateChange={setSelectedDate}
              availableDates={availableDates}
              availableProvinces={availableProvinces}
              selectedDate={selectedDate}
            />
          </div>

          <div className="relative flex-1 min-w-0 w-full">
            {/* Mobile Selectors */}
            <div className="block lg:hidden mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-col gap-3">
                    <select 
                        className="w-full p-3 rounded-xl border border-gray-200 text-[#111111] font-bold outline-none cursor-pointer"
                        value={isAllProvinceSelected || selectedProvinces.length > 1 ? '__ALL__' : singleProvince}
                        onChange={(e) => {
                          if (e.target.value === '__ALL__') {
                            setSelectedProvinces(availableProvinces);
                            return;
                          }
                          setSelectedProvinces([e.target.value]);
                        }}
                    >
                        <option value="__ALL__">Tất cả đài miền Nam</option>
                        {availableProvinces.map((province) => (
                          <option key={province} value={province}>{province}</option>
                        ))}
                    </select>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => {
                          const el = document.getElementById('mobile-date-picker');
                          const arrow = document.getElementById('mobile-date-arrow');
                          if (el && arrow) {
                            if (el.style.maxHeight === '600px') {
                              el.style.maxHeight = '0px';
                              el.style.opacity = '0';
                              arrow.style.transform = 'rotate(0deg)';
                            } else {
                              el.style.maxHeight = '600px';
                              el.style.opacity = '1';
                              arrow.style.transform = 'rotate(180deg)';
                            }
                          }
                        }}
                        className="w-full flex items-center justify-between p-3 text-[#637381] font-medium outline-none cursor-pointer bg-white border-none"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                          <span>{selectedDate || 'Chọn ngày'}</span>
                        </div>
                        <span id="mobile-date-arrow" className="material-symbols-outlined text-[18px] transition-transform duration-300">
                          expand_more
                        </span>
                      </button>
                      
                      <div id="mobile-date-picker" className="transition-all duration-300 overflow-hidden" style={{ maxHeight: '0px', opacity: 0 }}>
                        <div className="p-3 border-t border-gray-100">
                          <DatePicker
                            selectedDate={selectedDate || ''}
                            onDateSelect={(date) => {
                              setSelectedDate(date);
                              const el = document.getElementById('mobile-date-picker');
                              const arrow = document.getElementById('mobile-date-arrow');
                              if (el && arrow) {
                                el.style.maxHeight = '0px';
                                el.style.opacity = '0';
                                arrow.style.transform = 'rotate(0deg)';
                              }
                            }}
                            availableDates={availableDates}
                          />
                        </div>
                      </div>
                    </div>
                </div>
            </div>
            
            <div className="relative">
              {shouldShowLoadingOverlay && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-3xl min-h-[400px]">
                  <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                    <div className="w-12 h-12 border-4 border-slate-100 border-t-[#ee1314] rounded-full animate-spin"></div>
                    <span className="text-[#102937] font-bold text-sm uppercase tracking-wider">Đang lấy kết quả...</span>
                  </div>
                </div>
              )}

              <div className="transition-all duration-300">
                {lotteryData.length > 0 ? (
                  <ResultsMatrix
                    dataList={lotteryData}
                    displayType={displayType}
                    setDisplayType={setDisplayType}
                    showLoto={showLoto}
                    setShowLoto={setShowLoto}
                    onDateChange={setSelectedDate}
                    availableDates={availableDates}
                    selectedDigit={selectedDigit}
                    setSelectedDigit={setSelectedDigit}
                    activeDigit={activeDigit}
                    setHoveredDigit={setHoveredDigit}
                    statusMessage={resultStatusMessage}
                    isRefreshing={isRefreshing}
                  />
                ) : !shouldShowLoadingOverlay ? (
                  /* EMPTY STATE - When no data is available */
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] p-12 lg:p-20 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-[48px] text-slate-300">search_off</span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-[#111111] font-client-main uppercase tracking-tight">Chưa có kết quả</h3>
                      <p className="text-slate-400 font-medium max-w-[300px]">
                        {emptyStateMessage}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedProvinces(availableProvinces)}
                      className="bg-[#102937] text-white px-6 py-3 rounded-2xl font-bold text-[14px] hover:bg-[#ee1314] transition-all cursor-pointer active:scale-95 shadow-lg shadow-slate-200"
                    >
                      Xem đài đang mở
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] min-h-[400px]" />
                )}
              </div>
            </div>
          </div>

          <HomeSidebar
            showLoto={showLoto}
            setShowLoto={setShowLoto}
            dataList={lotteryData}
            history={historyData}
            onDateChange={setSelectedDate}
            selectedDigit={selectedDigit}
            hoveredDigit={hoveredDigit}
            onDigitSelect={(digit) => setSelectedDigit(digit === selectedDigit ? null : digit)}
            onDigitHover={setHoveredDigit}
          />
        </div>


      </main>
    </div>
  );
};
