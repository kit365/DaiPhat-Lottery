import React from 'react';
import { calculateLotoTable, LotteryPrizes } from '../../types/lottery';

interface LotoTableProps {
  prizes: LotteryPrizes;
  selectedDigit?: string | null;
}

export const LotoTable: React.FC<LotoTableProps> = ({ prizes, selectedDigit }) => {
  const lotoData = calculateLotoTable(prizes);

  // Helper to render string with superscripts (e.g., "3^2, 4" -> "3² , 4")
  const renderFormattedDigits = (text: string) => {
    if (!text) return <span className="text-slate-200">...</span>;
    
    return text.split(', ').map((item, idx, array) => {
      const [digit, power] = item.split('^');
      return (
        <React.Fragment key={idx}>
          <span className="font-bold">{digit}</span>
          {power && <sup className="text-[10px] text-[#E60F14] font-black ml-0.5">{power}</sup>}
          {idx < array.length - 1 && <span className="text-slate-300 mx-1">,</span>}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="bg-white rounded-[24px] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 font-client-main">
      <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-50/80 border-b border-gray-100">
              <th className="py-2.5 px-1 text-[10px] font-black text-slate-400 uppercase border-r border-gray-100 w-[40%] text-center font-client-display">Chục</th>
              <th className="py-2.5 px-1 text-[11px] font-black text-[#E60F14] uppercase border-r border-gray-100 w-[20%] text-center font-client-display">Số</th>
              <th className="py-2.5 px-1 text-[10px] font-black text-slate-400 uppercase w-[40%] text-center font-client-display">Đơn vị</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lotoData.map((row) => {
              const isSelected = selectedDigit === row.head;
              return (
                <tr 
                  key={row.head} 
                  className={`transition-all h-[40px] ${isSelected ? 'bg-[#FEF08A]/40' : 'hover:bg-slate-50/50'}`}
                >
                  {/* LEFT COLUMN: Heads when focus is tail */}
                  <td className={`py-1 px-3 text-center border-r ${isSelected ? 'border-[#FDE047]/50' : 'border-gray-100 bg-slate-50/10'}`}>
                    <span className="text-slate-600 text-[13px]">
                      {renderFormattedDigits(row.heads)}
                    </span>
                  </td>
                  
                  {/* CENTER COLUMN: Focus Number */}
                  <td className={`py-1 px-1 text-center border-r ${isSelected ? 'border-[#FDE047]/50 bg-[#FEF08A]/60 scale-110 shadow-sm font-bold rounded-lg' : 'border-gray-100 bg-[#FFF9F9]'}`}>
                    <span className="text-[#E60F14] text-[17px] font-black leading-none">{row.head}</span>
                  </td>
                  
                  {/* RIGHT COLUMN: Tails when focus is head */}
                  <td className="py-1 px-3 text-center">
                    <span className="text-[#102937] text-[13px]">
                      {renderFormattedDigits(row.tails)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
