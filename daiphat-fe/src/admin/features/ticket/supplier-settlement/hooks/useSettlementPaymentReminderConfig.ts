"use client";

import { useMemo } from 'react';
import { useSystemConfigs } from '../../../system-config/hooks/useSystemConfig';
import { ConfigType } from '../../../system-config/types/system-config';

const DEFAULT_REMINDER_MINUTES = 10;

const parseClampedInt = (raw: string | undefined, fallback: number, min: number, max: number) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, Math.trunc(value)));
};

export const useSettlementPaymentReminderConfig = () => {
    const query = useSystemConfigs(ConfigType.SETTLEMENT_SETTING);

    return useMemo(() => {
        const configs = query.data?.data ?? [];
        const byKey = Object.fromEntries(configs.map((item) => [item.configKey, item.configValue]));

        return {
            reminderMinutes: parseClampedInt(
                byKey.SETTLEMENT_PAYMENT_REMINDER_MINUTES,
                DEFAULT_REMINDER_MINUTES,
                1,
                180
            ),
            isLoading: query.isLoading,
        };
    }, [query.data?.data, query.isLoading]);
};
