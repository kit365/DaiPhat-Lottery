import React from 'react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { LotoTable } from "./LotoTable";
import { RecentResults } from "./RecentResults";
import { FeaturedNews } from "./FeaturedNews";
import { LotteryResult } from '../../types/lottery';

interface HomeSidebarProps {
  showLoto?: boolean;
  data: LotteryResult | null;
  history: LotteryResult[];
  onDateChange: (date: string) => void;
  selectedDigit?: string | null;
}

export const HomeSidebar: React.FC<HomeSidebarProps> = ({ showLoto, data, history, onDateChange, selectedDigit }) => {
  const { openLoginModal } = useAuthStore();

  return (
    <aside className="w-full lg:w-[380px] space-y-4">
      {/* Smaller Promo Banner - Always Visible */}
      <div className="relative overflow-hidden rounded-[20px] bg-[#E60F14] p-5 shadow-[0_10px_25px_rgba(230,15,20,0.15)] group cursor-pointer transition-all hover:scale-[1.01] flex items-center min-h-[140px]">
        <div className="relative z-10 space-y-4 max-w-[65%]">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest font-client-display">Mua vé số online</p>
            <h3 className="text-lg font-black text-white leading-tight uppercase font-client-display tracking-tight">
              SĂN LỘC VÀNG<br />
              TRÚNG LỚN
            </h3>
          </div>
          <button 
            onClick={openLoginModal}
            className="bg-[#FFD54F] hover:bg-white text-[#B71C1C] px-4 py-2 rounded-xl font-black text-[12px] transition-all shadow-md cursor-pointer active:scale-95 uppercase"
          >
            Mua vé ngay
          </button>
        </div>

        {/* Lucky Girl Image */}
        <div className="absolute right-0 top-0 w-full h-full z-0 pointer-events-none overflow-hidden rounded-[20px]">
          <img 
            src="/assets/images/hero_laptop.JPEG" 
            alt="Lucky Girl" 
            className="w-full h-full object-cover object-[82%_center] transition-transform group-hover:scale-105 duration-700 opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#E60F14] via-[#E60F14]/60 to-transparent"></div>
        </div>
      </div>

      {/* Loto Table - Toggled by showLoto but dynamic based on prizes */}
      {showLoto && data && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <LotoTable prizes={data.prizes} selectedDigit={selectedDigit} />
        </div>
      )}

      {/* Recent Results Widget */}
      <RecentResults history={history} onDateChange={onDateChange} />

      {/* Featured News Widget */}
      <FeaturedNews />
    </aside>
  );
};
