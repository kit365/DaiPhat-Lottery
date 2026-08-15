'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

type OpenKey = 'day' | 'month' | 'year' | null;

type FortuneDobPickerProps = {
  day: string;
  month: string;
  year: string;
  onDayChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onInteract: () => void;
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1919 }, (_, i) => String(CURRENT_YEAR - i));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));

function daysInMonth(month: string, year: string) {
  const m = Number(month);
  const y = Number(year);
  if (!m || !y) return 31;
  return new Date(y, m, 0).getDate();
}

function pad2(value: string) {
  if (!value) return '';
  return value.padStart(2, '0');
}

export function FortuneDobPicker({
  day,
  month,
  year,
  onDayChange,
  onMonthChange,
  onYearChange,
  onInteract,
}: FortuneDobPickerProps) {
  const [open, setOpen] = useState<OpenKey>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const maxDay = daysInMonth(month, year);
  const days = Array.from({ length: maxDay }, (_, i) => String(i + 1));

  const clampDay = (nextMonth: string, nextYear: string) => {
    const max = daysInMonth(nextMonth, nextYear);
    const current = Number(day);
    if (current && current > max) onDayChange(String(max));
  };

  const toggle = (key: OpenKey) => {
    onInteract();
    setOpen((prev) => (prev === key ? null : key));
  };

  const pick = (key: OpenKey, value: string) => {
    onInteract();
    if (key === 'day') onDayChange(value);
    if (key === 'month') {
      onMonthChange(value);
      clampDay(value, year);
    }
    if (key === 'year') {
      onYearChange(value);
      clampDay(month, value);
    }
    setOpen(null);
  };

  return (
    <div
      ref={rootRef}
      className="relative grid grid-cols-3 gap-2"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <DobColumn
        label="Ngày"
        display={pad2(day) || '—'}
        open={open === 'day'}
        onToggle={() => toggle('day')}
      >
        <div className="grid grid-cols-7 gap-1">
          {days.map((value) => (
            <OptionButton key={value} selected={day === value} onClick={() => pick('day', value)}>
              {value}
            </OptionButton>
          ))}
        </div>
      </DobColumn>

      <DobColumn
        label="Tháng"
        display={pad2(month) || '—'}
        open={open === 'month'}
        onToggle={() => toggle('month')}
      >
        <div className="grid grid-cols-4 gap-1">
          {MONTHS.map((value) => (
            <OptionButton key={value} selected={month === value} onClick={() => pick('month', value)}>
              {pad2(value)}
            </OptionButton>
          ))}
        </div>
      </DobColumn>

      <DobColumn
        label="Năm"
        display={year || '—'}
        open={open === 'year'}
        align="right"
        onToggle={() => toggle('year')}
      >
        <div className="max-h-[196px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#E8C87240_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/45 hover:[&::-webkit-scrollbar-thumb]:bg-amber-300/70">
          <div className="grid grid-cols-3 gap-1">
            {YEARS.map((value) => (
              <OptionButton key={value} selected={year === value} onClick={() => pick('year', value)}>
                {value}
              </OptionButton>
            ))}
          </div>
        </div>
      </DobColumn>
    </div>
  );
}

function DobColumn({
  label,
  display,
  open,
  onToggle,
  align = 'left',
  children,
}: {
  label: string;
  display: string;
  open: boolean;
  onToggle: () => void;
  align?: 'left' | 'right';
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full cursor-pointer items-center justify-between gap-1 rounded-lg border px-2 py-2 text-left transition ${
          open
            ? 'border-amber-300 bg-[#2A0C0E] shadow-[0_0_0_1px_rgba(232,200,114,0.45)]'
            : 'border-amber-500/35 bg-[#1A0808]/80 hover:border-amber-400/60'
        }`}
      >
        <span className="min-w-0">
          <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-amber-200/55">
            {label}
          </span>
          <span className="block truncate text-[14px] font-black tabular-nums text-amber-50">{display}</span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-amber-300/80 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className={`absolute top-[calc(100%+6px)] z-30 min-w-[148px] rounded-xl border border-amber-500/30 bg-[#1A0808] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-md border-none px-1 py-1.5 text-[12px] font-bold tabular-nums transition ${
        selected
          ? 'bg-amber-400 text-[#5A1012]'
          : 'bg-transparent text-amber-100/85 hover:bg-amber-500/15'
      }`}
    >
      {children}
    </button>
  );
}
