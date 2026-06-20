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
      <div className="absolute left-0 top-[calc(100%+12px)] z-[100] w-[300px] max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="bg-[#EAEAEA] rounded-lg shadow-xl border border-gray-300 overflow-hidden">
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
