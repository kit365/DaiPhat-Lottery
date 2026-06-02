import React from 'react';
import { calculateLotoTable, LotteryResult, LotteryPrizes } from '../../types/lottery';

interface LotoTableProps {
  dataList: LotteryResult[];
  selectedDigit?: string | null;
  hoveredDigit?: string | null;
  onDigitClick?: (digit: string | null) => void;
  onDigitHover?: (digit: string | null) => void;
  setShowLoto?: (val: boolean) => void;
}

export const LotoTable: React.FC<LotoTableProps> = ({ dataList, selectedDigit, hoveredDigit, onDigitClick, onDigitHover, setShowLoto }) => {
  // Merge all prizes from all selected provinces into one big prizes object
  const mergedPrizes: LotteryPrizes = {
    special: '',
    first: '',
    second: '',
    third: [],
    fourth: [],
    fifth: '',
    sixth: [],
    seventh: '',
    eighth: ''
  };

  dataList.forEach(d => {
    mergedPrizes.third.push(d.prizes.special);
    mergedPrizes.third.push(d.prizes.first);
    mergedPrizes.third.push(d.prizes.second);
    mergedPrizes.third.push(...d.prizes.third);
    mergedPrizes.third.push(...d.prizes.fourth);
    mergedPrizes.third.push(d.prizes.fifth);
    mergedPrizes.third.push(...d.prizes.sixth);
    mergedPrizes.third.push(d.prizes.seventh);
    mergedPrizes.third.push(d.prizes.eighth);
  });

  const lotoData = calculateLotoTable(mergedPrizes);

  // Helper to render string with superscripts (e.g., "3^2, 4" -> "3² , 4")
  const renderFormattedDigits = (text: string) => {
    if (!text) return <span className="text-slate-200">...</span>;
    
    return text.split(', ').map((item, idx, array) => {
      const [digit, power] = item.split('^');
      return (
        <React.Fragment key={idx}>
          <span className="font-bold font-client-main text-[#444444]">{digit}</span>
          {power && <sup className="text-[10px] text-[#ee1314] font-bold ml-0.5 font-client-main">{power}</sup>}
          {idx < array.length - 1 && <span className="text-slate-300 mx-1">,</span>}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="bg-white rounded-[20px] p-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 font-client-main">
      <div className="flex items-center justify-between mb-3 px-2">
        <h3 className="text-[13px] font-bold text-[#111111] uppercase">BẢNG LOTO</h3>
      </div>
      <div className="border border-gray-100 rounded-lg overflow-hidden shadow-sm bg-white">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-100">
              <th className="py-1.5 px-1 text-[10px] font-bold text-[#555555] uppercase border-r border-gray-100 w-[40%] text-center font-client-main">Chục</th>
              <th className="py-1.5 px-1 text-[10px] font-bold text-[#ee1314] uppercase border-r border-gray-100 w-[20%] text-center font-client-main">Số</th>
              <th className="py-1.5 px-1 text-[10px] font-bold text-[#555555] uppercase w-[40%] text-center font-client-main">Đơn vị</th>
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
                  className={`transition-all h-[30px] font-client-main ${isSelected ? 'bg-[#FDE047]' : isHovered ? 'bg-[#FEF9C3]' : 'bg-white hover:bg-slate-50/50'}`}
                  onMouseEnter={() => onDigitHover?.(row.head)}
                  onMouseLeave={() => onDigitHover?.(null)}
                >
                  {/* LEFT COLUMN: Heads when focus is tail */}
                  <td className={`py-1 px-3 text-center border-r ${isSelected ? 'border-[#FDE047]/50' : 'border-gray-100'}`}>
                    <span className="text-slate-600 text-[12px]">
                      {renderFormattedDigits(row.heads)}
                    </span>
                  </td>
                  
                  {/* CENTER COLUMN: Focus Number */}
                  <td 
                    className={`py-0.5 px-1 text-center border-r cursor-pointer transition-colors ${isActive ? 'border-[#FDE047] font-bold' : 'border-gray-100 bg-[#FAFAFA] hover:bg-slate-100'}`}
                    onClick={() => onDigitClick?.(isSelected ? null : row.head)}
                  >
                    <span className={`text-[#ee1314] text-[15px] font-bold leading-none font-client-main transition-colors inline-flex items-center justify-center min-w-[20px] h-[20px] rounded-md ${isActive ? 'bg-white shadow-sm' : ''}`}>
                      {row.head}
                    </span>
                  </td>
                  
                  {/* RIGHT COLUMN: Tails when focus is head */}
                  <td className="py-1 px-3 text-center">
                    <span className="text-[#102937] text-[12px]">
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
