import React from 'react';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableDates: string[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({ 
  isOpen, 
  onClose, 
  availableDates, 
  selectedDate,
  onDateSelect 
}) => {
  if (!isOpen) return null;

  // Mock a simple calendar view for the current month (May 2024)
  // In a real app, this would be a dynamic calendar component
  const daysInMonth = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const dateStr = `${day < 10 ? '0' + day : day}/05/2024`;
    const hasResult = availableDates.includes(dateStr);
    const isSelected = selectedDate === dateStr;
    return { day, dateStr, hasResult, isSelected };
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-[#102937]/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-[400px] bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        {/* Header */}
        <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF5F5] flex items-center justify-center text-[#E60F14]">
              <span className="material-symbols-outlined">calendar_month</span>
            </div>
            <div>
              <h3 className="font-black text-[#102937] text-[18px] uppercase tracking-tight font-client-display">Chọn ngày</h3>
              <p className="text-slate-400 text-[12px] font-bold">Tháng 05/2024</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="p-6">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
              <div key={d} className="text-center text-[11px] font-black text-slate-400 uppercase">{d}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {/* Empty slots for start of month (assuming May 2024 starts on Wednesday/T4) */}
            <div className="aspect-square"></div>
            <div className="aspect-square"></div>
            <div className="aspect-square"></div>
            
            {daysInMonth.map(({ day, dateStr, hasResult, isSelected }) => (
              <button
                key={day}
                disabled={!hasResult}
                onClick={() => {
                  onDateSelect(dateStr);
                  onClose();
                }}
                className={`
                  relative aspect-square rounded-2xl flex items-center justify-center text-[14px] font-bold transition-all
                  ${isSelected ? 'bg-[#E60F14] text-white shadow-lg shadow-red-200 scale-110 z-10' : ''}
                  ${!isSelected && hasResult ? 'bg-white text-[#102937] border border-gray-100 hover:border-[#E60F14] hover:text-[#E60F14] cursor-pointer' : ''}
                  ${!hasResult ? 'text-slate-200 cursor-not-allowed' : ''}
                `}
              >
                {day}
                {hasResult && !isSelected && (
                  <span className="absolute bottom-1.5 w-1 h-1 bg-[#E60F14] rounded-full"></span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-slate-50 border-t border-gray-100">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <span className="w-2 h-2 bg-[#E60F14] rounded-full"></span>
            Ngày có kết quả
          </div>
        </div>
      </div>
    </div>
  );
};
