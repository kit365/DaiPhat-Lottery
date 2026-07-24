import React, { useState, useRef, useEffect, useMemo } from 'react';
import dayjs, { Dayjs } from 'dayjs';

interface CheckoutDateTimePickerProps {
  value: string; // ISO string
  onChange: (isoString: string) => void;
  /** Thời gian tối thiểu được chọn (mặc định: hiện tại + 15 phút) */
  minDate?: Date;
  maxDate?: Date;
  /** Buffer tối thiểu so với hiện tại (phút). Mặc định 15. */
  minLeadMinutes?: number;
}

const SLOT_MINUTES = ['00', '15', '30', '45'] as const;
const OPEN_HOUR = 8;  // 08:00
const CLOSE_HOUR = 20; // 20:00

const to12HourParts = (h24: number) => {
  const period = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return { h12: String(h12).padStart(2, '0'), period };
};

const to24Hour = (hour12: string, period: string) => {
  let h = parseInt(hour12, 10);
  if (Number.isNaN(h)) return 0;
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h;
};

/** Làm tròn lên mốc 15 phút gần nhất, không sớm hơn minTime */
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

const buildDateTime = (dateStr: string, hour12: string, minute: string, period: string): Dayjs => {
  const [day, month, year] = dateStr.split('/');
  const h = to24Hour(hour12, period);
  return dayjs(new Date(Number(year), Number(month) - 1, Number(day), h, Number(minute), 0, 0));
};

export const CheckoutDateTimePicker: React.FC<CheckoutDateTimePickerProps> = ({
  value,
  onChange,
  minLeadMinutes = 15,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tick mỗi phút để danh sách giờ cập nhật theo thời gian thực
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
  }, [today, minSelectable]);

  const canSelectToday = earliestToday != null;

  const parseValueParts = (iso: string) => {
    const d = dayjs(iso);
    if (!d.isValid()) return null;
    const { h12, period } = to12HourParts(d.hour());
    return {
      dateStr: d.format('DD/MM/YYYY'),
      hour12: h12,
      minute: String(Math.floor(d.minute() / 15) * 15).padStart(2, '0'),
      period,
    };
  };

  const initialParts = value ? parseValueParts(value) : null;
  const defaultStart = canSelectToday ? earliestToday! : tomorrow.hour(OPEN_HOUR).minute(0);
  const defaultParts = {
    dateStr: defaultStart.format('DD/MM/YYYY'),
    ...to12HourParts(defaultStart.hour()),
    minute: String(defaultStart.minute()).padStart(2, '0'),
  };

  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    initialParts?.dateStr && (initialParts.dateStr === todayStr || initialParts.dateStr === tomorrowStr)
      ? initialParts.dateStr
      : defaultParts.dateStr
  );
  const [selectedPeriod, setSelectedPeriod] = useState<string>(initialParts?.period ?? defaultParts.period);
  const [selectedHour12, setSelectedHour12] = useState<string>(initialParts?.hour12 ?? defaultParts.h12);
  const [selectedMinute, setSelectedMinute] = useState<string>(initialParts?.minute ?? defaultParts.minute);

  const displayDateText =
    selectedDateStr === todayStr ? 'Hôm nay' : selectedDateStr === tomorrowStr ? 'Ngày mai' : selectedDateStr;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
      // Giờ phải còn ít nhất 1 slot phút hợp lệ
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
  }, [isTodaySelected, earliestToday, today]);

  const availablePeriods = useMemo(() => {
    const periods: string[] = [];
    if (valid24Hours.some((h) => h < 12)) periods.push('AM');
    if (valid24Hours.some((h) => h >= 12)) periods.push('PM');
    return periods;
  }, [valid24Hours]);

  const availableHours12 = useMemo(() => {
    return valid24Hours
      .filter((h) => (selectedPeriod === 'AM' ? h < 12 : h >= 12))
      .map((h) => to12HourParts(h).h12);
  }, [valid24Hours, selectedPeriod]);

  const selected24H = to24Hour(selectedHour12, selectedPeriod);

  const availableMinutes = useMemo(() => {
    return SLOT_MINUTES.filter((m) => {
      if (!isTodaySelected) return true;
      if (!earliestToday) return false;
      const candidate = today.hour(selected24H).minute(Number(m));
      return !candidate.isBefore(earliestToday);
    });
  }, [isTodaySelected, earliestToday, today, selected24H]);

  // Khi chọn hôm nay nhưng không còn slot → chuyển sang ngày mai
  useEffect(() => {
    if (isTodaySelected && !canSelectToday) {
      setSelectedDateStr(tomorrowStr);
      const open = tomorrow.hour(OPEN_HOUR).minute(0);
      const parts = to12HourParts(open.hour());
      setSelectedPeriod(parts.period);
      setSelectedHour12(parts.h12);
      setSelectedMinute('00');
    }
  }, [isTodaySelected, canSelectToday, tomorrowStr, tomorrow]);

  useEffect(() => {
    if (availablePeriods.length > 0 && !availablePeriods.includes(selectedPeriod)) {
      setSelectedPeriod(availablePeriods[0]);
    }
  }, [availablePeriods, selectedPeriod]);

  useEffect(() => {
    if (availableHours12.length > 0 && !availableHours12.includes(selectedHour12)) {
      setSelectedHour12(availableHours12[0]);
    }
  }, [availableHours12, selectedHour12]);

  useEffect(() => {
    if (availableMinutes.length > 0 && !availableMinutes.includes(selectedMinute as typeof SLOT_MINUTES[number])) {
      setSelectedMinute(availableMinutes[0]);
    }
  }, [availableMinutes, selectedMinute]);

  // Nếu value bên ngoài đã quá khứ → kéo về slot sớm nhất hợp lệ
  useEffect(() => {
    if (!value) return;
    const current = dayjs(value);
    if (!current.isValid()) return;
    if (current.isBefore(minSelectable)) {
      const next = canSelectToday ? earliestToday! : tomorrow.hour(OPEN_HOUR).minute(0);
      onChange(next.toISOString());
      const parts = to12HourParts(next.hour());
      setSelectedDateStr(next.format('DD/MM/YYYY'));
      setSelectedPeriod(parts.period);
      setSelectedHour12(parts.h12);
      setSelectedMinute(String(next.minute()).padStart(2, '0'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minSelectable.valueOf()]);

  const handleConfirm = () => {
    if (!selectedDateStr || !selectedHour12 || !selectedMinute || !selectedPeriod) return;

    let picked = buildDateTime(selectedDateStr, selectedHour12, selectedMinute, selectedPeriod);

    if (picked.isBefore(minSelectable)) {
      picked = canSelectToday ? earliestToday! : tomorrow.hour(OPEN_HOUR).minute(0);
    }

    const parts = to12HourParts(picked.hour());
    setSelectedDateStr(picked.format('DD/MM/YYYY'));
    setSelectedPeriod(parts.period);
    setSelectedHour12(parts.h12);
    setSelectedMinute(String(picked.minute()).padStart(2, '0'));
    onChange(picked.toISOString());
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    if (!canSelectToday || !earliestToday) return;
    setSelectedDateStr(todayStr);
    const parts = to12HourParts(earliestToday.hour());
    setSelectedPeriod(parts.period);
    setSelectedHour12(parts.h12);
    setSelectedMinute(String(earliestToday.minute()).padStart(2, '0'));
  };

  const handleSelectTomorrow = () => {
    setSelectedDateStr(tomorrowStr);
    const open = tomorrow.hour(OPEN_HOUR).minute(0);
    const parts = to12HourParts(open.hour());
    setSelectedPeriod(parts.period);
    setSelectedHour12(parts.h12);
    setSelectedMinute('00');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 px-3 py-2 border rounded-lg text-[14px] transition-colors text-left flex items-center justify-between ${isOpen ? 'border-[#ee1314]' : 'border-[#E5E8EB]'} bg-white text-[#212B36]`}
      >
        <span className={selectedDateStr && selectedHour12 && selectedMinute && selectedPeriod ? 'font-medium' : 'text-gray-400'}>
          {selectedDateStr && selectedHour12 && selectedMinute && selectedPeriod
            ? `${selectedHour12}:${selectedMinute} ${selectedPeriod} - ${displayDateText} (${selectedDateStr})`
            : 'Chọn ngày và giờ'}
        </span>
        <i className="fa-regular fa-calendar-clock text-[#ee1314]"></i>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 z-50 w-[320px] bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="mb-4">
            <span className="text-[13px] font-bold text-[#212B36] block mb-2">Ngày nhận vé</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canSelectToday}
                onClick={handleSelectToday}
                className={`py-2 px-3 rounded-lg text-[13px] font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  selectedDateStr === todayStr
                    ? 'bg-[#BA0000]/10 border-[#BA0000] text-[#BA0000]'
                    : 'border-[#E5E8EB] text-[#444444] hover:bg-gray-50'
                }`}
              >
                Hôm nay ({today.format('DD/MM')})
              </button>
              <button
                type="button"
                onClick={handleSelectTomorrow}
                className={`py-2 px-3 rounded-lg text-[13px] font-medium border transition-colors ${
                  selectedDateStr === tomorrowStr
                    ? 'bg-[#BA0000]/10 border-[#BA0000] text-[#BA0000]'
                    : 'border-[#E5E8EB] text-[#444444] hover:bg-gray-50'
                }`}
              >
                Ngày mai ({tomorrow.format('DD/MM')})
              </button>
            </div>
            <p className="text-[11px] text-[#919EAB] mt-2">
              Chỉ chọn giờ từ hiện tại trở đi (tối thiểu sau {minLeadMinutes} phút).
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#212B36]">Thời gian nhận vé</span>
              <div className="flex items-center gap-2">
                <select
                  value={selectedHour12}
                  onChange={(e) => setSelectedHour12(e.target.value)}
                  className="h-9 px-2 border border-[#E5E8EB] rounded-lg text-[14px] font-medium text-[#212B36] focus:outline-none focus:border-[#ee1314] bg-white cursor-pointer"
                >
                  {availableHours12.length === 0 ? (
                    <option value="">-</option>
                  ) : (
                    availableHours12.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))
                  )}
                </select>
                <span className="font-bold text-[#212B36]">:</span>
                <select
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(e.target.value)}
                  className="h-9 px-2 border border-[#E5E8EB] rounded-lg text-[14px] font-medium text-[#212B36] focus:outline-none focus:border-[#ee1314] bg-white cursor-pointer"
                >
                  {availableMinutes.length === 0 ? (
                    <option value="">--</option>
                  ) : (
                    availableMinutes.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))
                  )}
                </select>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="h-9 px-2 border border-[#E5E8EB] rounded-lg text-[14px] font-medium text-[#212B36] focus:outline-none focus:border-[#ee1314] bg-white cursor-pointer ml-1"
                >
                  {availablePeriods.length === 0 ? (
                    <option value="">-</option>
                  ) : (
                    availablePeriods.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))
                  )}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={availableHours12.length === 0 || availableMinutes.length === 0}
              className="w-full h-10 bg-[#ee1314] text-white rounded-lg text-[14px] font-bold hover:bg-[#d00f10] transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
