"use client";

import React, { useEffect, useRef, useState } from 'react';

interface SortDropdownProps {
  selectedLabel: string;
  onSelect: (label: string) => void;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({ selectedLabel, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const options = ['Mới nhất', 'Cũ nhất', 'Xem nhiều'];
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full md:w-[160px]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between pl-4 pr-3 py-2.5 bg-white border ${
          isOpen ? 'border-[#ee1314] shadow-[0_0_0_2px_rgba(238,19,20,0.1)]' : 'border-[#E5E8EB]'
        } rounded-lg text-[14px] text-[#212B36] font-medium outline-none transition-all hover:border-[#ee1314]`}
      >
        {selectedLabel}
        <i
          className={`fa-solid fa-chevron-down text-[#919EAB] text-[12px] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        ></i>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 w-full bg-white border border-[#E5E8EB] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden z-20 py-1 animate-in fade-in zoom-in-95 duration-200 origin-top">
          {options.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-[14px] cursor-pointer transition-colors flex items-center justify-between ${
                selectedLabel === option
                  ? 'bg-[#FFF4F4] text-[#ee1314] font-semibold'
                  : 'text-[#454F5B] hover:bg-[#F4F6F8]'
              }`}
            >
              {option}
              {selectedLabel === option && <i className="fa-solid fa-check text-[12px]"></i>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
