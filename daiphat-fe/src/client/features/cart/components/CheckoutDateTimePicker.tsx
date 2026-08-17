"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { ClientSelect } from '../../../components/ui/ClientSelect';
import { ClientDatePicker } from '../../../components/ui/ClientDatePicker';
import { usePublicSystemConfigValues } from '../../../hooks/usePublicSystemConfigValues';

interface CheckoutDateTimePickerProps {
  value: string; // ISO string
  onChange: (isoString: string) => void;
  minDate?: Date;
  maxDate?: Date;
  minLeadMinutes?: number;
}

const SLOT_MINUTES = ['00', '15', '30', '45'] as const;

const ceilToNextSlot = (minTime: Dayjs): Dayjs => {
  let t = minTime.second(0).millisecond(0);
  const mod = t.minute() % 15;
  if (mod !== 0) {
    t = t.add(15 - mod, 'minute');
  } else if (minTime.second() > 0 || minTime.millisecond() > 0) {
    t = t.add(15, 'minute');
  }
  while (t.isBefore(minTime)) {
    t = t.add(15, 'minute');
  }
  return t;
};

const buildDateTime = (dateStr: string, hour24: string, minute: string): Dayjs => {
  const [day, month, year] = dateStr.split('/');
  return dayjs(new Date(Number(year), Number(month) - 1, Number(day), Number(hour24), Number(minute), 0, 0));
};

export const CheckoutDateTimePicker: React.FC<CheckoutDateTimePickerProps> = ({
  value,
  onChange,
  minLeadMinutes = 15,
}) => {
  const { SITE_SUPPORT_OPEN_TIME, SITE_SUPPORT_CLOSE_TIME } = usePublicSystemConfigValues(
    ['SITE_SUPPORT_OPEN_TIME', 'SITE_SUPPORT_CLOSE_TIME'],
    { SITE_SUPPORT_OPEN_TIME: '08:00', SITE_SUPPORT_CLOSE_TIME: '20:00' }
  );

  const OPEN_HOUR = parseInt(SITE_SUPPORT_OPEN_TIME.split(':')[0], 10) || 8;
  const CLOSE_HOUR = parseInt(SITE_SUPPORT_CLOSE_TIME.split(':')[0], 10) || 20;

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const now = useMemo(() => dayjs(nowTick), [nowTick]);
  const minSelectable = useMemo(
    () => ceilToNextSlot(now.add(minLeadMinutes, 'minute')),
    [now, minLeadMinutes]
  );

  const today = now.startOf('day');
  const tomorrow = today.add(1, 'day');
  const todayStr = today.format('DD/MM/YYYY');
  const tomorrowStr = tomorrow.format('DD/MM/YYYY');

  const earliestToday = useMemo(() => {
    const open = today.hour(OPEN_HOUR).minute(0);
    const close = today.hour(CLOSE_HOUR).minute(0);
    if (minSelectable.isAfter(close)) return null;
    return minSelectable.isBefore(open) ? open : minSelectable;
  }, [today, minSelectable, OPEN_HOUR, CLOSE_HOUR]);

  const canSelectToday = earliestToday != null;

  const parseValueParts = (iso: string) => {
    const d = dayjs(iso);
    if (!d.isValid()) return null;
    return {
      dateStr: d.format('DD/MM/YYYY'),
      hour24: String(d.hour()).padStart(2, '0'),
      minute: String(Math.floor(d.minute() / 15) * 15).padStart(2, '0'),
    };
  };

  const initialParts = value ? parseValueParts(value) : null;
  const defaultStart = canSelectToday ? earliestToday! : tomorrow.hour(OPEN_HOUR).minute(0);
  const defaultParts = {
    dateStr: defaultStart.format('DD/MM/YYYY'),
    hour24: String(defaultStart.hour()).padStart(2, '0'),
    minute: String(defaultStart.minute()).padStart(2, '0'),
  };

  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    initialParts?.dateStr || defaultParts.dateStr
  );
  const [selectedHour24, setSelectedHour24] = useState<string>(initialParts?.hour24 ?? defaultParts.hour24);
  const [selectedMinute, setSelectedMinute] = useState<string>(initialParts?.minute ?? defaultParts.minute);

  const displayDateText =
    selectedDateStr === todayStr ? 'Hôm nay' : selectedDateStr === tomorrowStr ? 'Ngày mai' : selectedDateStr;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Element;
      // Skip if clicking inside container or inside a portal element (ClientSelect/ClientDatePicker dropdowns)
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        !target.closest('.client-portal, [role="listbox"], [role="dialog"]')
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isTodaySelected = selectedDateStr === todayStr;

  const valid24Hours = useMemo(() => {
    return Array.from({ length: CLOSE_HOUR - OPEN_HOUR + 1 }, (_, i) => i + OPEN_HOUR).filter((h) => {
      if (!isTodaySelected) return true;
      if (!earliestToday) return false;
      if (h < earliestToday.hour()) return false;
      if (h > CLOSE_HOUR) return false;
      if (h === earliestToday.hour()) {
        return SLOT_MINUTES.some((m) => {
          const candidate = today.hour(h).minute(Number(m));
          return !candidate.isBefore(earliestToday) && candidate.hour() === h;
        });
      }
      return h <= CLOSE_HOUR;
    });
  }, [isTodaySelected, earliestToday, today, OPEN_HOUR, CLOSE_HOUR]);

  const availableHours24 = useMemo(() => {
    return valid24Hours.map((h) => String(h).padStart(2, '0'));
  }, [valid24Hours]);

  const availableMinutes = useMemo(() => {
    return SLOT_MINUTES.filter((m) => {
      if (!isTodaySelected) return true;
      if (!earliestToday) return false;
      const candidate = today.hour(Number(selectedHour24)).minute(Number(m));
      return !candidate.isBefore(earliestToday);
    });
  }, [isTodaySelected, earliestToday, today, selectedHour24]);

  useEffect(() => {
    if (isTodaySelected && !canSelectToday) {
      setSelectedDateStr(tomorrowStr);
      const open = tomorrow.hour(OPEN_HOUR).minute(0);
      setSelectedHour24(String(open.hour()).padStart(2, '0'));
      setSelectedMinute('00');
    }
  }, [isTodaySelected, canSelectToday, tomorrowStr, tomorrow, OPEN_HOUR]);

  useEffect(() => {
    if (availableHours24.length > 0 && !availableHours24.includes(selectedHour24)) {
      setSelectedHour24(availableHours24[0]);
    }
  }, [availableHours24, selectedHour24]);

  useEffect(() => {
    if (availableMinutes.length > 0 && !availableMinutes.includes(selectedMinute as typeof SLOT_MINUTES[number])) {
      setSelectedMinute(availableMinutes[0]);
    }
  }, [availableMinutes, selectedMinute]);

  useEffect(() => {
    if (!value) return;
    const current = dayjs(value);
    if (!current.isValid()) return;
    if (current.isBefore(minSelectable)) {
      const next = canSelectToday ? earliestToday! : tomorrow.hour(OPEN_HOUR).minute(0);
      onChange(next.toISOString());
      setSelectedDateStr(next.format('DD/MM/YYYY'));
      setSelectedHour24(String(next.hour()).padStart(2, '0'));
      setSelectedMinute(String(next.minute()).padStart(2, '0'));
    }
  }, [minSelectable.valueOf(), OPEN_HOUR]);

  const handleConfirm = () => {
    if (!selectedDateStr || !selectedHour24 || !selectedMinute) return;

    let picked = buildDateTime(selectedDateStr, selectedHour24, selectedMinute);

    if (picked.isBefore(minSelectable)) {
      picked = canSelectToday ? earliestToday! : tomorrow.hour(OPEN_HOUR).minute(0);
    }

    setSelectedDateStr(picked.format('DD/MM/YYYY'));
    setSelectedHour24(String(picked.hour()).padStart(2, '0'));
    setSelectedMinute(String(picked.minute()).padStart(2, '0'));
    onChange(picked.toISOString());
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 px-3.5 py-2.5 border rounded-lg text-[15px] transition-colors text-left flex items-center justify-between ${isOpen ? 'border-[#ee1314]' : 'border-[#E5E8EB]'} bg-white text-[#212B36]`}
      >
        <span className={selectedDateStr && selectedHour24 && selectedMinute ? 'font-medium' : 'text-gray-400'}>
          {selectedDateStr && selectedHour24 && selectedMinute
            ? `${selectedHour24}:${selectedMinute} - ${displayDateText} (${selectedDateStr})`
            : 'Chọn ngày và giờ'}
        </span>
        <i className="fa-regular fa-calendar-clock text-[#ee1314]"></i>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 z-50 w-[360px] sm:w-[410px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-[0_12px_44px_rgba(0,0,0,0.14)] border border-[#E5E8EB] p-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[14px] font-bold text-[#212B36]">Ngày nhận vé</span>
              <span className="text-[12px] text-[#919EAB]">Chọn ngày lấy</span>
            </div>
            
            <div className="w-full">
              <ClientDatePicker
                value={selectedDateStr.split('/').reverse().join('-')}
                minDate={canSelectToday ? today.format('YYYY-MM-DD') : tomorrow.format('YYYY-MM-DD')}
                onChange={(ymd) => {
                  if (!ymd) return;
                  const [y, m, d] = ymd.split('-');
                  const newDateStr = `${d}/${m}/${y}`;
                  setSelectedDateStr(newDateStr);
                  
                  const isNewToday = newDateStr === todayStr;
                  if (isNewToday && canSelectToday && earliestToday) {
                     setSelectedHour24(String(earliestToday.hour()).padStart(2, '0'));
                     setSelectedMinute(String(earliestToday.minute()).padStart(2, '0'));
                  } else {
                     const open = dayjs(ymd).hour(OPEN_HOUR).minute(0);
                     setSelectedHour24(String(open.hour()).padStart(2, '0'));
                     setSelectedMinute('00');
                  }
                }}
              />
            </div>
            
            <p className="text-[12px] text-[#919EAB] mt-2">
              Thời gian lấy vé phải cách hiện tại tối thiểu {minLeadMinutes} phút để quầy chuẩn bị.
            </p>
          </div>

          <div className="pt-4 border-t border-[#E5E8EB] flex flex-col gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-bold text-[#212B36]">Thời gian nhận vé</span>
                <span className="text-[12px] text-[#919EAB]">Định dạng 24 giờ</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-[#637381]">Giờ</span>
                  <ClientSelect
                    size="sm"
                    className="w-full"
                    value={selectedHour24}
                    onChange={setSelectedHour24}
                    options={
                      availableHours24.length === 0
                        ? [{ value: '', label: '-' }]
                        : availableHours24.map((h) => ({ value: h, label: h }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-[#637381]">Phút</span>
                  <ClientSelect
                    size="sm"
                    className="w-full"
                    value={selectedMinute}
                    onChange={setSelectedMinute}
                    options={
                      availableMinutes.length === 0
                        ? [{ value: '', label: '--' }]
                        : availableMinutes.map((m) => ({ value: m, label: m }))
                    }
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={availableHours24.length === 0 || availableMinutes.length === 0}
              className="w-full h-11 bg-[#ee1314] text-white rounded-xl text-[14px] font-bold hover:bg-[#d00f10] shadow-[0_4px_12px_rgba(238,19,20,0.2)] transition-all mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Xác nhận thời gian
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
