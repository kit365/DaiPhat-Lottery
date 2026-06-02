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
    isLoading
  } = useLottery();

  const activeDigit = hoveredDigit || selectedDigit;
  const singleProvince = selectedProvinces.length > 0 ? selectedProvinces[0] : '';
  const singleData = lotteryData.length > 0 ? lotteryData[0] : null;

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
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-8 lg:pt-24 flex flex-col lg:flex-row gap-6 items-start">
          <div className="hidden lg:block shrink-0">
            <LeftSidebar
              activeProvinces={selectedProvinces}
              setActiveProvinces={setSelectedProvinces}
              onDateChange={setSelectedDate}
              availableDates={historyData.map(h => h.date)}
              selectedDate={singleData?.date}
            />
          </div>

          <div className={`flex-1 min-w-0 w-full transition-all duration-300 ${isLoading ? 'opacity-50 grayscale-[0.5]' : 'opacity-100'}`}>
            
            {/* Mobile Selectors */}
            <div className="block lg:hidden mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-col gap-3">
                    <select 
                        className="w-full p-3 rounded-xl border border-gray-200 text-[#111111] font-bold outline-none cursor-pointer"
                        value={singleProvince}
                        onChange={(e) => setSelectedProvinces([e.target.value])}
                    >
                        <option value="Miền Bắc">Miền Bắc</option>
                        <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                        <option value="Đồng Nai">Đồng Nai</option>
                        <option value="Sóc Trăng">Sóc Trăng</option>
                        <option value="Cần Thơ">Cần Thơ</option>
                        <option value="Tây Ninh">Tây Ninh</option>
                        <option value="Đà Lạt">Đà Lạt</option>
                        <option value="Bình Dương">Bình Dương</option>
                        <option value="Khánh Hòa">Khánh Hòa</option>
                    </select>

                    <select 
                        className="w-full p-3 rounded-xl border border-gray-200 text-[#637381] font-medium outline-none cursor-pointer"
                        value={singleData?.date || ''}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    >
                        {historyData.map(h => (
                            <option key={h.date} value={h.date}>{h.date}</option>
                        ))}
                    </select>
                </div>
            </div>
            {lotteryData.length > 0 ? (
              <ResultsMatrix
                dataList={lotteryData}
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
                    Đài <span className="text-[#ee1314] font-bold">{singleProvince}</span> hiện chưa cập nhật kết quả cho ngày hôm nay.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProvinces(["TP. Hồ Chí Minh"])}
                  className="bg-[#102937] text-white px-6 py-3 rounded-2xl font-bold text-[14px] hover:bg-[#ee1314] transition-all cursor-pointer active:scale-95 shadow-lg shadow-slate-200"
                >
                  Xem đài TP. Hồ Chí Minh
                </button>
              </div>
            )}
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

        <div className="max-w-[1240px] mx-auto px-6 py-10 lg:py-16">
          <PartnerLogos />
        </div>
      </main>
    </div>
  );
};
