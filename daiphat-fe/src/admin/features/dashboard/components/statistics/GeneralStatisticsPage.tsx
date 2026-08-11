"use client";

import { useEffect, useState } from 'react';
import { Box, Typography, Stack, IconButton, Skeleton } from '@mui/material';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });
import RefreshIcon from '@mui/icons-material/Refresh';
import { getEcommerceStats } from "@/admin/features/dashboard/services/dashboardService";
import DashboardCard from '@/admin/components/dashboard/DashboardCard';
import SummaryWidget from '@/admin/components/dashboard/SummaryWidget';
import { Icon } from '@/admin/components/ui/AdminIcon';

export const GeneralStatisticsPage = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await getEcommerceStats();
            setData(response.data);
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading || !data) {
        return (
            <Box p={3}><Skeleton variant="rectangular" height={600} sx={{ borderRadius: 2 }} /></Box>
        );
    }

    const { summary, yearlyRevenueChart } = data;

    const chartOptions: any = {
        chart: { toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Public Sans, sans-serif' },
        stroke: { curve: 'smooth', width: 3 },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.1, opacityTo: 0, stops: [0, 90, 100] } },
        xaxis: {
            categories: ['Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6', 'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12'],
            axisBorder: { show: false }, axisTicks: { show: false }
        },
        colors: ['#FF3030', '#FFAB00'], // Ticket, Service
        grid: { strokeDashArray: 3, borderColor: 'rgba(145, 158, 171, 0.2)' },
        tooltip: { theme: 'light', y: { formatter: (val: number) => val?.toLocaleString() + 'đ' } },
        legend: { show: true, position: 'top', horizontalAlign: 'right', fontWeight: 600 }
    };

    const gridLayout = {
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '24px',
    };

    return (
        <Box p={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>Thống kê Doanh thu thuần</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Báo cáo lợi nhuận thực tế từ tất cả nguồn thu (Vé số, Dịch vụ).</Typography>
                </Box>
                <IconButton onClick={fetchData} sx={{ bgcolor: 'rgba(255, 48, 48, 0.08)', color: 'primary.main' }}>
                    <RefreshIcon />
                </IconButton>
            </Stack>

            <Box sx={gridLayout}>
                {/* Summary Widgets with History Hover */}
                <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
                    <SummaryWidget
                        title="Doanh thu tháng này"
                        total={(summary?.monthlyRevenue || 0).toLocaleString() + 'đ'}
                        percent={summary?.revenueMonthPercent || 0}
                        chartData={yearlyRevenueChart?.total || []}
                        recentSources={summary?.recentRevenueSources}
                    />
                </Box>
                <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
                    <SummaryWidget
                        title="Doanh thu Vé số"
                        total={(summary?.shopRevenue || 0).toLocaleString() + 'đ'}
                        percent={5.2}
                        color="#FF3030"
                        chartData={yearlyRevenueChart?.shop || []}
                    />
                </Box>
                <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
                    <SummaryWidget
                        title="Doanh thu Dịch vụ"
                        total={(summary?.ticketServiceRevenue || 0).toLocaleString() + 'đ'}
                        percent={2.1}
                        color="#FFAB00"
                        chartData={yearlyRevenueChart?.ticketService || []}
                    />
                </Box>

                {/* Hàng 2: Xu hướng doanh thu tổng thể (Full width) */}
                <Box sx={{ gridColumn: 'span 12' }}>
                    <DashboardCard sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Xu hướng Doanh thu hàng tháng</Typography>
                        <Chart
                            options={chartOptions}
                            series={[
                                { name: 'Vé số', data: yearlyRevenueChart?.shop || [] },
                                { name: 'Dịch vụ', data: yearlyRevenueChart?.ticketService || [] },
                            ]}
                            type="area"
                            height={400}
                        />
                    </DashboardCard>
                </Box>
            </Box>

            <Box sx={{ mt: 3 }}>
                <DashboardCard sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={2} mb={4}>
                        <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: 'rgba(0, 75, 80, 0.1)', color: '#004b50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon icon="solar:chart-2-bold-duotone" width={24} />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>Tổng doanh thu tích lũy</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Cơ cấu doanh thu trọn đời từ tất cả các nguồn (Vé số, Dịch vụ).</Typography>
                        </Box>
                    </Stack>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 400px' }, gap: 4 }}>
                        <Stack spacing={3}>
                            <Box sx={{ p: 4, borderRadius: 3, bgcolor: '#004b50', color: 'common.white', position: 'relative', overflow: 'hidden' }}>
                                <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.1 }}>
                                    <Icon icon="solar:banknote-bold-duotone" width={160} />
                                </Box>
                                <Typography variant="subtitle2" sx={{ opacity: 0.72, mb: 1, fontWeight: 700, textTransform: 'uppercase' }}>Tổng doanh thu (All-time)</Typography>
                                <Typography variant="h2" sx={{ fontWeight: 800 }}>{(summary?.allTimeRevenue?.total || 0).toLocaleString()}đ</Typography>
                                <Typography variant="body2" sx={{ mt: 2, opacity: 0.8 }}>Dữ liệu được tổng hợp từ ngày bắt đầu vận hành hệ thống.</Typography>
                            </Box>

                             <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
                                {[
                                    { label: 'Vé số', value: summary?.allTimeRevenue?.shop || 0, color: '#FF3030', icon: 'solar:ticket-bold-duotone' },
                                    { label: 'Dịch vụ', value: summary?.allTimeRevenue?.ticketService || 0, color: '#FFAB00', icon: 'solar:tea-cup-bold-duotone' },
                                ].map((item) => (
                                    <Box key={item.label} sx={{ p: 2, borderRadius: 2, bgcolor: 'var(--palette-background-neutral)', border: '1px solid var(--palette-divider)' }}>
                                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                                            <Icon icon={item.icon} width={20} style={{ color: item.color }} />
                                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase' }}>{item.label}</Typography>
                                        </Stack>
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{item.value.toLocaleString()}đ</Typography>
                                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>({((item.value / (summary?.allTimeRevenue?.total || 1)) * 100).toFixed(1)}%)</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Stack>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Chart
                                options={{
                                    labels: ['Vé số', 'Dịch vụ'],
                                    colors: ['#FF3030', '#FFAB00'],
                                    stroke: { width: 0 },
                                    legend: { position: 'bottom', fontWeight: 600 },
                                    plotOptions: { pie: { donut: { size: '80%' } } },
                                    dataLabels: { enabled: false }
                                }}
                                series={[summary?.allTimeRevenue?.shop || 0, summary?.allTimeRevenue?.ticketService || 0]}
                                type="donut"
                                width="100%"
                                height={340}
                            />
                        </Box>
                    </Box>
                </DashboardCard>
            </Box>
        </Box>
    );
};
