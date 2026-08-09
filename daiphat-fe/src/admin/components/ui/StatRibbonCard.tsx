"use client";

import { Box, Card, SxProps, Theme, Typography } from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';
import type { ReactNode } from 'react';

export type StatRibbonColor = 'orange' | 'green' | 'cyan' | 'purple' | 'red';

const COLOR_THEMES: Record<
    StatRibbonColor,
    { ribbon: string; icon: string }
> = {
    orange: { ribbon: 'rgba(255, 171, 0, 0.16)', icon: '#FFAB00' },
    green: { ribbon: 'rgba(34, 197, 94, 0.16)', icon: '#22C55E' },
    cyan: { ribbon: 'rgba(0, 184, 217, 0.16)', icon: '#00B8D9' },
    purple: { ribbon: 'rgba(142, 84, 233, 0.16)', icon: '#8E54E9' },
    red: { ribbon: 'rgba(255, 86, 48, 0.16)', icon: '#FF5630' },
};

export interface StatRibbonCardProps {
    value: string;
    label: string;
    icon: string;
    color?: StatRibbonColor;
    sx?: SxProps<Theme>;
}

export const StatRibbonCard = ({
    value,
    label,
    icon,
    color = 'orange',
    sx,
}: StatRibbonCardProps) => {
    const theme = COLOR_THEMES[color];

    return (
        <Card
            elevation={0}
            sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '16px',
                bgcolor: '#fff',
                boxShadow: 'var(--customShadows-card, 0 0 2px rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12))',
                minHeight: 118,
                ...sx,
            }}
        >
            {/* Nền góc phải — clip-path khớp mép card, không bị dư đoạn dưới */}
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '46%',
                    height: '100%',
                    bgcolor: theme.ribbon,
                    clipPath: 'polygon(36% 0, 100% 0, 100% 100%, 0% 100%)',
                    pointerEvents: 'none',
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.icon,
                    pointerEvents: 'none',
                }}
            >
                <Icon icon={icon} width={28} height={28} />
            </Box>

            <Box
                sx={{
                    p: 3,
                    pr: { xs: 10, sm: 11 },
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: 118,
                }}
            >
                <Typography
                    sx={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        lineHeight: 1.15,
                        color: 'var(--palette-text-primary, #1C252E)',
                        fontFamily: 'Barlow, Public Sans, sans-serif',
                        wordBreak: 'break-word',
                    }}
                >
                    {value}
                </Typography>
                <Typography
                    variant="body2"
                    sx={{
                        mt: 0.75,
                        color: 'var(--palette-text-secondary, #637381)',
                        fontWeight: 500,
                        lineHeight: 1.5,
                    }}
                >
                    {label}
                </Typography>
            </Box>
        </Card>
    );
};

export interface StatRibbonCardsGridProps {
    children: ReactNode;
    columns?: {
        xs?: number;
        sm?: number;
        md?: number;
        lg?: number;
    };
}

export const StatRibbonCardsGrid = ({
    children,
    columns = { xs: 1, sm: 2, md: 4 },
}: StatRibbonCardsGridProps) => (
    <Box
        sx={{
            display: 'grid',
            gridTemplateColumns: {
                xs: `repeat(${columns.xs ?? 1}, minmax(0, 1fr))`,
                sm: `repeat(${columns.sm ?? 2}, minmax(0, 1fr))`,
                md: `repeat(${columns.md ?? 4}, minmax(0, 1fr))`,
                ...(columns.lg ? { lg: `repeat(${columns.lg}, minmax(0, 1fr))` } : {}),
            },
            gap: 3,
            width: '100%',
        }}
    >
        {children}
    </Box>
);
