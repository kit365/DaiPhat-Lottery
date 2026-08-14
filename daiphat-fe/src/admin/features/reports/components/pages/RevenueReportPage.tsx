"use client";

import React from 'react';
import { Box, Typography, Grid, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Chip } from '@mui/material';
import Chart from '@/components/ApexChartCompat';
import DashboardCard from "@/admin/components/dashboard/DashboardCard";

const KPI_DATA = [
    { title: "Doanh thu bán vé", total: "1,250,400,000 ₫", subtitle: "Trong kỳ đang xem", color: "#22C55E" },
    { title: "Tiền đã thu", total: "950,000,000 ₫", subtitle: "Đã thu trong kỳ", color: "#00B8D9" },
    { title: "Tiền chờ đối soát", total: "300,400,000 ₫", subtitle: "Đang chờ đối soát", color: "#FFAB00" },
    { title: "Số phiếu đối soát", total: "12", subtitle: "Tổng phiếu trong kỳ", color: "#FF3030" }
];

const DAILY_REVENUE = {
    dates: ["01/08", "02/08", "03/08", "04/08", "05/08", "06/08", "07/08"],
    data: [120, 150, 180, 140, 190, 210, 250] // in millions
};

const REVENUE_VS_RECONCILIATION = {
    stations: ["TP.HCM", "Đồng Tháp", "Cà Mau", "Bến Tre", "Vũng Tàu"],
    collected: [450, 300, 250, 280, 320], // in millions
    pending: [50, 80, 30, 40, 60] // in millions
};

const RECONCILIATION_STATUS = [
    { label: "Đang mở", value: 5, color: '#00B8D9' },
    { label: "Đã khớp", value: 18, color: '#36B37E' },
    { label: "Có chênh lệch", value: 2, color: '#FF3030' }
];

const STATION_REVENUE = [
    { station: "TP.HCM", tickets: "50,000", revenue: "500,000,000 ₫" },
    { station: "Đồng Tháp", tickets: "30,000", revenue: "300,000,000 ₫" },
    { station: "Cà Mau", tickets: "25,000", revenue: "250,000,000 ₫" },
    { station: "Bến Tre", tickets: "28,000", revenue: "280,000,000 ₫" },
    { station: "Vũng Tàu", tickets: "32,000", revenue: "320,000,000 ₫" },
];

const RECONCILIATION_TABLE = [
    { target: "Đại lý Hùng Phát", type: "Người bán vé số", period: "Kỳ 08/2026", amount: "50,000,000 ₫", status: "Có chênh lệch" },
    { target: "Nhà cung cấp XSKT TP.HCM", type: "Nhà cung cấp", period: "Kỳ 08/2026", amount: "500,000,000 ₫", status: "Đang mở" },
    { target: "Đại lý Minh Ngọc", type: "Người bán vé số", period: "Kỳ 08/2026", amount: "30,000,000 ₫", status: "Đã khớp" },
];

export const RevenueReportPage = () => {
    const dailyRevenueOptions: any = {
        chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
        xaxis: { categories: DAILY_REVENUE.dates, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { formatter: (val: number) => `${val} Tr` } },
        colors: ['#22C55E'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        grid: { strokeDashArray: 3, borderColor: 'var(--palette-divider)' },
    };

    const revVsReconciliationOptions: any = {
        chart: { type: 'bar', stacked: false, toolbar: { show: false }, fontFamily: 'inherit' },
        plotOptions: { bar: { horizontal: false, columnWidth: '55%', borderRadius: 4 } },
        xaxis: { categories: REVENUE_VS_RECONCILIATION.stations, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { formatter: (val: number) => `${val} Tr` } },
        colors: ['#00B8D9', '#FFAB00'],
        legend: { position: 'top', horizontalAlign: 'right' },
        dataLabels: { enabled: false },
        grid: { strokeDashArray: 3, borderColor: 'var(--palette-divider)' },
    };

    const reconciliationStatusOptions: any = {
        labels: RECONCILIATION_STATUS.map(s => s.label),
        colors: RECONCILIATION_STATUS.map(s => s.color),
        legend: { position: 'bottom', horizontalAlign: 'center' },
        dataLabels: { enabled: false },
        plotOptions: { pie: { donut: { size: '75%' } } }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>Doanh thu & Đối soát</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Theo dõi dòng tiền, doanh thu bán vé và tiến độ đối soát các bên.</Typography>
            </Box>

            <Grid container spacing={3}>
                {KPI_DATA.map((kpi, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                        <DashboardCard sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>
                                {kpi.title}
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: kpi.color }}>
                                {kpi.total}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                {kpi.subtitle}
                            </Typography>
                        </DashboardCard>
                    </Grid>
                ))}

                <Grid size={{ xs: 12, md: 8 }}>
                    <DashboardCard sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Doanh thu bán vé theo ngày</Typography>
                        <Chart options={dailyRevenueOptions} series={[{ name: 'Doanh thu', data: DAILY_REVENUE.data }]} type="area" height={320} />
                    </DashboardCard>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <DashboardCard sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Trạng thái đối soát</Typography>
                        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Chart options={reconciliationStatusOptions} series={RECONCILIATION_STATUS.map(s => s.value)} type="donut" height={280} />
                        </Box>
                    </DashboardCard>
                </Grid>

                <Grid size={{ xs: 12, lg: 8 }}>
                    <DashboardCard sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Tiền thu và tiền cần đối soát theo đài</Typography>
                        <Chart
                            options={revVsReconciliationOptions}
                            series={[
                                { name: 'Tiền đã thu', data: REVENUE_VS_RECONCILIATION.collected },
                                { name: 'Chờ đối soát', data: REVENUE_VS_RECONCILIATION.pending }
                            ]}
                            type="bar"
                            height={320}
                        />
                    </DashboardCard>
                </Grid>

                <Grid size={{ xs: 12, lg: 4 }}>
                    <DashboardCard sx={{ height: '100%' }}>
                        <Box sx={{ p: 3, pb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Doanh thu theo đài</Typography>
                        </Box>
                        <TableContainer sx={{ px: 3, pb: 3 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ '& th': { borderBottom: '1px dashed var(--palette-divider)', color: 'text.secondary', fontWeight: 600 } }}>
                                        <TableCell>Đài / Tỉnh</TableCell>
                                        <TableCell align="right">Vé bán</TableCell>
                                        <TableCell align="right">Doanh thu</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {STATION_REVENUE.map((row, index) => (
                                        <TableRow key={index} sx={{ '& td': { borderBottom: '1px dashed var(--palette-divider)', py: 1.5 } }}>
                                            <TableCell sx={{ fontWeight: 600 }}>{row.station}</TableCell>
                                            <TableCell align="right" sx={{ color: 'text.secondary' }}>{row.tickets}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: 'text.primary' }}>{row.revenue}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </DashboardCard>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <DashboardCard>
                        <Box sx={{ p: 3, pb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Phiếu đối soát (Nhà cung cấp & Người bán vé)</Typography>
                        </Box>
                        <TableContainer sx={{ px: 3, pb: 3 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ '& th': { borderBottom: '1px dashed var(--palette-divider)', color: 'text.secondary', fontWeight: 600 } }}>
                                        <TableCell>Đối tượng</TableCell>
                                        <TableCell>Phân loại</TableCell>
                                        <TableCell>Kỳ</TableCell>
                                        <TableCell align="right">Chênh lệch / Cần thanh toán</TableCell>
                                        <TableCell>Trạng thái</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {RECONCILIATION_TABLE.map((row, index) => {
                                        const isError = row.status === 'Có chênh lệch';
                                        const isSuccess = row.status === 'Đã khớp';
                                        return (
                                            <TableRow key={index} sx={{ '& td': { borderBottom: '1px dashed var(--palette-divider)', py: 1.5 } }}>
                                                <TableCell sx={{ fontWeight: 600 }}>{row.target}</TableCell>
                                                <TableCell sx={{ color: 'text.secondary' }}>{row.type}</TableCell>
                                                <TableCell sx={{ color: 'text.secondary' }}>{row.period}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600, color: isError ? 'error.main' : 'inherit' }}>
                                                    {row.amount}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={row.status}
                                                        color={isError ? 'error' : isSuccess ? 'success' : 'info'}
                                                        sx={{ fontWeight: 600, height: 24 }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </DashboardCard>
                </Grid>
            </Grid>
        </Box>
    );
};

export default RevenueReportPage;
