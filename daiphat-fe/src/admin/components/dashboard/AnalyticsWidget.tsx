import { Box, Typography, Tooltip, Stack, Divider } from "@mui/material";
import { Icon } from '@/admin/components/ui/AdminIcon';
import Chart from '@/components/ApexChartCompat';
import DashboardCard from "./DashboardCard";
import dayjs from 'dayjs';

interface RecentSource {
    id: string;
    label: string;
    amount: number;
    time: string;
    type: 'order' | 'ticketServiceOrder' | 'boarding';
}

interface AnalyticsWidgetProps {
    title: string;
    total: string;
    percent: number;
    color: string;
    icon: string;
    chartData: number[];
    colorType?: 'primary' | 'secondary' | 'info' | 'warning' | 'error';
    recentSources?: RecentSource[];
}

const AnalyticsWidget = ({ title, total, percent, color, icon, chartData, colorType = 'primary', recentSources }: AnalyticsWidgetProps) => {
    const isLoss = percent < 0;

    const chartOptions: any = {
        chart: {
            sparkline: { enabled: true },
            animations: { enabled: true }
        },
        stroke: { curve: 'smooth', width: 2.5 },
        colors: [color],
        tooltip: { enabled: false },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'light',
                type: "vertical",
                opacityFrom: 0,
                opacityTo: 0,
            }
        },
        states: {
            hover: { filter: { type: 'none' } },
            active: { filter: { type: 'none' } }
        },
    };

    const commonFont = '"Public Sans Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';
    const hasSources = recentSources && recentSources.length > 0;

    const TooltipContent = (
        <Box sx={{ p: 1.5, minWidth: 240 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon icon="solar:history-bold-duotone" width={18} />
                Lịch sử doanh thu
            </Typography>
            <Divider sx={{ mb: 1.5, borderStyle: 'dashed' }} />
            <Stack spacing={1.5}>
                {recentSources?.map((source) => (
                    <Box key={source.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: 'var(--palette-common-white)' }}>
                                {source.label}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.65rem' }}>
                                {dayjs(source.time).format('DD/MM HH:mm')} • {source.type === 'order' ? 'Sản phẩm' : source.type === 'ticketServiceOrder' ? 'Dịch vụ' : 'Boarding'}
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

    const mainContent = (
        <DashboardCard
            sx={{
                p: 'calc(3 * var(--spacing))',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                zIndex: 0,
                boxShadow: 'none',
                color: `var(--palette-${colorType}-darker)`,
                bgcolor: 'var(--palette-common-white)',
                backgroundImage: `linear-gradient(135deg, rgba(var(--palette-${colorType}-lighterChannel) / 48%), rgba(var(--palette-${colorType}-lightChannel) / 48%))`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
                borderRadius: 'var(--card-radius, 16px)',
                minHeight: 180,
                ...(hasSources && {
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 'var(--customShadows-z24)',
                        cursor: 'help'
                    }
                }),
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundImage: `radial-gradient(rgba(var(--palette-${colorType}-darkerChannel) / 0.1) 1px, transparent 1px)`,
                    backgroundSize: '8px 8px',
                    opacity: 0.4,
                }
            }}
        >
            {/* Percentage Box - Absolute Positioned */}
            <Tooltip title="So với tuần trước" arrow placement="top">
                <Box
                    sx={{
                        top: 16,
                        right: 16,
                        display: 'flex',
                        position: 'absolute',
                        alignItems: 'center',
                        gap: 'calc(0.5 * var(--spacing))',
                        zIndex: 1,
                        cursor: 'help'
                    }}
                >
                    <Icon icon={isLoss ? "eva:trending-down-fill" : "eva:trending-up-fill"} width={20} height={20} />
                    <Box
                        component="span"
                        sx={{
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            lineHeight: 1.57143,
                            fontFamily: commonFont
                        }}
                    >
                        {percent > 0 ? `+${percent}` : percent}%
                    </Box>
                </Box>
            </Tooltip>

            {/* Icon */}
            <Box
                component="img"
                src={icon}
                sx={{
                    width: 48,
                    height: 48,
                    mb: 'calc(3 * var(--spacing))',
                    maxWidth: '100%',
                    verticalAlign: 'middle',
                    position: 'relative',
                    zIndex: 1
                }}
            />

            {/* Title and Total */}
            <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Typography
                    sx={{
                        mb: 'var(--spacing)',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        lineHeight: 1.57143,
                        fontFamily: commonFont,
                        color: 'inherit'
                    }}
                >
                    {title}
                </Typography>
                <Typography
                    sx={{
                        fontWeight: 700,
                        fontSize: '1.5rem',
                        lineHeight: 1.5,
                        fontFamily: commonFont,
                        color: 'inherit'
                    }}
                >
                    {total}
                </Typography>
            </Box>

            <Box sx={{
                position: 'absolute',
                bottom: 24,
                right: 24,
                width: 100,
                height: 40,
                zIndex: 1
            }}>
                <Chart type="line" series={[{ data: chartData }]} options={chartOptions} width={100} height={40} />
            </Box>
        </DashboardCard>
    );

    if (hasSources) {
        return (
            <Tooltip title={TooltipContent} arrow placement="bottom">
                {mainContent}
            </Tooltip>
        );
    }

    return mainContent;
};

export default AnalyticsWidget;
