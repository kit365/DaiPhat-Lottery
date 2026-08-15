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
    Alert,
    LinearProgress,
    Avatar,
} from "@mui/material";
import SummaryWidget from "@/admin/components/dashboard/SummaryWidget";
import { useRouter } from "next/navigation";
import DashboardCard from "@/admin/components/dashboard/DashboardCard";
import { ROUTES } from "@/admin/constants/routes";
import { EllipsisText } from "@/shared/components/EllipsisText";
import Chart from "@/components/ApexChartCompat";
import type { ApexOptions } from "apexcharts";
import { useEcommerceOverview } from "@/admin/features/dashboard/hooks/useDashboard";
import type {
    AdminEcommerceNamedCount,
    AdminEcommerceOverview,
    AdminEcommerceRecentOrder,
    AdminEcommerceStationRisk,
    AdminEcommerceTopCustomer,
    AdminEcommerceTopStation,
    AdminEcommerceTrendPoint,
    AdminEcommerceVendorRisk,
} from "@/admin/features/dashboard/services/dashboardService";
import { EMPTY_ECOMMERCE_OVERVIEW } from "@/admin/features/dashboard/services/dashboardService";
import { DEMO_KPI_SPARKLINES } from "@/admin/features/dashboard/services/ecommerceDemoData";
import dayjs from "dayjs";

const VI_NUMBER_FORMATTER = new Intl.NumberFormat("vi-VN");

const formatCount = (value: number | null | undefined) =>
    VI_NUMBER_FORMATTER.format(value ?? 0);

const formatCurrency = (value: number | null | undefined) =>
    `${VI_NUMBER_FORMATTER.format(value ?? 0)}\u00A0đ`;

const ACTION_COLORS = ["#FFAB00", "#00B8D9", "#8E33FF", "#FF5630", "#22C55E"];
const ORDER_COLORS = ["#FFAB00", "#00B8D9", "#8E33FF", "#22C55E", "#FF5630", "#637381"];
const SERIAL_COLORS = ["#22C55E", "#FFAB00", "#00B8D9", "#8E33FF", "#FF5630", "#637381"];

type ChipTone = { bg: string; color: string };

const toneForLabel = (label: string): ChipTone => {
    const s = (label || "").toLowerCase();
    if (s.includes("cao") || s.includes("hủy") || s.includes("hết hạn") || s.includes("cần xử")) {
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

const donutOptions = (labels: string[], colors: string[], unit: string, totalLabel: string, totalValue: string): ApexOptions => ({
    chart: { type: "donut", toolbar: { show: false } },
    labels,
    dataLabels: { enabled: false },
    legend: { position: "bottom" as const, fontSize: "12px", fontWeight: 600 },
    colors,
    stroke: { width: 2 },
    tooltip: { y: { formatter: (val: number) => `${formatCount(val)} ${unit}` } },
    plotOptions: {
        pie: {
            donut: {
                size: "74%",
                labels: {
                    show: true,
                    name: { show: true, fontSize: "12px", color: "var(--palette-text-secondary)" },
                    value: { show: true, fontSize: "20px", fontWeight: 700, color: "var(--palette-text-primary)" },
                    total: {
                        show: true,
                        label: totalLabel,
                        fontSize: "12px",
                        color: "var(--palette-text-secondary)",
                        formatter: () => totalValue,
                    },
                },
            },
        },
    },
});

const ActionItemPanel = ({ data }: { data: AdminEcommerceNamedCount[] }) => {
    if (data.length === 0) {
        return <EmptyCard title="Việc cần xử lý" message="Không có việc tồn đọng" />;
    }

    const total = data.reduce((sum, item) => sum + (item.count || 0), 0);

    return (
        <DashboardCard sx={{ p: 3, height: "100%" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 2.5 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.125rem" }}>
                        Việc cần xử lý
                    </Typography>
                    <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)" }}>
                        Tồn đọng cần nhân sự theo dõi
                    </Typography>
                </Box>
                <Typography sx={{ fontFamily: "Barlow, sans-serif", fontWeight: 700, fontSize: "1.5rem" }}>
                    {formatCount(total)}
                </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {data.map((item, index) => {
                    const color = ACTION_COLORS[index % ACTION_COLORS.length];
                    const pct = total > 0 ? Math.round(((item.count || 0) / total) * 100) : 0;
                    return (
                        <Box key={item.type || item.label}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, mb: 0.75 }}>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <EllipsisText sx={{ fontWeight: 600, fontSize: "0.813rem" }}>
                                        {item.label || item.type}
                                    </EllipsisText>
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, color, fontSize: "0.813rem", whiteSpace: "nowrap", flexShrink: 0 }}>
                                    {formatCount(item.count)}
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={pct}
                                sx={{
                                    height: 8,
                                    borderRadius: 99,
                                    bgcolor: "rgba(145, 158, 171, 0.16)",
                                    "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 99 },
                                }}
                            />
                        </Box>
                    );
                })}
            </Box>
        </DashboardCard>
    );
};

const OrderDistributionDonut = ({ data }: { data: AdminEcommerceNamedCount[] }) => {
    if (data.length === 0) {
        return <EmptyCard title="Trạng thái đơn hàng" message="Chưa có đơn hàng" />;
    }

    const total = data.reduce((sum, item) => sum + (item.count || 0), 0);

    return (
        <DashboardCard sx={{ p: 3, pb: "20px", height: "100%" }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.125rem" }}>
                Trạng thái đơn hàng
            </Typography>
            <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", display: "block", mb: 1 }}>
                Toàn bộ vòng đời đơn
            </Typography>
            <Chart
                options={donutOptions(
                    data.map((item) => item.label || item.type),
                    ORDER_COLORS,
                    "đơn",
                    "Tổng đơn",
                    formatCount(total),
                )}
                series={data.map((item) => item.count || 0)}
                type="donut"
                height={280}
            />
        </DashboardCard>
    );
};

const InventoryRiskBarChart = ({ data }: { data: AdminEcommerceStationRisk[] }) => {
    if (data.length === 0) {
        return <EmptyCard title="Tồn vé theo đài" message="Chưa có dữ liệu tồn vé kỳ tới" />;
    }

    const chartHeight = Math.max(280, data.length * 72);
    const chartOptions: ApexOptions = {
        chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
        plotOptions: { bar: { horizontal: true, barHeight: "60%", borderRadius: 6 } },
        dataLabels: { enabled: false },
        stroke: { show: true, width: 2, colors: ["transparent"] },
        xaxis: {
            categories: data.map((item) => item.stationName),
            labels: { style: { colors: "var(--palette-text-secondary)", fontSize: "12px", fontWeight: 500 } },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: { labels: { style: { colors: "var(--palette-text-primary)", fontSize: "12px", fontWeight: 600 } } },
        colors: ["#FF5630", "#00B8D9"],
        tooltip: {
            theme: "dark",
            y: {
                formatter: (val: number, opts: { dataPointIndex?: number }) => {
                    const item = data[opts?.dataPointIndex ?? 0];
                    const riskText = item?.risk ? ` • Rủi ro: ${item.risk}` : "";
                    return `${val?.toLocaleString("vi-VN") || 0} vé${riskText}`;
                },
            },
        },
        legend: {
            position: "top",
            horizontalAlign: "right",
            fontSize: "12px",
            fontWeight: 600,
            labels: { colors: "var(--palette-text-primary)" },
        },
        grid: { strokeDashArray: 3, borderColor: "var(--palette-divider)", padding: { right: 32, left: 20 } },
    };

    return (
        <DashboardCard sx={{ height: "100%" }}>
            <Box sx={{ p: 3, pb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.125rem" }}>
                    Vé có thể bán và vé người bán đang giữ
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.25 }}>
                    {data.map((item) => (
                        <StatusChip key={item.stationId} label={`${item.stationName}: ${item.risk}`} />
                    ))}
                </Box>
            </Box>
            <Box sx={{ minHeight: chartHeight, px: { xs: 2, md: 3 }, pt: 1, pb: 3 }}>
                <Chart
                    options={chartOptions}
                    series={[
                        { name: "Vé người bán giữ", data: data.map((item) => item.vendorHeldQuantity) },
                        { name: "Vé còn bán", data: data.map((item) => item.sellableQuantity) },
                    ]}
                    type="bar"
                    height={chartHeight}
                />
            </Box>
        </DashboardCard>
    );
};

const VendorRiskTable = ({ data }: { data: AdminEcommerceVendorRisk[] }) => {
    if (data.length === 0) {
        return <EmptyCard title="Rủi ro người bán" message="Không có người bán đang giữ vé" />;
    }

    return (
        <DashboardCard sx={{ height: "100%" }}>
            <Box sx={{ p: 3, pb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.125rem" }}>
                    Rủi ro người bán
                </Typography>
                <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)" }}>
                    Vé đang nằm ngoài kho
                </Typography>
            </Box>
            <TableContainer sx={{ px: 3, pb: 3 }}>
                <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                    <TableHead>
                        <TableRow sx={tableHeadSx}>
                            <TableCell>Người bán</TableCell>
                            <TableCell align="right" sx={{ width: 110 }}>Vé đang giữ</TableCell>
                            <TableCell sx={{ width: 128 }}>Trạng thái</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.vendorName} sx={tableRowSx}>
                                <TableCell sx={{ fontWeight: 600, fontSize: "0.813rem" }}>
                                    <EllipsisText sx={{ fontWeight: 600, fontSize: "0.813rem" }}>
                                        {item.vendorName}
                                    </EllipsisText>
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.813rem", whiteSpace: "nowrap" }}>
                                    {formatCount(item.heldQuantity)}{"\u00A0"}vé
                                </TableCell>
                                <TableCell>
                                    <StatusChip label={item.status || "—"} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </DashboardCard>
    );
};

const DailyRevenueChart = ({ data }: { data: AdminEcommerceTrendPoint[] }) => {
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
        stroke: { curve: "smooth", width: 3 },
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
                        Đơn hoàn tất theo ngày
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

const TopStationsChart = ({ data }: { data: AdminEcommerceTopStation[] }) => {
    if (data.length === 0) {
        return <EmptyCard title="Đài bán chạy" message="Chưa có vé bán theo đài" />;
    }

    const chartOptions: ApexOptions = {
        chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
        plotOptions: { bar: { borderRadius: 8, columnWidth: "46%", distributed: true } },
        xaxis: {
            categories: data.map((item) => item.stationName),
            labels: { style: { fontSize: "11px", colors: "var(--palette-text-secondary)" } },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        colors: ["#EE1314", "#FF5630", "#FFAB00", "#00B8D9", "#22C55E"],
        legend: { show: false },
        dataLabels: { enabled: false },
        grid: { strokeDashArray: 3, borderColor: "var(--palette-divider)" },
        tooltip: { y: { formatter: (val: number) => `${formatCount(val)} vé` } },
    };

    return (
        <DashboardCard sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.125rem", mb: 0.5 }}>
                Đài bán chạy
            </Typography>
            <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", display: "block", mb: 2 }}>
                Vé đã bán theo đài
            </Typography>
            <Chart options={chartOptions} series={[{ name: "Vé đã bán", data: data.map((item) => item.soldQuantity) }]} type="bar" height={280} />
        </DashboardCard>
    );
};

const RANK_COLORS = ["#FFAB00", "#919EAB", "#CD7F32"];

const TopCustomersTable = ({ data }: { data: AdminEcommerceTopCustomer[] }) => {
    if (data.length === 0) {
        return <EmptyCard title="Khách chi nhiều" message="Chưa có khách hàng có đơn hoàn tất" />;
    }

    return (
        <DashboardCard sx={{ height: "100%" }}>
            <Box sx={{ p: 3, pb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.125rem" }}>
                    Khách chi nhiều nhất
                </Typography>
            </Box>
            <TableContainer sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}>
                <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                    <TableHead>
                        <TableRow sx={tableHeadSx}>
                            <TableCell>Khách hàng</TableCell>
                            <TableCell align="right" sx={{ width: 76 }}>Số đơn</TableCell>
                            <TableCell align="right" sx={{ width: 128 }}>Tổng chi</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((item, index) => (
                            <TableRow key={item.customerName} sx={tableRowSx}>
                                <TableCell>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
                                        <Avatar
                                            sx={{
                                                width: 28,
                                                height: 28,
                                                flexShrink: 0,
                                                fontSize: "0.75rem",
                                                fontWeight: 700,
                                                bgcolor: RANK_COLORS[index] ?? "rgba(145,158,171,0.24)",
                                                color: index < 3 ? "#fff" : "var(--palette-text-primary)",
                                            }}
                                        >
                                            {index + 1}
                                        </Avatar>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <EllipsisText sx={{ fontWeight: 600, fontSize: "0.813rem" }}>
                                                {item.customerName || "Khách lẻ"}
                                            </EllipsisText>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: "0.813rem", whiteSpace: "nowrap" }}>
                                    {formatCount(item.orderCount)}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.813rem", whiteSpace: "nowrap" }}>
                                    <EllipsisText sx={{ fontWeight: 700, fontSize: "0.813rem", textAlign: "right" }}>
                                        {formatCurrency(item.totalSpent)}
                                    </EllipsisText>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </DashboardCard>
    );
};

const SerialDistributionDonut = ({ data }: { data: AdminEcommerceNamedCount[] }) => {
    if (data.length === 0) {
        return <EmptyCard title="Tồn serial" message="Chưa có serial trong kho" />;
    }

    const total = data.reduce((sum, item) => sum + (item.count || 0), 0);

    return (
        <DashboardCard sx={{ p: 3, pb: "20px", height: "100%" }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.125rem" }}>
                Phân bố serial vé
            </Typography>
            <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)", display: "block", mb: 1 }}>
                Trạng thái từng tờ vé
            </Typography>
            <Chart
                options={donutOptions(
                    data.map((item) => item.label || item.type),
                    SERIAL_COLORS,
                    "vé",
                    "Tổng serial",
                    formatCount(total),
                )}
                series={data.map((item) => item.count || 0)}
                type="donut"
                height={280}
            />
        </DashboardCard>
    );
};

const RecentOrdersTable = ({ data }: { data: AdminEcommerceRecentOrder[] }) => {
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

const KpiGrid = ({ data, isDemo }: { data: AdminEcommerceOverview; isDemo: boolean }) => {
    const { summary } = data;
    const revenueSpark = data.dailyRevenue.length
        ? data.dailyRevenue.map((point) => point.amount)
        : DEMO_KPI_SPARKLINES.revenueMonth;

    return (
        <Grid container spacing={3} alignItems="stretch">
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <SummaryWidget
                    title="Vé đang mở bán"
                    total={formatCount(summary.totalTickets)}
                    percent={8.2}
                    color="#8E33FF"
                    chartData={isDemo ? DEMO_KPI_SPARKLINES.openTickets : [0, 0]}
                    hideTrend={!isDemo}
                    subtitle="Sản phẩm vé còn active"
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <SummaryWidget
                    title="Vé đã bán tháng này"
                    total={formatCount(data.soldTicketsThisMonth)}
                    percent={10.8}
                    color="#00B8D9"
                    chartData={isDemo ? DEMO_KPI_SPARKLINES.soldMonth : [0, 0]}
                    hideTrend={!isDemo}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <SummaryWidget
                    title="Doanh thu tháng"
                    total={formatCurrency(summary.monthlyRevenue)}
                    percent={Number(summary.revenueMonthPercent) || 0}
                    color="#22C55E"
                    chartData={revenueSpark}
                    hideTrend={!summary.revenueMonthPercent}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <SummaryWidget
                    title="Tổng đơn hàng"
                    total={formatCount(summary.totalOrders)}
                    percent={5.4}
                    color="#FF4842"
                    chartData={isDemo ? DEMO_KPI_SPARKLINES.totalOrders : [0, 0]}
                    hideTrend={!isDemo}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <SummaryWidget
                    title="Đơn trong tháng"
                    total={formatCount(data.ordersThisMonth)}
                    percent={6.1}
                    color="#FFAB00"
                    chartData={isDemo ? DEMO_KPI_SPARKLINES.ordersMonth : [0, 0]}
                    hideTrend={!isDemo}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <SummaryWidget
                    title="Doanh thu tất cả"
                    total={formatCurrency(data.allTimeRevenue)}
                    percent={4.2}
                    color="#00A76F"
                    chartData={isDemo ? DEMO_KPI_SPARKLINES.allTimeRevenue : [0, 0]}
                    hideTrend={!isDemo}
                />
            </Grid>
        </Grid>
    );
};

export const EcommercePage = () => {
    const router = useRouter();
    const { data, isLoading, isError, refetch, isFetching } = useEcommerceOverview();
    const overview = data?.overview ?? EMPTY_ECOMMERCE_OVERVIEW;
    const isDemo = data?.isDemo ?? false;

    return (
        <Grid container spacing={3} alignItems="stretch">
            {isDemo && !isLoading ? (
                <Grid size={12}>
                    <Alert
                        severity="info"
                        sx={{
                            borderRadius: 2,
                            bgcolor: "rgba(0, 184, 217, 0.08)",
                            color: "var(--palette-text-primary)",
                            "& .MuiAlert-icon": { color: "#006C9C" },
                        }}
                    >
                        Đang dùng dữ liệu mẫu. Khi API `/admin/dashboard/ecommerce/overview` có số liệu thật, trang sẽ tự chuyển sang dữ liệu live.
                    </Alert>
                </Grid>
            ) : null}

            {isLoading ? (
                <Grid size={12} sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                    <CircularProgress />
                </Grid>
            ) : isError ? (
                <Grid size={12}>
                    <DashboardCard sx={{ p: 4, textAlign: "center" }}>
                        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                            Không tải được thống kê bán hàng
                        </Typography>
                        <Button variant="outlined" onClick={() => refetch()}>
                            Thử lại
                        </Button>
                    </DashboardCard>
                </Grid>
            ) : (
                <>
                    <Grid size={12}>
                        <KpiGrid data={overview} isDemo={isDemo} />
                    </Grid>

                    <Grid size={12}>
                        <DailyRevenueChart data={overview.dailyRevenue} />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <ActionItemPanel data={overview.actionItems} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <InventoryRiskBarChart data={overview.inventoryRisks} />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <OrderDistributionDonut data={overview.orderDistribution} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <SerialDistributionDonut data={overview.serialDistribution} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TopStationsChart data={overview.topStations} />
                    </Grid>

                    <Grid size={{ xs: 12, lg: 7 }}>
                        <VendorRiskTable data={overview.vendorRisks} />
                    </Grid>
                    <Grid size={{ xs: 12, lg: 5 }}>
                        <TopCustomersTable data={overview.topCustomers} />
                    </Grid>

                    <Grid size={12}>
                        <RecentOrdersTable data={overview.recentOrders} />
                    </Grid>
                </>
            )}

            <Grid size={12} sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                    variant="text"
                    onClick={() => router.push(ROUTES.ADMIN.REPORTS.REVENUE)}
                    sx={{ fontWeight: 600 }}
                    disabled={isFetching}
                >
                    Xem báo cáo doanh thu & đối soát →
                </Button>
            </Grid>
        </Grid>
    );
};

export default EcommercePage;
