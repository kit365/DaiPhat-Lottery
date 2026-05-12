import React from 'react';
import { calculateLotoTable, LotteryPrizes } from '../../types/lottery';

interface LotoTableProps {
  prizes: LotteryPrizes;
  selectedDigit?: string | null;
  hoveredDigit?: string | null;
  onDigitClick?: (digit: string) => void;
  onDigitHover?: (digit: string | null) => void;
}

export const LotoTable: React.FC<LotoTableProps> = ({ prizes, selectedDigit, hoveredDigit, onDigitClick, onDigitHover }) => {
  const lotoData = calculateLotoTable(prizes);

  // Helper to render string with superscripts (e.g., "3^2, 4" -> "3² , 4")
  const renderFormattedDigits = (text: string) => {
    if (!text) return <span className="text-slate-200">...</span>;
    
    return text.split(', ').map((item, idx, array) => {
      const [digit, power] = item.split('^');
      return (
        <React.Fragment key={idx}>
          <span className="font-bold font-client-main">{digit}</span>
          {power && <sup className="text-[10px] text-[#BA0000] font-bold ml-0.5 font-client-main">{power}</sup>}
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
            <tr className="bg-slate-50 border-b border-gray-100">
              <th className="py-2.5 px-1 text-[11px] font-bold text-[#555555] uppercase border-r border-gray-100 w-[40%] text-center font-client-main">Chục</th>
              <th className="py-2.5 px-1 text-[11px] font-bold text-[#BA0000] uppercase border-r border-gray-100 w-[20%] text-center font-client-main">Số</th>
              <th className="py-2.5 px-1 text-[11px] font-bold text-[#555555] uppercase w-[40%] text-center font-client-main">Đơn vị</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lotoData.map((row) => {
              const isSelected = selectedDigit === row.head;
              const isHovered = hoveredDigit === row.head;
              const isActive = isSelected || isHovered;
              
              return (
                <tr 
                  key={row.head} 
                  className={`transition-all h-[40px] font-client-main ${isSelected ? 'bg-[#FDE047]' : isHovered ? 'bg-[#FEF9C3]' : 'bg-white hover:bg-slate-50/50'}`}
                  onMouseEnter={() => onDigitHover?.(row.head)}
                  onMouseLeave={() => onDigitHover?.(null)}
                >
                  {/* LEFT COLUMN: Heads when focus is tail */}
                  <td className={`py-1 px-3 text-center border-r ${isSelected ? 'border-[#FDE047]/50' : 'border-gray-100'}`}>
                    <span className="text-slate-600 text-[13px]">
                      {renderFormattedDigits(row.heads)}
                    </span>
                  </td>
                  
                  {/* CENTER COLUMN: Focus Number */}
                  <td 
                    className={`py-1 px-1 text-center border-r cursor-pointer transition-colors ${isActive ? 'border-[#FDE047] font-bold' : 'border-gray-100 bg-[#FAFAFA] hover:bg-slate-100'}`}
                    onClick={() => onDigitClick?.(row.head)}
                  >
                    <span className={`text-[#BA0000] text-[17px] font-bold leading-none font-client-main transition-colors inline-flex items-center justify-center min-w-[24px] h-[24px] rounded-md ${isActive ? 'bg-white shadow-sm' : ''}`}>
                      {row.head}
                    </span>
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
