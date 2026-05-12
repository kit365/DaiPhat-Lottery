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
      <div className="bg-white rounded-[24px] p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-slate-200 text-[40px]">history_toggle_off</span>
        </div>
        <p className="text-slate-400 font-bold text-[14px]">Chưa có lịch sử</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-gray-100 font-client-main relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCE5DF]/40 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FCE5DF] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#BA0000] text-[18px]">history</span>
          </div>
          <h3 className="text-[15px] font-black text-[#111111] uppercase font-client-main tracking-tight">
            KẾT QUẢ GẦN ĐÂY
          </h3>
        </div>
        <button
          className="group text-[12px] font-bold text-slate-400 hover:text-[#BA0000] flex items-center gap-0.5 cursor-pointer transition-all font-client-main"
        >
          Xem tất cả
          <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">chevron_right</span>
        </button>
      </div>

      <div className="space-y-1.5 relative z-10">
        {history.slice(0, 5).map((item, idx) => (
          <div
            key={idx}
            onClick={() => onDateChange(item.date)}
            className="group flex items-center justify-between p-3 -mx-2 rounded-[20px] hover:bg-[#FCE5DF]/30 transition-all cursor-pointer border border-transparent hover:border-slate-100/50"
          >
            {/* Date Info */}
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#BA0000] group-hover:text-white group-hover:border-transparent transition-all duration-300">
                <span className="material-symbols-outlined text-[22px]">confirmation_number</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-black text-[#102937] leading-tight mb-0.5 group-hover:text-[#BA0000] transition-colors">{item.date}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.dayOfWeek}</span>
              </div>
            </div>

            {/* Lucky Number - Special Prize Only */}
            <div className="flex flex-col items-end">
              <span className="text-[18px] font-black text-[#BA0000] font-client-display tracking-widest group-hover:scale-110 transition-transform origin-right">
                {item.prizes.special}
              </span>
              <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter mt-0.5">Giải Đặc Biệt</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-50 text-center">
        <button className="text-[11px] font-black text-slate-300 hover:text-[#BA0000] uppercase tracking-widest transition-colors cursor-pointer">
          Xem lịch sử chi tiết
        </button>
      </div>
    </div>
  );
};
