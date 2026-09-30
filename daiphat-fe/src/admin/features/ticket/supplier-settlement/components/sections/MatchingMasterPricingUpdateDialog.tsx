"use client";

import { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    Paper,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { bulkUpdateStationCommissions } from "../../../../station/services/stationService";
import { QUERY_KEYS as STATION_QUERY_KEYS } from "../../../../station/constants/queryKeys";
import { updateSupplierDefaultImportCost } from "../../../../supplier/services/supplierService";
import { QUERY_KEYS as SUPPLIER_QUERY_KEYS } from "../../../../supplier/constants/queryKeys";
import { useSupplierDetail } from "../../../../supplier/hooks/useSupplier";
import { AppToast } from "../../../../../../utils/toast.util";
import { AdminStatusBadge } from "@/admin/components/ui/AdminStatusBadge";

export type PriceMismatchSummary = {
    systemImportCost: number;
    actualImportCost: number;
};

export type CommissionMismatchRow = {
    lotteryStationId: number;
    lotteryStationName: string;
    systemCommissionRate: number;
    actualCommissionRate: number;
};

type Props = {
    open: boolean;
    onClose: () => void;
    supplierId?: number | null;
    supplierName?: string | null;
    priceMismatch: PriceMismatchSummary | null;
    commissionMismatches: CommissionMismatchRow[];
    onUpdated: () => void;
};

const formatMoney = (value?: number | null): string => {
    if (value == null || !Number.isFinite(Number(value))) return "—";
    return Math.round(Number(value)).toLocaleString("vi-VN");
};

const formatPercent = (rate?: number | null): string => {
    if (rate == null || !Number.isFinite(Number(rate))) return "—";
    return `${(Number(rate) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
};

export const MatchingMasterPricingUpdateDialog = ({
    open,
    onClose,
    supplierId,
    supplierName,
    priceMismatch,
    commissionMismatches,
    onUpdated,
}: Props) => {
    const queryClient = useQueryClient();
    const [busyKey, setBusyKey] = useState<string | null>(null);

    // Fetch rich supplier details
    const { data: supplier, isLoading: isLoadingSupplier } = useSupplierDetail(
        supplierId && open ? supplierId : undefined
    );

    const invalidateMaster = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: [SUPPLIER_QUERY_KEYS.SUPPLIER_DETAIL] }),
            queryClient.invalidateQueries({ queryKey: [SUPPLIER_QUERY_KEYS.SUPPLIERS] }),
            queryClient.invalidateQueries({ queryKey: [STATION_QUERY_KEYS.STATIONS] }),
            queryClient.invalidateQueries({ queryKey: [STATION_QUERY_KEYS.STATIONS_BY_DRAW_DATE] }),
        ]);
        onUpdated();
    };

    const handleUpdateImportCost = async () => {
        if (!supplierId || !priceMismatch) return;
        setBusyKey("import-cost");
        try {
            await updateSupplierDefaultImportCost(supplierId, priceMismatch.actualImportCost);
            AppToast.success("Đã cập nhật giá nhập mặc định của nhà cung cấp vào hệ thống.");
            await invalidateMaster();
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || err?.message || "Cập nhật giá nhập NCC thất bại.");
        } finally {
            setBusyKey(null);
        }
    };

    const handleUpdateCommissions = async (rows: CommissionMismatchRow[]) => {
        if (rows.length === 0) return;
        setBusyKey(rows.length === 1 ? `commission-${rows[0].lotteryStationId}` : "commission-all");
        try {
            await bulkUpdateStationCommissions(
                rows.map((row) => ({
                    lotteryStationId: row.lotteryStationId,
                    commissionRate: row.actualCommissionRate,
                }))
            );
            AppToast.success(
                rows.length === 1
                    ? `Đã cập nhật hoa hồng đài ${rows[0].lotteryStationName} vào hệ thống.`
                    : `Đã cập nhật hoa hồng ${rows.length} đài vào hệ thống.`
            );
            await invalidateMaster();
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || err?.message || "Cập nhật hoa hồng đài thất bại.");
        } finally {
            setBusyKey(null);
        }
    };

    const handleUpdateAll = async () => {
        setBusyKey("update-all");
        try {
            const promises: Promise<any>[] = [];
            if (supplierId && priceMismatch) {
                promises.push(updateSupplierDefaultImportCost(supplierId, priceMismatch.actualImportCost));
            }
            if (commissionMismatches.length > 0) {
                promises.push(
                    bulkUpdateStationCommissions(
                        commissionMismatches.map((row) => ({
                            lotteryStationId: row.lotteryStationId,
                            commissionRate: row.actualCommissionRate,
                        }))
                    )
                );
            }
            await Promise.all(promises);
            AppToast.success("Đã cập nhật toàn bộ giá nhập và hoa hồng vào dữ liệu hệ thống.");
            await invalidateMaster();
            onClose();
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || err?.message || "Cập nhật dữ liệu hệ thống thất bại.");
        } finally {
            setBusyKey(null);
        }
    };

    const busy = Boolean(busyKey);

    const priceDiff = priceMismatch ? priceMismatch.actualImportCost - priceMismatch.systemImportCost : 0;
    const priceDiffPercent =
        priceMismatch && priceMismatch.systemImportCost > 0
            ? ((priceDiff / priceMismatch.systemImportCost) * 100).toFixed(1)
            : "0";

    const totalMismatchCount = (priceMismatch ? 1 : 0) + commissionMismatches.length;

    return (
        <Dialog
            open={open}
            onClose={busy ? undefined : onClose}
            maxWidth="md"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: "20px",
                        overflow: "hidden",
                        boxShadow: "0 24px 48px -12px rgba(15, 23, 42, 0.25)",
                    },
                },
            }}
        >
            {/* Dialog Header */}
            <DialogTitle
                sx={{
                    p: 2.5,
                    px: 3,
                    bgcolor: "#ffffff",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                }}
            >
                <Stack direction="row" spacing={1.75} alignItems="center">
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: "12px",
                            bgcolor: "#eff6ff",
                            color: "#2563eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            border: "1px solid #bfdbfe",
                        }}
                    >
                        <LocalOfferOutlinedIcon sx={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={800} color="#0f172a" lineHeight={1.25}>
                            Cập nhật giá & hoa hồng hệ thống
                        </Typography>
                        <Typography variant="caption" color="#64748b" sx={{ fontSize: "0.8rem" }}>
                            Đồng bộ giá nhập mặc định và tỷ lệ hoa hồng vào danh mục dữ liệu gốc (Master Data)
                        </Typography>
                    </Box>
                </Stack>
                <IconButton
                    size="small"
                    onClick={onClose}
                    disabled={busy}
                    sx={{
                        color: "#94a3b8",
                        bgcolor: "#f8fafc",
                        "&:hover": { bgcolor: "#e2e8f0", color: "#334155" },
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "#f8fafc" }}>
                <Stack spacing={2.5}>
                    {/* Notice Banner */}
                    <Alert
                        severity="info"
                        icon={<InfoOutlinedIcon fontSize="inherit" />}
                        sx={{
                            borderRadius: "12px",
                            bgcolor: "#eff6ff",
                            color: "#1e40af",
                            border: "1px solid #dbeafe",
                            fontSize: "0.85rem",
                            "& .MuiAlert-icon": { color: "#2563eb" },
                        }}
                    >
                        Số liệu thực tế trên kỳ đối soát hiện tại vẫn được giữ nguyên. Thao tác tại đây sẽ cập nhật giá
                        nhập mặc định của nhà cung cấp hoặc tỷ lệ hoa hồng từng đài vào cấu hình hệ thống để tự động áp
                        dụng cho các kỳ nhập vé và đối soát tiếp theo.
                    </Alert>

                    {/* Supplier Information Card */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: "16px",
                            border: "1px solid #e2e8f0",
                            bgcolor: "#ffffff",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                        }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.75 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <StorefrontOutlinedIcon sx={{ color: "#2563eb", fontSize: "1.2rem" }} />
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                    Thông tin nhà cung cấp
                                </Typography>
                            </Stack>
                            {supplier ? (
                                <AdminStatusBadge
                                    label={supplier.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                                    modifier={supplier.isActive ? "admin-status-badge--active" : "admin-status-badge--cancelled"}
                                />
                            ) : null}
                        </Stack>

                        {isLoadingSupplier ? (
                            <Stack spacing={1}>
                                <Skeleton variant="text" width="60%" height={28} />
                                <Skeleton variant="rectangular" height={50} sx={{ borderRadius: "8px" }} />
                            </Stack>
                        ) : (
                            <Stack spacing={1.5}>
                                {/* Top Row: Name, Code, Type */}
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    alignItems={{ xs: "flex-start", sm: "center" }}
                                    justifyContent="space-between"
                                    spacing={1}
                                    sx={{
                                        p: 1.5,
                                        borderRadius: "12px",
                                        bgcolor: "#f8fafc",
                                        border: "1px solid #f1f5f9",
                                    }}
                                >
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                            {supplier?.name || supplierName || "Nhà cung cấp"}
                                        </Typography>
                                        {supplier?.typeLabel || supplier?.type ? (
                                            <Typography variant="caption" color="#64748b">
                                                Loại: {supplier.typeLabel || (supplier.type === "LOTTERY_COMPANY" ? "Công ty Xổ số Kiến thiết" : "Đại lý phân phối")}
                                            </Typography>
                                        ) : null}
                                    </Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        {supplier?.code && (
                                            <Chip
                                                size="small"
                                                label={`Mã: ${supplier.code}`}
                                                sx={{
                                                    bgcolor: "#e0f2fe",
                                                    color: "#0369a1",
                                                    fontWeight: 700,
                                                    fontFamily: "monospace",
                                                    fontSize: "0.775rem",
                                                }}
                                            />
                                        )}
                                        {supplier?.taxCode && (
                                            <Chip
                                                size="small"
                                                icon={<ReceiptLongOutlinedIcon sx={{ fontSize: "0.9rem !important" }} />}
                                                label={`MST: ${supplier.taxCode}`}
                                                sx={{
                                                    bgcolor: "#f1f5f9",
                                                    color: "#475569",
                                                    fontWeight: 600,
                                                    fontSize: "0.75rem",
                                                }}
                                            />
                                        )}
                                    </Stack>
                                </Stack>

                                {/* Contact Grid */}
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                                        gap: 1.25,
                                    }}
                                >
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 1.25,
                                            px: 1.5,
                                            borderRadius: "10px",
                                            bgcolor: "#ffffff",
                                            border: "1px solid #e2e8f0",
                                        }}
                                    >
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <PhoneOutlinedIcon sx={{ fontSize: "1rem", color: "#64748b" }} />
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="caption" color="#64748b" sx={{ display: "block" }}>
                                                    Số điện thoại
                                                </Typography>
                                                <Typography variant="body2" fontWeight={700} color="#0f172a" noWrap>
                                                    {supplier?.contactPhone || "—"}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Paper>

                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 1.25,
                                            px: 1.5,
                                            borderRadius: "10px",
                                            bgcolor: "#ffffff",
                                            border: "1px solid #e2e8f0",
                                        }}
                                    >
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <PersonOutlineOutlinedIcon sx={{ fontSize: "1rem", color: "#64748b" }} />
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="caption" color="#64748b" sx={{ display: "block" }}>
                                                    Người liên hệ
                                                </Typography>
                                                <Typography variant="body2" fontWeight={700} color="#0f172a" noWrap>
                                                    {supplier?.contactName || "—"}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Paper>

                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 1.25,
                                            px: 1.5,
                                            borderRadius: "10px",
                                            bgcolor: "#ffffff",
                                            border: "1px solid #e2e8f0",
                                        }}
                                    >
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <EmailOutlinedIcon sx={{ fontSize: "1rem", color: "#64748b" }} />
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="caption" color="#64748b" sx={{ display: "block" }}>
                                                    Email
                                                </Typography>
                                                <Typography variant="body2" fontWeight={700} color="#0f172a" noWrap>
                                                    {supplier?.contactEmail || "—"}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Paper>
                                </Box>

                                {supplier?.address && (
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 0.5 }}>
                                        <LocationOnOutlinedIcon sx={{ fontSize: "1rem", color: "#64748b" }} />
                                        <Typography variant="caption" color="#475569">
                                            {supplier.address}
                                        </Typography>
                                    </Stack>
                                )}
                            </Stack>
                        )}
                    </Paper>

                    {/* Section 1: Supplier Default Import Cost Mismatch */}
                    {priceMismatch && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: "16px",
                                border: "1px solid #fed7aa",
                                bgcolor: "#ffffff",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                            }}
                        >
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                alignItems={{ xs: "flex-start", sm: "center" }}
                                justifyContent="space-between"
                                spacing={1.5}
                                sx={{ mb: 2 }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <LocalOfferOutlinedIcon sx={{ fontSize: "1.2rem", color: "#ea580c" }} />
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                        Giá nhập mặc định của nhà cung cấp
                                    </Typography>
                                    <AdminStatusBadge label="Lệch giá" modifier="admin-status-badge--pending" />
                                </Stack>

                                <Button
                                    size="small"
                                    variant="contained"
                                    disabled={busy || !supplierId}
                                    onClick={() => void handleUpdateImportCost()}
                                    startIcon={
                                        busyKey === "import-cost" ? (
                                            <CircularProgress size={14} color="inherit" />
                                        ) : (
                                            <CheckCircleOutlineIcon />
                                        )
                                    }
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 700,
                                        borderRadius: "8px",
                                        bgcolor: "#2563eb",
                                        px: 2,
                                        "&:hover": { bgcolor: "#1d4ed8" },
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    Cập nhật giá nhập NCC
                                </Button>
                            </Stack>

                            {/* Comparison 3-box Grid */}
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: { xs: "1fr", sm: "1fr auto 1fr auto 1fr" },
                                    alignItems: "center",
                                    gap: 1.5,
                                    p: 2,
                                    borderRadius: "12px",
                                    bgcolor: "#fffbeb",
                                    border: "1px solid #fef3c7",
                                }}
                            >
                                {/* Box 1: System */}
                                <Box sx={{ textAlign: "center", p: 1.5, bgcolor: "#ffffff", borderRadius: "10px", border: "1px solid #fde68a" }}>
                                    <Typography variant="caption" fontWeight={600} color="#78350f" sx={{ display: "block", mb: 0.5 }}>
                                        Giá mặc định hệ thống
                                    </Typography>
                                    <Typography variant="h6" fontWeight={800} color="#92400e">
                                        {formatMoney(priceMismatch.systemImportCost)} <span style={{ fontSize: "0.8rem" }}>VNĐ</span>
                                    </Typography>
                                </Box>

                                {/* Arrow 1 */}
                                <Box sx={{ display: { xs: "none", sm: "flex" }, justifyContent: "center", color: "#d97706" }}>
                                    <ArrowForwardIcon />
                                </Box>

                                {/* Box 2: Actual */}
                                <Box sx={{ textAlign: "center", p: 1.5, bgcolor: "#ffffff", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
                                    <Typography variant="caption" fontWeight={700} color="#1e40af" sx={{ display: "block", mb: 0.5 }}>
                                        Giá thực tế đối soát
                                    </Typography>
                                    <Typography variant="h6" fontWeight={800} color="#2563eb">
                                        {formatMoney(priceMismatch.actualImportCost)} <span style={{ fontSize: "0.8rem" }}>VNĐ</span>
                                    </Typography>
                                </Box>

                                {/* Arrow 2 */}
                                <Box sx={{ display: { xs: "none", sm: "flex" }, justifyContent: "center", color: "#94a3b8" }}>
                                    <Typography variant="body2" fontWeight={800}>=</Typography>
                                </Box>

                                {/* Box 3: Diff */}
                                <Box sx={{ textAlign: "center", p: 1.5, bgcolor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                                    <Typography variant="caption" fontWeight={600} color="#64748b" sx={{ display: "block", mb: 0.5 }}>
                                        Mức chênh lệch
                                    </Typography>
                                    <Typography
                                        variant="subtitle1"
                                        fontWeight={800}
                                        color={priceDiff < 0 ? "#16a34a" : "#dc2626"}
                                    >
                                        {priceDiff > 0 ? `+${formatMoney(priceDiff)}` : formatMoney(priceDiff)} VNĐ
                                    </Typography>
                                    <Typography variant="caption" fontWeight={700} color={priceDiff < 0 ? "#15803d" : "#b91c1c"}>
                                        ({Number(priceDiffPercent) > 0 ? `+${priceDiffPercent}` : priceDiffPercent}%)
                                    </Typography>
                                </Box>
                            </Box>

                            <Typography variant="caption" color="#78350f" sx={{ display: "block", mt: 1.5, fontSize: "0.775rem" }}>
                                💡 Khi cập nhật, giá nhập <strong>{formatMoney(priceMismatch.actualImportCost)} VNĐ</strong> sẽ trở thành giá nhập mặc định của nhà cung cấp <strong>{supplier?.name || supplierName}</strong> trong các giao dịch nhập lô sau này.
                            </Typography>
                        </Paper>
                    )}

                    {/* Section 2: Station Commission Mismatches */}
                    {commissionMismatches.length > 0 && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: "16px",
                                border: "1px solid #bfdbfe",
                                bgcolor: "#ffffff",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                            }}
                        >
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                alignItems={{ xs: "flex-start", sm: "center" }}
                                justifyContent="space-between"
                                spacing={1.5}
                                sx={{ mb: 2 }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <PercentOutlinedIcon sx={{ fontSize: "1.2rem", color: "#2563eb" }} />
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                        Tỷ lệ hoa hồng theo từng nhà đài
                                    </Typography>
                                    <AdminStatusBadge
                                        label={`${commissionMismatches.length} đài lệch`}
                                        modifier="admin-status-badge--active"
                                    />
                                </Stack>

                                {commissionMismatches.length > 1 && (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        disabled={busy}
                                        onClick={() => void handleUpdateCommissions(commissionMismatches)}
                                        startIcon={
                                            busyKey === "commission-all" ? (
                                                <CircularProgress size={14} color="inherit" />
                                            ) : (
                                                <DoneAllIcon />
                                            )
                                        }
                                        sx={{
                                            textTransform: "none",
                                            fontWeight: 700,
                                            borderRadius: "8px",
                                            borderColor: "#93c5fd",
                                            color: "#1d4ed8",
                                            bgcolor: "#eff6ff",
                                            "&:hover": { bgcolor: "#dbeafe", borderColor: "#3b82f6" },
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        Cập nhật tất cả {commissionMismatches.length} đài
                                    </Button>
                                )}
                            </Stack>

                            {/* Table of Station Commissions */}
                            <TableContainer
                                sx={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                    overflow: "hidden",
                                }}
                            >
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: "#f8fafc" }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 800, color: "#475569", py: 1.25 }}>Nhà đài</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 800, color: "#475569", py: 1.25 }}>
                                                Hoa hồng hệ thống
                                            </TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 800, color: "#1e40af", py: 1.25 }}>
                                                Hoa hồng thực tế
                                            </TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 800, color: "#475569", py: 1.25 }}>
                                                Chênh lệch
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, color: "#475569", py: 1.25, width: 140 }}>
                                                Hành động
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {commissionMismatches.map((row) => {
                                            const diffRate = row.actualCommissionRate - row.systemCommissionRate;
                                            const diffRateFormatted = formatPercent(Math.abs(diffRate));
                                            return (
                                                <TableRow key={row.lotteryStationId} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
                                                    <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>
                                                        {row.lotteryStationName}
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ color: "#64748b", fontWeight: 600 }}>
                                                        {formatPercent(row.systemCommissionRate)}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            size="small"
                                                            label={formatPercent(row.actualCommissionRate)}
                                                            sx={{
                                                                bgcolor: "#eff6ff",
                                                                color: "#1d4ed8",
                                                                fontWeight: 800,
                                                                border: "1px solid #bfdbfe",
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography
                                                            variant="caption"
                                                            fontWeight={700}
                                                            color={diffRate > 0 ? "#16a34a" : "#dc2626"}
                                                        >
                                                            {diffRate > 0 ? `+${diffRateFormatted}` : `-${diffRateFormatted}`}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            disabled={busy}
                                                            onClick={() => void handleUpdateCommissions([row])}
                                                            startIcon={
                                                                busyKey === `commission-${row.lotteryStationId}` ? (
                                                                    <CircularProgress size={12} color="inherit" />
                                                                ) : undefined
                                                            }
                                                            sx={{
                                                                textTransform: "none",
                                                                fontWeight: 700,
                                                                fontSize: "0.75rem",
                                                                borderRadius: "6px",
                                                                bgcolor: "#2563eb",
                                                                py: 0.5,
                                                                px: 1.25,
                                                                "&:hover": { bgcolor: "#1d4ed8" },
                                                                whiteSpace: "nowrap",
                                                            }}
                                                        >
                                                            Cập nhật đài này
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}

                    {/* All Synchronized Empty State */}
                    {!priceMismatch && commissionMismatches.length === 0 && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 4,
                                borderRadius: "16px",
                                border: "1px solid #bbf7d0",
                                bgcolor: "#f0fdf4",
                                textAlign: "center",
                            }}
                        >
                            <CheckCircleOutlineIcon sx={{ fontSize: 44, color: "#16a34a", mb: 1 }} />
                            <Typography variant="subtitle1" fontWeight={800} color="#15803d">
                                Dữ liệu giá & hoa hồng đã khớp với hệ thống
                            </Typography>
                            <Typography variant="body2" color="#166534" sx={{ mt: 0.5 }}>
                                Không phát hiện chênh lệch nào giữa số liệu thực tế trên kỳ đối soát và cấu hình hệ thống hiện tại.
                            </Typography>
                        </Paper>
                    )}
                </Stack>
            </DialogContent>

            {/* Dialog Footer Actions */}
            <DialogActions
                sx={{
                    p: 2.25,
                    px: 3,
                    bgcolor: "#ffffff",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1.5,
                }}
            >
                <Box>
                    {totalMismatchCount > 0 ? (
                        <Typography variant="caption" fontWeight={600} color="#64748b">
                            Tổng cộng: <strong style={{ color: "#0f172a" }}>{totalMismatchCount} mục</strong> có chênh lệch cần đồng bộ
                        </Typography>
                    ) : (
                        <Typography variant="caption" color="#16a34a" fontWeight={700}>
                            ✓ Tất cả số liệu đã đồng bộ
                        </Typography>
                    )}
                </Box>

                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Button
                        variant="outlined"
                        onClick={onClose}
                        disabled={busy}
                        sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            color: "#475569",
                            borderColor: "#cbd5e1",
                            borderRadius: "10px",
                            px: 2.5,
                            "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
                        }}
                    >
                        Đóng
                    </Button>

                    {totalMismatchCount > 1 && (
                        <Button
                            variant="contained"
                            disabled={busy}
                            onClick={() => void handleUpdateAll()}
                            startIcon={
                                busyKey === "update-all" ? (
                                    <CircularProgress size={16} color="inherit" />
                                ) : (
                                    <DoneAllIcon />
                                )
                            }
                            sx={{
                                textTransform: "none",
                                fontWeight: 800,
                                borderRadius: "10px",
                                bgcolor: "#2563eb",
                                px: 2.5,
                                "&:hover": { bgcolor: "#1d4ed8" },
                            }}
                        >
                            {busyKey === "update-all" ? "Đang đồng bộ..." : "Cập nhật tất cả vào hệ thống"}
                        </Button>
                    )}
                </Stack>
            </DialogActions>
        </Dialog>
    );
};
