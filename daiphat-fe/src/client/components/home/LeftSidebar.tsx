import React, { useState, useMemo } from 'react';
import { DatePickerModal } from './DatePickerModal';

interface LeftSidebarProps {
  activeProvince: string;
  setActiveProvince: (province: string) => void;
  onDateChange: (date: string) => void;
  availableDates: string[];
  selectedDate?: string;
}

const MIEN_NAM_PROVINCES = [
  "TP. Hồ Chí Minh", "Đồng Tháp", "Cà Mau", 
  "Tây Ninh", "Vũng Tàu", "Bến Tre", "Bạc Liêu",
  "Đồng Nai", "Cần Thơ", "Sóc Trăng",
  "An Giang", "Bình Dương", "Hậu Giang",
  "Kiên Giang", "Long An", "Tiền Giang", "Trà Vinh",
  "Vĩnh Long", "Bình Phước", "Đà Lạt"
];

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeProvince,
  setActiveProvince,
  onDateChange,
  availableDates,
  selectedDate
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isMienNamOpen, setIsMienNamOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProvinces = useMemo(() => {
    return MIEN_NAM_PROVINCES.filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  return (
    <aside className="w-full lg:w-[280px] shrink-0 space-y-4 font-client-main">
      {/* Date Picker Button - Premium Integration */}
      <button 
        onClick={() => setIsDatePickerOpen(true)}
        className="w-full bg-[#FAFBFC] hover:bg-white border border-slate-200 text-[#102937] py-4 px-6 rounded-2xl font-bold flex items-center justify-between shadow-sm transition-all active:scale-[0.98] group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[20px] text-[#E60F14] group-hover:rotate-12 transition-transform">calendar_month</span>
          <span className="text-[14px] uppercase tracking-tighter font-client-display">CHỌN NGÀY KHÁC</span>
        </div>
        <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-[#E60F14] transition-colors">chevron_right</span>
      </button>

      {/* Main Province Filter Card */}
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {/* Card Header */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-50">
          <span className="material-symbols-outlined text-[#E60F14] text-[22px] font-bold">location_on</span>
          <h3 className="text-[16px] font-bold text-[#17191F] font-client-display">Chọn tỉnh thành</h3>
        </div>

        {/* Region Accordion */}
        <div className="p-1">
          <button 
            onClick={() => setIsMienNamOpen(!isMienNamOpen)}
            className="w-full flex items-center justify-between px-3 py-3 text-[#17191F] font-bold text-[15px] hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
          >
            <span>Miền Nam</span>
            <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${isMienNamOpen ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {/* Province List Area */}
          <div className={`transition-all duration-300 overflow-hidden ${isMienNamOpen ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
            
            {/* Minimal Search Box */}
            <div className="px-2 mb-2">
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">search</span>
                <input 
                  type="text" 
                  placeholder="Tìm tỉnh..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 text-[13px] rounded-lg pl-9 pr-3 py-2 outline-none focus:border-[#FFB800]/50 focus:bg-white transition-all text-[#102937] placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Scrollable List */}
            <div className="space-y-0.5 px-1 pb-2 overflow-y-auto max-h-[350px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {filteredProvinces.map((province) => {
                const isActive = activeProvince === province;
                return (
                  <button
                    key={province}
                    onClick={() => setActiveProvince(province)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer relative overflow-hidden group font-client-main ${
                      isActive 
                        ? 'text-[#E60F14] font-bold' 
                        : 'text-[#555555] hover:text-[#E60F14]'
                    }`}
                  >
                    {/* Active Indicator Bar - Sharp like the header */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#E60F14]"></div>
                    )}
                    
                    <span className="text-[14px] pl-1">{province}</span>
                  </button>
                );
              })}

              {filteredProvinces.length === 0 && (
                <div className="text-center py-4 text-slate-400 text-[13px]">
                  Không tìm thấy tỉnh nào
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onDateSelect={(date) => {
          onDateChange(date);
          setIsDatePickerOpen(false);
        }}
        availableDates={availableDates}
        selectedDate={selectedDate}
      />
    </aside>
  );
};
