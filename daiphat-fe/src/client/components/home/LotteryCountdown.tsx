import React, { useState, useEffect } from 'react';

export const LotteryCountdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 15,
    minutes: 59,
    seconds: 1
  });

  // Simple countdown effect for the demo
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatNum = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm mb-6 font-client-main">
      {/* Indicator Dots */}
      <div className="flex gap-1">
        <div className="w-2 h-2 rounded-full bg-slate-300"></div>
        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
      </div>

      {/* Message */}
      <div className="flex-1 text-[#0066CC] font-bold text-[14px] lg:text-[15px] tracking-tight">
        Đang chờ xổ số Miền Nam lúc 16h12': 26/04/2026. 
        <span className="ml-2">
          Còn {formatNum(timeLeft.hours)}:{formatNum(timeLeft.minutes)}:{formatNum(timeLeft.seconds)} nữa
        </span>
      </div>
    </div>
  );
};
