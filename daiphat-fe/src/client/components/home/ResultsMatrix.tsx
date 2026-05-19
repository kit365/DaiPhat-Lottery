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
  if (!digitToHighlight) return <>{numStr}</>;

  // Loto is only determined by the last 2 digits (or all digits if length < 2)
  const length = numStr.length;
  const lotoStartIndex = length >= 2 ? length - 2 : 0;

  // Check if the loto part contains the digit
  const lotoPart = numStr.slice(lotoStartIndex);
  const isMatch = lotoPart.includes(digitToHighlight);

  // If no match in the Loto part, dim the entire number
  if (!isMatch) {
    return <span className="opacity-30 transition-opacity">{numStr}</span>;
  }

  // If matched, highlight the ENTIRE Loto pair as a single block
  const prefix = numStr.slice(0, lotoStartIndex);

  return (
    <>
      {prefix && <span className="opacity-30 transition-opacity">{prefix}</span>}
      <span className="bg-[#FDE047] text-[#BA0000] font-black px-0.5 rounded-sm transition-colors">
        {lotoPart}
      </span>
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
        <div className="p-5 lg:p-6 bg-white border-b border-gray-100 rounded-t-3xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-[4px] h-5 bg-[#BA0000]"></div>
                <h2 className="text-[18px] lg:text-[20px] font-bold text-[#111111] uppercase font-client-main">
                  KẾT QUẢ XỔ SỐ KIẾN THIẾT {data.province} {data.date}
                </h2>
              </div>
              <div className="flex items-center gap-2 ml-3.5">
                <p className="text-slate-600 text-[14px] flex items-center gap-2">
                  <span className="flex gap-1 items-center">
                    <span className="w-2 h-2 rounded-full bg-[#BA0000] animate-pulse"></span>
                  </span>
                  <span>
                    Đang chờ xổ số <span className="font-semibold text-slate-900">{data.province}</span> lúc <span className="font-semibold">16h12'</span>.
                    Còn <span className="text-[#BA0000] font-semibold tabular-nums ml-1">{formatTime(timeLeft.h)}:{formatTime(timeLeft.m)}:{formatTime(timeLeft.s)}</span> nữa
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Integrated Quick Filter Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center overflow-x-auto lg:overflow-x-visible">
          <div className="flex items-center gap-6 whitespace-nowrap w-full">
            {/* Main Filters */}
            <div className="flex items-center gap-4 pr-6 border-r border-slate-200">
              <button
                onClick={() => setDisplayType('full')}
                className={`text-[12px] font-bold transition-all font-client-display uppercase tracking-tight cursor-pointer ${displayType === 'full' ? 'text-[#BA0000]' : 'text-slate-500 hover:text-[#102937]'}`}
              >
                Đầy đủ
              </button>
              <div className="w-[1px] h-3 bg-gray-300/50"></div>
              <button
                onClick={() => setDisplayType('2-digit')}
                className={`text-[12px] font-bold transition-all font-client-display uppercase tracking-tight cursor-pointer ${displayType === '2-digit' ? 'text-[#BA0000]' : 'text-slate-500 hover:text-[#102937]'}`}
              >
                2 số
              </button>
              <div className="w-[1px] h-3 bg-gray-300/50"></div>
              <button
                onClick={() => setDisplayType('3-digit')}
                className={`text-[12px] font-bold transition-all font-client-display uppercase tracking-tight cursor-pointer ${displayType === '3-digit' ? 'text-[#BA0000]' : 'text-slate-500 hover:text-[#102937]'}`}
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
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all cursor-pointer ${isSelected
                      ? 'bg-[#FDE047] border-[#FDE047] text-[#111111]'
                      : isActive
                        ? 'bg-[#FEF9C3] border-[#FDE047] text-[#BA0000]'
                        : 'border-gray-200 bg-white text-[#111111] hover:border-[#FDE047] hover:text-[#BA0000]'
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
              className={`flex font-bold text-[12px] items-center gap-2 transition-all font-client-main uppercase tracking-tight ml-auto cursor-pointer ${showLoto ? 'text-[#BA0000]' : 'text-slate-500 hover:text-[#BA0000]'}`}
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
          <div className="flex border-b border-gray-100 bg-[#FCE5DF]/30">
            <div className="w-[120px] lg:w-[180px] bg-gradient-to-br from-[#8B0000] to-[#BA0000] p-5 flex flex-col items-center justify-center shrink-0 border-r border-white/10">
              <span className="material-symbols-outlined text-[#FFD54F] text-[24px] mb-1" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
              <span className="text-white text-[12px] font-black uppercase text-center leading-tight">Giải ĐẶC BIỆT</span>
            </div>
            <div className="flex-1 flex items-center justify-center py-6">
              <span className="text-[#BA0000] text-3xl lg:text-4xl font-black tracking-tight">
                {renderHighlightedNumber(getDisplayNumber(prizes.special, displayType), activeDigit || null)}
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
            <div key={prize.label} className={`flex border-b border-gray-100 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`}>
              <div className="w-[120px] lg:w-[180px] p-4 flex items-center justify-center shrink-0 border-r border-gray-100 bg-[#FAFAFA]/50">
                <span className="text-[#BA0000] text-[13px] font-bold uppercase font-client-display">{prize.label}</span>
              </div>
              <div className="flex-1 py-4 px-8 flex items-center">
                {prize.isGrid ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-3">
                    {prize.numbers.map((n, i) => (
                      <span key={i} className="text-[#111111] text-[18px] lg:text-[20px] font-bold tracking-tight font-client-main">
                        {renderHighlightedNumber(getDisplayNumber(n, displayType), activeDigit || null)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-12 gap-y-3">
                    {prize.numbers.map((n, i) => (
                      <span key={i} className={`${prize.isHighlight && !activeDigit ? 'text-[#BA0000] text-[24px] lg:text-[28px]' : 'text-[#111111] text-[18px] lg:text-[22px]'} font-bold tracking-tight font-client-main`}>
                        {renderHighlightedNumber(getDisplayNumber(n, displayType), activeDigit || null)}
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
