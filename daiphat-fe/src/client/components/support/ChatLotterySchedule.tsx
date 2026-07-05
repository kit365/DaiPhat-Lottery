import React, { useMemo, useEffect, useRef } from 'react';
import { useLotterySchedule } from '../../hooks/useLotterySchedule';

const REGION_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  MIEN_NAM: { label: 'Miền Nam', bg: 'bg-[#ee1314]', text: 'text-[#ee1314]' },
  MIEN_TRUNG: { label: 'Miền Trung', bg: 'bg-[#F26522]', text: 'text-[#F26522]' },
  MIEN_BAC: { label: 'Miền Bắc', bg: 'bg-[#F59E0B]', text: 'text-[#F59E0B]' },
};

export interface ChatLotteryScheduleProps {
  region?: string;
  stationId?: number;
  stationIds?: number[];
  highlightDate?: string;
}

export const ChatLotterySchedule = ({ region, stationId, stationIds, highlightDate }: ChatLotteryScheduleProps) => {
  const { scheduleByDay, availableRegions, regionDrawTimes, highlightDayId, todayDayName, showFullWeek, isLoading, error } =
    useLotterySchedule({ region, stationId, stationIds, highlightDate });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && containerRef.current) {
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [isLoading]);

  const emphasizedDayId = showFullWeek ? todayDayName : (highlightDayId ?? todayDayName);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <div className="w-6 h-6 border-2 border-slate-100 border-t-[#ee1314] rounded-full animate-spin"></div>
        <span className="text-[#102937] font-semibold text-xs mt-2 uppercase tracking-wider">Đang tải lịch...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center p-4 text-center">
        <span className="material-symbols-outlined text-[24px] text-slate-300 mb-2">error</span>
        <p className="text-slate-500 font-medium text-xs">{error}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full bg-white overflow-hidden flex flex-col">
      <div className="bg-[#ee1314] text-white font-bold py-2.5 px-3 text-center text-[14px]">
        Lịch Mở Thưởng Xổ Số
      </div>
      {availableRegions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <span className="material-symbols-outlined text-[32px] text-slate-300 mb-2">event_busy</span>
          <p className="text-slate-500 font-medium text-[13px]">Chưa có lịch mở thưởng cho khu vực này.</p>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 pb-1">
          <table className="w-full border-collapse min-w-full">
            <thead>
              <tr>
                <th className="border-b border-r border-white/20 bg-[#ee1314] text-white font-bold py-2.5 px-3 text-center w-[25%] text-[12px] uppercase tracking-wider align-middle">
                  Thứ
                </th>
                {availableRegions.map((regionCode) => {
                  const config = REGION_LABELS[regionCode] || {
                    label: regionCode,
                    bg: 'bg-[#ee1314]',
                    text: 'text-[#ee1314]',
                  };
                  return (
                    <th
                      key={regionCode}
                      className={`border-b border-r border-white/20 ${config.bg} text-white font-bold py-2.5 px-3 text-center text-[13px] uppercase tracking-wider align-middle`}
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span>{config.label}</span>
                        <span className="text-[11px] font-medium opacity-90 normal-case tracking-normal">
                          ({regionDrawTimes[regionCode]})
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {scheduleByDay.map((day) => {
                const isHighlighted = day.dayId === emphasizedDayId;
                const rowBg = isHighlighted ? 'bg-[#FFF4F4]' : 'bg-white hover:bg-slate-50 transition-colors';

                return (
                  <tr key={day.dayId} className={rowBg}>
                    <td
                      className={`border-b border-r border-gray-100 py-2.5 px-3 text-center font-bold text-[13px] ${
                        isHighlighted ? 'text-[#ee1314]' : 'text-[#102937]'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-1">
                        {isHighlighted && (
                          <span
                            className="material-symbols-outlined text-[#ee1314] text-[14px]"
                            style={{ fontVariationSettings: '"FILL" 1' }}
                          >
                            star
                          </span>
                        )}
                        <span>{day.dayLabel}</span>
                      </div>
                    </td>
                    {availableRegions.map((regionCode) => {
                      const stations = day.stationsByRegion[regionCode];
                      const config = REGION_LABELS[regionCode] || {
                        label: regionCode,
                        bg: 'bg-[#ee1314]',
                        text: 'text-[#ee1314]',
                      };
                      const textClass = isHighlighted ? `font-bold ${config.text}` : 'text-[#333333] font-medium';

                      return (
                        <td
                          key={regionCode}
                          className="border-b border-r border-gray-100 py-2.5 px-3 text-center text-[13px] leading-relaxed"
                        >
                          {stations.map((st) => (
                            <div key={st.stationId} className={textClass}>
                              {st.stationName}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
