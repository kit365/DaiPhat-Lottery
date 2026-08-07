'use client';

import { Stack, TextField, Typography } from '@mui/material';
import { useMemo } from 'react';

const MIN_TOTAL_MINUTES = 1;
/** Max one calendar day (24h 00m). Hours input allows 0–23, or exactly 24 with minutes forced to 00. */
const MAX_TOTAL_MINUTES = 24 * 60;
const MAX_HOURS_WITH_MINUTES = 23;
const MAX_HOURS_EXACT = 24;

export const FORTUNE_COOLDOWN_CONFIG_KEY = 'FORTUNE_CAST_COOLDOWN_HOURS';

export const isFortuneCooldownConfig = (configKey: string) =>
    configKey === FORTUNE_COOLDOWN_CONFIG_KEY;

export const parseFortuneCooldownTotalMinutes = (raw: string): number => {
    const n = Number.parseInt(String(raw ?? '').trim(), 10);
    if (!Number.isFinite(n) || n < MIN_TOTAL_MINUTES) return MAX_TOTAL_MINUTES;
    return Math.min(n, MAX_TOTAL_MINUTES);
};

export const splitFortuneCooldownMinutes = (totalMinutes: number) => {
    const safe = Math.max(MIN_TOTAL_MINUTES, Math.min(MAX_TOTAL_MINUTES, totalMinutes));
    return {
        hours: Math.floor(safe / 60),
        minutes: safe % 60,
    };
};

export const formatFortuneCooldownDuration = (totalMinutes: number): string => {
    const { hours, minutes } = splitFortuneCooldownMinutes(totalMinutes);
    if (hours > 0 && minutes > 0) return `${hours} giờ ${minutes} phút`;
    if (hours > 0) return `${hours} giờ`;
    return `${minutes} phút`;
};

interface FortuneCooldownDurationEditorProps {
    value: string;
    onChange: (totalMinutesValue: string) => void;
    error?: string;
}

export const FortuneCooldownDurationEditor = ({
    value,
    onChange,
    error,
}: FortuneCooldownDurationEditorProps) => {
    const totalMinutes = parseFortuneCooldownTotalMinutes(value);
    const { hours, minutes } = useMemo(
        () => splitFortuneCooldownMinutes(totalMinutes),
        [totalMinutes]
    );

    const commit = (nextHours: number, nextMinutes: number) => {
        let h = Number.isFinite(nextHours) ? Math.trunc(nextHours) : 0;
        let m = Number.isFinite(nextMinutes) ? Math.trunc(nextMinutes) : 0;

        if (h >= MAX_HOURS_EXACT) {
            h = MAX_HOURS_EXACT;
            m = 0;
        } else {
            h = Math.max(0, Math.min(MAX_HOURS_WITH_MINUTES, h));
            m = Math.max(0, Math.min(59, m));
        }

        let total = h * 60 + m;
        if (total < MIN_TOTAL_MINUTES) total = MIN_TOTAL_MINUTES;
        if (total > MAX_TOTAL_MINUTES) total = MAX_TOTAL_MINUTES;
        onChange(String(total));
    };

    const minutesLocked = hours >= MAX_HOURS_EXACT;

    const hint = useMemo(() => {
        const label = formatFortuneCooldownDuration(totalMinutes);
        if (totalMinutes === 60) return `Mỗi khung 1 giờ đồng hồ (0h, 1h, 2h, …) · ${label}`;
        if (totalMinutes === 360) return `Mỗi khung 6 giờ (0h, 6h, 12h, 18h) · ${label}`;
        if (totalMinutes === 1440) return `Mỗi khung 1 ngày (reset 0h) · ${label}`;
        return `Mỗi khung ${label}, căn từ 0h giờ Việt Nam`;
    }, [totalMinutes]);

    return (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Độ dài khung giờ
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                    type="number"
                    label="Giờ"
                    value={hours}
                    onChange={(e) => commit(Number(e.target.value), minutes)}
                    fullWidth
                    error={!!error}
                    helperText="Tối đa 23; nhập 24 thì phút = 00"
                    inputProps={{ min: 0, max: MAX_HOURS_EXACT, step: 1 }}
                />
                <TextField
                    type="number"
                    label="Phút"
                    value={minutes}
                    onChange={(e) => commit(hours, Number(e.target.value))}
                    fullWidth
                    error={!!error}
                    disabled={minutesLocked}
                    helperText={minutesLocked ? '24 giờ → phút cố định 00' : '0 – 59'}
                    inputProps={{ min: 0, max: 59, step: 1 }}
                />
            </Stack>
            <Typography variant="caption" color={error ? 'error' : 'text.secondary'}>
                {error || hint}
            </Typography>
            {!error && (
                <Typography variant="caption" color="text.secondary">
                    Không tính từ lúc khách gieo — chỉ theo khung giờ thật.
                </Typography>
            )}
        </Stack>
    );
};
