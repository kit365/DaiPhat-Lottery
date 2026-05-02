import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "../components/layout/header";
import { PartnerLogos } from "../components/layout/PartnerLogos";
import { useAuthStore } from "../../stores/useAuthStore";
import { LeftSidebar } from "../components/home/LeftSidebar";
import { HomeSidebar } from "../components/home/HomeSidebar";
import { ResultsMatrix } from "../components/home/ResultsMatrix";
import { useLottery } from "../hooks/useLottery";
import { LotteryCountdown } from "../components/home/LotteryCountdown";

export const HomePage = () => {
  const { openVerifyModal } = useAuthStore();
  const [searchParams] = useSearchParams();
  
  const {
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
    isLoading
  } = useLottery();

  const activeDigit = hoveredDigit || selectedDigit;

  useEffect(() => {
    const token = searchParams.get("verify_token");
    if (token) {
      openVerifyModal(token);
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, openVerifyModal]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#FDFBF7] text-client-ink font-client-main">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.028] bg-[url('data:image/svg+xml,%3Csvg_viewBox=%270_0_200_200%27_xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter_id=%27n%27%3E%3CfeTurbulence_type=%27fractalNoise%27_baseFrequency=%27.65%27_numOctaves=%273%27_stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect_width=%27100%25%27_height=%27100%25%27_filter=%27url(%23n)%27/%3E%3C/svg%3E')]" aria-hidden="true" />
      
      <Header />

      <main className="relative z-1">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-8 lg:pt-24 flex flex-col lg:flex-row gap-6 items-start">
          <LeftSidebar 
            activeProvince={selectedProvince} 
            setActiveProvince={setSelectedProvince} 
            onDateChange={setSelectedDate}
            availableDates={historyData.map(h => h.date)}
            selectedDate={lotteryData?.date}
          />

          <div className={`flex-1 min-w-0 transition-all duration-300 ${isLoading ? 'opacity-50 grayscale-[0.5]' : 'opacity-100'}`}>
            {lotteryData ? (
              <ResultsMatrix 
                data={lotteryData}
                displayType={displayType}
                setDisplayType={setDisplayType}
                showLoto={showLoto} 
                setShowLoto={setShowLoto} 
                onDateChange={setSelectedDate}
                availableDates={historyData.map(h => h.date)}
                selectedDigit={selectedDigit}
                setSelectedDigit={setSelectedDigit}
                activeDigit={activeDigit}
                setHoveredDigit={setHoveredDigit}
              />
            ) : (
              /* EMPTY STATE - When no data is available */
              <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] p-12 lg:p-20 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-[48px] text-slate-300">search_off</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#111111] font-client-main uppercase tracking-tight">Chưa có kết quả</h3>
                  <p className="text-slate-400 font-medium max-w-[300px]">
                    Đài <span className="text-[#E60F14] font-bold">{selectedProvince}</span> hiện chưa cập nhật kết quả cho ngày hôm nay.
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedProvince("TP. Hồ Chí Minh")}
                  className="bg-[#102937] text-white px-6 py-3 rounded-2xl font-bold text-[14px] hover:bg-[#E60F14] transition-all cursor-pointer active:scale-95 shadow-lg shadow-slate-200"
                >
                  Xem đài TP. Hồ Chí Minh
                </button>
              </div>
            )}
          </div>

          <HomeSidebar 
            showLoto={showLoto} 
            data={lotteryData} 
            history={historyData}
            onDateChange={setSelectedDate}
            selectedDigit={selectedDigit}
            hoveredDigit={hoveredDigit}
            onDigitSelect={(digit) => setSelectedDigit(digit === selectedDigit ? null : digit)}
            onDigitHover={setHoveredDigit}
          />
        </div>

        <div className="max-w-[1240px] mx-auto px-6 py-10 lg:py-16">
          <PartnerLogos />
        </div>
      </main>
    </div>
  );
};
