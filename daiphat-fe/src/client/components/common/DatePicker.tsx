import React, { useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

dayjs.locale('vi');

interface DatePickerProps {
  selectedDate: string; // Format: DD/MM/YYYY
  onDateSelect: (date: string) => void;
  availableDates?: string[];
  className?: string;
}

const QUICK_RANGES = [
  { label: 'Hôm nay', value: 'today', type: 'exact' },
  { label: 'Hôm qua', value: 'yesterday', type: 'exact' },
  { label: 'Tuần này', value: 'this_week', type: 'range' },
  { label: 'Tuần trước', value: 'last_week', type: 'range' },
  { label: 'Tháng này', value: 'this_month', type: 'range' },
  { label: 'Tháng trước', value: 'last_month', type: 'range' },
];

export const DatePicker: React.FC<DatePickerProps> = ({
  selectedDate,
  onDateSelect,
  availableDates = [],
  className = ""
}) => {
  const [currentViewDate, setCurrentViewDate] = useState(dayjs(selectedDate, 'DD/MM/YYYY').isValid() ? dayjs(selectedDate, 'DD/MM/YYYY') : dayjs());
  const [activeRange, setActiveRange] = useState<string | null>(null);

  const startOfMonth = currentViewDate.startOf('month');
  const endOfMonth = currentViewDate.endOf('month');
  const daysInMonth = endOfMonth.date();
  const startDayOfWeek = startOfMonth.day(); // 0 is Sunday

  const days = [];
  // Add empty slots for days before the start of the month
  for (let i = 0; i < (startDayOfWeek === 0 ? 6 : startDayOfWeek - 1); i++) {
    days.push(null);
  }
  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(startOfMonth.date(i));
  }

  const handlePrevMonth = () => setCurrentViewDate(currentViewDate.subtract(1, 'month'));
  const handleNextMonth = () => setCurrentViewDate(currentViewDate.add(1, 'month'));

  const handleQuickRangeSelect = (range: any) => {
    setActiveRange(range.value);
    let targetDate = dayjs();
    
    switch (range.value) {
      case 'today': targetDate = dayjs(); break;
      case 'yesterday': targetDate = dayjs().subtract(1, 'day'); break;
      case 'this_week': targetDate = dayjs().startOf('week'); break;
      case 'last_week': targetDate = dayjs().subtract(1, 'week').startOf('week'); break;
      case 'this_month': targetDate = dayjs().startOf('month'); break;
      case 'last_month': targetDate = dayjs().subtract(1, 'month').startOf('month'); break;
      default: targetDate = dayjs();
    }
    
    setCurrentViewDate(targetDate);
    
    // Only auto-select if it's an exact day. Otherwise, just navigate the calendar view.
    if (range.type === 'exact') {
      const dateStr = targetDate.format('DD/MM/YYYY');
      onDateSelect(dateStr);
    }
  };

  return (
    <div className={`flex bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-xl ${className}`}>
      {/* Sidebar - Quick Ranges */}
      <div className="w-[180px] bg-slate-50/50 border-r border-gray-100 p-3 flex flex-col gap-1">
        {QUICK_RANGES.map((range) => {
          const isActive = activeRange === range.value;
          return (
            <button
              key={range.value}
              onClick={() => handleQuickRangeSelect(range)}
              className={`
                w-full text-left px-4 py-2.5 rounded-xl text-[14px] font-bold transition-all cursor-pointer
                ${isActive 
                  ? 'bg-white text-[#BA0000] shadow-sm' 
                  : 'text-slate-500 hover:bg-white hover:text-[#102937]'
                }
              `}
            >
              {range.label}
            </button>
          );
        })}
      </div>

      {/* Calendar Area */}
      <div className="flex-1 p-6 min-w-[340px]">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-8 px-2">
          <button onClick={handlePrevMonth} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer transition-colors">
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          
          <h4 className="text-[16px] font-black text-[#102937] uppercase tracking-tight font-client-display">
            {currentViewDate.format('MMMM YYYY')}
          </h4>

          <button onClick={handleNextMonth} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer transition-colors">
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
            <div key={d} className="text-center text-[11px] font-black text-slate-400 uppercase py-2">{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="aspect-square"></div>;
            
            const dateStr = date.format('DD/MM/YYYY');
            const isSelected = selectedDate === dateStr;
            const hasResult = availableDates.includes(dateStr);
            const isToday = date.isSame(dayjs(), 'day');

            return (
              <button
                key={dateStr}
                onClick={() => onDateSelect(dateStr)}
                className={`
                  relative aspect-square rounded-xl flex flex-col items-center justify-center text-[14px] font-bold transition-all group cursor-pointer
                  ${isSelected 
                    ? 'bg-[#BA0000] text-white shadow-lg shadow-red-100 scale-105 z-10' 
                    : 'text-[#102937] hover:bg-[#FFF5F5] hover:text-[#BA0000]'
                  }
                  ${isToday && !isSelected ? 'border border-[#BA0000]/30' : ''}
                `}
              >
                <span>{date.date()}</span>
                {hasResult && (
                  <span className={`absolute bottom-2 w-1 h-1 rounded-full ${isSelected ? 'bg-white/60' : 'bg-[#BA0000]'}`}></span>
                )}
                
                {/* Tooltip-like effect on hover */}
                {!isSelected && isToday && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#BA0000] rounded-full border-2 border-white"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
