"use client";

import { Box, Divider, Stack, SxProps, Theme, Tooltip, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import dayjs from 'dayjs';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import DashboardCard from './DashboardCard';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export interface AdminMetricCardRecentSource {
    id: string;
    label: string;
    amount: number;
    time: string;
    type: 'order' | 'ticketServiceOrder' | 'boarding';
}

export interface AdminMetricCardTrend {
    percent: number;
    chartData: number[];
}

export interface AdminMetricCardProps {
    title: string;
    value: string;
    color?: string;
    subtitle?: string;
    trend?: AdminMetricCardTrend;
    recentSources?: AdminMetricCardRecentSource[];
    sx?: SxProps<Theme>;
}

export const AdminMetricCard = ({
    title,
    value,
    color = '#FF3030',
    subtitle,
    trend,
    recentSources,
    sx,
}: AdminMetricCardProps) => {
    const hasTrend = Boolean(trend);
    const isLoss = (trend?.percent ?? 0) < 0;
    const hasRevenueSources = Boolean(recentSources?.length);

    const chartOptions: Record<string, unknown> = {
        chart: {
            sparkline: { enabled: true },
            animations: { enabled: true },
        },
        stroke: { curve: 'smooth', width: 2.5 },
        fill: {
            type: 'gradient',
            gradient: {
                colorStops: [
                    { offset: 0, color, opacity: 1 },
                    { offset: 100, color, opacity: 1 },
                ],
            },
        },
        colors: [color],
        tooltip: { enabled: false },
        states: {
            hover: { filter: { type: 'none' } },
            active: { filter: { type: 'none' } },
        },
        grid: { padding: { top: 2, bottom: 2 } },
    };

    const tooltipContent = (
        <Box sx={{ p: 1.5, minWidth: 240 }}>
            <Typography
                variant="subtitle2"
                sx={{ mb: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}
            >
                <Icon icon="solar:history-bold-duotone" width={18} />
                Nguồn thu gần đây
            </Typography>
            <Divider sx={{ mb: 1.5, borderStyle: 'dashed' }} />
            <Stack spacing={1.5}>
                {recentSources?.map((source) => (
                    <Box
                        key={source.id}
                        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                    >
                        <Box>
                            <Typography
                                variant="caption"
                                sx={{ fontWeight: 700, display: 'block', color: 'var(--palette-common-white)' }}
                            >
                                {source.label}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.65rem' }}>
                                {dayjs(source.time).format('DD/MM HH:mm')} •{' '}
                                {source.type === 'order'
                                    ? 'Sản phẩm'
                                    : source.type === 'ticketServiceOrder'
                                      ? 'Dịch vụ'
                                      : 'Boarding'}
                            </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--palette-success-light)' }}>
                            +{source.amount.toLocaleString()}đ
                        </Typography>
                    </Box>
                ))}
            </Stack>
        </Box>
    );

    const content = (
        <DashboardCard
            sx={{
                display: 'flex',
                alignItems: hasTrend ? 'center' : 'stretch',
                p: 'calc(3 * var(--spacing))',
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                ...(hasRevenueSources && {
                    '&:hover': {
                        cursor: 'help',
                        transform: 'translateY(-4px)',
                        boxShadow: 'var(--customShadows-z24)',
                    },
                }),
                ...sx,
            }}
        >
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-secondary)' }}>
                    {title}
                </Typography>
                <Typography
                    sx={{
                        mt: 1.5,
                        mb: subtitle || hasTrend ? 1 : 0,
                        fontSize: '2rem',
                        fontWeight: 600,
                        fontFamily: 'Barlow, sans-serif',
                        lineHeight: 1.2,
                        wordBreak: 'break-word',
                    }}
                >
                    {value}
                </Typography>
                {subtitle ? (
                    <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 500 }}>
                        {subtitle}
                    </Typography>
                ) : null}
                {hasTrend && trend ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: subtitle ? 1 : 0 }}>
                        <Box
                            sx={{
                                width: 24,
                                height: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                bgcolor: isLoss ? 'rgba(255, 86, 48, 0.16)' : 'rgba(34, 197, 94, 0.16)',
                                color: isLoss ? '#ff5630' : '#22c55e',
                            }}
                        >
                            <Icon
                                icon={isLoss ? 'eva:trending-down-fill' : 'eva:trending-up-fill'}
                                width={16}
                                height={16}
                            />
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {trend.percent > 0 ? `+${Number(trend.percent).toFixed(2)}` : Number(trend.percent).toFixed(2)}%
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 400 }}>
                            từ tuần trước
                        </Typography>
                    </Box>
                ) : null}
            </Box>

            {hasTrend && trend ? (
                <Box sx={{ width: 100, height: 66, flexShrink: 0, ml: 2 }}>
                    <Chart type="line" series={[{ data: trend.chartData }]} options={chartOptions} width={100} height={66} />
                </Box>
            ) : null}
        </DashboardCard>
    );

    if (hasRevenueSources) {
        return (
            <Tooltip
                title={tooltipContent}
                arrow
                placement="right"
                enterDelay={200}
                leaveDelay={200}
                slotProps={{
                    popper: {
                        modifiers: [
                            {
                                name: 'offset',
                                options: {
                                    offset: [0, 12],
                                },
                            },
                        ],
                    },
                }}
            >
                {content}
            </Tooltip>
        );
    }

    return content;
};

export interface AdminMetricCardsGridProps {
    children: ReactNode;
    columns?: {
        xs?: number;
        sm?: number;
        md?: number;
        lg?: number;
    };
}

export const AdminMetricCardsGrid = ({
    children,
    columns = { xs: 1, sm: 2, md: 4 },
}: AdminMetricCardsGridProps) => (
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
