import { Box, Typography, Tooltip, Stack, Divider } from "@mui/material";
import { Icon } from '@iconify/react';
import Chart from 'react-apexcharts';
import DashboardCard from "./DashboardCard";
import dayjs from 'dayjs';

interface RecentSource {
    id: string;
    label: string;
    amount: number;
    time: string;
    type: 'order' | 'ticketServiceOrder' | 'boarding';
}

interface SummaryWidgetProps {
    title: string;
    total: string;
    percent: number;
    color?: string;
    chartData: number[];
    recentSources?: RecentSource[];
}

const SummaryWidget = ({ title, total, percent, color = '#FF3030', chartData, recentSources }: SummaryWidgetProps) => {
    const isLoss = percent < 0;

    const chartOptions: any = {
        chart: {
            sparkline: { enabled: true },
            animations: { enabled: true }
        },
        stroke: { curve: 'smooth', width: 2.5 },
        fill: {
            type: 'gradient',
            gradient: {
                colorStops: [
                    { offset: 0, color: color, opacity: 1 },
                    { offset: 100, color: color, opacity: 1 },
                ]
            }
        },
        colors: [color],
        tooltip: { enabled: false },
        states: {
            hover: { filter: { type: 'none' } },
            active: { filter: { type: 'none' } }
        },
        grid: { padding: { top: 2, bottom: 2 } }
    };

    const hasRevenueSources = recentSources && recentSources.length > 0;

    const TooltipContent = (
        <Box sx={{ p: 1.5, minWidth: 240 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon icon="solar:history-bold-duotone" width={18} />
                Nguồn thu gần đây
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

    const content = (
        <DashboardCard sx={{
            display: 'flex',
            alignItems: 'center',
            p: 'calc(3 * var(--spacing))',
            transition: 'transform 0.2s',
            ...(hasRevenueSources && {
                '&:hover': {
                    cursor: 'help',
                    transform: 'translateY(-4px)',
                    boxShadow: 'var(--customShadows-z24)'
                }
            })
        }}>
            <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {title}
                </Typography>
                <Typography sx={{ mt: 1.5, mb: 1, fontSize: '2rem', fontWeight: 600, fontFamily: 'Barlow, sans-serif' }}>
                    {total}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                        sx={{
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            bgcolor: isLoss ? 'rgba(255, 86, 48, 0.16)' : 'rgba(34, 197, 94, 0.16)',
                            color: isLoss ? '#ff5630' : '#22c55e'
                        }}
                    >
                        <Icon
                            icon={isLoss ? "eva:trending-down-fill" : "eva:trending-up-fill"}
                            width={16}
                            height={16}
                        />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {percent > 0 ? `+${Number(percent).toFixed(2)}` : Number(percent).toFixed(2)}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 400 }}>
                        từ tuần trước
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ width: 100, height: 66 }}>
                <Chart type="line" series={[{ data: chartData }]} options={chartOptions} width={100} height={66} />
            </Box>
        </DashboardCard>
    );

    if (hasRevenueSources) {
        return (
            <Tooltip
                title={TooltipContent}
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

export default SummaryWidget;
