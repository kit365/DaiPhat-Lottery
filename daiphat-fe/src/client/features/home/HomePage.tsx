"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import dynamic from 'next/dynamic';

import { useAuthStore } from "../../../stores/useAuthStore";
import { buildLotteryCountdownMessage, getCountdownState } from "../../components/home/LotteryCountdown";
import { LeftSidebar } from "../../components/home/LeftSidebar";
import { HomeSidebar } from "../../components/home/HomeSidebar";
import { ResultsMatrix } from "../../components/home/ResultsMatrix";
import { CLIENT_PAGE_BACKGROUND } from "../../constants/clientBannerAssets";
import { usePrefetchClientPagesWhenIdle } from "../../hooks/usePrefetchClientPagesWhenIdle";
import type { HomeServerInitialData } from '@/lib/server-lottery';
import { useLottery } from "../../hooks/useLottery";
import { buildCountdownTarget, formatApiDateToDisplay } from "../../types/lottery";

const MobileLotterySelector = dynamic(
  () => import('../../components/home/MobileLotterySelector').then((mod) => mod.MobileLotterySelector),
  { ssr: false }
);


const scrollWindowToTop = () => {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};

export const HomePage = ({ initialData }: { initialData?: HomeServerInitialData }) => {
  const [searchParams] = useSearchParams();
  const urlDrawDate = searchParams.get('drawDate');
  const urlStationId = searchParams.get('stationId');
  const urlStationIds = searchParams.get('stationIds');
  const urlRegion = searchParams.get('region');

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
    boardData,
    historyData,
    availableDates,
    availableProvinces,
    scheduleStations,
    isLoading,
    isWaitingForResults,
    error
  } = useLottery(initialData);

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
        : '';

  const emptyStateMessage = error || 'Chưa có dữ liệu kết quả cho ngày đã chọn.';
  const shouldShowEmptyState = lotteryData.length === 0 && !isLoading && !isWaitingForResults;

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

  useEffect(() => {
    if (!urlDrawDate) {
      return;
    }
    const displayDate = /^\d{4}-\d{2}-\d{2}$/.test(urlDrawDate)
      ? formatApiDateToDisplay(urlDrawDate)
      : urlDrawDate;
    setSelectedDate(displayDate);
  }, [urlDrawDate, setSelectedDate]);

  useLayoutEffect(() => {
    if (urlDrawDate || urlStationId || urlStationIds || urlRegion) {
      scrollWindowToTop();
    }
  }, [urlDrawDate, urlStationId, urlStationIds, urlRegion]);

  useEffect(() => {
    if (!(urlDrawDate || urlStationId || urlStationIds || urlRegion)) {
      return;
    }
    scrollWindowToTop();
    const timers = [50, 150, 400].map((ms) => window.setTimeout(scrollWindowToTop, ms));
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [urlDrawDate, urlStationId, urlStationIds, urlRegion, isLoading, lotteryData.length]);

  // Hydrate đài từ URL trên board đầy đủ (không dùng lotteryData đã filter — tránh race).
  useEffect(() => {
    if ((!urlStationId && !urlStationIds) || boardData.length === 0) {
      return;
    }
    if (urlStationIds) {
      const ids = urlStationIds
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => !Number.isNaN(id));
      if (ids.length === 0) {
        return;
      }
      const matches = boardData.filter(
        (item) => item.stationId != null && ids.includes(item.stationId)
      );
      if (matches.length > 0) {
        setSelectedProvinces(matches.map((item) => item.province));
      }
      return;
    }
    const stationId = Number(urlStationId);
    if (Number.isNaN(stationId)) {
      return;
    }
    const match = boardData.find((item) => item.stationId === stationId);
    if (match) {
      setSelectedProvinces([match.province]);
    }
  }, [urlStationId, urlStationIds, boardData, setSelectedProvinces]);

  useEffect(() => {
    if (!urlRegion || urlStationId || urlStationIds || availableProvinces.length === 0) {
      return;
    }
    setSelectedProvinces(availableProvinces);
  }, [urlRegion, urlStationId, urlStationIds, availableProvinces, setSelectedProvinces]);

  usePrefetchClientPagesWhenIdle(!isLoading);

  return (
    <div 
      className="relative min-h-screen overflow-x-hidden font-client-main bg-fixed bg-cover bg-center"
      style={{ backgroundImage: `url("${CLIENT_PAGE_BACKGROUND}")` }}
    >
      <main className="relative z-1">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 pt-[148px] pb-[100px] lg:pt-[100px] lg:pb-12 flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
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
            {/* Mobile Selectors Component */}
            <MobileLotterySelector
              isAllProvinceSelected={isAllProvinceSelected}
              selectedProvinces={selectedProvinces}
              singleProvince={singleProvince}
              availableProvinces={availableProvinces}
              selectedDate={selectedDate}
              availableDates={availableDates}
              onSelectProvince={setSelectedProvinces}
              onSelectDate={setSelectedDate}
            />
            
            <div className="relative">
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
                  />
                ) : shouldShowEmptyState ? (
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
                ) : null}
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
