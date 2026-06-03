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
    <>
      {/* Invisible overlay for click-away */}
      <div
        className="fixed inset-0 z-[90] cursor-default"
        onClick={onClose}
      />

      {/* Popup Content - Positioned absolutely relative to parent */}
      <div className="absolute left-[calc(100%+20px)] top-0 z-[100] w-[600px] animate-in fade-in slide-in-from-left-4 duration-300">
        <div className="bg-white rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden">
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
    </>
  );
};
