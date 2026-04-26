import React from 'react';
import { DatePicker } from '../common/DatePicker';

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-[#102937]/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        {/* The clean DatePicker */}
        <DatePicker 
          selectedDate={selectedDate}
          onDateSelect={(date) => {
            onDateSelect(date);
            onClose();
          }}
          availableDates={availableDates}
          className="border-none shadow-none"
        />
      </div>
    </div>
  );
};
