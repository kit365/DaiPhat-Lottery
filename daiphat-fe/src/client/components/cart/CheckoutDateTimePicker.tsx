import React, { useState, useRef, useEffect } from 'react';
import dayjs from 'dayjs';

interface CheckoutDateTimePickerProps {
  value: string; // ISO string
  onChange: (isoString: string) => void;
  minDate?: Date;
  maxDate?: Date;
}

export const CheckoutDateTimePicker: React.FC<CheckoutDateTimePickerProps> = ({
  value,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = dayjs();
  const tomorrow = dayjs().add(1, 'day');
  
  const todayStr = today.format('DD/MM/YYYY');
  const tomorrowStr = tomorrow.format('DD/MM/YYYY');

  const currentHour = today.hour();
  const currentMinute = today.minute();

  const initialDateObj = value ? new Date(value) : null;
  const initH24 = initialDateObj ? initialDateObj.getHours() : 8;
  const initPeriod = initH24 >= 12 ? 'PM' : 'AM';
  let initH12 = initH24 % 12;
  if (initH12 === 0) initH12 = 12;

  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    initialDateObj ? dayjs(initialDateObj).format('DD/MM/YYYY') : todayStr
  );
  
  const [selectedPeriod, setSelectedPeriod] = useState<string>(initPeriod);
  const [selectedHour12, setSelectedHour12] = useState<string>(String(initH12).padStart(2, '0'));
  
  const [selectedMinute, setSelectedMinute] = useState<string>(
    initialDateObj ? dayjs(initialDateObj).format('mm') : '00'
  );

  const displayDateText = selectedDateStr === todayStr ? 'Hôm nay' : selectedDateStr === tomorrowStr ? 'Ngày mai' : selectedDateStr;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleConfirm = () => {
    if (!selectedDateStr) return;
    setIsOpen(false);
    updateValue(selectedDateStr, selectedHour12, selectedMinute, selectedPeriod);
  };

  const updateValue = (dStr: string, hour12: string, minute: string, period: string) => {
    if (!dStr || !hour12 || !minute || !period) return;
    const [day, month, year] = dStr.split('/');
    let h = parseInt(hour12, 10);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    
    const d = new Date(Number(year), Number(month) - 1, Number(day), h, Number(minute));
    onChange(d.toISOString());
  };

  const isTodaySelected = selectedDateStr === todayStr;

  // Valid 24h hours (08 to 20)
  const valid24Hours = Array.from({ length: 13 }, (_, i) => i + 8).filter(h => {
    if (isTodaySelected) {
      if (h < currentHour) return false;
      if (h === currentHour && currentMinute > 45) return false;
    }
    return true;
  });

  const availablePeriods: string[] = [];
  if (valid24Hours.some(h => h < 12)) availablePeriods.push('AM');
  if (valid24Hours.some(h => h >= 12)) availablePeriods.push('PM');

  useEffect(() => {
    if (availablePeriods.length > 0 && !availablePeriods.includes(selectedPeriod)) {
      setSelectedPeriod(availablePeriods[0]);
    }
  }, [availablePeriods, selectedPeriod]);

  const availableHours12 = valid24Hours
    .filter(h => selectedPeriod === 'AM' ? h < 12 : h >= 12)
    .map(h => {
      let h12 = h % 12;
      if (h12 === 0) h12 = 12;
      return String(h12).padStart(2, '0');
    });

  useEffect(() => {
    if (availableHours12.length > 0 && (!selectedHour12 || !availableHours12.includes(selectedHour12))) {
      setSelectedHour12(availableHours12[0]);
    }
  }, [availableHours12, selectedHour12]);

  const getSelected24Hour = () => {
    let h = parseInt(selectedHour12, 10);
    if (isNaN(h)) return 0;
    if (selectedPeriod === 'PM' && h !== 12) h += 12;
    if (selectedPeriod === 'AM' && h === 12) h = 0;
    return h;
  };
  const selected24H = getSelected24Hour();

  const availableMinutes = ['00', '15', '30', '45'].filter(m => {
    if (isTodaySelected && selected24H === currentHour) {
      return parseInt(m, 10) > currentMinute;
    }
    return true;
  });

  useEffect(() => {
    if (availableMinutes.length > 0 && (!selectedMinute || !availableMinutes.includes(selectedMinute))) {
      setSelectedMinute(availableMinutes[0]);
    }
  }, [availableMinutes, selectedMinute, selected24H]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 px-3 py-2 border rounded-lg text-[14px] transition-colors text-left flex items-center justify-between ${isOpen ? 'border-[#ee1314]' : 'border-[#E5E8EB]'} bg-white text-[#212B36]`}
      >
        <span className={selectedDateStr && selectedHour12 && selectedMinute && selectedPeriod ? 'font-medium' : 'text-gray-400'}>
          {selectedDateStr && selectedHour12 && selectedMinute && selectedPeriod ? `${selectedHour12}:${selectedMinute} ${selectedPeriod} - ${displayDateText} (${selectedDateStr})` : 'Chọn ngày và giờ'}
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
                  onClick={() => setSelectedDateStr(todayStr)}
                  className={`py-2 px-3 rounded-lg text-[13px] font-medium border transition-colors ${
                    selectedDateStr === todayStr 
                      ? 'bg-[#BA0000]/10 border-[#BA0000] text-[#BA0000]' 
                      : 'border-[#E5E8EB] text-[#444444] hover:bg-gray-50'
                  }`}
                >
                  Hôm nay ({today.format('DD/MM')})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDateStr(tomorrowStr)}
                  className={`py-2 px-3 rounded-lg text-[13px] font-medium border transition-colors ${
                    selectedDateStr === tomorrowStr 
                      ? 'bg-[#BA0000]/10 border-[#BA0000] text-[#BA0000]' 
                      : 'border-[#E5E8EB] text-[#444444] hover:bg-gray-50'
                  }`}
                >
                  Ngày mai ({tomorrow.format('DD/MM')})
                </button>
              </div>
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
                      availableHours12.map(h => <option key={h} value={h}>{h}</option>)
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
                      availableMinutes.map(m => <option key={m} value={m}>{m}</option>)
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
                      availablePeriods.map(p => <option key={p} value={p}>{p}</option>)
                    )}
                  </select>
                </div>
              </div>
              <button 
                type="button"
                onClick={handleConfirm}
                className="w-full h-10 bg-[#ee1314] text-white rounded-lg text-[14px] font-bold hover:bg-[#d00f10] transition-colors mt-2"
              >
                Xác nhận
              </button>
           </div>
        </div>
      )}
    </div>
  );
};
