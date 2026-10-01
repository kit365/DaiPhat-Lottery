"use client";

import { useMemo, useState } from "react";
import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

import dayjs from "dayjs";
import "dayjs/locale/vi";
import { PageHeader } from "../../../../../components/ui/PageHeader";
import { SpinnerLoading } from "../../../../../components/ui/SpinnerLoading";
import { AdminStatusBadge } from "../../../../../components/ui/AdminStatusBadge";
import { prefixAdmin } from "../../../../../constants/routes";
import { useTicketDetail } from "../../hooks/useTicket";
import { useStations } from "../../../../station/hooks/useStation";
import { formatImportBatchCode } from "../../../import-batch/utils/importBatchCode";
import { resolveAvailableTicketQuantity } from "../../utils/ticketQuantity";
import { getTicketStatusLabel, normalizeTicketStatus } from "../../constants/ticket-status.config";
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
    const [filterCategory, setFilterCategory] = useState<"ALL" | "IN_STOCK" | "SOLD" | "FAULT">("ALL");

    const ticketSerials = useMemo(() => {
        const serials = Array.isArray(ticketDetail?.serials) ? ticketDetail.serials : [];
        return serials.filter((s: { ticketCondition?: string | null }) => {
            const cond = (s.ticketCondition || "").toUpperCase();
            return cond !== "VOIDED";
        });
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

            return matchesSearch && matchesCategory;
        });
    }, [ticketSerials, searchSerial, filterCategory]);

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

            {ticketDetail.cancelReason && (
                <Alert
                    severity="error"
                    icon={<WarningAmberOutlinedIcon fontSize="inherit" />}
                    sx={{ mb: 3, borderRadius: "12px", "& .MuiAlert-message": { fontSize: "0.85rem" } }}
                >
                    <Typography variant="body2" fontWeight={800} sx={{ mb: 0.25 }}>
                        Lý do hủy dãy vé
                    </Typography>
                    {ticketDetail.cancelReason}
                </Alert>
            )}

            {/* Main Content Sections */}
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
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", mb: 2.5 }}>
                        Thông tin phát hành & Quản trị
                    </Typography>

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" },
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
                                Mệnh giá vé
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                                {unitPrice.toLocaleString("vi-VN")} VNĐ
                            </Typography>
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
                                Trạng thái xác thực
                            </Typography>
                            <AdminStatusBadge
                                label={ticketDetail.verified ? "Đã xác thực" : "Chưa duyệt"}
                                modifier={ticketDetail.verified ? "admin-status-badge--active" : "admin-status-badge--draft"}
                            />
                        </Box>

                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                                Người tạo phiếu
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#0f172a" }}>
                                {ticketDetail.createdBy || "—"}
                            </Typography>
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
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a" }}>
                            Danh sách sê-ri vé vật lý
                        </Typography>

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



                    {/* Search Row */}
                    <TextField
                        size="small"
                        placeholder="Tìm kiếm số sê-ri..."
                        value={searchSerial}
                        onChange={(e) => setSearchSerial(e.target.value)}
                        sx={{
                            mb: 2,
                            maxWidth: 360,
                            "& .MuiOutlinedInput-root": {
                                borderRadius: "10px",
                                bgcolor: "#f8fafc",
                            },
                        }}
                    />

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
                                maxHeight: 520,
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
                                        <TableCell width={54} align="center" sx={{ bgcolor: "#f8fafc", fontWeight: 700, zIndex: 3 }}>
                                            STT
                                        </TableCell>
                                        <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700, zIndex: 3 }}>Số sê-ri</TableCell>
                                        <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: 700, zIndex: 3 }}>Trạng thái</TableCell>
                                        <TableCell align="center" sx={{ bgcolor: "#f8fafc", fontWeight: 700, zIndex: 3 }}>Tình trạng</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredSerials.map((serial: any, index: number) => {
                                        const statusProps = getSerialStatusBadgeProps(serial.status);
                                        const conditionProps = getSerialConditionBadgeProps(serial.ticketCondition);

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
                                                <TableCell align="center">
                                                    <AdminStatusBadge
                                                        label={serial.statusDisplayName || statusProps.label}
                                                        modifier={statusProps.modifier}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <AdminStatusBadge
                                                        label={serial.ticketConditionDisplayName || conditionProps.label}
                                                        modifier={conditionProps.modifier}
                                                    />
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
        </Box>
    );
};
