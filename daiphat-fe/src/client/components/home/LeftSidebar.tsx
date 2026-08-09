"use client";

import React, { useState, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { DatePicker } from '../common/DatePicker';
import { QuickCheckTicketBanner } from './QuickCheckTicketBanner';

interface LeftSidebarProps {
  activeProvinces: string[];
  setActiveProvinces: (provinces: string[]) => void;
  onDateChange: (date: string) => void;
  availableDates: string[];
  availableProvinces: string[];
  selectedDate?: string;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeProvinces,
  setActiveProvinces,
  onDateChange,
  availableDates,
  availableProvinces,
  selectedDate
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isMienNamOpen, setIsMienNamOpen] = useState(true);
  const [searchQuery] = useState('');

  const filteredProvinces = useMemo(() => {
    return availableProvinces.filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [availableProvinces, searchQuery]);

  const isAllSelected =
    filteredProvinces.length > 0 &&
    activeProvinces.length === filteredProvinces.length &&
    filteredProvinces.every((province) => activeProvinces.includes(province));

  const handleSelectAll = () => {
    // Always restore full board — empty selection is not allowed
    setActiveProvinces(filteredProvinces);
  };

  const handleToggleProvince = (province: string) => {
    // Default is "all stations". First click on a station starts filtering to that station.
    if (isAllSelected || activeProvinces.length === 0) {
      setActiveProvinces([province]);
      return;
    }

    // Clicking the only selected station again returns to full board
    if (activeProvinces.length === 1 && activeProvinces[0] === province) {
      setActiveProvinces(filteredProvinces);
      return;
    }

    if (activeProvinces.includes(province)) {
      const next = activeProvinces.filter((item) => item !== province);
      setActiveProvinces(next.length === 0 ? filteredProvinces : next);
      return;
    }

    setActiveProvinces([...activeProvinces, province]);
  };

  return (
    <aside className="relative w-full lg:w-[220px] xl:w-[280px] shrink-0 space-y-4 font-client-main">
      {/* Date Picker Button - Premium Integration */}
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        <button
          onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
          className="w-full flex items-center justify-between px-5 py-4 transition-all active:scale-[0.98] group cursor-pointer hover:bg-slate-50 border-b border-gray-50"
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-[#ee1314]">calendar_month</span>
            <span className="text-[16px] font-bold text-[#333333]">Chọn ngày khác</span>
          </div>
          <span className={`material-symbols-outlined text-[20px] text-slate-400 transition-transform duration-300 ${isDatePickerOpen ? 'rotate-180' : ''}`}>
            expand_less
          </span>
        </button>

        {/* Calendar Accordion Area */}
        <div className={`transition-all duration-300 overflow-hidden ${isDatePickerOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-4 bg-white">
            <DatePicker
              selectedDate={selectedDate || ''}
              onDateSelect={(date) => {
                onDateChange(date);
              }}
              availableDates={availableDates}
            />
          </div>
        </div>
      </div>

      {/* Main Province Filter Card */}
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {/* Card Header */}
        <div className="px-5 py-4 flex items-center gap-2.5 border-b border-gray-100">
          <div className="w-6 h-6 rounded-full bg-[#ee1314] flex items-center justify-center shadow-sm">
            <MapPin className="w-4 h-4 text-white" strokeWidth={2.5} aria-hidden />
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
              <label className="w-full flex items-center gap-3 px-5 py-3 transition-all cursor-pointer relative group font-client-main text-[#444444] hover:bg-slate-50">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="absolute opacity-0 w-0 h-0"
                  />
                  <div className={`w-[16px] h-[16px] rounded flex items-center justify-center border transition-all ${isAllSelected ? 'bg-[#ee1314] border-[#ee1314]' : 'bg-white border-gray-300'}`}>
                    {isAllSelected && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white -translate-y-[0.5px]">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-[14px] leading-relaxed transition-all font-medium">Chọn tất cả</span>
              </label>

              {filteredProvinces.map((province) => {
                const isActive = activeProvinces.includes(province);
                return (
                  <label
                    key={province}
                    className={`w-full flex items-center justify-between px-5 py-3 transition-all cursor-pointer relative group font-client-main ${isActive
                      ? 'bg-[#FCE5DF] text-[#ee1314] font-semibold'
                      : 'text-[#444444] hover:bg-slate-50'
                      }`}
                  >
                    {/* Active/Hover Indicator Bar - Thick and Sharp */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[5px] bg-[#ee1314] transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0'
                      }`}></div>

                    <div className="flex items-center gap-3 w-full">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => handleToggleProvince(province)}
                          className="absolute opacity-0 w-0 h-0"
                        />
                        <div className={`w-[16px] h-[16px] rounded flex items-center justify-center border transition-all ${isActive ? 'bg-[#ee1314] border-[#ee1314]' : 'bg-white border-gray-300'}`}>
                          {isActive && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white -translate-y-[0.5px]">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="text-[14px] leading-relaxed transition-all font-medium">
                        {province}
                      </span>
                    </div>

                    {isActive && (
                      <span className="material-symbols-outlined text-[18px] text-[#FFB800] shrink-0" style={{ fontVariationSettings: '"FILL" 1' }}>
                        star
                      </span>
                    )}
                  </label>
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

      {/* Quick Check Ticket Banner */}
      <QuickCheckTicketBanner availableDates={availableDates} />

    </aside>
  );
};
