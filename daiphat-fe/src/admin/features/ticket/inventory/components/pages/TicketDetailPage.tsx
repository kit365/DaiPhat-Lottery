"use client";

import { useMemo, useState } from "react";
import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import {
    Box,
    Button,
    Card,
    Chip,
    Divider,
    Grid,
    IconButton,
    InputAdornment,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import ImageNotSupportedOutlinedIcon from "@mui/icons-material/ImageNotSupportedOutlined";
import ZoomInOutlinedIcon from "@mui/icons-material/ZoomInOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";

import dayjs from "dayjs";
import "dayjs/locale/vi";
import { PageHeader } from "../../../../../components/ui/PageHeader";
import { SpinnerLoading } from "../../../../../components/ui/SpinnerLoading";
import { AdminStatusBadge } from "../../../../../components/ui/AdminStatusBadge";
import { ImagePreview } from "../../../../../components/ui/ImagePreview";
import { prefixAdmin } from "../../../../../constants/routes";
import { useTicketDetail } from "../../hooks/useTicket";
import { useStations } from "../../../../station/hooks/useStation";
import { formatImportBatchCode } from "../../../import-batch/utils/importBatchCode";
import { resolveAvailableTicketQuantity } from "../../utils/ticketQuantity";
import { getTicketStatusLabel, normalizeTicketStatus } from "../../constants/ticket-status.config";
import {
    buildSerialStatusFilterOptions,
    buildSerialConditionFilterOptions,
} from "../../constants/serial-status-filter.config";
import { AdminLuckyDisplay } from "@/shared/lucky-number";

dayjs.locale("vi");

const getSerialStatusBadgeProps = (status?: string | null) => {
    const norm = (status || "").toUpperCase();
    if (norm === "IN_STOCK" || norm === "AVAILABLE") {
        return { label: "Trong kho", modifier: "admin-status-badge--active" };
    }
    if (norm === "RESERVED") {
        return { label: "Đang giữ chỗ", modifier: "admin-status-badge--pending" };
    }
    if (norm === "PROXY_HOLDING") {
        return { label: "Giữ hộ", modifier: "admin-status-badge--pending" };
    }
    if (norm === "SOLD") {
        return { label: "Đã bán", modifier: "admin-status-badge--inactive" };
    }
    if (norm === "EXPIRED") {
        return { label: "Hết hạn", modifier: "admin-status-badge--inactive" };
    }
    if (norm.includes("FAULT") || norm === "ISSUER_FAULT" || norm === "INTERNAL_FAULT") {
        return {
            label: norm === "ISSUER_FAULT" ? "Lỗi nhà đài" : "Lỗi nội bộ",
            modifier: "admin-status-badge--inactive",
        };
    }
    return { label: status || "—", modifier: "admin-status-badge--draft" };
};

const getSerialConditionBadgeProps = (condition?: string | null) => {
    const norm = (condition || "").toUpperCase();
    if (norm === "DAMAGED") {
        return { label: "Hư hỏng", modifier: "admin-status-badge--inactive" };
    }
    if (norm === "LOST") {
        return { label: "Thất lạc", modifier: "admin-status-badge--inactive" };
    }
    if (norm === "VOIDED") {
        return { label: "Đã hủy", modifier: "admin-status-badge--inactive" };
    }
    return { label: "Tốt", modifier: "admin-status-badge--active" };
};

export const TicketDetailPage = () => {
    const { id } = useRouteParams();
    const router = useAdminRouter();

    const { data: ticketDetail, isLoading: isLoadingTicket } = useTicketDetail(id);
    const { data: providersRes } = useStations({ limit: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];

    const [searchSerial, setSearchSerial] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [filterCategory, setFilterCategory] = useState<"ALL" | "IN_STOCK" | "SOLD" | "FAULT">("ALL");

    const ticketSerials = useMemo(() => {
        return Array.isArray(ticketDetail?.serials) ? ticketDetail.serials : [];
    }, [ticketDetail?.serials]);

    // Summary counts
    const totalCount = ticketSerials.length || resolveAvailableTicketQuantity(ticketDetail);
    const inStockCount = useMemo(() => {
        return ticketSerials.filter((s: any) => {
            const st = (s.status || "").toUpperCase();
            const cond = (s.ticketCondition || "").toUpperCase();
            return (st === "IN_STOCK" || st === "AVAILABLE" || !st) && !["DAMAGED", "LOST", "VOIDED"].includes(cond);
        }).length;
    }, [ticketSerials]);

    const soldCount = useMemo(() => {
        return ticketSerials.filter((s: any) => {
            const st = (s.status || "").toUpperCase();
            return st === "SOLD" || st === "RESERVED" || st === "PROXY_HOLDING";
        }).length;
    }, [ticketSerials]);

    const faultCount = useMemo(() => {
        return ticketSerials.filter((s: any) => {
            const st = (s.status || "").toUpperCase();
            const cond = (s.ticketCondition || "").toUpperCase();
            return st === "EXPIRED" || st.includes("FAULT") || ["DAMAGED", "LOST", "VOIDED"].includes(cond);
        }).length;
    }, [ticketSerials]);

    const filteredSerials = useMemo(() => {
        return ticketSerials.filter((serial: any) => {
            const matchesSearch =
                !searchSerial ||
                (serial.serialNumber || "").toLowerCase().includes(searchSerial.toLowerCase()) ||
                (serial.createdBy || "").toLowerCase().includes(searchSerial.toLowerCase());

            const st = (serial.status || "").toUpperCase();
            const cond = (serial.ticketCondition || "").toUpperCase();

            // Quick category tab filter
            let matchesCategory = true;
            if (filterCategory === "IN_STOCK") {
                matchesCategory = (st === "IN_STOCK" || st === "AVAILABLE" || !st) && !["DAMAGED", "LOST", "VOIDED"].includes(cond);
            } else if (filterCategory === "SOLD") {
                matchesCategory = st === "SOLD" || st === "RESERVED" || st === "PROXY_HOLDING";
            } else if (filterCategory === "FAULT") {
                matchesCategory = st === "EXPIRED" || st.includes("FAULT") || ["DAMAGED", "LOST", "VOIDED"].includes(cond);
            }

            // Dropdown filter
            const matchesStatus =
                filterStatus === "ALL" ||
                st === filterStatus ||
                (serial.faultedBy || "").toUpperCase() === filterStatus ||
                cond === filterStatus;

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [ticketSerials, searchSerial, filterCategory, filterStatus]);

    const availableSerialStatusOptions = useMemo(() => {
        const statusOptions = buildSerialStatusFilterOptions(ticketSerials);
        const conditionOptions = buildSerialConditionFilterOptions(ticketSerials);
        return [...statusOptions, ...conditionOptions];
    }, [ticketSerials]);

    if (isLoadingTicket) {
        return (
            <Box className="admin-page" sx={{ maxWidth: 1400, mx: "auto", p: { xs: 2, md: 3 } }}>
                <PageHeader
                    title="Chi tiết vé số"
                    breadcrumbItems={[
                        { label: "Kho vé số", to: `/${prefixAdmin}/ticket/list` },
                        { label: "Chi tiết" },
                    ]}
                />
                <SpinnerLoading />
            </Box>
        );
    }

    if (!ticketDetail) {
        return (
            <Box className="admin-page" sx={{ maxWidth: 1400, mx: "auto", p: { xs: 2, md: 3 } }}>
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 360,
                        gap: 2,
                    }}
                >
                    <ImageNotSupportedOutlinedIcon sx={{ fontSize: 64, color: "text.disabled" }} />
                    <Typography variant="h6" color="text.secondary">
                        Không tìm thấy thông tin vé số.
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackOutlinedIcon />}
                        onClick={() => router.push(`/${prefixAdmin}/ticket/list`)}
                    >
                        Quay lại danh sách vé
                    </Button>
                </Box>
            </Box>
        );
    }

    const providerId = ticketDetail.stationId || ticketDetail.productId || ticketDetail.providerId;
    const provider = providers.find((p: any) => (p.id || p._id)?.toString() === providerId?.toString());
    const providerName = provider ? provider.name : ticketDetail.providerName || "Không xác định";
    const drawTime = provider?.drawTime || "16:15";

    const canEditTicket =
        (ticketDetail.status || "").toUpperCase() === "IN_STOCK" &&
        !ticketSerials.some((serial: any) => ["RESERVED", "SOLD"].includes((serial.status || "").toUpperCase()));

    const availableQuantity = inStockCount > 0 ? inStockCount : resolveAvailableTicketQuantity(ticketDetail);
    const unitPrice = ticketDetail.priceSnapshot || ticketDetail.price || ticketDetail.ticketPrice || 10000;
    const totalInventoryValue = availableQuantity * unitPrice;

    const normalizedStatus = normalizeTicketStatus(ticketDetail.status);
    const ticketStatusLabel = ticketDetail.statusDisplayName || getTicketStatusLabel(ticketDetail.status) || "Trong kho";
    const ticketStatusModifier =
        normalizedStatus === "IN_STOCK"
            ? "admin-status-badge--active"
            : normalizedStatus === "IMPORTING"
              ? "admin-status-badge--pending"
              : normalizedStatus === "SOLD_OUT" || normalizedStatus === "EXPIRED"
                ? "admin-status-badge--inactive"
                : "admin-status-badge--draft";

    const mainTicketImage = ticketDetail.ticketImg || ticketDetail.image || (ticketSerials.find((s: any) => s.ticketImg)?.ticketImg);
    const hasDamagedOrLost = faultCount > 0;

    return (
        <Box className="admin-page" sx={{ maxWidth: 1400, mx: "auto", p: { xs: 2, md: 3 }, pb: 8 }}>
            {/* Header */}
            <PageHeader
                title={`Chi tiết vé số ${ticketDetail.numbers ? `#${ticketDetail.numbers}` : `#${id}`}`}
                breadcrumbItems={[
                    { label: "Vé số", to: `/${prefixAdmin}/ticket/list` },
                    { label: "Kho vé số", to: `/${prefixAdmin}/ticket/list` },
                    { label: ticketDetail.numbers ? `${ticketDetail.numbers}` : `#${id}` },
                ]}
                titleExtra={
                    <AdminStatusBadge
                        label={ticketStatusLabel}
                        modifier={ticketStatusModifier}
                    />
                }
                action={
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackOutlinedIcon />}
                            onClick={() => router.push(`/${prefixAdmin}/ticket/list`)}
                            sx={{
                                textTransform: "none",
                                fontWeight: 700,
                                borderRadius: "10px",
                                borderColor: "#cbd5e1",
                                color: "#475569",
                                bgcolor: "#ffffff",
                                "&:hover": { bgcolor: "#f8fafc", borderColor: "#94a3b8" },
                            }}
                        >
                            Quay lại
                        </Button>

                        <Button
                            variant="contained"
                            startIcon={<EditOutlinedIcon />}
                            disabled={!canEditTicket}
                            onClick={() => router.push(`/${prefixAdmin}/ticket/edit/${id}`)}
                            sx={{
                                textTransform: "none",
                                fontWeight: 700,
                                borderRadius: "10px",
                                bgcolor: "#0f172a",
                                color: "#ffffff",
                                "&:hover": { bgcolor: "#1e293b" },
                                "&.Mui-disabled": {
                                    bgcolor: "#e2e8f0",
                                    color: "#94a3b8",
                                },
                            }}
                        >
                            Chỉnh sửa vé
                        </Button>
                    </Stack>
                }
            />

            {/* Hero Information Card */}
            <Card
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    bgcolor: "#ffffff",
                    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
                    mb: 3,
                    width: "100%",
                }}
            >
                {/* Hero Top Strip */}
                <Stack
                    direction={{ xs: "column", lg: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", lg: "center" }}
                    spacing={2.5}
                    sx={{ pb: 2.5, borderBottom: "1px solid #f1f5f9" }}
                >
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        {/* Number Display Box */}
                        <Box
                            sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                px: 2,
                                py: 0.75,
                                borderRadius: "12px",
                                bgcolor: "#f8fafc",
                                border: "1.5px solid #cbd5e1",
                            }}
                        >
                            <ConfirmationNumberOutlinedIcon sx={{ color: "#2563eb", mr: 1, fontSize: 28 }} />
                            <AdminLuckyDisplay
                                value={ticketDetail.numbers}
                                ticket
                                sx={{
                                    fontSize: { xs: "1.5rem", md: "1.875rem" },
                                    fontWeight: 900,
                                    letterSpacing: "0.12em",
                                    color: "#0f172a",
                                    lineHeight: 1,
                                }}
                            />
                        </Box>

                        {/* Station Tag */}
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.75,
                                    px: 1.5,
                                    py: 0.75,
                                    borderRadius: "10px",
                                    bgcolor: "#eff6ff",
                                    border: "1px solid #bfdbfe",
                                }}
                            >
                                <StorefrontOutlinedIcon sx={{ fontSize: 18, color: "#2563eb" }} />
                                <Typography variant="body2" sx={{ fontWeight: 700, color: "#1d4ed8" }}>
                                    {providerName}
                                </Typography>
                            </Box>

                            {ticketDetail.verified ? (
                                <Tooltip title="Vé đã được kiểm tra & đối soát dữ liệu">
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                            px: 1.25,
                                            py: 0.75,
                                            borderRadius: "10px",
                                            bgcolor: "#f0fdf4",
                                            border: "1px solid #bbf7d0",
                                        }}
                                    >
                                        <VerifiedUserOutlinedIcon sx={{ fontSize: 16, color: "#16a34a" }} />
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: "#15803d" }}>
                                            Đã xác thực
                                        </Typography>
                                    </Box>
                                </Tooltip>
                            ) : (
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                        px: 1.25,
                                        py: 0.75,
                                        borderRadius: "10px",
                                        bgcolor: "#f8fafc",
                                        border: "1px solid #e2e8f0",
                                    }}
                                >
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: "#64748b" }}>
                                        Chưa duyệt
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </Stack>

                    {/* Right Metadata chips */}
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ bgcolor: "#f8fafc", px: 1.5, py: 0.75, borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                            <CalendarTodayOutlinedIcon sx={{ fontSize: 16, color: "#64748b" }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155" }}>
                                Ngày quay: <strong>{ticketDetail.drawDate ? dayjs(ticketDetail.drawDate).format("DD/MM/YYYY") : "—"}</strong> ({drawTime})
                            </Typography>
                        </Stack>

                        {ticketDetail.batchCode && (
                            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ bgcolor: "#f1f5f9", px: 1.5, py: 0.75, borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                <QrCode2OutlinedIcon sx={{ fontSize: 16, color: "#475569" }} />
                                <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>
                                    Lô: {formatImportBatchCode(ticketDetail.batchCode)}
                                </Typography>
                            </Stack>
                        )}
                    </Stack>
                </Stack>

                {/* 4 Metric Cards */}
                <Grid container spacing={2} sx={{ pt: 2.5 }}>
                    {/* 1. Inventory count */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: "12px",
                                bgcolor: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                                    Số lượng tồn kho
                                </Typography>
                                <Inventory2OutlinedIcon sx={{ fontSize: 20, color: "#2563eb" }} />
                            </Stack>
                            <Box sx={{ my: 1 }}>
                                <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>
                                    {availableQuantity}{" "}
                                    <Typography component="span" variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
                                        / {totalCount} vé
                                    </Typography>
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={totalCount > 0 ? (availableQuantity / totalCount) * 100 : 0}
                                sx={{
                                    height: 6,
                                    borderRadius: 3,
                                    bgcolor: "#e2e8f0",
                                    "& .MuiLinearProgress-bar": {
                                        bgcolor: availableQuantity > 0 ? "#16a34a" : "#94a3b8",
                                        borderRadius: 3,
                                    },
                                }}
                            />
                        </Paper>
                    </Grid>

                    {/* 2. Unit price */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: "12px",
                                bgcolor: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                                    Mệnh giá vé
                                </Typography>
                                <MonetizationOnOutlinedIcon sx={{ fontSize: 20, color: "#ea580c" }} />
                            </Stack>
                            <Box sx={{ my: 1 }}>
                                <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>
                                    {unitPrice.toLocaleString("vi-VN")}{" "}
                                    <Typography component="span" variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
                                        VNĐ / vé
                                    </Typography>
                                </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: "#64748b" }}>
                                Giá niêm yết phát hành
                            </Typography>
                        </Paper>
                    </Grid>

                    {/* 3. Total stock value */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: "12px",
                                bgcolor: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                                    Tổng giá trị khả dụng
                                </Typography>
                                <ReceiptLongOutlinedIcon sx={{ fontSize: 20, color: "#16a34a" }} />
                            </Stack>
                            <Box sx={{ my: 1 }}>
                                <Typography variant="h5" sx={{ fontWeight: 800, color: "#16a34a" }}>
                                    {totalInventoryValue.toLocaleString("vi-VN")}{" "}
                                    <Typography component="span" variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
                                        VNĐ
                                    </Typography>
                                </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: "#64748b" }}>
                                {availableQuantity} vé đang có trong kho
                            </Typography>
                        </Paper>
                    </Grid>

                    {/* 4. Quality condition */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: "12px",
                                bgcolor: hasDamagedOrLost ? "#fff1f2" : "#f0fdf4",
                                border: `1px solid ${hasDamagedOrLost ? "#fecdd3" : "#bbf7d0"}`,
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontWeight: 700,
                                        color: hasDamagedOrLost ? "#e11d48" : "#15803d",
                                        textTransform: "uppercase",
                                        letterSpacing: 0.5,
                                    }}
                                >
                                    Chất lượng sê-ri
                                </Typography>
                                {hasDamagedOrLost ? (
                                    <WarningAmberOutlinedIcon sx={{ fontSize: 20, color: "#e11d48" }} />
                                ) : (
                                    <CheckCircleOutlinedIcon sx={{ fontSize: 20, color: "#16a34a" }} />
                                )}
                            </Stack>
                            <Box sx={{ my: 1 }}>
                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 800,
                                        color: hasDamagedOrLost ? "#e11d48" : "#15803d",
                                    }}
                                >
                                    {hasDamagedOrLost ? `${faultCount} sê-ri lỗi` : "100% Đạt chuẩn"}
                                </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: hasDamagedOrLost ? "#be123c" : "#166534" }}>
                                {hasDamagedOrLost ? "Có vé hỏng / thất lạc" : "Tất cả sê-ri nguyên vẹn"}
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>
            </Card>

            {/* Main Content Layout: 2 Columns */}
            <Grid container spacing={3}>
                {/* Left Column: Details & Serials Table */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Stack spacing={3}>
                        {/* Section Card: Ticket Information Grid */}
                        <Card
                            elevation={0}
                            sx={{
                                p: { xs: 2.5, md: 3 },
                                borderRadius: "16px",
                                border: "1px solid #e2e8f0",
                                bgcolor: "#ffffff",
                                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
                            }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
                                <InfoOutlinedIcon sx={{ color: "#2563eb", fontSize: 20 }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a" }}>
                                    Thông tin phát hành & Quản trị
                                </Typography>
                            </Stack>

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
                                    gap: 2.5,
                                }}
                            >
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                                        Nhà đài phát hành
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                                        {providerName}
                                    </Typography>
                                    {provider?.stationCode && (
                                        <Typography variant="caption" sx={{ color: "#64748b", fontFamily: "monospace" }}>
                                            Mã đài: {provider.stationCode}
                                        </Typography>
                                    )}
                                </Box>

                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                                        Ngày & Giờ quay thưởng
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                                        {ticketDetail.drawDate ? dayjs(ticketDetail.drawDate).format("DD/MM/YYYY") : "—"}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "#2563eb", fontWeight: 600 }}>
                                        Mở thưởng lúc {drawTime}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                                        Dãy số dự thưởng
                                    </Typography>
                                    <AdminLuckyDisplay
                                        value={ticketDetail.numbers}
                                        ticket
                                        sx={{
                                            fontWeight: 800,
                                            fontSize: "1rem",
                                            letterSpacing: "0.06em",
                                            color: "#0f172a",
                                        }}
                                    />
                                </Box>

                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                                        Mã lô nhập tương ứng
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontFamily: "monospace",
                                            fontWeight: 700,
                                            color: "#2563eb",
                                        }}
                                    >
                                        {formatImportBatchCode(ticketDetail.batchCode) || "—"}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                                        Người tạo phiếu
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <PersonOutlineOutlinedIcon sx={{ fontSize: 16, color: "#64748b" }} />
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#0f172a" }}>
                                            {ticketDetail.createdBy || "—"}
                                        </Typography>
                                    </Stack>
                                </Box>

                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                                        Thời gian nhập kho
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#0f172a" }}>
                                        {ticketDetail.createdAt
                                            ? dayjs(ticketDetail.createdAt).format("DD/MM/YYYY HH:mm")
                                            : ticketDetail.importedAt
                                              ? dayjs(ticketDetail.importedAt).format("DD/MM/YYYY HH:mm")
                                              : "—"}
                                    </Typography>
                                </Box>

                                {ticketDetail.updatedAt && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                                            Cập nhật lần cuối
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#0f172a" }}>
                                            {dayjs(ticketDetail.updatedAt).format("DD/MM/YYYY HH:mm")}
                                        </Typography>
                                    </Box>
                                )}

                                {ticketDetail.returnedAt && (
                                    <Box sx={{ bgcolor: "#fef2f2", p: 1, borderRadius: "8px", border: "1px solid #fee2e2" }}>
                                        <Typography variant="caption" sx={{ color: "#b91c1c", fontWeight: 700, display: "block" }}>
                                            Đã trả về nhà cung cấp
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#dc2626" }}>
                                            {dayjs(ticketDetail.returnedAt).format("DD/MM/YYYY HH:mm")}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Card>

                        {/* Section Card: Physical Serials Table */}
                        <Card
                            elevation={0}
                            sx={{
                                p: { xs: 2, md: 3 },
                                borderRadius: "16px",
                                border: "1px solid #e2e8f0",
                                bgcolor: "#ffffff",
                                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
                            }}
                        >
                            {/* Table Header with Title & Quick Filters */}
                            <Stack
                                direction={{ xs: "column", md: "row" }}
                                justifyContent="space-between"
                                alignItems={{ xs: "flex-start", md: "center" }}
                                spacing={2}
                                sx={{ mb: 2 }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a" }}>
                                        Danh sách sê-ri vé vật lý
                                    </Typography>
                                    <Chip
                                        size="small"
                                        label={`${filteredSerials.length} / ${ticketSerials.length} tờ`}
                                        sx={{ fontWeight: 700, bgcolor: "#f1f5f9", color: "#334155" }}
                                    />
                                </Stack>

                                {/* Filter Tabs */}
                                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                    <Button
                                        size="small"
                                        variant={filterCategory === "ALL" ? "contained" : "outlined"}
                                        onClick={() => setFilterCategory("ALL")}
                                        sx={{
                                            borderRadius: "20px",
                                            textTransform: "none",
                                            fontWeight: 700,
                                            fontSize: "0.75rem",
                                            px: 1.5,
                                            py: 0.25,
                                            bgcolor: filterCategory === "ALL" ? "#0f172a" : "#ffffff",
                                            color: filterCategory === "ALL" ? "#ffffff" : "#64748b",
                                            borderColor: "#e2e8f0",
                                            "&:hover": { bgcolor: filterCategory === "ALL" ? "#1e293b" : "#f8fafc" },
                                        }}
                                    >
                                        Tất cả ({ticketSerials.length})
                                    </Button>
                                    <Button
                                        size="small"
                                        variant={filterCategory === "IN_STOCK" ? "contained" : "outlined"}
                                        onClick={() => setFilterCategory("IN_STOCK")}
                                        sx={{
                                            borderRadius: "20px",
                                            textTransform: "none",
                                            fontWeight: 700,
                                            fontSize: "0.75rem",
                                            px: 1.5,
                                            py: 0.25,
                                            bgcolor: filterCategory === "IN_STOCK" ? "#16a34a" : "#ffffff",
                                            color: filterCategory === "IN_STOCK" ? "#ffffff" : "#16a34a",
                                            borderColor: filterCategory === "IN_STOCK" ? "#16a34a" : "#bbf7d0",
                                            "&:hover": { bgcolor: filterCategory === "IN_STOCK" ? "#15803d" : "#f0fdf4" },
                                        }}
                                    >
                                        Trong kho ({inStockCount})
                                    </Button>
                                    <Button
                                        size="small"
                                        variant={filterCategory === "SOLD" ? "contained" : "outlined"}
                                        onClick={() => setFilterCategory("SOLD")}
                                        sx={{
                                            borderRadius: "20px",
                                            textTransform: "none",
                                            fontWeight: 700,
                                            fontSize: "0.75rem",
                                            px: 1.5,
                                            py: 0.25,
                                            bgcolor: filterCategory === "SOLD" ? "#2563eb" : "#ffffff",
                                            color: filterCategory === "SOLD" ? "#ffffff" : "#2563eb",
                                            borderColor: filterCategory === "SOLD" ? "#2563eb" : "#bfdbfe",
                                            "&:hover": { bgcolor: filterCategory === "SOLD" ? "#1d4ed8" : "#eff6ff" },
                                        }}
                                    >
                                        Đã bán ({soldCount})
                                    </Button>
                                    {faultCount > 0 && (
                                        <Button
                                            size="small"
                                            variant={filterCategory === "FAULT" ? "contained" : "outlined"}
                                            onClick={() => setFilterCategory("FAULT")}
                                            sx={{
                                                borderRadius: "20px",
                                                textTransform: "none",
                                                fontWeight: 700,
                                                fontSize: "0.75rem",
                                                px: 1.5,
                                                py: 0.25,
                                                bgcolor: filterCategory === "FAULT" ? "#e11d48" : "#ffffff",
                                                color: filterCategory === "FAULT" ? "#ffffff" : "#e11d48",
                                                borderColor: filterCategory === "FAULT" ? "#e11d48" : "#fecdd3",
                                                "&:hover": { bgcolor: filterCategory === "FAULT" ? "#be123c" : "#fff1f2" },
                                            }}
                                        >
                                            Lỗi ({faultCount})
                                        </Button>
                                    )}
                                </Stack>
                            </Stack>

                            {/* Integrated Allocation Status Breakdown Strip */}
                            <Box
                                sx={{
                                    p: 1.75,
                                    px: 2,
                                    borderRadius: "12px",
                                    bgcolor: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    mb: 2,
                                }}
                            >
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    justifyContent="space-between"
                                    alignItems={{ xs: "flex-start", sm: "center" }}
                                    spacing={1.5}
                                    flexWrap="wrap"
                                    useFlexGap
                                >
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5 }}>
                                            Tình trạng phân bổ:
                                        </Typography>
                                        <Chip
                                            size="small"
                                            label={`Tổng ${totalCount} vé vật lý`}
                                            sx={{ fontWeight: 800, bgcolor: "#e2e8f0", color: "#0f172a", height: 22, fontSize: "0.75rem" }}
                                        />
                                    </Stack>

                                    <Stack direction="row" spacing={2.5} alignItems="center" flexWrap="wrap" useFlexGap>
                                        <Stack direction="row" spacing={0.75} alignItems="center">
                                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#16a34a" }} />
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155", fontSize: "0.8125rem" }}>
                                                Trong kho: <b style={{ color: "#16a34a" }}>{inStockCount} vé</b>{" "}
                                                <Typography component="span" variant="caption" sx={{ color: "#64748b" }}>
                                                    ({totalCount > 0 ? Math.round((inStockCount / totalCount) * 100) : 0}%)
                                                </Typography>
                                            </Typography>
                                        </Stack>

                                        <Stack direction="row" spacing={0.75} alignItems="center">
                                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#2563eb" }} />
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155", fontSize: "0.8125rem" }}>
                                                Đã bán: <b style={{ color: "#2563eb" }}>{soldCount} vé</b>{" "}
                                                <Typography component="span" variant="caption" sx={{ color: "#64748b" }}>
                                                    ({totalCount > 0 ? Math.round((soldCount / totalCount) * 100) : 0}%)
                                                </Typography>
                                            </Typography>
                                        </Stack>

                                        {faultCount > 0 && (
                                            <Stack direction="row" spacing={0.75} alignItems="center">
                                                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#e11d48" }} />
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: "#e11d48", fontSize: "0.8125rem" }}>
                                                    Hỏng/Lỗi: <b style={{ color: "#e11d48" }}>{faultCount} vé</b>{" "}
                                                    <Typography component="span" variant="caption" sx={{ color: "#e11d48" }}>
                                                        ({totalCount > 0 ? Math.round((faultCount / totalCount) * 100) : 0}%)
                                                    </Typography>
                                                </Typography>
                                            </Stack>
                                        )}
                                    </Stack>
                                </Stack>
                            </Box>

                            {/* Search and Secondary Filter Row */}
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
                                <TextField
                                    size="small"
                                    placeholder="Tìm kiếm số sê-ri hoặc người tạo..."
                                    value={searchSerial}
                                    onChange={(e) => setSearchSerial(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchOutlinedIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        flex: 1,
                                        "& .MuiOutlinedInput-root": {
                                            borderRadius: "10px",
                                            bgcolor: "#f8fafc",
                                        },
                                    }}
                                />

                                <Select
                                    size="small"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    sx={{
                                        minWidth: { xs: "100%", sm: 200 },
                                        borderRadius: "10px",
                                        bgcolor: "#f8fafc",
                                        fontWeight: 600,
                                        fontSize: "0.875rem",
                                    }}
                                >
                                    <MenuItem value="ALL">Tất cả trạng thái sê-ri</MenuItem>
                                    {availableSerialStatusOptions.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value} sx={{ fontWeight: 500 }}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Stack>

                            {/* Table with Scrollable Container */}
                            {filteredSerials.length === 0 ? (
                                <Box
                                    sx={{
                                        py: 6,
                                        textAlign: "center",
                                        bgcolor: "#f8fafc",
                                        borderRadius: "12px",
                                        border: "1px dashed #cbd5e1",
                                    }}
                                >
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                        Không tìm thấy sê-ri nào phù hợp với bộ lọc.
                                    </Typography>
                                </Box>
                            ) : (
                                <TableContainer
                                    sx={{
                                        maxHeight: 460,
                                        overflowY: "auto",
                                        borderRadius: "12px",
                                        border: "1px solid #e2e8f0",
                                        "&::-webkit-scrollbar": {
                                            width: 6,
                                            height: 6,
                                        },
                                        "&::-webkit-scrollbar-track": {
                                            bgcolor: "#f8fafc",
                                        },
                                        "&::-webkit-scrollbar-thumb": {
                                            bgcolor: "#cbd5e1",
                                            borderRadius: 3,
                                            "&:hover": { bgcolor: "#94a3b8" },
                                        },
                                    }}
                                >
                                    <Table size="small" stickyHeader className="admin-table">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell width={48} align="center" sx={{ bgcolor: "#f8fafc", fontWeight: 700, zIndex: 3 }}>
                                                    STT
                                                </TableCell>
                                                <TableCell width={64} align="center" sx={{ bgcolor: "#f8fafc", fontWeight: 700, zIndex: 3 }}>
                                                    Ảnh
                                                </TableCell>
                                                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700, zIndex: 3 }}>Số sê-ri</TableCell>
                                                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700, zIndex: 3 }}>Mã lô</TableCell>
                                                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700, zIndex: 3 }}>Trạng thái</TableCell>
                                                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700, zIndex: 3 }}>Tình trạng</TableCell>
                                                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700, zIndex: 3 }}>Thời gian nhập</TableCell>
                                                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700, zIndex: 3 }}>Người thực hiện</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredSerials.map((serial: any, index: number) => {
                                                const statusProps = getSerialStatusBadgeProps(serial.status);
                                                const conditionProps = getSerialConditionBadgeProps(serial.ticketCondition);
                                                const serialImg = serial.ticketImg || serial.image;

                                                return (
                                                    <TableRow key={serial.id || index} hover>
                                                        <TableCell align="center">
                                                            <Typography
                                                                variant="caption"
                                                                sx={{ fontWeight: 700, color: "#64748b" }}
                                                            >
                                                                {index + 1}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            {serialImg ? (
                                                                <ImagePreview
                                                                    src={serialImg}
                                                                    alt={`Sê-ri ${serial.serialNumber || index + 1}`}
                                                                    dialogTitle={`Ảnh sê-ri: ${serial.serialNumber || "N/A"}`}
                                                                    infoItems={[
                                                                        { label: "Số sê-ri", value: serial.serialNumber || "—" },
                                                                        { label: "Dãy số", value: ticketDetail.numbers || "—" },
                                                                        { label: "Nhà đài", value: providerName },
                                                                    ]}
                                                                    thumbnailSx={{
                                                                        width: 44,
                                                                        height: 32,
                                                                        objectFit: "cover",
                                                                        borderRadius: "6px",
                                                                        border: "1px solid #cbd5e1",
                                                                        bgcolor: "#f1f5f9",
                                                                        cursor: "zoom-in",
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Box
                                                                    sx={{
                                                                        width: 44,
                                                                        height: 32,
                                                                        borderRadius: "6px",
                                                                        border: "1px dashed #cbd5e1",
                                                                        bgcolor: "#f8fafc",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                    }}
                                                                >
                                                                    <Typography variant="caption" sx={{ fontSize: "0.625rem", color: "#94a3b8" }}>
                                                                        N/A
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontWeight: 700,
                                                                    fontFamily: "monospace",
                                                                    fontSize: "0.875rem",
                                                                    color: "#0f172a",
                                                                }}
                                                            >
                                                                {serial.serialNumber || "—"}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    fontFamily: "monospace",
                                                                    fontWeight: 600,
                                                                    bgcolor: "#f1f5f9",
                                                                    px: 1,
                                                                    py: 0.25,
                                                                    borderRadius: "4px",
                                                                    border: "1px solid #e2e8f0",
                                                                    color: "#334155",
                                                                }}
                                                            >
                                                                {formatImportBatchCode(serial.batchCode || ticketDetail.batchCode)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <AdminStatusBadge
                                                                label={serial.statusDisplayName || statusProps.label}
                                                                modifier={statusProps.modifier}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <AdminStatusBadge
                                                                label={serial.ticketConditionDisplayName || conditionProps.label}
                                                                modifier={conditionProps.modifier}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "#0f172a" }}>
                                                                {serial.createdAt
                                                                    ? dayjs(serial.createdAt).format("DD/MM/YYYY")
                                                                    : "—"}
                                                            </Typography>
                                                            {serial.createdAt && (
                                                                <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                                                                    {dayjs(serial.createdAt).format("HH:mm")}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ fontSize: "0.8125rem", fontWeight: 500, color: "#334155" }}>
                                                                {serial.createdBy || ticketDetail.createdBy || "—"}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Card>
                    </Stack>
                </Grid>

                {/* Right Column: Ticket Image Preview & Distribution Overview */}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Stack spacing={3}>
                        {/* Ticket Image Card */}
                        <Card
                            elevation={0}
                            sx={{
                                p: { xs: 2.5, md: 3 },
                                borderRadius: "16px",
                                border: "1px solid #e2e8f0",
                                bgcolor: "#ffffff",
                                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a" }}>
                                    Ảnh chụp vé số vật lý
                                </Typography>
                                {mainTicketImage && (
                                    <Tooltip title="Nhấp vào ảnh để phóng to toàn màn hình">
                                        <ZoomInOutlinedIcon sx={{ fontSize: 20, color: "#64748b" }} />
                                    </Tooltip>
                                )}
                            </Stack>

                            {mainTicketImage ? (
                                <Box sx={{ width: "100%" }}>
                                    <ImagePreview
                                        src={mainTicketImage}
                                        alt={`Vé số ${ticketDetail.numbers || id}`}
                                        dialogTitle={`Ảnh vé số: ${ticketDetail.numbers || ""}`}
                                        infoItems={[
                                            { label: "Dãy số", value: ticketDetail.numbers || "—" },
                                            { label: "Nhà đài", value: providerName },
                                            { label: "Ngày quay", value: ticketDetail.drawDate ? dayjs(ticketDetail.drawDate).format("DD/MM/YYYY") : "—" },
                                            { label: "Mệnh giá", value: `${unitPrice.toLocaleString("vi-VN")} VNĐ` },
                                        ]}
                                        thumbnailSx={{
                                            width: "100%",
                                            maxHeight: 380,
                                            objectFit: "contain",
                                            borderRadius: "12px",
                                            border: "1px solid #e2e8f0",
                                            bgcolor: "#f8fafc",
                                            p: 1,
                                            display: "block",
                                        }}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "center" }}>
                                        Nhấp vào ảnh để phóng to & xem chi tiết
                                    </Typography>
                                </Box>
                            ) : (
                                <Box
                                    sx={{
                                        height: 240,
                                        borderRadius: "12px",
                                        bgcolor: "#f8fafc",
                                        border: "1.5px dashed #cbd5e1",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 1.5,
                                        p: 3,
                                        textAlign: "center",
                                    }}
                                >
                                    <ImageNotSupportedOutlinedIcon sx={{ fontSize: 44, color: "#94a3b8" }} />
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#64748b" }}>
                                            Chưa có ảnh chụp vé số
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Ảnh sẽ được đồng bộ khi thực hiện quét hoặc tải lên từ phiếu nhập
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </Card>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};
