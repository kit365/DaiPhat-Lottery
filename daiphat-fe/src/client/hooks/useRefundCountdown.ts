import { useEffect, useState } from 'react';

const LOW_TIME_THRESHOLD_SECONDS = 5 * 60;

export function useRefundCountdown(remainingSeconds: number | null | undefined, enabled: boolean) {
    const [secondsLeft, setSecondsLeft] = useState(remainingSeconds ?? 0);

    useEffect(() => {
        if (!enabled || remainingSeconds == null) return;
        setSecondsLeft(remainingSeconds);
    }, [remainingSeconds, enabled]);

    useEffect(() => {
        if (!enabled || remainingSeconds == null) return;

        const interval = setInterval(() => {
            setSecondsLeft((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [enabled, remainingSeconds]);

    const isExpired = secondsLeft <= 0;
    const isLowTime = secondsLeft > 0 && secondsLeft < LOW_TIME_THRESHOLD_SECONDS;

    return { secondsLeft, isExpired, isLowTime };
}
