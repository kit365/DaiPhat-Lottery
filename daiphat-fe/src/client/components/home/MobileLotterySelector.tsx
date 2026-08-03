"use client";

import React from 'react';
import { DatePicker } from '../common/DatePicker';

interface MobileLotterySelectorProps {
  isAllProvinceSelected: boolean;
  selectedProvinces: string[];
  singleProvince: string;
  availableProvinces: string[];
  selectedDate: string;
  availableDates: string[];
  onSelectProvince: (provinces: string[]) => void;
  onSelectDate: (date: string) => void;
}

export const MobileLotterySelector: React.FC<MobileLotterySelectorProps> = ({
  isAllProvinceSelected,
  selectedProvinces,
  singleProvince,
  availableProvinces,
  selectedDate,
  availableDates,
  onSelectProvince,
  onSelectDate,
}) => {
  return (
    <div className="block lg:hidden mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex flex-col gap-3">
        <select
          className="w-full p-3 rounded-xl border border-gray-200 text-[#111111] font-bold outline-none cursor-pointer"
          value={isAllProvinceSelected || selectedProvinces.length > 1 ? '__ALL__' : singleProvince}
          onChange={(e) => {
            if (e.target.value === '__ALL__') {
              onSelectProvince(availableProvinces);
              return;
            }
            onSelectProvince([e.target.value]);
          }}
        >
          <option value="__ALL__">Tất cả đài miền Nam</option>
          {availableProvinces.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => {
              const el = document.getElementById('mobile-date-picker');
              const arrow = document.getElementById('mobile-date-arrow');
              if (el && arrow) {
                if (el.style.maxHeight === '600px') {
                  el.style.maxHeight = '0px';
                  el.style.opacity = '0';
                  arrow.style.transform = 'rotate(0deg)';
                } else {
                  el.style.maxHeight = '600px';
                  el.style.opacity = '1';
                  arrow.style.transform = 'rotate(180deg)';
                }
              }
            }}
            className="w-full flex items-center justify-between p-3 text-[#637381] font-medium outline-none cursor-pointer bg-white border-none"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              <span>{selectedDate || 'Chọn ngày'}</span>
            </div>
            <span
              id="mobile-date-arrow"
              className="material-symbols-outlined text-[18px] transition-transform duration-300"
            >
              expand_more
            </span>
          </button>

          <div
            id="mobile-date-picker"
            className="transition-all duration-300 overflow-hidden"
            style={{ maxHeight: '0px', opacity: 0 }}
          >
            <div className="p-3 border-t border-gray-100">
              <DatePicker
                selectedDate={selectedDate || ''}
                onDateSelect={(date) => {
                  onSelectDate(date);
                  const el = document.getElementById('mobile-date-picker');
                  const arrow = document.getElementById('mobile-date-arrow');
                  if (el && arrow) {
                    el.style.maxHeight = '0px';
                    el.style.opacity = '0';
                    arrow.style.transform = 'rotate(0deg)';
                  }
                }}
                availableDates={availableDates}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
