import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Skeleton } from '@mui/material';
import Chart from 'react-apexcharts';
import { getDetailedOrderStats } from '../../../api/dashboard.api';
import DashboardCard from '../../../components/dashboard/DashboardCard';
import SummaryWidget from '../../../components/dashboard/SummaryWidget';

export const OrderStatisticsPage = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    const STATUS_LABELS: Record<string, string> = {
        'pending': 'Chờ xác nhận',
        'confirmed': 'Đã xác nhận',
        'shipping': 'Đang giao',
        'shipped': 'Đã giao',
        'completed': 'Thành công',
        'cancelled': 'Đã hủy',
        'returned': 'Trả hàng',
        'request_cancel': 'Yêu cầu hủy'
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await getDetailedOrderStats();
                setStats(response.data);
            } catch (error) {
                console.error("Error fetching order stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading || !stats) {
        return <Box p={3}><Skeleton variant="rectangular" height={500} sx={{ borderRadius: 2 }} /></Box>;
    }

    const { topTickets, orderDistribution, totalOrders, pendingOrders, confirmedOrders, thisMonthRevenue, revenueTrend, recentRevenueSources } = stats;

    const trendOptions: any = {
        chart: { type: 'area', toolbar: { show: false }, fontFamily: 'Public Sans, sans-serif' },
        xaxis: { categories: (revenueTrend || []).map((t: any) => t.month) },
        colors: ['#00A76F'],
        stroke: { curve: 'smooth', width: 3 },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 90, 100] } },
        grid: { strokeDashArray: 3 }
    };

    const donutOptions: any = {
        labels: orderDistribution.map((o: any) => STATUS_LABELS[o._id] || o._id || 'Khác'),
        colors: ['#00A76F', '#FFAB00', '#FF5630', '#00B8D9', '#8E33FF', '#74CAFF', '#FF4842', '#212B36'],
        legend: { position: 'bottom', horizontalAlign: 'center', fontWeight: 600 },
        plotOptions: { pie: { donut: { size: '75%', labels: { show: true, total: { show: true, label: 'Tổng đơn' } } } } },
        dataLabels: { enabled: false }
    };

    const barOptions: any = {
        chart: { toolbar: { show: false }, fontFamily: 'Public Sans, sans-serif' },
        xaxis: {
            categories: topTickets.map((p: any) => p.name.length > 20 ? p.name.substring(0, 17) + "..." : p.name),
            labels: { style: { fontSize: '11px' } }
        },
        colors: ['#00B8D9'],
        // Cột nhỏ lại bằng cách tăng columnWidth vừa phải hoặc giảm size biểu đồ
        plotOptions: { bar: { borderRadius: 6, columnWidth: '25%' } },
        grid: { strokeDashArray: 3 }
    };

    const gridLayout = {
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '24px',
    };

    return (
        <Box p={3}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, mb: 4 }}>
                <SummaryWidget
                    title="Tổng đơn hàng"
                    total={totalOrders}
                    percent={5.2}
                    color="#00A76F"
                    chartData={revenueTrend?.map((t: any) => t.total)}
                />
                <SummaryWidget
                    title="Chờ xác nhận"
                    total={pendingOrders}
                    percent={-2.1}
                    color="#FFAB00"
                    chartData={revenueTrend?.map((t: any) => t.total)}
                />
                <SummaryWidget
                    title="Đã xác nhận"
                    total={confirmedOrders}
                    percent={1.4}
                    color="#00B8D9"
                    chartData={revenueTrend?.map((t: any) => t.total)}
                />
                <SummaryWidget
                    title="Doanh thu tháng này"
                    total={(thisMonthRevenue || 0).toLocaleString() + 'đ'}
                    percent={12.5}
                    color="#FF5630"
                    chartData={revenueTrend?.map((t: any) => t.total)}
                    recentSources={recentRevenueSources}
                />
            </Box>

            <Box sx={gridLayout}>
                <Box sx={{ gridColumn: 'span 12' }}>
                    <DashboardCard sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>{t('admin.dashboard.statistics.revenue_trend_6m', 'Xu hướng doanh thu (6 tháng gần nhất)')}</Typography>
                        <Chart options={trendOptions} series={[{ name: t('admin.common.revenue', 'Doanh thu'), data: (revenueTrend || []).map((t: any) => t.total) }]} type="area" height={300} />
                    </DashboardCard>
                </Box>

                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 5' } }}>
                    <DashboardCard sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>{t('admin.dashboard.statistics.order_status', 'Trạng thái Đơn hàng')}</Typography>
                        <Chart options={donutOptions} series={orderDistribution.map((o: any) => o.count)} type="donut" height={380} />
                    </DashboardCard>
                </Box>

                <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 7' } }}>
                    <DashboardCard sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>{t('admin.dashboard.statistics.top_5_products', 'Top 5 Sản phẩm Bán chạy nhất')}</Typography>
                        <Chart options={barOptions} series={[{ name: t('admin.common.quantity', 'Số lượng mua'), data: topTickets.map((p: any) => p.totalQuantity) }]} type="bar" height={360} />
                    </DashboardCard>
                </Box>

            </Box>
        </Box>
    );
};
