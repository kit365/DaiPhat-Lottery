"use client";

import { Grid, Box, Typography, Button, Divider, Menu, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Avatar, CircularProgress } from "@mui/material"
import WelcomeWidget from "@/admin/components/dashboard/WelcomeWidget";
import SummaryWidget from "@/admin/components/dashboard/SummaryWidget";
import { useRouter } from 'next/navigation';
import DashboardCard from "@/admin/components/dashboard/DashboardCard";
import { ROUTES } from "@/admin/constants/routes";
import { useAuthStore } from "@/stores/useAuthStore";
import { Icon } from '@/admin/components/ui/AdminIcon';
import { useState, useEffect } from "react";
import { getDashboardKpis, getActionItems, getInventoryRisks, getVendorRisks } from "@/admin/features/dashboard/services/dashboardService";
import type { StationTicketRiskItem } from "@/admin/features/dashboard/services/dashboardService";
import Chart from '@/components/ApexChartCompat';

const VI_NUMBER_FORMATTER = new Intl.NumberFormat('vi-VN');

const formatCount = (value: number | null | undefined) =>
    VI_NUMBER_FORMATTER.format(value ?? 0);

const formatCurrency = (value: number | null | undefined) =>
    `${VI_NUMBER_FORMATTER.format(value ?? 0)} đ`;

const ActionItemDonut = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchData = async () => {
        setLoading(true); setError(false);
        const res = await getActionItems();
        if (res.success) setData(res.data || []);
        else setError(true);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) return <DashboardCard sx={{ height: '100%', p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></DashboardCard>;
    if (error) return <DashboardCard sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}><Typography variant="body2" color="error">Không thể tải dữ liệu</Typography><Button onClick={fetchData} variant="outlined" size="small">Thử lại</Button></DashboardCard>;
    if (data.length === 0) return <DashboardCard sx={{ height: '100%', p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 500 }}>Chưa có việc cần xử lý</Typography></DashboardCard>;

    const chartOptions: any = {
        chart: { type: 'donut', toolbar: { show: false } },
        labels: data.map(item => item.type || item.category || 'Khác'),
        dataLabels: { enabled: false },
        legend: { position: 'bottom' },
        colors: ['#00B8D9', '#36B37E', '#FFAB00', '#FF5630', '#637381'],
        tooltip: { y: { formatter: (val: number) => `${val.toLocaleString('vi-VN')} việc` } }
    };
    const series = data.map(item => item.count || 0);

    return (
        <DashboardCard sx={{ p: 3, pb: '20px', height: '100%' }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem' }}>Việc cần xử lý</Typography>
            </Box>
            <Chart options={chartOptions} series={series} type="donut" height={280} />
        </DashboardCard>
    );
};

const InventoryRiskBarChart = () => {
    const [data, setData] = useState<StationTicketRiskItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchData = async () => {
        setLoading(true); setError(false);
        const res = await getInventoryRisks();
        if (res.success) setData(res.data || []);
        else setError(true);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) return <DashboardCard sx={{ height: '100%', p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></DashboardCard>;
    if (error) return <DashboardCard sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}><Typography variant="body2" color="error">Không thể tải dữ liệu</Typography><Button onClick={fetchData} variant="outlined" size="small">Thử lại</Button></DashboardCard>;
    if (data.length === 0) return <DashboardCard sx={{ height: '100%', p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 500 }}>Chưa có dữ liệu rủi ro tồn vé</Typography></DashboardCard>;

    const chartHeight = Math.max(280, data.length * 85);

    const chartOptions: any = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
        plotOptions: { bar: { horizontal: true, barHeight: '60%', borderRadius: 4, dataLabels: { position: 'top' } } },
        dataLabels: { enabled: false },
        stroke: { show: true, width: 2, colors: ['transparent'] },
        xaxis: {
            categories: data.map(item => `${item.stationName} (${item.drawDate})`),
            labels: { style: { colors: 'var(--palette-text-secondary)', fontSize: '12px', fontWeight: 500 } },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { style: { colors: 'var(--palette-text-primary)', fontSize: '12px', fontWeight: 600 } } },
        colors: ['#FF3030', '#00B8D9'],
        tooltip: {
            theme: 'dark',
            y: { formatter: (val: number, opts: any) => { const item = data[opts?.dataPointIndex]; const riskText = item?.risk ? ` • Rủi ro: ${item.risk}` : ''; return `${val?.toLocaleString('vi-VN') || 0} vé${riskText}`; } }
        },
        legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px', fontWeight: 600, labels: { colors: 'var(--palette-text-primary)' }, markers: { radius: 12 } },
        grid: { strokeDashArray: 3, borderColor: 'var(--palette-divider)', padding: { right: 32, left: 20 } },
    };

    const series = [
        { name: 'Vé người bán giữ', data: data.map(item => item.vendorHeldQuantity) },
        { name: 'Vé còn bán', data: data.map(item => item.sellableQuantity) },
    ];

    return (
        <DashboardCard sx={{ height: '100%' }}>
            <Box sx={{ p: 3, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem' }}>Vé có thể bán và vé người bán đang giữ</Typography>
                    <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', display: 'block', mt: 0.25 }}>Tỷ lệ tồn kho & rủi ro đại lý giữ vé</Typography>
                </Box>
            </Box>
            <Box sx={{ minHeight: { xs: 280, sm: chartHeight }, height: { xs: 'auto', sm: chartHeight }, px: { xs: 2, md: 3 }, pt: 1, pb: { xs: 3, md: 4 }, width: '100%', overflow: 'hidden' }}>
                <Chart options={chartOptions} series={series} type="bar" height={chartHeight} />
            </Box>
        </DashboardCard>
    );
};

const VendorRiskTable = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchData = async () => {
        setLoading(true); setError(false);
        const res = await getVendorRisks();
        if (res.success) setData(res.data || []);
        else setError(true);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) return <DashboardCard sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></DashboardCard>;
    if (error) return <DashboardCard sx={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}><Typography variant="body2" color="error">Không thể tải dữ liệu</Typography><Button onClick={fetchData} variant="outlined" size="small">Thử lại</Button></DashboardCard>;
    if (data.length === 0) return (
        <DashboardCard>
            <Box sx={{ p: 3, pb: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem' }}>Rủi ro người bán</Typography>
            </Box>
            <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 500 }}>Chưa có dữ liệu rủi ro người bán</Typography>
            </Box>
        </DashboardCard>
    );

    return (
        <DashboardCard>
            <Box sx={{ p: 3, pb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem' }}>Rủi ro người bán</Typography>
            </Box>
            <TableContainer sx={{ px: 3, pb: 3 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ '& th': { borderBottom: '1px dashed var(--palette-divider)', color: 'var(--palette-text-secondary)', fontWeight: 600, fontSize: '0.75rem' } }}>
                            <TableCell>Người bán</TableCell>
                            <TableCell align="right">Vé đang giữ</TableCell>
                            <TableCell>Trạng thái</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((item, idx) => (
                            <TableRow key={idx} sx={{ '& td': { borderBottom: '1px dashed var(--palette-divider)', py: 1.5 } }}>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.813rem' }}>{item.vendorName || item.name || 'N/A'}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.813rem' }}>{formatCount(item.heldQuantity || item.quantity)} vé</TableCell>
                                <TableCell sx={{ fontSize: '0.813rem', color: 'var(--palette-text-secondary)' }}>{item.status || item.risk || '-'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </DashboardCard>
    );
};



export const EcommercePage = () => {
    const { user } = useAuthStore();
    const router = useRouter();
    const [activeIndex, setActiveIndex] = useState(0);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            const response = await getDashboardKpis();
            if (response.success) {
                setStats(response.data);
            }
        };
        fetchStats();
    }, []);

    return (
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
            <Grid
                sx={{
                    flexGrow: 0,
                    flexBasis: 'auto',
                    width: 'calc(100% * 12 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 12) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))',
                }}
            >
                <WelcomeWidget
                    title={`Chào mừng quay trở lại 👋\n` + (user?.fullName || 'Admin')}
                    description="Hôm nay có gì mới? Hãy kiểm tra các chỉ số kinh doanh và lịch đặt gần đây."
                    img="https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/illustrations/characters/character-present.webp"
                />
            </Grid>

            {/* KPI vận hành */}
            <Grid sx={{ width: '100%', flexGrow: 0, flexBasis: '100%', minWidth: 0 }}>
                <Grid container spacing={3} alignItems="stretch">
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ height: '100%', minWidth: 0, '& > *': { height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column' } }}>
                            <SummaryWidget
                                title="Vé đã bán"
                                total={formatCount(stats?.totalTickets)}
                                percent={0}
                                color="#00B8D9"
                                chartData={[0, 0]}
                                hideTrend={true}
                            />
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ height: '100%', minWidth: 0, '& > *': { height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column' } }}>
                            <SummaryWidget
                                title="Doanh thu bán vé"
                                total={stats?.monthlyRevenue != null ? formatCurrency(stats?.monthlyRevenue) : '0 đ'}
                                percent={Number(stats?.revenueMonthPercent) || 0}
                                color="#22C55E"
                                chartData={[0, 0]}
                                hideTrend={!stats?.revenueMonthPercent}
                            />
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Box sx={{ height: '100%', minWidth: 0, '& > *': { height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column' } }}>
                            <SummaryWidget
                                title="Tổng đơn hàng"
                                total={formatCount(stats?.totalOrders)}
                                percent={0}
                                color="#FF4842"
                                chartData={[0, 0]}
                                hideTrend={true}
                            />
                        </Box>
                    </Grid>
                </Grid>
            </Grid>

            <Grid sx={{ width: '100%', flexGrow: 0, flexBasis: '100%', minWidth: 0 }}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <ActionItemDonut />
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <InventoryRiskBarChart />
                    </Grid>
                </Grid>
            </Grid>
            <Grid sx={{ width: '100%', flexGrow: 0, flexBasis: '100%', minWidth: 0 }}>
                <VendorRiskTable />
            </Grid>

            <Grid sx={{ width: '100%', flexGrow: 0, flexBasis: '100%', minWidth: 0, display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button variant="text" onClick={() => router.push(ROUTES.ADMIN.REPORTS.REVENUE)} sx={{ fontWeight: 600 }}>
                    Xem báo cáo doanh thu & đối soát →
                </Button>
            </Grid>
        </Grid>
    );
};

export default EcommercePage;
