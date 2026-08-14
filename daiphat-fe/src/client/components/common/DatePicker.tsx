"use client";

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

export const DatePicker: React.FC<DatePickerProps> = ({
  selectedDate,
  onDateSelect,
  availableDates = [],
  className = ""
}) => {
  const [currentViewDate, setCurrentViewDate] = useState(
    dayjs(selectedDate, 'DD/MM/YYYY').isValid() ? dayjs(selectedDate, 'DD/MM/YYYY').startOf('month') : dayjs().startOf('month')
  );

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
  const handleNextMonth = () => {
    const nextMonth = currentViewDate.add(1, 'month');
    if (nextMonth.startOf('month').isAfter(dayjs().startOf('month'))) {
      return;
    }
    setCurrentViewDate(nextMonth);
  };
  const handlePrevYear = () => setCurrentViewDate(currentViewDate.subtract(1, 'year'));
  const handleNextYear = () => {
    const nextYear = currentViewDate.add(1, 'year');
    if (nextYear.startOf('month').isAfter(dayjs().startOf('month'))) {
      setCurrentViewDate(dayjs().startOf('month'));
      return;
    }
    setCurrentViewDate(nextYear);
  };

  const renderMonthGrid = (viewDate: dayjs.Dayjs) => {
    const days = getDaysForMonth(viewDate);
    return (
      <div className="w-full bg-white px-2">
        <div className="grid grid-cols-7 mb-1">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, idx) => (
            <div key={d} className={`text-center text-[13px] font-bold py-1 ${idx >= 5 ? 'text-[#ee1314]' : 'text-[#444444]/60'}`}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {days.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="w-8 h-8 mx-auto"></div>;

            const dateStr = date.format('DD/MM/YYYY');
            const isSelected = selectedDate === dateStr;
            const isFuture = date.isAfter(dayjs(), 'day');
            const isDisabled = isFuture;
            const isToday = date.isSame(dayjs(), 'day');

            return (
              <button
                key={dateStr}
                onClick={() => {
                  if (isDisabled) return;
                  onDateSelect(dateStr);
                }}
                disabled={isDisabled}
                className={`
                  relative w-9 h-9 mx-auto flex flex-col items-center justify-center text-[15px] transition-all cursor-pointer group rounded-full
                  ${isSelected
                    ? 'bg-[#ee1314] text-white z-10 font-bold shadow-md shadow-[#ee1314]/30'
                    : isDisabled
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'hover:bg-red-50 text-[#444444]'
                  }
                `}
              >
                <span>{date.date()}</span>
                {isToday && !isSelected && (
                   <div className="absolute bottom-0.5 w-4 h-[2px] bg-[#ee1314]/30 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col bg-white overflow-hidden font-client-main ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-2 mt-2">
        <div className="flex items-center">
          <button onClick={handlePrevYear} className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-full text-[#444444] cursor-pointer transition-colors"><span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span></button>
          <button onClick={handlePrevMonth} className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-full text-[#444444] cursor-pointer transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
        </div>
        <h4 className="text-[15px] font-bold text-[#333333] capitalize whitespace-nowrap text-center flex-1">
          {currentViewDate.format('MMMM YYYY')}
        </h4>
        <div className="flex items-center">
          <button onClick={handleNextMonth} className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-full text-[#444444] cursor-pointer transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
          <button onClick={handleNextYear} className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-full text-[#444444] cursor-pointer transition-colors"><span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_right</span></button>
        </div>
      </div>

      {renderMonthGrid(currentViewDate)}

      <div className="mt-2 px-2 pb-2">
        <button
          onClick={() => {
            setCurrentViewDate(dayjs().startOf('month'));
            onDateSelect(dayjs().format('DD/MM/YYYY'));
          }}
          className="w-full text-center py-2.5 rounded-xl text-[15px] font-bold text-[#ee1314] bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
        >
          Hôm nay
        </button>
      </div>
    </div>
  );
};
