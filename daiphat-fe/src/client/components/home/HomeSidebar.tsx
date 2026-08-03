import React from 'react';
import { Link } from 'react-router-dom';
import { LotoTable } from "./LotoTable";
import { LotteryResult } from '../../types/lottery';
import { TicketSearchWidget } from '../ticket-search/TicketSearchWidget';

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
  return (
    <aside className="w-full lg:w-[260px] xl:w-[340px] flex flex-col-reverse lg:flex-col gap-4">
      <TicketSearchWidget />

      <Link
        to="/buy-ticket"
        className="relative overflow-hidden rounded-[16px] shadow-sm cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] w-full min-h-[150px] flex items-center p-5 group bg-[#e41212]"
      >
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://i.ibb.co/FbsnQfjR/28d77182-45b0-40bf-9aaf-58136bc87741.png"
            alt="Săn Lộc Vàng Background"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-right sm:object-center"
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
          <span
            className="bg-gradient-to-r from-[#ffe169] to-[#ffc107] group-hover:from-[#fff] group-hover:to-[#ffe169] text-[#c62828] px-4 py-2 rounded-full font-bold text-[12px] transition-all shadow-[0_4px_10px_rgba(255,213,79,0.3)] uppercase font-client-main flex items-center gap-1 w-max"
          >
            Mua vé ngay
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </span>
        </div>
      </Link>

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
