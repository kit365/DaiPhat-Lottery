import React from 'react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { LotoTable } from "./LotoTable";
import { LotteryResult } from '../../types/lottery';

interface HomeSidebarProps {
  showLoto?: boolean;
  setShowLoto?: (val: boolean) => void;
  dataList: LotteryResult[];
  history: LotteryResult[];
  onDateChange: (date: string) => void;
  selectedDigit?: string | null;
  hoveredDigit?: string | null;
  onDigitSelect?: (digit: string | null) => void;
  onDigitHover?: (digit: string | null) => void;
}

export const HomeSidebar: React.FC<HomeSidebarProps> = ({ showLoto, setShowLoto, dataList, history, onDateChange, selectedDigit, hoveredDigit, onDigitSelect, onDigitHover }) => {
  const { openLoginModal } = useAuthStore();

  return (
    <aside className="w-full lg:w-[380px] space-y-4">
      <div
        onClick={openLoginModal}
        className="relative overflow-hidden rounded-[16px] shadow-sm cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] w-full min-h-[150px] flex items-center p-5 group bg-[#e41212]"
      >
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://i.ibb.co/FbsnQfjR/28d77182-45b0-40bf-9aaf-58136bc87741.png"
            alt="Săn Lộc Vàng Background"
            className="w-full h-full object-cover object-center scale-[1.3] -translate-x-12"
          />
        </div>

        {/* Text & Button Overlay */}
        <div className="relative z-10 space-y-3 max-w-[65%]">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-white uppercase tracking-[0.1em] font-client-display drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              Mua vé số online
            </p>
            <h3 className="text-[20px] font-black text-white leading-[1.1] uppercase font-client-main drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              SĂN LỘC VÀNG<br />
              TRÚNG LỚN
            </h3>
          </div>
          <button
            className="bg-gradient-to-r from-[#ffe169] to-[#ffc107] hover:from-[#fff] hover:to-[#ffe169] text-[#c62828] px-4 py-2 rounded-full font-bold text-[12px] transition-all shadow-[0_4px_10px_rgba(255,213,79,0.3)] uppercase font-client-main flex items-center gap-1 w-max pointer-events-none"
          >
            Mua vé ngay
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Loto Table - Shown conditionally on mobile, always on desktop if data exists */}
      {showLoto && dataList.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <LotoTable
            dataList={dataList}
            selectedDigit={selectedDigit}
            hoveredDigit={hoveredDigit}
            onDigitClick={onDigitSelect}
            onDigitHover={onDigitHover}
            setShowLoto={setShowLoto}
          />
        </div>
      )}
    </aside>
  );
};
