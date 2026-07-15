import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { getSystemConfigs } from '../api/system-config.api';
import { ConfigType } from '../pages/settings/types/system-config';
import { SYSTEM_CONFIG_KEYS } from '../pages/settings/hooks/useSystemConfig';
import { useAuthStore } from '../../stores/useAuthStore';
import { hasPermission } from '../utils/permission.util';
import { PERMISSIONS } from '../constants/permission.constants';

/** Matches backend `VENDOR_RETURN_CUTOFF` default (giờ chốt trả vé / draw ops cutoff). */
export const DEFAULT_ORDER_DRAW_CUTOFF = '15:00';
export const ORDER_DRAW_CUTOFF_CONFIG_KEY = 'VENDOR_RETURN_CUTOFF';
const APPROACHING_WINDOW_MINUTES = 60;

export type OrderCutoffPhase = 'none' | 'approaching' | 'past';

export const parseCutoffTime = (cutoffTime?: string | null): { hour: number; minute: number } | null => {
    if (!cutoffTime?.trim()) return null;
    const [hourPart, minutePart] = cutoffTime.trim().split(':');
    const hour = Number(hourPart);
    const minute = Number(minutePart ?? 0);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour, minute };
};

export const resolveCutoffMoment = (cutoffTime: string, now: Dayjs = dayjs()): Dayjs | null => {
    const parsed = parseCutoffTime(cutoffTime);
    if (!parsed) return null;
    return now.hour(parsed.hour).minute(parsed.minute).second(0).millisecond(0);
};

export const resolveOrderCutoffPhase = (
    cutoffTime: string,
    now: Dayjs = dayjs(),
    approachingWindowMinutes = APPROACHING_WINDOW_MINUTES
): OrderCutoffPhase => {
    const cutoff = resolveCutoffMoment(cutoffTime, now);
    if (!cutoff) return 'none';

    if (!now.isBefore(cutoff)) {
        return 'past';
    }

    const approachingStart = cutoff.subtract(approachingWindowMinutes, 'minute');
    if (!now.isBefore(approachingStart)) {
        return 'approaching';
    }

    return 'none';
};

/**
 * Resolves draw/vendor-return cutoff and whether PREPARING orders need attention.
 * Prefers `VENDOR_RETURN_CUTOFF` from system config when the user can read settings;
 * otherwise falls back to the seeded default (15:00).
 */
export const useOrderDrawCutoff = (preparingCount = 0) => {
    const { user } = useAuthStore();
    const canViewSettings = hasPermission(user, PERMISSIONS.SETTINGS.VIEW);
    const [now, setNow] = useState(() => dayjs());

    useEffect(() => {
        const tick = window.setInterval(() => setNow(dayjs()), 30_000);
        return () => window.clearInterval(tick);
    }, []);

    const configQuery = useQuery({
        queryKey: SYSTEM_CONFIG_KEYS.list(ConfigType.ORDER_SETTING),
        queryFn: () => getSystemConfigs(ConfigType.ORDER_SETTING),
        enabled: canViewSettings,
        staleTime: 60_000,
        retry: false,
    });

    const cutoffTime = useMemo(() => {
        const configs = configQuery.data?.data ?? [];
        const match = configs.find((c) => c.configKey === ORDER_DRAW_CUTOFF_CONFIG_KEY);
        return parseCutoffTime(match?.configValue) ? match!.configValue : DEFAULT_ORDER_DRAW_CUTOFF;
    }, [configQuery.data?.data]);

    const phase = useMemo(
        () => resolveOrderCutoffPhase(cutoffTime, now),
        [cutoffTime, now]
    );

    const cutoffMoment = useMemo(
        () => resolveCutoffMoment(cutoffTime, now),
        [cutoffTime, now]
    );

    const shouldHighlightPreparing =
        phase === 'approaching' || (phase === 'past' && preparingCount > 0);

    const showReminderBanner =
        phase === 'approaching' || (phase === 'past' && preparingCount > 0);

    return {
        cutoffTime,
        cutoffLabel: cutoffMoment?.format('HH:mm') ?? cutoffTime,
        phase,
        shouldHighlightPreparing,
        showReminderBanner,
        preparingCount,
        now,
    };
};
