"use client";

import { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { bulkUpdateStationCommissions } from "../../../../station/services/stationService";
import { QUERY_KEYS as STATION_QUERY_KEYS } from "../../../../station/constants/queryKeys";
import { updateSupplierDefaultImportCost } from "../../../../supplier/services/supplierService";
import { QUERY_KEYS as SUPPLIER_QUERY_KEYS } from "../../../../supplier/constants/queryKeys";
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
            AppToast.success("Đã cập nhật giá nhập mặc định của nhà cung cấp.");
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
                    ? `Đã cập nhật hoa hồng đài ${rows[0].lotteryStationName}.`
                    : `Đã cập nhật hoa hồng ${rows.length} đài.`
            );
            await invalidateMaster();
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || err?.message || "Cập nhật hoa hồng đài thất bại.");
        } finally {
            setBusyKey(null);
        }
    };

    const busy = Boolean(busyKey);

    return (
        <Dialog
            open={open}
            onClose={busy ? undefined : onClose}
            maxWidth="sm"
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
            <DialogTitle
                sx={{
                    p: 3,
                    pb: 2,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 2,
                }}
            >
                <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                        sx={{
                            width: 46,
                            height: 46,
                            borderRadius: "14px",
                            bgcolor: "#eff6ff",
                            color: "#2563eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            border: "1px solid #bfdbfe",
                        }}
                    >
                        <LocalOfferOutlinedIcon sx={{ fontSize: 26 }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={800} color="#0f172a">
                            Cập nhật giá / hoa hồng hệ thống
                        </Typography>
                        <Typography variant="caption" color="#64748b">
                            {supplierName || "Nhà cung cấp"} · chỉ ghi master, không đổi giá bán đài
                        </Typography>
                    </Box>
                </Stack>
                <IconButton
                    size="small"
                    onClick={onClose}
                    disabled={busy}
                    sx={{
                        color: "#94a3b8",
                        bgcolor: "#f1f5f9",
                        "&:hover": { bgcolor: "#e2e8f0", color: "#334155" },
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ px: 3, py: 1.5 }}>
                <Stack spacing={1.75}>
                    <Alert
                        severity="info"
                        icon={<InfoOutlinedIcon fontSize="inherit" />}
                        sx={{ borderRadius: "12px", bgcolor: "#eff6ff", color: "#1e40af" }}
                    >
                        Số liệu thực tế trên kỳ đối soát vẫn giữ nguyên. Nút dưới đây chỉ cập nhật giá nhập mặc định
                        của NCC hoặc hoa hồng từng đài để lần sau khớp hệ thống.
                    </Alert>

                    {priceMismatch && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: "12px",
                                border: "1px solid #fde68a",
                                bgcolor: "#fffbeb",
                            }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <LocalOfferOutlinedIcon sx={{ fontSize: "1.1rem", color: "#b45309" }} />
                                <Typography variant="subtitle2" fontWeight={800} color="#92400e">
                                    Giá nhập nhà cung cấp
                                </Typography>
                                <AdminStatusBadge label="Lệch" modifier="admin-status-badge--pending" />
                            </Stack>
                            <Typography variant="caption" color="#92400e" sx={{ display: "block", mb: 1.25 }}>
                                Hệ thống {formatMoney(priceMismatch.systemImportCost)} VNĐ → Thực tế{" "}
                                <strong>{formatMoney(priceMismatch.actualImportCost)} VNĐ</strong>
                            </Typography>
                            <Button
                                size="small"
                                variant="contained"
                                disabled={busy || !supplierId}
                                onClick={() => void handleUpdateImportCost()}
                                startIcon={
                                    busyKey === "import-cost" ? (
                                        <CircularProgress size={14} color="inherit" />
                                    ) : undefined
                                }
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 800,
                                    borderRadius: "8px",
                                    bgcolor: "#2563eb",
                                    "&:hover": { bgcolor: "#1d4ed8" },
                                }}
                            >
                                Cập nhật giá nhập NCC
                            </Button>
                        </Paper>
                    )}

                    {commissionMismatches.length > 0 && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: "12px",
                                border: "1px solid #bfdbfe",
                                bgcolor: "#f8fbff",
                            }}
                        >
                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                justifyContent="space-between"
                                sx={{ mb: 1.25 }}
                                flexWrap="wrap"
                                useFlexGap
                            >
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <PercentOutlinedIcon sx={{ fontSize: "1.1rem", color: "#1d4ed8" }} />
                                    <Typography variant="subtitle2" fontWeight={800} color="#1e40af">
                                        Hoa hồng theo đài
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
                                            ) : undefined
                                        }
                                        sx={{
                                            textTransform: "none",
                                            fontWeight: 700,
                                            borderRadius: "8px",
                                            borderColor: "#93c5fd",
                                            color: "#1d4ed8",
                                        }}
                                    >
                                        Cập nhật tất cả đài
                                    </Button>
                                )}
                            </Stack>
                            <Stack spacing={1}>
                                {commissionMismatches.map((row) => (
                                    <Stack
                                        key={row.lotteryStationId}
                                        direction={{ xs: "column", sm: "row" }}
                                        spacing={1}
                                        alignItems={{ xs: "flex-start", sm: "center" }}
                                        justifyContent="space-between"
                                        sx={{
                                            p: 1.25,
                                            borderRadius: "10px",
                                            bgcolor: "#ffffff",
                                            border: "1px solid #e2e8f0",
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="body2" fontWeight={800} color="#0f172a">
                                                {row.lotteryStationName}
                                            </Typography>
                                            <Typography variant="caption" color="#64748b">
                                                Hệ thống {formatPercent(row.systemCommissionRate)} → Thực tế{" "}
                                                <strong>{formatPercent(row.actualCommissionRate)}</strong>
                                            </Typography>
                                        </Box>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            disabled={busy}
                                            onClick={() => void handleUpdateCommissions([row])}
                                            startIcon={
                                                busyKey === `commission-${row.lotteryStationId}` ? (
                                                    <CircularProgress size={14} color="inherit" />
                                                ) : undefined
                                            }
                                            sx={{
                                                textTransform: "none",
                                                fontWeight: 800,
                                                borderRadius: "8px",
                                                bgcolor: "#2563eb",
                                                "&:hover": { bgcolor: "#1d4ed8" },
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            Cập nhật hoa hồng đài
                                        </Button>
                                    </Stack>
                                ))}
                            </Stack>
                        </Paper>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions
                sx={{
                    p: 2.5,
                    px: 3,
                    bgcolor: "#f8fafc",
                    borderTop: "1px solid #e2e8f0",
                }}
            >
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
                    }}
                >
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
};
