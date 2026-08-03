"use client";

import { useEffect, useState } from 'react';
import { computeRefundSecondsLeft, RefundWindowInput } from '../../types/refund.type';

const LOW_TIME_THRESHOLD_SECONDS = 5 * 60;

export interface UseRefundCountdownInput extends RefundWindowInput {
    enabled: boolean;
}

export function useRefundCountdown({
    refundDeadlineAt,
    paymentSuccessAt,
    graceMinutes,
    remainingSeconds,
    enabled
}: UseRefundCountdownInput) {
    const compute = () =>
        computeRefundSecondsLeft(
            refundDeadlineAt,
            paymentSuccessAt,
            graceMinutes,
            remainingSeconds
        );

    const [secondsLeft, setSecondsLeft] = useState(() => (enabled ? compute() : 0));

    useEffect(() => {
        if (!enabled) {
            setSecondsLeft(0);
            return;
        }

        setSecondsLeft(compute());

        const interval = setInterval(() => {
            setSecondsLeft(compute());
        }, 1000);

        return () => clearInterval(interval);
    }, [enabled, refundDeadlineAt, paymentSuccessAt, graceMinutes, remainingSeconds]);

    const isExpired = !enabled || secondsLeft <= 0;
    const isLowTime = enabled && secondsLeft > 0 && secondsLeft < LOW_TIME_THRESHOLD_SECONDS;

    return { secondsLeft, isExpired, isLowTime };
}
