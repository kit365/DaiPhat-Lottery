import React, { useState, useEffect } from 'react';
import { DisplayType, getDisplayNumber, LotteryResult } from '../../types/lottery';

interface ResultsMatrixProps {
  data: LotteryResult;
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
}

// Helper to highlight specific digits
const renderHighlightedNumber = (numStr: string, digitToHighlight: string | null) => {
  if (!digitToHighlight || !numStr.includes(digitToHighlight)) {
    return <>{numStr}</>;
  }

  // Split by the digit and map to JSX, keeping the digit wrapped in a span
  return (
    <>
      {numStr.split('').map((char, index) => {
        if (char === digitToHighlight) {
          return <span key={index} className="text-[#E60F14] drop-shadow-sm font-black">{char}</span>;
        }
        return <span key={index} className="opacity-30">{char}</span>;
      })}
    </>
  );
};

export const ResultsMatrix: React.FC<ResultsMatrixProps> = ({
  data,
  displayType,
  setDisplayType,
  showLoto,
  setShowLoto,
  onDateChange,
  availableDates = [],
  selectedDigit,
  setSelectedDigit,
  activeDigit,
  setHoveredDigit
}) => {
  const { prizes } = data;
  const [timeLeft, setTimeLeft] = useState({ h: 15, m: 58, s: 37 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 };
        if (prev.m > 0) return { ...prev, m: prev.m - 1, s: 59 };
        if (prev.h > 0) return { h: prev.h - 1, m: 59, s: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (n: number) => n.toString().padStart(2, '0');

  return (
    <section className="w-full">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] overflow-hidden font-client-main">
        {/* Header Section */}
        <div className="p-6 bg-white border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-7 bg-[#E60F14] rounded-full"></div>
                <h2 className="text-xl lg:text-2xl font-black text-[#102937] uppercase tracking-tight font-client-display">
                  KẾT QUẢ XỔ SỐ KIẾN THIẾT {data.province} {data.date}
                </h2>
              </div>
              <div className="flex items-center gap-2 ml-5">
                <p className="text-[#102937] font-medium text-[16px] font-client-display tracking-tight flex items-center gap-3">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E60F14]/20"></span>
                    <span className="w-2 h-2 rounded-full bg-[#E60F14] animate-pulse shadow-[0_0_8px_rgba(230,15,20,0.4)]"></span>
                  </span>
                  <span>
                    Đang chờ xổ số <span className="font-black text-[#102937]">{data.province}</span> lúc <span className="font-black">16h12'</span>.
                    Còn <span className="text-[#E60F14] font-black tabular-nums mx-1">{formatTime(timeLeft.h)}:{formatTime(timeLeft.m)}:{formatTime(timeLeft.s)}</span> nữa
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Integrated Quick Filter Bar */}
        <div className="px-6 py-2 bg-slate-50/80 border-b border-gray-100 flex items-center overflow-x-auto lg:overflow-x-visible">
          <div className="flex items-center gap-5 whitespace-nowrap w-full">
            {/* Main Filters */}
            <div className="flex items-center gap-4 pr-5 border-r border-gray-300/50">
              <button
                onClick={() => setDisplayType('full')}
                className={`text-[12px] font-bold transition-all font-client-display uppercase tracking-tight cursor-pointer ${displayType === 'full' ? 'text-[#E60F14]' : 'text-slate-500 hover:text-[#102937]'}`}
              >
                Đầy đủ
              </button>
              <div className="w-[1px] h-3 bg-gray-300/50"></div>
              <button
                onClick={() => setDisplayType('2-digit')}
                className={`text-[12px] font-bold transition-all font-client-display uppercase tracking-tight cursor-pointer ${displayType === '2-digit' ? 'text-[#E60F14]' : 'text-slate-500 hover:text-[#102937]'}`}
              >
                2 số
              </button>
              <div className="w-[1px] h-3 bg-gray-300/50"></div>
              <button
                onClick={() => setDisplayType('3-digit')}
                className={`text-[12px] font-bold transition-all font-client-display uppercase tracking-tight cursor-pointer ${displayType === '3-digit' ? 'text-[#E60F14]' : 'text-slate-500 hover:text-[#102937]'}`}
              >
                3 số
              </button>
            </div>

            {/* Number Selector */}
            <div className="flex items-center gap-1 pr-5 border-r border-gray-300/50">
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
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border transition-all cursor-pointer shadow-sm ${isSelected
                        ? 'bg-[#E60F14] border-[#E60F14] text-white scale-110'
                        : isActive
                          ? 'bg-[#FFF5F5] border-[#E60F14] text-[#E60F14] scale-110'
                          : 'border-gray-200 bg-white text-[#102937] hover:border-[#E60F14] hover:text-[#E60F14]'
                      }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            {/* View Loto */}
            <button
              onClick={() => setShowLoto(!showLoto)}
              className={`flex font-bold text-[12px] items-center gap-1.5 transition-all font-client-display uppercase tracking-tight ml-auto cursor-pointer ${showLoto ? 'text-[#E60F14]' : 'text-[#102937] hover:text-[#E60F14]'}`}
            >
              {showLoto ? 'Ẩn bảng loto' : 'Xem bảng loto'}
              <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${showLoto ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="w-full">
          {/* SPECIAL PRIZE ROW */}
          <div className="flex border-b border-gray-100 bg-[#FFF9F9]">
            <div className="w-[120px] lg:w-[180px] bg-gradient-to-br from-[#B71C1C] to-[#E60F14] p-5 flex flex-col items-center justify-center shrink-0 border-r border-white/10">
              <span className="material-symbols-outlined text-[#FFD54F] text-[24px] mb-1" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
              <span className="text-white text-[12px] font-black uppercase text-center leading-tight">Giải ĐẶC BIỆT</span>
            </div>
            <div className="flex-1 flex items-center justify-center py-6">
              <span className="text-[#E60F14] text-3xl lg:text-4xl font-black tracking-[0.2em]">
                {renderHighlightedNumber(getDisplayNumber(prizes.special, displayType), activeDigit)}
              </span>
            </div>
          </div>

          {/* OTHER PRIZES */}
          {[
            { label: "Giải nhất", numbers: [prizes.first] },
            { label: "Giải nhì", numbers: [prizes.second] },
            { label: "Giải ba", numbers: prizes.third },
            { label: "Giải tư", numbers: prizes.fourth, isGrid: true },
            { label: "Giải năm", numbers: [prizes.fifth] },
            { label: "Giải sáu", numbers: prizes.sixth },
            { label: "Giải bảy", numbers: [prizes.seventh] },
            { label: "Giải tám", numbers: [prizes.eighth], isHighlight: true },
          ].map((prize, idx) => (
            <div key={prize.label} className={`flex border-b border-gray-100 last:border-0 ${idx % 2 !== 0 ? 'bg-white' : 'bg-[#FAFBFC]/40'}`}>
              <div className="w-[120px] lg:w-[180px] p-4 flex items-center justify-center shrink-0 border-r border-gray-100 bg-[#FAFAFA]/50">
                <span className="text-[#E60F14] text-[13px] font-bold uppercase font-client-display">{prize.label}</span>
              </div>
              <div className="flex-1 py-4 px-8 flex items-center">
                {prize.isGrid ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-3">
                    {prize.numbers.map((n, i) => (
                      <span key={i} className="text-[#102937] text-[18px] lg:text-[20px] font-extrabold tracking-tight">
                        {renderHighlightedNumber(getDisplayNumber(n, displayType), activeDigit)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-12 gap-y-3">
                    {prize.numbers.map((n, i) => (
                      <span key={i} className={`${prize.isHighlight && !activeDigit ? 'text-[#E60F14] text-[24px] lg:text-[28px]' : 'text-[#102937] text-[18px] lg:text-[22px]'} font-extrabold tracking-tight`}>
                        {renderHighlightedNumber(getDisplayNumber(n, displayType), activeDigit)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
};
