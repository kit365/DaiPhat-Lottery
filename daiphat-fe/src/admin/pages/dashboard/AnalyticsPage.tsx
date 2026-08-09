"use client";

import { Grid, Box, Typography, useTheme, CircularProgress } from "@mui/material";
import Chart from 'react-apexcharts';
import DashboardCard from "../../components/dashboard/DashboardCard";
import AnalyticsWidget from "../../components/dashboard/AnalyticsWidget";
import { useState, useEffect } from "react";
import { getAnalyticsStats } from "../../api/dashboard.api";
import { Icon } from '@/admin/components/ui/AdminIcon';

const CurrentVisits = ({ data }: { data: any[] }) => {
    const theme = useTheme();
    const chartOptions: any = {
        chart: { type: 'pie' },
        labels: data?.map(d => d.label) || [],
        stroke: { show: true, width: 2, colors: [theme.palette.background.paper] },
        legend: {
            position: 'bottom',
            horizontalAlign: 'center',
            fontSize: '13px',
            fontWeight: 500,
            offsetY: 0,
            itemMargin: { horizontal: 10, vertical: 5 },
            markers: { radius: 12, width: 12, height: 12 }
        },
        dataLabels: {
            enabled: true,
            dropShadow: { enabled: false },
            style: {
                fontSize: '12px',
                fontWeight: 'bold',
                colors: ['#fff']
            },
            formatter: (val: number) => `${val.toFixed(1)}%`
        },
        plotOptions: {
            pie: {
                customScale: 0.8,
                expandOnClick: true,
                dataLabels: { offset: -10 }
            }
        },
        colors: ['#FF3030', '#ffab00', '#B71833', '#FF5630', '#FFC107', '#2196F3'],
    };

    const series = data?.map(d => d.value) || [];

    return (
        <DashboardCard sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 3, pb: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px' }}>Trạng thái đơn hàng</Typography>
            </Box>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                <Chart options={chartOptions} series={series} type="pie" width="100%" height={344} />
            </Box>
        </DashboardCard>
    );
};

const WebsiteVisits = ({ data }: { data: number[] }) => {
    const chartOptions: any = {
        chart: { type: 'bar', toolbar: { show: false } },
        plotOptions: {
            bar: {
                columnWidth: '32%',
                borderRadius: 4
            }
        },
        stroke: { show: true, width: 2, colors: ['transparent'] },
        xaxis: {
            categories: ['Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6', 'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12'],
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: { style: { colors: 'var(--palette-text-disabled)', fontSize: '12px' } }
        },
        yaxis: {
            labels: {
                show: true,
                style: { colors: 'var(--palette-text-disabled)', fontSize: '12px' }
            }
        },
        grid: { strokeDashArray: 3, borderColor: 'var(--palette-divider)' },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            fontSize: '13px',
            fontWeight: 500,
            markers: { radius: 12, width: 12, height: 12 },
            itemMargin: { horizontal: 10 }
        },
        colors: ['#B71833', '#FFAB00'],
        dataLabels: { enabled: false }
    };

    const series = [
        { name: 'Số lượng đơn hàng', data: data || Array(12).fill(0) }
    ];

    return (
        <DashboardCard sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px' }}>Tần suất đặt hàng</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Thống kê số lượng đơn hàng theo từng tháng</Typography>
            </Box>
            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <Chart options={chartOptions} series={series} type="bar" width="100%" height={364} />
            </Box>
        </DashboardCard>
    );
};

export const AnalyticsPage = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await getAnalyticsStats();
                if (res.success) {
                    setStats(res.data);
                }
            } catch (error) {
                console.error("Error fetching analytics stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 5 }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    Phân tích hệ thống 👋
                </Typography>
                <DashboardCard sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#004b50', color: '#ffffff' }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon icon="solar:wallet-money-bold-duotone" width={26} />
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ opacity: 0.64, fontWeight: 700, textTransform: 'uppercase' }}>Tổng doanh thu tích lũy</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>{(stats?.weeklySales?.allTime?.total ?? 0).toLocaleString()}đ</Typography>
                    </Box>
                </DashboardCard>
            </Box>

            <Grid
                container
                sx={{
                    '--Grid-columns': 12,
                    '--Grid-columnSpacing': 'calc(3 * var(--spacing))',
                    '--Grid-rowSpacing': 'calc(3 * var(--spacing))',
                    flexFlow: 'wrap',
                    minWidth: '0px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    gap: 'var(--Grid-rowSpacing) var(--Grid-columnSpacing)',
                    '& > *': {
                        '--Grid-parent-rowSpacing': 'calc(3 * var(--spacing))',
                        '--Grid-parent-columnSpacing': 'calc(3 * var(--spacing))',
                        '--Grid-parent-columns': 12,
                    }
                }}
            >
                {/* Analytics Widgets (Span 3 each) */}
                <Grid
                    sx={{
                        flexBasis: 'auto', flexGrow: 0, width: '100%',
                        '@media (min-width: 600px)': { width: 'calc(100% * 6 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 6) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' },
                        '@media (min-width: 1200px)': { width: 'calc(100% * 3 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 3) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' }
                    }}
                >
                    <AnalyticsWidget
                        title="Doanh số tuần"
                        total={`${(stats?.weeklySales?.total ?? 0).toLocaleString()}đ`}
                        percent={stats?.weeklySales?.percent || 0}
                        color="#FF3030"
                        colorType="primary"
                        icon="https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/icons/glass/ic-glass-bag.svg"
                        chartData={stats?.weeklySales?.data || [0]}
                        recentSources={stats?.weeklySales?.recentRevenueSources}
                    />
                </Grid>
                <Grid
                    sx={{
                        flexBasis: 'auto', flexGrow: 0, width: '100%',
                        '@media (min-width: 600px)': { width: 'calc(100% * 6 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 6) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' },
                        '@media (min-width: 1200px)': { width: 'calc(100% * 3 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 3) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' }
                    }}
                >
                    <AnalyticsWidget
                        title="Người dùng mới"
                        total={(stats?.newUsers?.total ?? 0).toString()}
                        percent={stats?.newUsers?.percent || 0}
                        color="#8e33ff"
                        colorType="secondary"
                        icon="https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/icons/glass/ic-glass-users.svg"
                        chartData={stats?.newUsers?.data || [15, 32, 45, 32, 56, 30, 44, 32, 20]} // Simulated users trend
                    />
                </Grid>
                <Grid
                    sx={{
                        flexBasis: 'auto', flexGrow: 0, width: '100%',
                        '@media (min-width: 600px)': { width: 'calc(100% * 6 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 6) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' },
                        '@media (min-width: 1200px)': { width: 'calc(100% * 3 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 3) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' }
                    }}
                >
                    <AnalyticsWidget
                        title="Tổng đơn hàng"
                        total={(stats?.purchaseOrders?.total ?? 0).toString()}
                        percent={stats?.purchaseOrders?.percent || 0}
                        color="#ffab00"
                        colorType="warning"
                        icon="https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/icons/glass/ic-glass-buy.svg"
                        chartData={stats?.purchaseOrders?.data || [10, 25, 40, 20, 45, 35, 50, 40, 60]} // Simulated orders trend
                    />
                </Grid>
                <Grid
                    sx={{
                        flexBasis: 'auto', flexGrow: 0, width: '100%',
                        '@media (min-width: 600px)': { width: 'calc(100% * 6 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 6) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' },
                        '@media (min-width: 1200px)': { width: 'calc(100% * 3 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 3) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' }
                    }}
                >
                    <AnalyticsWidget
                        title="Tổng thú cưng"
                        total={(stats?.userTickets?.total ?? 0).toString()}
                        percent={stats?.userTickets?.percent || 0}
                        color="#ff5630"
                        colorType="error"
                        icon="https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/icons/glass/ic-glass-message.svg"
                        chartData={stats?.userTickets?.data || [5, 18, 12, 51, 68, 11, 39, 37, 27, 20]} // Simulated userTickets trend
                    />
                </Grid>

                {/* Current Visits (Span 4) */}
                <Grid
                    sx={{
                        flexBasis: 'auto', flexGrow: 0, width: '100%',
                        '@media (min-width: 900px)': { width: 'calc(100% * 4 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 4) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' }
                    }}
                >
                    <CurrentVisits data={stats?.orderDistribution} />
                </Grid>

                {/* Website Visits (Span 8) */}
                <Grid
                    sx={{
                        flexBasis: 'auto', flexGrow: 0, width: '100%',
                        '@media (min-width: 900px)': { width: 'calc(100% * 8 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 8) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))' }
                    }}
                >
                    <WebsiteVisits data={stats?.websiteVisits} />
                </Grid>
            </Grid>
        </Box>
    );
};

export default AnalyticsPage;
