import React from 'react';
import { LotteryResult } from '../../types/lottery';

interface RecentResultsProps {
  history: LotteryResult[];
  onDateChange: (date: string) => void;
}

export const RecentResults: React.FC<RecentResultsProps> = ({ history, onDateChange }) => {
  // If no history, show empty state or placeholder
  if (!history || history.length === 0) {
    return (
      <div className="bg-white rounded-[24px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col items-center justify-center text-center">
        <span className="material-symbols-outlined text-slate-200 text-[48px] mb-2">history_toggle_off</span>
        <p className="text-slate-400 font-bold text-[13px]">Chưa có lịch sử</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 font-client-main">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[15px] font-black text-[#102937] uppercase tracking-tight font-client-display">
          KẾT QUẢ GẦN ĐÂY
        </h3>
        <button 
          className="text-[12px] font-bold text-slate-400 hover:text-[#E60F14] flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
        >
          Xem tất cả
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>

      <div className="space-y-1">
        {history.map((item, idx) => (
          <div 
            key={idx} 
            onClick={() => onDateChange(item.date)}
            className="group flex items-center justify-between py-4 px-3 -mx-3 rounded-[20px] hover:bg-slate-50 transition-all cursor-pointer border border-transparent hover:border-slate-100"
          >
            {/* Date Info */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF5F5] flex items-center justify-center text-[#E60F14] group-hover:bg-[#E60F14] group-hover:text-white transition-all shadow-sm">
                <span className="material-symbols-outlined text-[20px]">event</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-black text-[#102937] leading-none mb-1">{item.date}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{item.dayOfWeek}</span>
              </div>
            </div>

            {/* Lucky Number - Special Prize Only */}
            <div className="flex items-center">
              <span className="text-[18px] font-black text-[#E60F14] font-client-display tracking-wider group-hover:scale-110 transition-transform origin-right">
                {item.prizes.special}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
