"use client";

import { Box, Typography, Grid, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Chip } from '@mui/material';
import DashboardCard from '@/admin/components/dashboard/DashboardCard';
import SummaryWidget from "@/admin/components/dashboard/SummaryWidget";
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const KPI_DATA = [
    { title: "Doanh thu ghi nhận", total: "245,000,000 ₫", percent: 0, color: "#00B8D9" },
    { title: "Tiền thu", total: "180,000,000 ₫", percent: 0, color: "#36B37E" },
    { title: "Chờ đối soát", total: "65,000,000 ₫", percent: 0, color: "#FFAB00" },
    { title: "Phiếu cần xử lý", total: "8 phiếu", percent: 0, color: "#FF3030" }
];

const DRAW_SCHEDULE = [
    { id: 1, station: "TP.HCM", drawTime: "16:15 hôm nay", ticketQty: "50,000", cutoff: "15:30", status: "Sắp diễn ra" },
    { id: 2, station: "Đồng Tháp", drawTime: "16:15 hôm nay", ticketQty: "30,000", cutoff: "15:30", status: "Sắp diễn ra" },
    { id: 3, station: "Cà Mau", drawTime: "16:15 hôm nay", ticketQty: "25,000", cutoff: "15:30", status: "Chưa tới hạn" },
];

const TASK_STATUS = [
    { label: "Chờ xử lý", value: 15 },
    { label: "Đang xử lý", value: 8 },
    { label: "Đã xong", value: 42 },
    { label: "Quá hạn", value: 3 }
];

const STATION_PROGRESS = [
    { station: "TP.HCM", completed: 85, pending: 15 },
    { station: "Đồng Tháp", completed: 60, pending: 40 },
    { station: "Cà Mau", completed: 90, pending: 10 }
];

const COMPACT_TASKS = [
    { id: 1, type: "Nhận vé trả (Người bán)", ref: "VT-0813-01", deadline: "16:00", status: "Đang xử lý", isWarning: false },
    { id: 2, type: "Lô nhập cần kiểm tra", ref: "LN-0813-05", deadline: "17:30", status: "Chờ xử lý", isWarning: false },
    { id: 3, type: "Đối soát nhà cung cấp", ref: "DS-0813", deadline: "18:00", status: "Chờ xử lý", isWarning: true },
];

const SHIFT_REVENUE_RECONCILIATION = [
    { id: 1, target: "Đại lý Minh Ngọc", type: "Thu tiền bán vé", amount: "50,000,000 ₫", status: "Đã thu đủ" },
    { id: 2, target: "Nhà cung cấp TP.HCM", type: "Đối soát trả thưởng", amount: "120,000,000 ₫", status: "Chờ xác nhận" },
    { id: 3, target: "Đại lý Hùng Phát", type: "Thu tiền bán vé", amount: "15,000,000 ₫", status: "Thiếu hụt" },
];

const SHIFT_RECONCILIATION_STATUS = [
    { label: "Chờ đối soát", value: 4, color: "#FFAB00" },
    { label: "Đang kiểm tra", value: 3, color: "#00B8D9" },
    { label: "Đã khớp", value: 12, color: "#36B37E" },
    { label: "Có chênh lệch", value: 1, color: "#FF3030" }
];

const SHIFT_CASHFLOW = {
    times: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"],
    recorded: [20, 50, 90, 140, 190, 245], // Doanh thu ghi nhận (triệu VNĐ)
    collected: [10, 35, 70, 100, 150, 180] // Tiền thu (triệu VNĐ)
};

const SHIFT_STATION_STATS = [
    { id: 1, station: "TP.HCM", cutoff: "15:30", tickets: "50,000", revenue: "500,000,000 ₫", status: "Đã khớp" },
    { id: 2, station: "Đồng Tháp", cutoff: "15:30", tickets: "30,000", revenue: "300,000,000 ₫", status: "Đang kiểm tra" },
    { id: 3, station: "Cà Mau", cutoff: "15:30", tickets: "25,000", revenue: "250,000,000 ₫", status: "Chờ đối soát" },
    { id: 4, station: "Bến Tre", cutoff: "15:30", tickets: "28,000", revenue: "280,000,000 ₫", status: "Có chênh lệch" }
];

const SHIFT_MILESTONES = [
    { label: "Giờ nhận vé", time: "14:00" },
    { label: "Giờ chót bàn giao", time: "15:30" },
    { label: "Giờ xổ", time: "16:15" },
];

const SHIFT_STATION_REVENUE = {
    stations: ["TP.HCM", "Đồng Tháp", "Cà Mau", "Bến Tre"],
    revenue: [500, 300, 250, 280] // Triệu VNĐ
};

export const StaffStatisticsPage = () => {
    const taskStatusOptions: any = {
        labels: TASK_STATUS.map(s => s.label),
        colors: ['#00B8D9', '#FFAB00', '#36B37E', '#FF3030'],
        legend: { position: 'bottom', horizontalAlign: 'center' },
        dataLabels: { enabled: false },
        plotOptions: { pie: { donut: { size: '75%' } } }
    };

    const stationProgressOptions: any = {
        chart: { type: 'bar', stacked: true, toolbar: { show: false }, fontFamily: 'inherit' },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '50%' } },
        xaxis: { categories: STATION_PROGRESS.map(s => s.station), labels: { style: { colors: 'var(--palette-text-secondary)', fontWeight: 500 } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { colors: 'var(--palette-text-primary)', fontWeight: 600 } } },
        colors: ['#36B37E', '#FFAB00'],
        legend: { position: 'top', horizontalAlign: 'right' },
        grid: { strokeDashArray: 3, borderColor: 'var(--palette-divider)' },
    };

    const stationProgressSeries = [
        { name: 'Đã xử lý (%)', data: STATION_PROGRESS.map(s => s.completed) },
        { name: 'Chờ xử lý (%)', data: STATION_PROGRESS.map(s => s.pending) }
    ];

    const shiftCashflowOptions: any = {
        chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
        xaxis: { categories: SHIFT_CASHFLOW.times, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { formatter: (val: number) => `${val} Tr` } },
        colors: ['#00B8D9', '#36B37E'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        legend: { position: 'top', horizontalAlign: 'right' },
        grid: { strokeDashArray: 3, borderColor: 'var(--palette-divider)' },
    };

    const shiftReconciliationStatusOptions: any = {
        labels: SHIFT_RECONCILIATION_STATUS.map(s => s.label),
        colors: SHIFT_RECONCILIATION_STATUS.map(s => s.color),
        legend: { position: 'bottom', horizontalAlign: 'center' },
        dataLabels: { enabled: false },
        plotOptions: { pie: { donut: { size: '75%' } } }
    };

    const shiftStationRevenueOptions: any = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'top' } } },
        xaxis: { categories: SHIFT_STATION_REVENUE.stations, axisBorder: { show: false }, axisTicks: { show: false }, labels: { formatter: (val: number) => `${val} Tr` } },
        dataLabels: { enabled: true, formatter: (val: number) => `${val} Tr`, offsetX: 20, style: { fontSize: '12px', colors: ['#333'] } },
        colors: ['#00B8D9'],
        grid: { strokeDashArray: 3, borderColor: 'var(--palette-divider)', xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
            <Box mb={4}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>Tổng quan ca làm việc</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Theo dõi tiến độ xử lý và các hạng mục vận hành xổ số trong ca trực.</Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>
                        Số liệu trong ca hiện tại
                    </Typography>
                </Grid>
                {KPI_DATA.map((kpi, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                        <Box sx={{ height: '100%' }}>
                            <SummaryWidget title={kpi.title} total={kpi.total} percent={kpi.percent} color={kpi.color} chartData={[]} hideTrend={true} />
                        </Box>
                    </Grid>
                ))}

                <Grid size={{ xs: 12 }}>
                    <DashboardCard sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>
                            Mốc vận hành hôm nay
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            {SHIFT_MILESTONES.map((m, index) => (
                                <Chip key={index} label={`${m.label}: ${m.time}`} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                            ))}
                        </Box>
                    </DashboardCard>
                </Grid>

                <Grid size={{ xs: 12, lg: 8 }}>
                    <DashboardCard sx={{ height: '100%' }}>
                        <Box sx={{ p: 3, pb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Lịch xổ số hôm nay</Typography>
                        </Box>
                        <TableContainer sx={{ px: 3, pb: 3 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ '& th': { borderBottom: '1px dashed var(--palette-divider)', color: 'text.secondary', fontWeight: 600 } }}>
                                        <TableCell>Đài / Tỉnh</TableCell>
                                        <TableCell>Giờ xổ</TableCell>
                                        <TableCell align="right">Số lượng vé</TableCell>
                                        <TableCell>Hạn chót bàn giao</TableCell>
                                        <TableCell>Trạng thái</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {DRAW_SCHEDULE.length > 0 ? DRAW_SCHEDULE.map((row) => (
                                        <TableRow key={row.id} sx={{ '& td': { borderBottom: '1px dashed var(--palette-divider)', py: 1.5 } }}>
                                            <TableCell sx={{ fontWeight: 600 }}>{row.station}</TableCell>
                                            <TableCell sx={{ color: 'text.secondary' }}>{row.drawTime}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>{row.ticketQty} vé</TableCell>
                                            <TableCell sx={{ color: 'text.secondary' }}>{row.cutoff}</TableCell>
                                            <TableCell>
                                                <Chip size="small" label={row.status} color={row.status === 'Sắp diễn ra' ? 'warning' : 'default'} sx={{ fontWeight: 600, height: 24 }} />
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>Không có lịch xổ số nào hôm nay.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </DashboardCard>
                </Grid>

                <Grid size={{ xs: 12, lg: 4 }}>
                    <DashboardCard sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Trạng thái công việc trong ca</Typography>
                        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Chart options={taskStatusOptions} series={TASK_STATUS.map(s => s.value)} type="donut" height={280} />
                        </Box>
                    </DashboardCard>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <DashboardCard sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Tiến độ xử lý theo đài</Typography>
                        <Chart options={stationProgressOptions} series={stationProgressSeries} type="bar" height={320} />
                    </DashboardCard>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <DashboardCard sx={{ height: '100%' }}>
                        <Box sx={{ p: 3, pb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Công việc đang theo dõi</Typography>
                        </Box>
                        <TableContainer sx={{ px: 3, pb: 3 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ '& th': { borderBottom: '1px dashed var(--palette-divider)', color: 'text.secondary', fontWeight: 600 } }}>
                                        <TableCell>Loại</TableCell>
                                        <TableCell>Mã</TableCell>
                                        <TableCell>Hạn chót</TableCell>
                                        <TableCell>Trạng thái</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {COMPACT_TASKS.length > 0 ? COMPACT_TASKS.map((row) => (
                                        <TableRow key={row.id} sx={{ '& td': { borderBottom: '1px dashed var(--palette-divider)', py: 1.5 } }}>
                                            <TableCell sx={{ fontWeight: 600 }}>{row.type}</TableCell>
                                            <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{row.ref}</TableCell>
                                            <TableCell sx={{ color: 'text.secondary' }}>{row.deadline}</TableCell>
                                            <TableCell sx={{ color: row.isWarning ? 'error.main' : 'text.secondary', fontWeight: row.isWarning ? 600 : 400 }}>{row.status}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>Không có công việc đang theo dõi.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </DashboardCard>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <DashboardCard sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Doanh thu theo đài trong ca</Typography>
                        <Chart options={shiftStationRevenueOptions} series={[{ name: 'Doanh thu (Triệu VNĐ)', data: SHIFT_STATION_REVENUE.revenue }]} type="bar" height={320} />
                    </DashboardCard>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', mt: 2 }}>
                        Doanh thu & Đối soát trong ca
                    </Typography>
                </Grid>

                <Grid size={{ xs: 12, md: 7, lg: 8 }}>
                    <DashboardCard sx={{ height: '100%', p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Tiến độ dòng tiền</Typography>
                        <Chart
                            options={shiftCashflowOptions}
                            series={[
                                { name: 'Doanh thu ghi nhận', data: SHIFT_CASHFLOW.recorded },
                                { name: 'Tiền thu', data: SHIFT_CASHFLOW.collected }
                            ]}
                            type="area"
                            height={300}
                        />
                    </DashboardCard>
                </Grid>

                <Grid size={{ xs: 12, md: 5, lg: 4 }}>
                    <DashboardCard sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Trạng thái đối soát</Typography>
                        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Chart options={shiftReconciliationStatusOptions} series={SHIFT_RECONCILIATION_STATUS.map(s => s.value)} type="donut" height={280} />
                        </Box>
                    </DashboardCard>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <DashboardCard sx={{ height: '100%' }}>
                        <Box sx={{ p: 3, pb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Giao dịch gần nhất</Typography>
                        </Box>
                        <TableContainer sx={{ px: 3, pb: 3 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ '& th': { borderBottom: '1px dashed var(--palette-divider)', color: 'text.secondary', fontWeight: 600 } }}>
                                        <TableCell>Đối tượng</TableCell>
                                        <TableCell>Loại giao dịch</TableCell>
                                        <TableCell align="right">Số tiền</TableCell>
                                        <TableCell>Trạng thái</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {SHIFT_REVENUE_RECONCILIATION.length > 0 ? SHIFT_REVENUE_RECONCILIATION.map((row) => {
                                        const isError = row.status === 'Thiếu hụt';
                                        const isSuccess = row.status === 'Đã thu đủ';
                                        return (
                                            <TableRow key={row.id} sx={{ '& td': { borderBottom: '1px dashed var(--palette-divider)', py: 1.5 } }}>
                                                <TableCell sx={{ fontWeight: 600 }}>{row.target}</TableCell>
                                                <TableCell sx={{ color: 'text.secondary' }}>{row.type}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600, color: isError ? 'error.main' : 'text.primary' }}>{row.amount}</TableCell>
                                                <TableCell>
                                                    <Chip size="small" label={row.status} color={isError ? 'error' : isSuccess ? 'success' : 'warning'} sx={{ fontWeight: 600, height: 24 }} />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }) : (
                                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>Không có giao dịch đối soát nào trong ca.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </DashboardCard>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <DashboardCard sx={{ height: '100%' }}>
                        <Box sx={{ p: 3, pb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Tình trạng đối soát theo đài (Miền Nam)</Typography>
                        </Box>
                        <TableContainer sx={{ px: 3, pb: 3 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ '& th': { borderBottom: '1px dashed var(--palette-divider)', color: 'text.secondary', fontWeight: 600 } }}>
                                        <TableCell>Đài / Tỉnh</TableCell>
                                        <TableCell>Giờ chót trả vé</TableCell>
                                        <TableCell align="right">Vé thu</TableCell>
                                        <TableCell align="right">Tiền bán</TableCell>
                                        <TableCell>Trạng thái đối soát</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {SHIFT_STATION_STATS.length > 0 ? SHIFT_STATION_STATS.map((row) => {
                                        const isError = row.status === 'Có chênh lệch';
                                        const isSuccess = row.status === 'Đã khớp';
                                        const isWarning = row.status === 'Chờ đối soát';
                                        return (
                                            <TableRow key={row.id} sx={{ '& td': { borderBottom: '1px dashed var(--palette-divider)', py: 1.5 } }}>
                                                <TableCell sx={{ fontWeight: 600 }}>{row.station}</TableCell>
                                                <TableCell sx={{ color: 'text.secondary' }}>{row.cutoff}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>{row.tickets}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600, color: 'text.primary' }}>{row.revenue}</TableCell>
                                                <TableCell>
                                                    <Chip size="small" label={row.status} color={isError ? 'error' : isSuccess ? 'success' : isWarning ? 'warning' : 'info'} sx={{ fontWeight: 600, height: 24 }} />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }) : (
                                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>Không có dữ liệu đài trong ca.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </DashboardCard>
                </Grid>

            </Grid>
        </Box>
    );
};

export default StaffStatisticsPage;
