"use client";

import { useMemo } from 'react';
import { Header } from "../../../components/layout/header";
import { BottomNav } from "../../../components/layout/BottomNav";
import { useLotterySchedule } from "../hooks/useLotterySchedule";

const REGION_LABELS: Record<string, { label: string, bg: string, text: string }> = {
  'MIEN_NAM': { label: 'Miền Nam', bg: 'bg-[#ee1314]', text: 'text-[#ee1314]' },
  'MIEN_TRUNG': { label: 'Miền Trung', bg: 'bg-[#F26522]', text: 'text-[#F26522]' },
  'MIEN_BAC': { label: 'Miền Bắc', bg: 'bg-[#F59E0B]', text: 'text-[#F59E0B]' },
};

const DAY_OF_WEEK_MAP = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export const SchedulePage = () => {
  const { scheduleByDay, availableRegions, regionDrawTimes, isLoading, error } = useLotterySchedule();

  const todayDayName = useMemo(() => {
    return DAY_OF_WEEK_MAP[new Date().getDay()];
  }, []);

  const colWidth = availableRegions.length > 0 ? `${85 / availableRegions.length}%` : '28%';

  return (
    <div 
      className="client-page relative min-h-screen overflow-x-hidden bg-fixed bg-cover bg-center"
      style={{ backgroundImage: 'url("https://i.ibb.co/BVFGYpL1/86f05f70-fcf8-445f-978e-a0539eb2f0de.png")' }}
    >
      <Header />

      <main className="relative z-1 pt-16 lg:pt-24 pb-12 lg:pb-20">
        <div className="max-w-[1280px] mx-auto px-4 xl:px-0">
          <section className="mb-6 text-center">
            <p className="client-body mb-1">Theo dõi thời gian quay số theo từng miền</p>
            <h1 className="client-heading">Lịch mở thưởng</h1>
          </section>
          
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_15px_40px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* Content Area */}
            <div className="p-3 lg:p-5 relative overflow-x-auto">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 min-h-[300px]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-[#ee1314] rounded-full animate-spin"></div>
                    <span className="text-[#102937] font-bold text-sm uppercase tracking-wider">Đang tải lịch...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-10 text-center min-h-[300px]">
                  <span className="material-symbols-outlined text-[48px] text-slate-300 mb-4">error</span>
                  <p className="text-slate-500 font-medium">{error}</p>
                </div>
              ) : (
                <div className="min-w-[800px] bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border-b border-r border-white/20 bg-[#ee1314] text-white font-bold py-2.5 px-3 text-center w-[15%] text-[14px] uppercase tracking-wider align-middle">Khu vực</th>
                        {availableRegions.map(region => {
                          const config = REGION_LABELS[region] || { label: region, bg: 'bg-[#ee1314]', text: 'text-[#ee1314]' };
                          return (
                            <th key={region} style={{ width: colWidth }} className={`border-b border-r border-white/20 ${config.bg} text-white font-bold py-2.5 px-3 text-center text-[14px] uppercase tracking-wider align-middle`}>
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <span>{config.label}</span>
                                <span className="text-[12px] font-medium opacity-90 normal-case tracking-normal">({regionDrawTimes[region]})</span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleByDay.map((day) => {
                        const isToday = day.dayId === todayDayName;
                        const rowBg = isToday ? 'bg-[#FFF4F4]' : 'bg-white hover:bg-slate-50 transition-colors';
                        
                        return (
                          <tr key={day.dayId} className={rowBg}>
                            <td className={`border-b border-r border-gray-100 py-2.5 px-3 text-center font-bold text-[15px] ${isToday ? 'text-[#ee1314]' : 'text-[#102937]'}`}>
                              <div className="flex items-center justify-center gap-1">
                                {isToday && (
                                  <span className="material-symbols-outlined text-[#ee1314] text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                                )}
                                <span>{day.dayLabel}</span>
                              </div>
                            </td>
                            {availableRegions.map(region => {
                              const stations = day.stationsByRegion[region];
                              const config = REGION_LABELS[region] || { label: region, bg: 'bg-[#ee1314]', text: 'text-[#ee1314]' };
                              const textClass = isToday ? `font-bold ${config.text}` : 'text-[#333333] font-medium';
                              
                              return (
                                <td key={region} className="border-b border-r border-gray-100 py-2.5 px-3 text-center text-[14px] leading-relaxed">
                                  {stations.map(st => <div key={st.stationId} className={textClass}>Xổ Số {st.stationName}</div>)}
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
          </div>
          
        </div>
      </main>

      <BottomNav />
    </div>
  );
};
