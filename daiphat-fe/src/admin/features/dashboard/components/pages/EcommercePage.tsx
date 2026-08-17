"use client";

import {
    Grid,
    Box,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableContainer,
    CircularProgress,
    Chip,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";
import DashboardCard from "@/admin/components/dashboard/DashboardCard";
import { ROUTES } from "@/admin/constants/routes";
import { EllipsisText } from "@/admin/components/ui/EllipsisText";
import { AdminDatePicker } from "@/admin/components/ui/AdminDatePicker";
import Chart from "@/components/ApexChartCompat";
import type { ApexOptions } from "apexcharts";
import { useAdminDashboard } from "@/admin/features/dashboard/hooks/useAdminDashboard";
import type {
    AdminDashboardKpis,
    AdminDashboardDailyRevenuePoint,
    AdminDashboardSerialStatus,
    AdminDashboardTopStation,
    AdminDashboardRecentOrder,
    AdminDashboardReconciliation,
} from "@/admin/features/dashboard/types/admin-dashboard.type";
import dayjs from "dayjs";

const VI_NUMBER_FORMATTER = new Intl.NumberFormat("vi-VN");

const formatCount = (value: number | null | undefined) =>
    VI_NUMBER_FORMATTER.format(value ?? 0);

const formatCurrency = (value: number | null | undefined) =>
    `${VI_NUMBER_FORMATTER.format(value ?? 0)}\u00A0đ`;

const getBusinessDate = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

const getTopStationsFromDate = (businessDate: string) =>
    dayjs(businessDate).subtract(13, "day").format("YYYY-MM-DD");

const DashboardDateFilter = ({
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,
    error,
}: {
    fromDate: string;
    toDate: string;
    onFromDateChange: (value: string) => void;
    onToDateChange: (value: string) => void;
    error?: string;
}) => (
    <DashboardCard sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: { xs: "stretch", lg: "center" }, justifyContent: "space-between", gap: 2, flexDirection: { xs: "column", lg: "row" } }}>
            <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Khoảng ngày kinh doanh
                </Typography>
                <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)" }}>
                    Chọn khoảng thời gian để xem số liệu bán vé, doanh thu và các biểu đồ liên quan.
                </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, width: { xs: "100%", lg: 500 }, flexShrink: 0, flexWrap: { xs: "wrap", sm: "nowrap" } }}>
                <AdminDatePicker
                    label="Từ ngày"
                    value={fromDate}
                    onChange={onFromDateChange}
                    max={toDate || undefined}
                    required
                    allowInput
                    error={Boolean(error)}
                />
                <AdminDatePicker
                    label="Đến ngày"
                    value={toDate}
                    onChange={onToDateChange}
                    min={fromDate || undefined}
                    max={getBusinessDate()}
                    required
                    allowInput
                    error={Boolean(error)}
                    helperText={error}
                    helperTextColor="error"
                />
            </Box>
        </Box>
    </DashboardCard>
);

const SERIAL_COLORS = ["#22C55E", "#FFAB00", "#00B8D9", "#8E33FF", "#FF5630", "#637381"];

type ChipTone = { bg: string; color: string };

const toneForLabel = (label: string): ChipTone => {
    const s = (label || "").toLowerCase();
    if (s.includes("cao") || s.includes("hủy") || s.includes("hết hạn") || s.includes("hết vé") || s.includes("cần xử")) {
        return { bg: "rgba(255, 86, 48, 0.16)", color: "#B71D18" };
    }
    if (s.includes("trung bình") || s.includes("chờ kiểm")) {
        return { bg: "rgba(255, 171, 0, 0.16)", color: "#B76E00" };
    }
    if (s.includes("hoàn") || s.includes("thấp") || s.includes("đã bán") || s.includes("trong kho")) {
        return { bg: "rgba(34, 197, 94, 0.16)", color: "#118D57" };
    }
    if (s.includes("chờ") || s.includes("chuẩn bị") || s.includes("giữ") || s.includes("thanh toán")) {
        return { bg: "rgba(0, 184, 217, 0.16)", color: "#006C9C" };
    }
    return { bg: "rgba(145, 158, 171, 0.16)", color: "#637381" };
};

const StatusChip = ({ label }: { label: string }) => {
    const tone = toneForLabel(label);
    return (
        <Chip
            label={label || "—"}
            size="small"
            title={label || "—"}
            sx={{
                height: 24,
                maxWidth: "100%",
                fontWeight: 700,
                fontSize: "0.7rem",
                bgcolor: tone.bg,
                color: tone.color,
                "& .MuiChip-label": {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    px: 1,
                },
            }}
        />
    );
};

const tableHeadSx = {
    "& th": {
        borderBottom: "1px dashed var(--palette-divider)",
        color: "var(--palette-text-secondary)",
        fontWeight: 600,
        fontSize: "0.75rem",
        whiteSpace: "nowrap",
    },
};

const tableRowSx = {
    "& td": {
        borderBottom: "1px dashed var(--palette-divider)",
        py: 1.5,
        whiteSpace: "nowrap",
        verticalAlign: "middle",
    },
};

const EmptyCard = ({ title, message }: { title?: string; message: string }) => (
    <DashboardCard sx={{ height: "100%", minHeight: 220, p: 3, display: "flex", flexDirection: "column" }}>
        {title ? (
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.125rem", mb: 2 }}>
                {title}
            </Typography>
        ) : null}
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)", fontWeight: 500 }}>
                {message}
            </Typography>
        </Box>
    </DashboardCard>
);

const DailyRevenueChart = ({ data, loading }: { data: AdminDashboardDailyRevenuePoint[]; loading: boolean }) => {
    if (loading) {
        return <EmptyCard title="Doanh thu 14 ngày gần nhất" message="Đang tải dữ liệu doanh thu" />;
    }
    if (data.length === 0) {
        return <EmptyCard title="Doanh thu 14 ngày" message="Chưa có giao dịch hoàn tất" />;
    }

    const chartOptions: ApexOptions = {
        chart: { type: "area", toolbar: { show: false }, fontFamily: "inherit" },
        xaxis: {
            categories: data.map((point) => point.date),
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: { style: { colors: "var(--palette-text-secondary)", fontSize: "11px" } },
        },
        yaxis: {
            labels: {
                formatter: (val: number) => (val >= 1_000_000 ? `${(val / 1_000_000).toFixed(1)}tr` : formatCount(val)),
                style: { colors: "var(--palette-text-secondary)", fontSize: "11px" },
            },
        },
        colors: ["#22C55E"],
        dataLabels: { enabled: false },
        stroke: { curve: "straight", width: 3 },
        fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.38, opacityTo: 0.02, stops: [0, 100] } },
        grid: { strokeDashArray: 3, borderColor: "var(--palette-divider)" },
        tooltip: { y: { formatter: (val: number) => formatCurrency(val) } },
        markers: { size: 3, strokeWidth: 0, hover: { size: 5 } },
    };

    return (
        <DashboardCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.125rem" }}>
                        Doanh thu 14 ngày gần nhất
                    </Typography>
                    <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)" }}>
                        Đơn hàng hoàn tất theo ngày kinh doanh
                    </Typography>
                </Box>
                <Typography sx={{ fontFamily: "Barlow, sans-serif", fontWeight: 700, color: "#118D57" }}>
                    {formatCurrency(data.reduce((sum, point) => sum + point.amount, 0))}
                </Typography>
            </Box>
            <Chart options={chartOptions} series={[{ name: "Doanh thu", data: data.map((point) => point.amount) }]} type="area" height={280} />
        </DashboardCard>
    );
};

interface TopStationsLeaderboardProps {
    data: AdminDashboardTopStation[];
    loading: boolean;
}

const TopStationsLeaderboard = ({
    data,
    loading,
}: TopStationsLeaderboardProps) => {
    const sorted = [...data]
        .sort((a, b) => (b.soldQuantity || 0) - (a.soldQuantity || 0))
        .slice(0, 5);
    const maxSold = Math.max(...sorted.map((item) => item.soldQuantity || 0), 1);

    return (
        <DashboardCard sx={{ p: 3 }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: { xs: "stretch", lg: "flex-start" },
                    justifyContent: "space-between",
                    gap: 2,
                    flexDirection: { xs: "column", lg: "row" },
                    mb: 2,
                }}
            >
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.125rem", mb: 0.5 }}>
                        Đài có số vé bán nhiều nhất
                    </Typography>
                    <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)" }}>
                        Xếp hạng số vé đã bán trong khoảng ngày kinh doanh đã chọn
                    </Typography>
                </Box>
            </Box>

            {loading ? (
                <Box sx={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)", fontWeight: 500 }}>
                        Đang tải dữ liệu theo đài…
                    </Typography>
                </Box>
            ) : data.length === 0 ? (
                <Box sx={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)", fontWeight: 500 }}>
                        Chưa có vé bán trong khoảng ngày này.
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
                    {sorted.map((item, index) => {
                        const soldQuantity = item.soldQuantity || 0;
                        const width = `${Math.max((soldQuantity / maxSold) * 100, soldQuantity > 0 ? 3 : 0)}%`;
                        return (
                            <Box key={item.stationId || item.stationName} sx={{ display: "grid", gridTemplateColumns: { xs: "24px minmax(100px, 0.7fr) minmax(100px, 2fr) 78px", sm: "28px 180px minmax(160px, 1fr) 90px" }, gap: 1.25, alignItems: "center" }}>
                                <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)", fontWeight: 700 }}>
                                    {index + 1}
                                </Typography>
                                <EllipsisText sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                                    {item.stationName || "Không rõ đài"}
                                </EllipsisText>
                                <Box sx={{ height: 10, borderRadius: 99, bgcolor: "rgba(0, 184, 217, 0.12)", overflow: "hidden" }} aria-label={`${item.stationName}: ${formatCount(soldQuantity)} vé`}>
                                    <Box sx={{ width, height: "100%", borderRadius: 99, bgcolor: "#00B8D9" }} />
                                </Box>
                                <Typography variant="body2" sx={{ textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
                                    {formatCount(soldQuantity)} vé
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            )}
        </DashboardCard>
    );
};

const reconciliationStatusLabel = (status: string) => {
    const normalized = (status || "").toUpperCase();
    if (normalized.includes("COMPLETED") || normalized.includes("RESOLVED") || normalized.includes("DONE")) {
        return "Đã xử lý";
    }
    if (normalized.includes("DISCREPANCY") || normalized.includes("MISMATCH")) {
        return "Có chênh lệch";
    }
    if (normalized.includes("MATCHING") || normalized.includes("OPEN") || normalized.includes("PENDING")) {
        return "Đang xử lý";
    }
    return status || "Đang xử lý";
};

const ReconciliationTable = ({ data, loading }: { data: AdminDashboardReconciliation[]; loading: boolean }) => {
    if (loading) {
        return <EmptyCard title="Đối soát cần theo dõi" message="Đang tải dữ liệu đối soát" />;
    }
    if (data.length === 0) {
        return <EmptyCard title="Đối soát cần theo dõi" message="Không có chênh lệch cần xử lý" />;
    }

    return (
        <DashboardCard sx={{ height: "100%" }}>
            <Box sx={{ p: 3, pb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.125rem" }}>
                    Đối soát cần theo dõi
                </Typography>
                <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)" }}>
                    Các kỳ đang có chênh lệch hoặc cần hoàn tất
                </Typography>
            </Box>
            <TableContainer sx={{ px: 3, pb: 3, overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 620 }}>
                    <TableHead>
                        <TableRow sx={tableHeadSx}>
                            <TableCell>Đối tượng</TableCell>
                            <TableCell>Kỳ đối soát</TableCell>
                            <TableCell align="right">Chênh lệch</TableCell>
                            <TableCell>Trạng thái</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.settlementId ?? `${item.subjectType}-${item.subjectName}-${item.periodFrom}`} sx={tableRowSx}>
                                <TableCell sx={{ fontWeight: 600, fontSize: "0.813rem", maxWidth: 210 }}>
                                    <EllipsisText sx={{ fontWeight: 600, fontSize: "0.813rem" }}>
                                        {item.subjectName || "Đối soát"}
                                    </EllipsisText>
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.75rem", color: "var(--palette-text-secondary)", whiteSpace: "nowrap" }}>
                                    {item.periodFrom || item.periodTo
                                        ? `${item.periodFrom ?? "—"} – ${item.periodTo ?? "—"}`
                                        : "—"}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.813rem", whiteSpace: "nowrap" }}>
                                    {formatCurrency(item.discrepancyAmount)}
                                </TableCell>
                                <TableCell>
                                    <StatusChip label={reconciliationStatusLabel(item.status)} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </DashboardCard>
    );
};

const SerialStatusDonut = ({ data, loading }: { data: AdminDashboardSerialStatus[]; loading: boolean }) => {
    if (loading) {
        return <EmptyCard title="Phân bố serial vé" message="Đang tải dữ liệu serial" />;
    }
    if (data.length === 0) {
        return <EmptyCard title="Tồn serial" message="Chưa có serial trong kho" />;
    }

    const sorted = [...data]
        .filter((item) => (item.count || 0) > 0)
        .sort((a, b) => (b.count || 0) - (a.count || 0));
    if (sorted.length === 0) {
        return <EmptyCard title="Trạng thái serial vé" message="Chưa có serial trong kho" />;
    }

    const total = sorted.reduce((sum, item) => sum + (item.count || 0), 0);
    const chartOptions: ApexOptions = {
        chart: { type: "donut", toolbar: { show: false }, fontFamily: "inherit" },
        colors: SERIAL_COLORS,
        dataLabels: { enabled: false },
        legend: { position: "bottom", fontSize: "12px", fontWeight: 600 },
        labels: sorted.map((item) => item.label || item.status),
        stroke: { width: 2 },
        plotOptions: {
            pie: {
                donut: {
                    size: "72%",
                    labels: {
                        show: true,
                        name: { show: true, fontSize: "12px", color: "var(--palette-text-secondary)" },
                        value: { show: true, fontSize: "20px", fontWeight: 700, color: "var(--palette-text-primary)", formatter: (value: string) => `${formatCount(Number(value))} vé` },
                        total: {
                            show: true,
                            label: "Tổng serial",
                            fontSize: "12px",
                            color: "var(--palette-text-secondary)",
                            formatter: () => `${formatCount(total)} vé`,
                        },
                    },
                },
            },
        },
        tooltip: { y: { formatter: (value: number) => `${formatCount(value)} vé` } },
    };

    return (
        <DashboardCard sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.125rem" }}>
                Trạng thái serial vé
            </Typography>
            <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", display: "block", mb: 1 }}>
                Tỷ trọng serial trong toàn bộ kho
            </Typography>
            <Chart options={chartOptions} series={sorted.map((item) => item.count || 0)} type="donut" height={300} />
        </DashboardCard>
    );
};

const RecentOrdersTable = ({ data, loading }: { data: AdminDashboardRecentOrder[]; loading: boolean }) => {
    if (loading) {
        return <EmptyCard title="Đơn hàng gần đây" message="Đang tải dữ liệu đơn hàng" />;
    }
    if (data.length === 0) {
        return <EmptyCard title="Đơn hàng gần đây" message="Chưa có đơn hàng" />;
    }

    return (
        <DashboardCard>
            <Box sx={{ p: 3, pb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.125rem" }}>
                    Đơn hàng gần đây
                </Typography>
            </Box>
            <TableContainer sx={{ px: 3, pb: 3, overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 640 }}>
                    <TableHead>
                        <TableRow sx={tableHeadSx}>
                            <TableCell>Mã đơn</TableCell>
                            <TableCell>Khách hàng</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell align="right">Tổng tiền</TableCell>
                            <TableCell align="right">Thời gian</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.id || item.orderCode} sx={tableRowSx}>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.813rem", fontFamily: "Barlow, sans-serif", maxWidth: 140 }}>
                                    <EllipsisText sx={{ fontWeight: 700, fontSize: "0.813rem", fontFamily: "Barlow, sans-serif" }}>
                                        {item.orderCode || "—"}
                                    </EllipsisText>
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.813rem", maxWidth: 180 }}>
                                    <EllipsisText sx={{ fontSize: "0.813rem" }}>{item.customerName}</EllipsisText>
                                </TableCell>
                                <TableCell>
                                    <StatusChip label={item.status} />
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.813rem", whiteSpace: "nowrap" }}>
                                    {formatCurrency(item.total)}
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: "0.75rem", color: "var(--palette-text-secondary)", whiteSpace: "nowrap" }}>
                                    {item.createdAt ? dayjs(item.createdAt).format("DD/MM HH:mm") : "—"}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </DashboardCard>
    );
};

const KpiCard = ({ title, value, detail, loading }: { title: string; value: string; detail: string; loading: boolean }) => (
    <DashboardCard sx={{ p: 2.5, minHeight: 126, display: "flex", flexDirection: "column" }}>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        <Box sx={{ minHeight: 40, display: "flex", alignItems: "center" }}>
            {loading ? <CircularProgress size={22} /> : <Typography variant="h5" sx={{ fontWeight: 700 }}>{value}</Typography>}
        </Box>
        <Typography variant="caption" color="text.secondary">{detail}</Typography>
    </DashboardCard>
);

const KpiGrid = ({ data, loading }: { data?: AdminDashboardKpis; loading: boolean }) => {
    return (
        <Grid container spacing={3} alignItems="stretch">
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><KpiCard title="Vé đã bán" value={`${formatCount(data?.soldTicketQuantity)} vé`} detail="Theo ngày kinh doanh hiện tại" loading={loading} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><KpiCard title="Doanh thu bán vé" value={formatCurrency(data?.ticketSalesRevenue)} detail="Tổng tiền từ vé đã bán" loading={loading} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}><KpiCard title="Chênh lệch đối soát đang mở" value={formatCurrency(data?.reconciliationAmount)} detail="Khoản cần xử lý, không phải doanh thu" loading={loading} /></Grid>
        </Grid>
    );
};

export const EcommercePage = () => {
    const router = useRouter();
    const initialBusinessDate = getBusinessDate();
    const [businessDateFrom, setBusinessDateFrom] = useState(() => getTopStationsFromDate(initialBusinessDate));
    const [businessDateTo, setBusinessDateTo] = useState(initialBusinessDate);

    const topStationsDateOutOfBusinessRange = Boolean(
        (businessDateFrom && businessDateFrom > businessDateTo) ||
        (businessDateTo && businessDateTo > getBusinessDate()),
    );
    const topStationsRangeTooLong = Boolean(
        businessDateFrom &&
        businessDateTo &&
        dayjs(businessDateTo).diff(dayjs(businessDateFrom), "day") > 365,
    );
    const topStationsDateRangeError = topStationsDateOutOfBusinessRange
        ? businessDateTo > getBusinessDate()
            ? "Ngày kết thúc không được sau ngày hiện tại."
            : "Ngày bắt đầu không được sau ngày kết thúc."
        : topStationsRangeTooLong
            ? "Chỉ có thể xem tối đa 366 ngày trong một lần."
            : undefined;

    // Existing dashboard APIs use businessDate as their single-date anchor;
    // use the selected end date until their range-aware contracts are added.
    const businessDate = businessDateTo;

    const {
        kpis,
        serialStatus,
        topStations,
        recentOrders,
        dailyRevenue,
        reconciliations,
    } = useAdminDashboard(businessDate, {
        includeActionItems: false,
        includeDailyRevenue: true,
        includeReconciliations: false,
        topStationsFromDate: businessDateFrom,
        topStationsToDate: businessDateTo,
        topStationsEnabled: !topStationsDateRangeError,
    });
    const dashboardQueries = [
        kpis,
        serialStatus,
        topStations,
        recentOrders,
        dailyRevenue,
        reconciliations,
    ];
    const isRefreshing = dashboardQueries.some((query) => query.isFetching);

    return (
        <Grid container spacing={3} alignItems="stretch">
            <Grid size={12}>
                <DashboardDateFilter
                    fromDate={businessDateFrom}
                    toDate={businessDateTo}
                    onFromDateChange={setBusinessDateFrom}
                    onToDateChange={setBusinessDateTo}
                    error={topStationsDateRangeError}
                />
            </Grid>

            <Grid size={12}>
                <KpiGrid data={kpis.data} loading={kpis.isLoading} />
            </Grid>

            <Grid size={12}>
                <DailyRevenueChart data={dailyRevenue.data ?? []} loading={dailyRevenue.isLoading} />
            </Grid>

            <Grid size={12}>
                <SerialStatusDonut data={serialStatus.data ?? []} loading={serialStatus.isLoading} />
            </Grid>

            <Grid size={12}>
                <TopStationsLeaderboard
                    data={topStations.data ?? []}
                    loading={topStations.isLoading}
                />
            </Grid>

            <Grid size={12}>
                <RecentOrdersTable data={recentOrders.data ?? []} loading={recentOrders.isLoading} />
            </Grid>

            <Grid size={12} sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                    variant="text"
                    onClick={() => router.push(ROUTES.ADMIN.REPORTS.REVENUE)}
                    sx={{ fontWeight: 600 }}
                    disabled={isRefreshing}
                >
                    Xem báo cáo doanh thu & đối soát →
                </Button>
            </Grid>
        </Grid>
    );
};

export default EcommercePage;
