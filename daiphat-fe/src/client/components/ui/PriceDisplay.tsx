import React from 'react';

interface PriceDisplayProps {
  amount: number;
  currency?: string;
  originalAmount?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  amount,
  currency = 'đ',
  originalAmount,
  size = 'md',
  className = '',
}) => {
  const formattedAmount = amount.toLocaleString('vi-VN');
  const formattedOriginal = originalAmount?.toLocaleString('vi-VN');

  const sizeClasses = {
    sm: 'text-[13px]',
    md: 'text-[16px]',
    lg: 'text-[22px] font-black',
  };

  return (
    <div className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className={`font-bold text-[#ee1314] ${sizeClasses[size]}`}>
        {formattedAmount}
        <span className="text-[0.8em] ml-0.5">{currency}</span>
      </span>
      {formattedOriginal && (
        <span className="text-[12px] text-slate-400 line-through font-medium">
          {formattedOriginal}
          {currency}
        </span>
      )}
    </div>
  );
};
