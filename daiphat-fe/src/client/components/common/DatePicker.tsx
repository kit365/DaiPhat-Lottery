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
  const [currentViewDate, setCurrentViewDate] = useState(
    dayjs(selectedDate, 'DD/MM/YYYY').isValid() ? dayjs(selectedDate, 'DD/MM/YYYY').startOf('month') : dayjs().startOf('month')
  );
  const [activeRange, setActiveRange] = useState<string | null>(null);

  const nextMonthViewDate = currentViewDate.add(1, 'month');

  const getDaysForMonth = (viewDate: dayjs.Dayjs) => {
    const startOfMonth = viewDate.startOf('month');
    const endOfMonth = viewDate.endOf('month');
    const daysInMonth = endOfMonth.date();
    const startDayOfWeek = startOfMonth.day(); // 0 is Sunday

    const days: (dayjs.Dayjs | null)[] = [];
    const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    for (let i = 0; i < offset; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(startOfMonth.date(i));
    }

    // Only fill until the end of the last week
    const totalSlots = days.length;
    const remainingInWeek = totalSlots % 7 === 0 ? 0 : 7 - (totalSlots % 7);
    for (let i = 0; i < remainingInWeek; i++) {
      days.push(null);
    }

    return days;
  };

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

    setCurrentViewDate(targetDate.startOf('month'));

    if (range.type === 'exact') {
      onDateSelect(targetDate.format('DD/MM/YYYY'));
    }
  };

  const renderMonthGrid = (viewDate: dayjs.Dayjs) => {
    const days = getDaysForMonth(viewDate);
    return (
      <div className="flex-1 px-4">
        <div className="grid grid-cols-7 mb-2">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
            <div key={d} className="text-center text-[12px] font-bold text-[#444444]/60 py-3">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-t border-l border-gray-100">
          {days.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="aspect-[1.2/1] border-r border-b border-gray-100 bg-slate-50/20"></div>;

            const dateStr = date.format('DD/MM/YYYY');
            const isSelected = selectedDate === dateStr;
            const hasResult = availableDates.includes(dateStr);
            const isToday = date.isSame(dayjs(), 'day');

            return (
              <button
                key={dateStr}
                onClick={() => onDateSelect(dateStr)}
                className={`
                  relative aspect-[1.2/1] border-r border-b border-gray-100 flex flex-col items-center justify-center text-[14px] transition-all cursor-pointer group
                  ${isSelected
                    ? 'bg-[#BA0000]/80 text-white z-10'
                    : 'bg-white text-[#444444] hover:bg-[#BA0000]/80 hover:text-white'
                  }
                `}
              >
                <span className={`font-bold ${isSelected ? 'text-white' : ''}`}>
                  {date.date()}
                </span>

                {hasResult && !isSelected && (
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#BA0000]"></div>
                )}

                {isToday && !isSelected && (
                  <div className="absolute bottom-1 w-5 h-0.5 bg-[#BA0000]/30 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex bg-white rounded-[24px] overflow-hidden ${className}`}>
      {/* Sidebar - Quick Ranges */}
      <div className="w-[160px] bg-slate-50/50 border-r border-gray-100 p-4 flex flex-col gap-1 shrink-0">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Phím tắt</span>
        {QUICK_RANGES.map((range) => {
          const isActive = activeRange === range.value;
          return (
            <button
              key={range.value}
              onClick={() => handleQuickRangeSelect(range)}
              className={`
                w-full text-left px-4 py-2.5 rounded-xl text-[14px] transition-all cursor-pointer
                ${isActive
                  ? 'bg-white text-[#BA0000] font-bold shadow-sm'
                  : 'text-[#444444] font-medium hover:bg-white/80 hover:text-[#BA0000]'
                }
              `}
            >
              {range.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 p-8">
        {/* Unified Header: Month + Navigation */}
        <div className="flex items-center justify-between mb-8 px-4">
          <button
            onClick={handlePrevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-[#333333] cursor-pointer transition-all active:scale-90"
          >
            <span className="material-symbols-outlined text-[24px]">chevron_left</span>
          </button>

          <h4 className="text-[16px] font-bold text-[#444444] capitalize">
            {currentViewDate.format('MMMM YYYY')}
          </h4>

          <button
            onClick={handleNextMonth}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-[#333333] cursor-pointer transition-all active:scale-90"
          >
            <span className="material-symbols-outlined text-[24px]">chevron_right</span>
          </button>
        </div>

        <div className="max-w-[400px] mx-auto">
          {renderMonthGrid(currentViewDate)}
        </div>
      </div>
    </div>
  );
};
