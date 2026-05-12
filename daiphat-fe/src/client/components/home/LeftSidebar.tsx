import React, { useState, useMemo } from 'react';
import { DatePickerModal } from './DatePickerModal';
import LocationOnIcon from '@mui/icons-material/LocationOn';

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
        className="w-full bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.04)] border border-gray-100 flex items-center justify-between px-5 py-4 transition-all active:scale-[0.98] group cursor-pointer hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[20px] text-[#BA0000]">calendar_month</span>
          <span className="text-[16px] font-bold text-[#333333]">Chọn ngày khác</span>
        </div>
        <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-[#BA0000] transition-colors">chevron_right</span>
      </button>

      {/* Main Province Filter Card */}
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {/* Card Header */}
        <div className="px-5 py-4 flex items-center gap-2.5 border-b border-gray-100">
          <div className="w-6 h-6 rounded-full bg-[#BA0000] flex items-center justify-center shadow-sm">
            <LocationOnIcon sx={{ fontSize: 16, color: 'white' }} />
          </div>
          <h3 className="text-[16px] font-bold text-[#333333]">Chọn tỉnh thành</h3>
        </div>

        {/* Region Accordion */}
        <div className="p-0">
          <button 
            onClick={() => setIsMienNamOpen(!isMienNamOpen)}
            className="w-full flex items-center justify-between px-5 py-4 text-[#333333] font-bold text-[15px] hover:bg-slate-50 transition-colors cursor-pointer border-b border-gray-50"
          >
            <span>Miền Nam</span>
            <span className={`material-symbols-outlined text-[20px] text-slate-400 transition-transform duration-300 ${isMienNamOpen ? 'rotate-180' : ''}`}>
              expand_less
            </span>
          </button>

          {/* Province List Area */}
          <div className={`transition-all duration-300 overflow-hidden ${isMienNamOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
            
            {/* Scrollable List */}
            <div className="pb-2 overflow-y-auto max-h-[600px] no-scrollbar">
              {filteredProvinces.map((province) => {
                const isActive = activeProvince === province;
                return (
                  <button
                    key={province}
                    onClick={() => setActiveProvince(province)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 transition-all cursor-pointer relative group font-client-main ${
                      isActive 
                        ? 'bg-[#FCE5DF] text-[#BA0000] font-semibold' 
                        : 'text-[#444444] hover:bg-[#FCE5DF] hover:text-[#BA0000]'
                    }`}
                  >
                    {/* Active/Hover Indicator Bar - Thick and Sharp */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[5px] bg-[#BA0000] transition-opacity duration-200 ${
                      isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}></div>
                    
                    <span className="text-[14px] leading-relaxed transition-all pl-2 font-medium">
                      {province}
                    </span>

                    {isActive && (
                      <span className="material-symbols-outlined text-[18px] text-[#FFB800]" style={{ fontVariationSettings: '"FILL" 1' }}>
                        star
                      </span>
                    )}
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
