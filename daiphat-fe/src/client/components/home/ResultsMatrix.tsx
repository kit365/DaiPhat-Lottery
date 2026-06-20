import React from 'react';
import { DisplayType, getDisplayNumber, LotteryResult } from '../../types/lottery';

interface ResultsMatrixProps {
  dataList: LotteryResult[];
  displayType: DisplayType;
  setDisplayType: (val: DisplayType) => void;
  showLoto: boolean;
  setShowLoto: (val: boolean) => void;
  onDateChange?: (date: string) => void;
  availableDates?: string[];
  selectedDigit?: string | null;
  setSelectedDigit?: (val: string | null) => void;
  activeDigit?: string | null;
  setHoveredDigit?: (val: string | null) => void;
  statusMessage?: string;
  isRefreshing?: boolean;
}

// Helper to highlight specific digits
const renderHighlightedNumber = (numStr: string, digitToHighlight: string | null) => {
  if (!digitToHighlight) return <>{numStr}</>;

  const length = numStr.length;
  const lotoStartIndex = length >= 2 ? length - 2 : 0;
  const lotoPart = numStr.slice(lotoStartIndex);
  const isMatch = lotoPart.includes(digitToHighlight);

  if (!isMatch) {
    return <span className="opacity-30 transition-opacity">{numStr}</span>;
  }

  const prefix = numStr.slice(0, lotoStartIndex);

  return (
    <>
      {prefix && <span className="opacity-30 transition-opacity">{prefix}</span>}
      <span className="bg-[#FDE047] text-[#ee1314] font-black px-0.5 rounded-sm transition-colors">
        {lotoPart}
      </span>
    </>
  );
};

export const ResultsMatrix: React.FC<ResultsMatrixProps> = ({
  dataList,
  displayType,
  setDisplayType,
  showLoto,
  setShowLoto,
  selectedDigit,
  setSelectedDigit,
  activeDigit,
  setHoveredDigit,
  statusMessage,
  isRefreshing = false,
}) => {
  const mainDate = dataList[0]?.date || '';
  const isSingleMode = dataList.length === 1;

  return (
    <section className="w-full relative">
      {isRefreshing && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-3xl min-h-[400px]">
          <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-[#ee1314] rounded-full animate-spin"></div>
            <span className="text-[#102937] font-bold text-sm uppercase tracking-wider">Đang cập nhật...</span>
          </div>
        </div>
      )}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] overflow-hidden font-client-main">
        {/* Header Section */}
        <div className="p-3 lg:p-4 bg-white border-b border-gray-100 rounded-t-3xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-[4px] h-4 bg-[#ee1314]"></div>
                <h2 className="text-[17px] lg:text-[18px] font-bold text-[#111111] uppercase font-client-main">
                  KẾT QUẢ XỔ SỐ KIẾN THIẾT HÔM NAY {mainDate}
                </h2>
              </div>
              <div className="flex items-center gap-2 ml-3.5">
                <p className="text-slate-600 text-[13px] flex items-center gap-2">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ee1314] animate-pulse"></span>
                  </span>
                  <span>{statusMessage || 'Đang cập nhật kết quả mới nhất từ hệ thống.'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Integrated Quick Filter Bar */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center overflow-x-auto lg:overflow-x-visible">
          <div className="flex items-center gap-4 whitespace-nowrap w-full">
            {/* Main Filters */}
            <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
              <button
                onClick={() => setDisplayType('full')}
                className={`text-[14px] font-bold transition-all font-client-display uppercase tracking-tight cursor-pointer ${displayType === 'full' ? 'text-[#ee1314]' : 'text-slate-500 hover:text-[#102937]'}`}
              >
                Đầy đủ
              </button>
              <div className="w-[1px] h-3.5 bg-gray-300/50"></div>
              <button
                onClick={() => setDisplayType('2-digit')}
                className={`text-[14px] font-bold transition-all font-client-display uppercase tracking-tight cursor-pointer ${displayType === '2-digit' ? 'text-[#ee1314]' : 'text-slate-500 hover:text-[#102937]'}`}
              >
                2 số
              </button>
              <div className="w-[1px] h-3.5 bg-gray-300/50"></div>
              <button
                onClick={() => setDisplayType('3-digit')}
                className={`text-[14px] font-bold transition-all font-client-display uppercase tracking-tight cursor-pointer ${displayType === '3-digit' ? 'text-[#ee1314]' : 'text-slate-500 hover:text-[#102937]'}`}
              >
                3 số
              </button>
            </div>

            {/* Number Selector */}
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const strNum = num.toString();
                const isSelected = selectedDigit === strNum;
                const isActive = activeDigit === strNum;
                return (
                  <button
                    key={num}
                    onClick={() => setSelectedDigit?.(isSelected ? null : strNum)}
                    onMouseEnter={() => setHoveredDigit?.(strNum)}
                    onMouseLeave={() => setHoveredDigit?.(null)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold border transition-all cursor-pointer ${isSelected
                      ? 'bg-[#FDE047] border-[#FDE047] text-[#111111]'
                      : isActive
                        ? 'bg-[#FEF9C3] border-[#FDE047] text-[#ee1314]'
                        : 'border-gray-200 bg-white text-[#111111] hover:border-[#FDE047] hover:text-[#ee1314]'
                      }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
              
            <button
              onClick={() => setShowLoto(!showLoto)}
              className={`flex font-bold text-[12px] items-center transition-all font-client-main uppercase tracking-tight cursor-pointer ml-auto ${showLoto ? 'text-[#ee1314]' : 'text-slate-500 hover:text-[#ee1314]'}`}
            >
              {showLoto ? 'Ẩn bảng Loto' : 'Xem bảng Loto'}
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="w-full">
          {/* TABLE HEADER FOR PROVINCES (Only for multiple stations) */}
          {!isSingleMode && (
            <div className="flex border-b border-gray-100 bg-slate-50">
              <div className="w-[70px] md:w-[100px] lg:w-[100px] p-2 flex items-center justify-center shrink-0 border-r border-gray-100">
                <span className="text-[#333333] text-[12px] font-bold">Giải</span>
              </div>
              <div className="flex-1 flex">
                {dataList.map((d, i) => (
                  <div key={i} className="flex-1 py-2 flex items-center justify-center border-r border-gray-100 last:border-0 bg-[#FCE5DF]/30">
                    <span className="text-[13px] font-bold text-[#ee1314]">{d.province}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SPECIAL PRIZE ROW */}
          <div className={`flex border-b border-gray-100 ${isSingleMode ? 'bg-[#FCE5DF]/30' : ''}`}>
            {isSingleMode ? (
              <div className="w-[120px] lg:w-[180px] bg-gradient-to-br from-[#8B0000] to-[#ee1314] p-5 flex flex-col items-center justify-center shrink-0 border-r border-white/10">
                <span className="material-symbols-outlined text-[#FFD54F] text-[24px] mb-1" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                <span className="text-white text-[12px] font-black uppercase text-center leading-tight">Giải ĐẶC BIỆT</span>
              </div>
            ) : (
              <div className="w-[70px] md:w-[100px] lg:w-[100px] p-2 flex flex-col items-center justify-center shrink-0 border-r border-gray-100 bg-white text-center">
                <span className="text-[#ee1314] text-[11px] font-bold uppercase">Đặc biệt</span>
              </div>
            )}
            <div className={`flex-1 flex ${isSingleMode ? 'py-6 items-center justify-center' : ''}`}>
              {dataList.map((d, i) => (
                <div key={i} className={`flex-1 flex items-center justify-center ${!isSingleMode ? 'py-2 border-r border-gray-100 last:border-0 bg-white' : ''}`}>
                  <span className={`${isSingleMode ? 'text-3xl lg:text-4xl' : 'text-xl lg:text-2xl'} font-black tracking-tight text-[#ee1314]`}>
                    {renderHighlightedNumber(getDisplayNumber(d.prizes.special, displayType), activeDigit || null)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* OTHER PRIZES */}
          {[
            { label: isSingleMode ? "Giải nhất" : "Giải 1", key: "first" as const },
            { label: isSingleMode ? "Giải nhì" : "Giải 2", key: "second" as const },
            { label: isSingleMode ? "Giải ba" : "Giải 3", key: "third" as const, isGrid: true },
            { label: isSingleMode ? "Giải tư" : "Giải 4", key: "fourth" as const, isGrid: true },
            { label: isSingleMode ? "Giải năm" : "Giải 5", key: "fifth" as const },
            { label: isSingleMode ? "Giải sáu" : "Giải 6", key: "sixth" as const, isGrid: true },
            { label: isSingleMode ? "Giải bảy" : "Giải 7", key: "seventh" as const },
            { label: isSingleMode ? "Giải tám" : "Giải 8", key: "eighth" as const, isHighlight: true },
          ].map((prize, idx) => (
            <div key={prize.label} className={`flex border-b border-gray-100 last:border-0 ${idx % 2 === 0 && !isSingleMode ? 'bg-[#FAFAFA]' : idx % 2 === 0 && isSingleMode ? 'bg-white' : 'bg-white'}`}>
              <div className={`${isSingleMode ? 'w-[90px] md:w-[120px] lg:w-[180px] p-2 md:p-4 bg-[#FAFAFA]/50' : 'w-[70px] md:w-[100px] lg:w-[100px] p-2'} flex items-center justify-center shrink-0 border-r border-gray-100 text-center`}>
                <span className={`text-[#ee1314] font-bold uppercase font-client-display ${isSingleMode ? 'text-[12px] md:text-[13px]' : 'text-[11px] md:text-[12px]'}`}>{prize.label}</span>
              </div>
              <div className="flex-1 flex">
                {dataList.map((d, i) => {
                  const rawVal = d.prizes[prize.key];
                  const numbers: string[] = Array.isArray(rawVal) ? rawVal : [rawVal];
                  return (
                    <div key={i} className={`flex-1 flex items-center justify-center ${!isSingleMode ? 'py-1.5 px-2 border-r border-gray-100 last:border-0' : 'py-3 px-3 md:py-4 md:px-8'}`}>
                      {prize.isGrid ? (
                        <div className={`${isSingleMode ? `grid ${numbers.length === 2 ? 'grid-cols-2 max-w-[300px] md:max-w-[400px] lg:max-w-[500px]' : numbers.length === 3 ? 'grid-cols-3 max-w-[400px] md:max-w-[500px] lg:max-w-[600px]' : 'grid-cols-2 lg:grid-cols-4 max-w-[400px] lg:max-w-[800px]'} gap-x-4 md:gap-x-6 lg:gap-x-10 gap-y-3` : 'flex flex-col gap-y-1'} w-full mx-auto text-center`}>
                          {numbers.map((n, index) => (
                            <span key={index} className={`text-[#111111] font-bold tracking-tight font-client-main ${isSingleMode ? 'text-[16px] md:text-[18px] lg:text-[20px]' : 'text-[13px] md:text-[14px] lg:text-[15px]'}`}>
                              {renderHighlightedNumber(getDisplayNumber(n, displayType), activeDigit || null)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className={`${isSingleMode ? 'flex flex-wrap items-center justify-center gap-x-6 md:gap-x-8 lg:gap-x-12 gap-y-3' : 'flex flex-col items-center justify-center gap-y-1'} w-full`}>
                          {numbers.map((n, index) => (
                            <span key={index} className={`${prize.isHighlight && !activeDigit ? 'text-[#ee1314]' : 'text-[#111111]'} font-bold tracking-tight font-client-main ${isSingleMode ? (prize.isHighlight && !activeDigit ? 'text-[20px] md:text-[24px] lg:text-[28px]' : 'text-[16px] md:text-[18px] lg:text-[22px]') : (prize.isHighlight && !activeDigit ? 'text-[16px] lg:text-[18px]' : 'text-[13px] md:text-[14px] lg:text-[15px]')}`}>
                              {renderHighlightedNumber(getDisplayNumber(n, displayType), activeDigit || null)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
