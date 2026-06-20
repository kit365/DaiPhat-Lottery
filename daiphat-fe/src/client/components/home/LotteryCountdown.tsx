import React, { useEffect, useMemo, useState } from 'react';

interface LotteryCountdownProps {
  targetTime: Date | null;
  drawTimeLabel: string;
  provinceLabel?: string;
}

interface CountdownState {
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

export const getCountdownState = (targetTime: Date | null): CountdownState => {
  if (!targetTime) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const diff = targetTime.getTime() - Date.now();
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, expired: false };
};

const formatNum = (value: number) => value.toString().padStart(2, '0');

export const buildLotteryCountdownMessage = (
  targetTime: Date | null,
  drawTimeLabel: string,
  provinceLabel?: string,
  timeLeft?: CountdownState,
) => {
  if (!targetTime) {
    return null;
  }

  const countdown = timeLeft || getCountdownState(targetTime);
  const provincePrefix = provinceLabel ? `${provinceLabel} ` : '';

  if (countdown.expired) {
    return `${provincePrefix}đã tới giờ quay số lúc ${drawTimeLabel}. Hệ thống đang chờ cập nhật kết quả.`;
  }

  return `${provincePrefix}đang chờ xổ số lúc ${drawTimeLabel}. Còn ${formatNum(countdown.hours)}:${formatNum(countdown.minutes)}:${formatNum(countdown.seconds)} nữa`;
};

export const LotteryCountdown: React.FC<LotteryCountdownProps> = ({
  targetTime,
  drawTimeLabel,
  provinceLabel,
}) => {
  const [timeLeft, setTimeLeft] = useState<CountdownState>(() => getCountdownState(targetTime));

  useEffect(() => {
    setTimeLeft(getCountdownState(targetTime));

    if (!targetTime) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTimeLeft(getCountdownState(targetTime));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [targetTime]);

  const message = useMemo(() => {
    return buildLotteryCountdownMessage(targetTime, drawTimeLabel, provinceLabel, timeLeft);
  }, [drawTimeLabel, provinceLabel, targetTime, timeLeft]);

  if (!message) {
    return null;
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm mb-6 font-client-main">
      <div className="flex gap-1">
        <div className="w-2 h-2 rounded-full bg-slate-300"></div>
        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
      </div>

      <div className="flex-1 text-[#0066CC] font-bold text-[14px] lg:text-[15px] tracking-tight">
        {message}
      </div>
    </div>
  );
};
