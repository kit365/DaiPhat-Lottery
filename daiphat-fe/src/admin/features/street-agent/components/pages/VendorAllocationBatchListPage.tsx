"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useEffect, useMemo, useState } from "react";
import {
    Alert, Autocomplete, Box, Card, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { Button } from '../../../../components/ui/Button';
import { ROUTES } from "../../../../constants/routes";
import { PERMISSIONS } from "../../../../constants/permission.constants";
import { usePermissions } from "../../../../hooks/usePermission";
import { useStreetAgentProfiles } from "../../hooks/useStreetAgent";
import {
    useCancelVendorAllocation,
    useOpenVendorAllocationReturnSession,
    useReturnVendorAllocationSerials,
    useSettleVendorAllocation,
    useVendorAllocationBatch,
    useVendorAllocationBatches,
    useVendorSettlementPreview,
} from "../../hooks/useVendorAllocation";
import {
    StreetAgentProfile,
    VendorAllocationAllocatedSerial,
    VendorAllocationBatch,
    VendorSettlementPreview,
} from "../../types/street-agent.type";
import {
    ALLOCATION_BATCH_STATUS_FILTER_OPTIONS,
    ALLOCATION_BATCH_STATUS_LABELS,
} from "../configs/constants";
import {
    formatCommission,
    formatCountdown,
    formatCurrency,
    formatDate,
    formatDateTime,
} from "../../utils/format";
import { ConfirmVendorDepositDialog } from "../ConfirmVendorDepositDialog";
import {
    VENDOR_LATE_RETURN_POLICY_LABELS,
    VendorLateReturnPolicyValue,
} from "../../hooks/useVendorSettingsDefaults";

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "var(--shape-borderRadius)",
        fontSize: "0.875rem",
    },
};

const getApiErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || fallback;

const profileLabel = (p?: StreetAgentProfile | null) => {
    if (!p) return "—";
    const name = `${p.lastName || ""} ${p.firstName || ""}`.trim();
    return name + (p.phone ? ` — ${p.phone}` : "");
};

const settlementStatusLabel = (status: string) => {
    if (status === "SETTLED") return "Đúng hạn";
    if (status === "LATE_SETTLED") return "Trễ hạn";
    return "Chưa quyết toán";
};

const latePolicyLabel = (policy?: string | null) => {
    if (!policy) return "—";
    return (
        VENDOR_LATE_RETURN_POLICY_LABELS[policy as VendorLateReturnPolicyValue] ||
        policy
    );
};

const SettlementBreakdown = ({
    allocatedQuantity,
    returnedQuantity,
    soldQuantity,
    grossCashRemitted,
    commissionPayable,
    agencyNetSalesAmount,
    depositRefundAmount,
    depositForfeitedAmount,
    forcedPurchaseAmount,
    additionalAmountDue,
    late,
    latePolicySnapshot,
}: {
    allocatedQuantity?: number | null;
    returnedQuantity?: number | null;
    soldQuantity?: number | null;
    grossCashRemitted?: number | null;
    commissionPayable?: number | null;
    agencyNetSalesAmount?: number | null;
    depositRefundAmount?: number | null;
    depositForfeitedAmount?: number | null;
    forcedPurchaseAmount?: number | null;
    additionalAmountDue?: number | null;
    late?: boolean | null;
    latePolicySnapshot?: string | null;
}) => (
    <Stack spacing={1}>
        <Row label="Tổng vé giao" value={String(allocatedQuantity ?? "—")} />
        <Row label="Vé đã trả" value={String(returnedQuantity ?? "—")} />
        <Row label="Vé được tính đã bán" value={String(soldQuantity ?? "—")} />
        <Row label="Tiền vendor giao lại" value={formatCurrency(grossCashRemitted)} />
        <Row label="Hoa hồng vendor" value={formatCurrency(commissionPayable)} />
        <Row label="Tiền đại lý thực thu" value={formatCurrency(agencyNetSalesAmount)} />
        <Row label="Cọc được hoàn" value={formatCurrency(depositRefundAmount)} />
        <Row label="Cọc bị giữ" value={formatCurrency(depositForfeitedAmount)} />
        <Row label="Giá trị force purchase" value={formatCurrency(forcedPurchaseAmount)} />
        <Row label="Khoản phải thu thêm" value={formatCurrency(additionalAmountDue)} />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
                Đúng hạn / trễ
            </Typography>
            {late == null ? (
                <Typography variant="body2">—</Typography>
            ) : (
                <Chip
                    size="small"
                    color={late ? "warning" : "success"}
                    label={late ? "Trễ hạn" : "Đúng hạn"}
                />
            )}
        </Stack>
        <Row label="Policy nếu trả trễ" value={latePolicyLabel(latePolicySnapshot)} />
    </Stack>
);

const Row = ({ label, value }: { label: string; value: string }) => (
    <Stack direction="row" justifyContent="space-between" gap={2}>
        <Typography variant="body2" color="text.secondary">
            {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right" }}>
            {value}
        </Typography>
    </Stack>
);

export const VendorAllocationBatchListPage = () => {
    const router = useAdminRouter();
    const { can } = usePermissions();
    const canEdit = can(PERMISSIONS.STREET_AGENT.EDIT);

    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [status, setStatus] = useState<string>("");
    const [profile, setProfile] = useState<StreetAgentProfile | null>(null);
    const [businessDateFrom, setBusinessDateFrom] = useState("");
    const [businessDateTo, setBusinessDateTo] = useState("");
    const [nowMs, setNowMs] = useState(Date.now());
    const [detailId, setDetailId] = useState<number | null>(null);
    const [confirmBatch, setConfirmBatch] = useState<VendorAllocationBatch | null>(null);
    const [cancelId, setCancelId] = useState<number | null>(null);
    const [returnSessionId, setReturnSessionId] = useState<number | null>(null);
    const [selectedSerialIds, setSelectedSerialIds] = useState<number[]>([]);
    const [scanInput, setScanInput] = useState("");
    const [previewEnabled, setPreviewEnabled] = useState(false);
    const [settleConfirmOpen, setSettleConfirmOpen] = useState(false);

    useEffect(() => {
        const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        setSelectedSerialIds([]);
        setScanInput("");
        setPreviewEnabled(false);
        setSettleConfirmOpen(false);
    }, [detailId]);

    const { data: profilesRes, isLoading: isLoadingProfiles } = useStreetAgentProfiles({
        page: 1,
        limit: 100,
    });
    const profiles = profilesRes?.data?.recordList || [];
    const profileById = useMemo(() => {
        const map = new Map<number, StreetAgentProfile>();
        profiles.forEach((p) => map.set(p.id, p));
        return map;
    }, [profiles]);

    const listParams = {
        page,
        size,
        profileId: profile?.id,
        status: status || undefined,
        businessDateFrom: businessDateFrom || undefined,
        businessDateTo: businessDateTo || undefined,
    };

    const { data: listData, isLoading, refetch } = useVendorAllocationBatches(listParams);
    const rows = listData?.recordList || [];
    const total = listData?.pagination?.totalRecords || 0;

    const { data: detailBatch, isLoading: isLoadingDetail, refetch: refetchDetail } =
        useVendorAllocationBatch(detailId);
    const {
        data: settlementPreview,
        isLoading: isLoadingPreview,
        isFetching: isFetchingPreview,
        error: previewError,
        refetch: refetchPreview,
    } = useVendorSettlementPreview(
        detailId,
        previewEnabled && detailBatch?.status === "RETURN_OPEN"
    );

    const { mutate: cancelDraft, isPending: isCancelling } = useCancelVendorAllocation();
    const { mutate: openReturnSession, isPending: isOpeningReturn } =
        useOpenVendorAllocationReturnSession();
    const { mutate: submitReturns, isPending: isSubmittingReturns } =
        useReturnVendorAllocationSerials();
    const { mutate: settleBatch, isPending: isSettling } = useSettleVendorAllocation();

    const continueDraft = (batch: VendorAllocationBatch) => {
        const params = new URLSearchParams({
            profileId: String(batch.streetAgentProfileId),
            draftId: String(batch.id),
            businessDate: batch.businessDate,
        });
        router.push(`${ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION}?${params.toString()}`);
    };

    const handleCancel = () => {
        if (!cancelId) return;
        cancelDraft(cancelId, {
            onSuccess: (response) => {
                toast.success(response.message || "Đã hủy phiếu nháp và nhả vé.");
                setCancelId(null);
                refetch();
            },
            onError: (error: any) => {
                toast.error(getApiErrorMessage(error, "Hủy nháp thất bại"));
            },
        });
    };

    const handleOpenReturnSession = (id: number) => {
        openReturnSession(id, {
            onSuccess: (response) => {
                toast.success(response.message || "Đã mở phiên nhận vé trả.");
                setReturnSessionId(null);
                refetch();
                if (detailId === id) refetchDetail();
                setDetailId(id);
            },
            onError: (error: any) => {
                toast.error(getApiErrorMessage(error, "Mở phiên trả vé thất bại"));
            },
        });
    };

    const toggleSerial = (serial: VendorAllocationAllocatedSerial) => {
        if (serial.allocationStatus !== "HANDED_OVER") return;
        setSelectedSerialIds((prev) =>
            prev.includes(serial.serialId)
                ? prev.filter((id) => id !== serial.serialId)
                : [...prev, serial.serialId]
        );
    };

    const handleScanSubmit = () => {
        const raw = scanInput.trim();
        if (!raw || !detailBatch?.serials?.length) return;
        const match = detailBatch.serials.find(
            (s) => s.serialNumber === raw || String(s.serialId) === raw
        );
        if (!match) {
            toast.error("Không tìm thấy serial trong phiếu này. Quét serialNumber hoặc serialId.");
            return;
        }
        if (match.allocationStatus !== "HANDED_OVER") {
            toast.error(
                match.allocationStatus === "RETURNED"
                    ? "Serial này đã được trả."
                    : `Serial không thể trả (trạng thái: ${match.allocationStatus}).`
            );
            return;
        }
        setSelectedSerialIds((prev) =>
            prev.includes(match.serialId) ? prev : [...prev, match.serialId]
        );
        setScanInput("");
    };

    const handleSubmitReturns = () => {
        if (!detailId || selectedSerialIds.length === 0) return;
        submitReturns(
            { id: detailId, data: { serialIds: selectedSerialIds } },
            {
                onSuccess: (response) => {
                    toast.success(response.message || "Đã ghi nhận vé trả.");
                    setSelectedSerialIds([]);
                    setPreviewEnabled(true);
                    refetchDetail();
                    refetch();
                    refetchPreview();
                },
                onError: (error: any) => {
                    toast.error(getApiErrorMessage(error, "Gửi serial trả thất bại"));
                },
            }
        );
    };

    const handleSettle = () => {
        if (!detailId) return;
        if (selectedSerialIds.length > 0) {
            toast.error(
                `Còn ${selectedSerialIds.length} vé đã chọn chưa gửi trả. Bấm "Gửi trả" trước khi quyết toán.`
            );
            return;
        }
        settleBatch(detailId, {
            onSuccess: (response) => {
                toast.success(response.message || "Đã quyết toán phiếu bàn giao.");
                setSettleConfirmOpen(false);
                refetchDetail();
                refetch();
            },
            onError: (error: any) => {
                toast.error(getApiErrorMessage(error, "Quyết toán thất bại"));
            },
        });
    };

    const selectAllReturnable = () => {
        if (!detailBatch?.serials?.length) return;
        setSelectedSerialIds(
            detailBatch.serials
                .filter((s) => s.allocationStatus === "HANDED_OVER")
                .map((s) => s.serialId)
        );
    };

    const previewErrorMessage =
        (previewError as any)?.response?.data?.message ||
        (previewError ? "Không tải được preview quyết toán." : null);

    const settledReadonly =
        detailBatch?.status === "SETTLED" || detailBatch?.status === "LATE_SETTLED";

    return (
        <Box sx={{ maxWidth: 1400, mx: "auto", pb: 5 }}>
            <PageHeader
                title="Phiếu bàn giao vé"
                breadcrumbItems={[
                    { label: "Dashboard", to: "/" },
                    { label: "Đại lý bán dạo", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
                    { label: "Phiếu bàn giao vé" },
                ]}
                action={
                    <Button
                        variant="contained"
                        onClick={() => router.push(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION)}
                    >
                        Tạo bàn giao mới
                    </Button>
                }
            />

            <Card
                sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: "var(--shape-borderRadius-lg)",
                    boxShadow: "var(--customShadows-card)",
                }}
            >
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr 1fr" },
                        gap: 2,
                    }}
                >
                    <Autocomplete
                        options={profiles}
                        loading={isLoadingProfiles}
                        value={profile}
                        onChange={(_e, value) => {
                            setProfile(value);
                            setPage(1);
                        }}
                        getOptionLabel={profileLabel}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        renderInput={(params) => (
                            <TextField {...params} label="Đại lý" sx={fieldSx} />
                        )}
                    />
                    <FormControl fullWidth size="small">
                        <InputLabel>Trạng thái</InputLabel>
                        <Select
                            label="Trạng thái"
                            value={status}
                            onChange={(e) => {
                                setStatus(e.target.value);
                                setPage(1);
                            }}
                        >
                            <MenuItem value="">Tất cả</MenuItem>
                            {ALLOCATION_BATCH_STATUS_FILTER_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        type="date"
                        label="Từ ngày"
                        value={businessDateFrom}
                        onChange={(e) => {
                            setBusinessDateFrom(e.target.value);
                            setPage(1);
                        }}
                        InputLabelProps={{ shrink: true }}
                        sx={fieldSx}
                    />
                    <TextField
                        type="date"
                        label="Đến ngày"
                        value={businessDateTo}
                        onChange={(e) => {
                            setBusinessDateTo(e.target.value);
                            setPage(1);
                        }}
                        InputLabelProps={{ shrink: true }}
                        sx={fieldSx}
                    />
                </Box>
            </Card>

            <Card
                sx={{
                    borderRadius: "var(--shape-borderRadius-lg)",
                    boxShadow: "var(--customShadows-card)",
                    overflow: "hidden",
                }}
            >
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Mã phiếu</TableCell>
                                <TableCell>Đại lý</TableCell>
                                <TableCell>Ngày KD</TableCell>
                                <TableCell>Trạng thái</TableCell>
                                <TableCell align="right">Đã giao</TableCell>
                                <TableCell align="right">Đã trả</TableCell>
                                <TableCell align="right">Đã bán</TableCell>
                                <TableCell align="right">Cọc</TableCell>
                                <TableCell align="right">Tiền phải giao</TableCell>
                                <TableCell>Trạng thái quyết toán</TableCell>
                                <TableCell>Hết hạn giữ</TableCell>
                                <TableCell align="right">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={12}>
                                        <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                                            Đang tải...
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={12}>
                                        <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                                            Chưa có phiếu bàn giao.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row) => {
                                    const isDraft = row.status === "DRAFT";
                                    const isConfirmed = row.status === "CONFIRMED";
                                    const isReturnOpen = row.status === "RETURN_OPEN";
                                    const isTerminal =
                                        row.status === "SETTLED" || row.status === "LATE_SETTLED";
                                    return (
                                        <TableRow key={row.id} hover>
                                            <TableCell sx={{ fontWeight: 600 }}>{row.batchCode}</TableCell>
                                            <TableCell>
                                                {profileLabel(profileById.get(row.streetAgentProfileId))}
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    #{row.streetAgentProfileId}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{formatDate(row.businessDate)}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={
                                                        ALLOCATION_BATCH_STATUS_LABELS[row.status] ||
                                                        row.status
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell align="right">{row.allocatedQuantity}</TableCell>
                                            <TableCell align="right">{row.returnedQuantity ?? 0}</TableCell>
                                            <TableCell align="right">{row.soldQuantity ?? 0}</TableCell>
                                            <TableCell align="right">
                                                {row.depositReceivedAmount != null ||
                                                row.depositRequiredAmount != null
                                                    ? `${formatCurrency(row.depositReceivedAmount)} / ${formatCurrency(
                                                          row.depositRequiredAmount
                                                      )}`
                                                    : "—"}
                                            </TableCell>
                                            <TableCell align="right">
                                                {isTerminal
                                                    ? formatCurrency(row.grossCashRemitted)
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>{settlementStatusLabel(row.status)}</TableCell>
                                            <TableCell>
                                                {isDraft ? (
                                                    <Stack spacing={0.25}>
                                                        <Typography variant="body2">
                                                            {formatCountdown(row.reservationExpiresAt, nowMs)}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {formatDateTime(row.reservationExpiresAt)}
                                                        </Typography>
                                                    </Stack>
                                                ) : (
                                                    "—"
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    justifyContent="flex-end"
                                                    flexWrap="wrap"
                                                    useFlexGap
                                                >
                                                    {isDraft && (
                                                        <Button size="small" onClick={() => continueDraft(row)}>
                                                            Tiếp tục
                                                        </Button>
                                                    )}
                                                    {isDraft && canEdit && (
                                                        <Button
                                                            size="small"
                                                            color="success"
                                                            onClick={() => setConfirmBatch(row)}
                                                        >
                                                            Xác nhận
                                                        </Button>
                                                    )}
                                                    {isDraft && canEdit && (
                                                        <Button
                                                            size="small"
                                                            color="error"
                                                            onClick={() => setCancelId(row.id)}
                                                        >
                                                            Hủy
                                                        </Button>
                                                    )}
                                                    {isConfirmed && canEdit && (
                                                        <Button
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => setReturnSessionId(row.id)}
                                                        >
                                                            Mở phiên trả
                                                        </Button>
                                                    )}
                                                    {isReturnOpen && (
                                                        <>
                                                            <Button
                                                                size="small"
                                                                onClick={() => setDetailId(row.id)}
                                                            >
                                                                Quét trả
                                                            </Button>
                                                            <Button
                                                                size="small"
                                                                onClick={() => {
                                                                    setDetailId(row.id);
                                                                    setPreviewEnabled(true);
                                                                }}
                                                            >
                                                                Preview
                                                            </Button>
                                                            <Button
                                                                size="small"
                                                                color="success"
                                                                onClick={() => {
                                                                    setDetailId(row.id);
                                                                    setPreviewEnabled(true);
                                                                }}
                                                            >
                                                                Quyết toán
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => setDetailId(row.id)}
                                                    >
                                                        Chi tiết
                                                    </Button>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={total}
                    page={Math.max(0, page - 1)}
                    onPageChange={(_e, next) => setPage(next + 1)}
                    rowsPerPage={size}
                    onRowsPerPageChange={(e) => {
                        setSize(Number(e.target.value));
                        setPage(1);
                    }}
                    rowsPerPageOptions={[10, 20, 50]}
                    labelRowsPerPage="Mỗi trang"
                />
            </Card>

            <Drawer
                anchor="right"
                open={!!detailId}
                onClose={() => setDetailId(null)}
                PaperProps={{ sx: { width: { xs: "100%", sm: 520 } } }}
            >
                <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="h6">Chi tiết phiếu</Typography>
                    <IconButton onClick={() => setDetailId(null)}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Box sx={{ px: 2, pb: 3 }}>
                    {isLoadingDetail || !detailBatch ? (
                        <Typography color="text.secondary">Đang tải...</Typography>
                    ) : (
                        <Stack spacing={2}>
                            <Typography>
                                <strong>Mã:</strong> {detailBatch.batchCode}
                            </Typography>
                            <Typography>
                                <strong>Trạng thái:</strong>{" "}
                                {ALLOCATION_BATCH_STATUS_LABELS[detailBatch.status] || detailBatch.status}
                            </Typography>
                            <Typography>
                                <strong>Ngày KD:</strong> {formatDate(detailBatch.businessDate)}
                            </Typography>
                            <Typography>
                                <strong>Đại lý:</strong>{" "}
                                {profileLabel(profileById.get(detailBatch.streetAgentProfileId))}
                            </Typography>

                            <Divider />
                            <Typography variant="subtitle2">Số lượng</Typography>
                            <Row label="Đã giao" value={String(detailBatch.allocatedQuantity)} />
                            <Row label="Đã trả" value={String(detailBatch.returnedQuantity ?? 0)} />
                            <Row label="Đã bán" value={String(detailBatch.soldQuantity ?? 0)} />

                            <Divider />
                            <Typography variant="subtitle2">Cọc & snapshot</Typography>
                            <Row
                                label="Mệnh giá snapshot"
                                value={formatCurrency(detailBatch.faceValueSnapshot)}
                            />
                            <Row
                                label="Giá vendor snapshot"
                                value={formatCurrency(detailBatch.vendorUnitPriceSnapshot)}
                            />
                            <Row
                                label="Tỷ lệ cọc snapshot"
                                value={formatCommission(detailBatch.depositRateSnapshot)}
                            />
                            <Row
                                label="Cọc cần thu"
                                value={formatCurrency(detailBatch.depositRequiredAmount)}
                            />
                            <Row
                                label="Cọc thực nhận"
                                value={formatCurrency(detailBatch.depositReceivedAmount)}
                            />
                            <Row
                                label="Số dư cọc trước"
                                value={formatCurrency(detailBatch.depositBalanceBefore)}
                            />
                            <Row
                                label="Số dư cọc sau"
                                value={formatCurrency(detailBatch.depositBalanceAfter)}
                            />
                            <Row
                                label="Giờ chốt trả"
                                value={detailBatch.returnCutoffSnapshot || "—"}
                            />
                            <Row
                                label="Policy trả trễ"
                                value={latePolicyLabel(detailBatch.latePolicySnapshot)}
                            />
                            {detailBatch.depositReceivedAt && (
                                <Row
                                    label="Nhận cọc lúc"
                                    value={formatDateTime(detailBatch.depositReceivedAt)}
                                />
                            )}
                            {detailBatch.settledAt && (
                                <Row label="Quyết toán lúc" value={formatDateTime(detailBatch.settledAt)} />
                            )}
                            {detailBatch.reservationExpiresAt && detailBatch.status === "DRAFT" && (
                                <Row
                                    label="Hết hạn giữ"
                                    value={formatDateTime(detailBatch.reservationExpiresAt)}
                                />
                            )}

                            {detailBatch.status === "CONFIRMED" && canEdit && (
                                <>
                                    <Divider />
                                    <Button
                                        loading={isOpeningReturn}
                                        label="Mở phiên trả vé"
                                        loadingLabel="Đang mở..."
                                        onClick={() => handleOpenReturnSession(detailBatch.id)}
                                    />
                                </>
                            )}

                            {detailBatch.status === "RETURN_OPEN" && (
                                <>
                                    <Divider />
                                    <Typography variant="subtitle2">Quét / chọn serial trả</Typography>
                                    <Alert severity="info" sx={{ py: 0.5 }}>
                                        Tick checkbox chỉ chọn tạm. Phải bấm <strong>Gửi trả</strong> để
                                        ghi nhận về kho — quyết toán mới cập nhật &quot;Vé đã trả&quot;.
                                    </Alert>
                                    <TextField
                                        label="Nhập / quét serial"
                                        value={scanInput}
                                        onChange={(e) => setScanInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleScanSubmit();
                                            }
                                        }}
                                        helperText="Nhập serialNumber hoặc serialId rồi Enter. Chỉ chọn được serial đang HANDED_OVER."
                                        sx={fieldSx}
                                        fullWidth
                                        size="small"
                                    />
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={selectAllReturnable}
                                            disabled={
                                                !(detailBatch.serials || []).some(
                                                    (s) => s.allocationStatus === "HANDED_OVER"
                                                )
                                            }
                                        >
                                            Chọn tất cả còn giữ
                                        </Button>
                                        <Button
                                            loading={isSubmittingReturns}
                                            variant="contained"
                                            label={`Gửi trả (${selectedSerialIds.length})`}
                                            loadingLabel="Đang gửi..."
                                            disabled={selectedSerialIds.length === 0}
                                            onClick={handleSubmitReturns}
                                            sx={{ flex: 1, minWidth: 140 }}
                                        />
                                        <Button
                                            variant="outlined"
                                            disabled={selectedSerialIds.length === 0}
                                            onClick={() => setSelectedSerialIds([])}
                                        >
                                            Bỏ chọn
                                        </Button>
                                    </Stack>
                                    {selectedSerialIds.length > 0 && (
                                        <Alert severity="warning" sx={{ py: 0.5 }}>
                                            Đã chọn {selectedSerialIds.length} vé chưa gửi. Bấm{" "}
                                            <strong>Gửi trả</strong> trước khi xem preview / quyết toán.
                                        </Alert>
                                    )}
                                </>
                            )}

                            <Typography variant="subtitle2" sx={{ pt: 1 }}>
                                Serial ({detailBatch.serials?.length || 0})
                            </Typography>
                            <TableContainer sx={{ maxHeight: 280 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {detailBatch.status === "RETURN_OPEN" && (
                                                <TableCell padding="checkbox" />
                                            )}
                                            <TableCell>Số vé</TableCell>
                                            <TableCell>Serial</TableCell>
                                            <TableCell>Trạng thái</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(detailBatch.serials || []).map((s) => {
                                            const selectable = s.allocationStatus === "HANDED_OVER";
                                            const pendingSelected = selectedSerialIds.includes(s.serialId);
                                            const returned = s.allocationStatus === "RETURNED";
                                            return (
                                                <TableRow
                                                    key={s.serialId}
                                                    hover={selectable}
                                                    selected={pendingSelected}
                                                    onClick={() =>
                                                        detailBatch.status === "RETURN_OPEN" &&
                                                        toggleSerial(s)
                                                    }
                                                    sx={{
                                                        cursor:
                                                            detailBatch.status === "RETURN_OPEN" &&
                                                            selectable
                                                                ? "pointer"
                                                                : "default",
                                                        opacity:
                                                            detailBatch.status === "RETURN_OPEN" &&
                                                            !selectable &&
                                                            !returned
                                                                ? 0.55
                                                                : 1,
                                                    }}
                                                >
                                                    {detailBatch.status === "RETURN_OPEN" && (
                                                        <TableCell padding="checkbox">
                                                            <Checkbox
                                                                size="small"
                                                                checked={pendingSelected || returned}
                                                                disabled={!selectable}
                                                                onChange={() => toggleSerial(s)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </TableCell>
                                                    )}
                                                    <TableCell>{s.ticketNumbers}</TableCell>
                                                    <TableCell sx={{ fontFamily: "monospace" }}>
                                                        {s.serialNumber}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack spacing={0.25}>
                                                            <Chip
                                                                size="small"
                                                                label={
                                                                    returned
                                                                        ? "Đã trả"
                                                                        : pendingSelected
                                                                          ? "Chờ gửi trả"
                                                                          : s.allocationStatus
                                                                }
                                                                color={
                                                                    returned
                                                                        ? "success"
                                                                        : pendingSelected
                                                                          ? "warning"
                                                                          : "default"
                                                                }
                                                                variant="outlined"
                                                            />
                                                            {s.returnedAt && (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                >
                                                                    {formatDateTime(s.returnedAt)}
                                                                </Typography>
                                                            )}
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {(detailBatch.status === "RETURN_OPEN" || settledReadonly) && (
                                <>
                                    <Divider />
                                    <Stack
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        flexWrap="wrap"
                                        gap={1}
                                    >
                                        <Typography variant="subtitle2">Quyết toán</Typography>
                                        {detailBatch.status === "RETURN_OPEN" && (
                                            <Button
                                                size="small"
                                                onClick={() => {
                                                    setPreviewEnabled(true);
                                                    refetchPreview();
                                                }}
                                                disabled={isLoadingPreview || isFetchingPreview}
                                            >
                                                {previewEnabled ? "Tải lại preview" : "Xem trước quyết toán"}
                                            </Button>
                                        )}
                                    </Stack>

                                    {detailBatch.status === "RETURN_OPEN" && previewErrorMessage && (
                                        <Alert severity="error">{previewErrorMessage}</Alert>
                                    )}

                                    {detailBatch.status === "RETURN_OPEN" &&
                                        previewEnabled &&
                                        (isLoadingPreview || isFetchingPreview) && (
                                            <Typography color="text.secondary">
                                                Đang tải preview...
                                            </Typography>
                                        )}

                                    {detailBatch.status === "RETURN_OPEN" &&
                                        settlementPreview &&
                                        !(isLoadingPreview || isFetchingPreview) && (
                                            <SettlementBreakdown
                                                {...mapPreviewToBreakdown(settlementPreview)}
                                            />
                                        )}

                                    {settledReadonly && (
                                        <SettlementBreakdown
                                            allocatedQuantity={detailBatch.allocatedQuantity}
                                            returnedQuantity={detailBatch.returnedQuantity}
                                            soldQuantity={detailBatch.soldQuantity}
                                            grossCashRemitted={detailBatch.grossCashRemitted}
                                            commissionPayable={detailBatch.commissionPayable}
                                            depositRefundAmount={detailBatch.depositRefundAmount}
                                            depositForfeitedAmount={detailBatch.depositForfeitedAmount}
                                            forcedPurchaseAmount={detailBatch.forcedPurchaseAmount}
                                            additionalAmountDue={detailBatch.additionalAmountDue}
                                            late={detailBatch.status === "LATE_SETTLED"}
                                            latePolicySnapshot={detailBatch.latePolicySnapshot}
                                        />
                                    )}

                                    {detailBatch.status === "RETURN_OPEN" && canEdit && (
                                        <Button
                                            loading={isSettling}
                                            label="Quyết toán"
                                            loadingLabel="Đang quyết toán..."
                                            disabled={
                                                !settlementPreview ||
                                                isLoadingPreview ||
                                                selectedSerialIds.length > 0
                                            }
                                            onClick={() => setSettleConfirmOpen(true)}
                                        />
                                    )}
                                    {detailBatch.status === "RETURN_OPEN" &&
                                        selectedSerialIds.length > 0 && (
                                            <Typography variant="caption" color="warning.main">
                                                Gửi trả {selectedSerialIds.length} vé đã chọn trước khi quyết
                                                toán.
                                            </Typography>
                                        )}
                                </>
                            )}
                        </Stack>
                    )}
                </Box>
            </Drawer>

            <ConfirmVendorDepositDialog
                open={!!confirmBatch}
                batch={confirmBatch}
                profile={
                    confirmBatch
                        ? profileById.get(confirmBatch.streetAgentProfileId) || null
                        : null
                }
                onClose={() => setConfirmBatch(null)}
                onSuccess={() => {
                    setConfirmBatch(null);
                    refetch();
                }}
            />

            <Dialog open={!!cancelId} onClose={() => setCancelId(null)}>
                <DialogTitle>Hủy phiếu nháp?</DialogTitle>
                <DialogContent>
                    Vé đang giữ sẽ được nhả về kho. Thao tác không hoàn tác.
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCancelId(null)}>Đóng</Button>
                    <Button
                        loading={isCancelling}
                        color="error"
                        variant="contained"
                        onClick={handleCancel}
                        label="Hủy phiếu"
                        loadingLabel="Đang hủy..."
                    />
                </DialogActions>
            </Dialog>

            <Dialog open={!!returnSessionId} onClose={() => setReturnSessionId(null)}>
                <DialogTitle>Mở phiên trả vé?</DialogTitle>
                <DialogContent>
                    Phiếu sẽ chuyển sang trạng thái đang trả vé để quét serial trả về.
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReturnSessionId(null)}>Đóng</Button>
                    <Button
                        loading={isOpeningReturn}
                        variant="contained"
                        onClick={() => returnSessionId && handleOpenReturnSession(returnSessionId)}
                        label="Mở phiên trả"
                        loadingLabel="Đang mở..."
                    />
                </DialogActions>
            </Dialog>

            <Dialog open={settleConfirmOpen} onClose={() => setSettleConfirmOpen(false)}>
                <DialogTitle>Xác nhận quyết toán?</DialogTitle>
                <DialogContent>
                    {settlementPreview ? (
                        <SettlementBreakdown {...mapPreviewToBreakdown(settlementPreview)} />
                    ) : (
                        <Typography>
                            Hệ thống sẽ chốt số vé bán/trả và cập nhật số dư cọc theo snapshot của phiếu.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSettleConfirmOpen(false)}>Đóng</Button>
                    <Button
                        loading={isSettling}
                        variant="contained"
                        onClick={handleSettle}
                        disabled={detailBatch?.status !== "RETURN_OPEN"}
                        label="Quyết toán"
                        loadingLabel="Đang quyết toán..."
                    />
                </DialogActions>
            </Dialog>

            <Alert severity="info" sx={{ mt: 2 }}>
                Phiếu nháp hết hạn sẽ tự chuyển sang &quot;Hết hạn giữ chỗ&quot; và nhả vé theo TTL cấu hình hệ thống.
                Số liệu quyết toán lấy từ BE — không tính lại trên FE.
            </Alert>
        </Box>
    );
};

const mapPreviewToBreakdown = (preview: VendorSettlementPreview) => ({
    allocatedQuantity: preview.allocatedQuantity,
    returnedQuantity: preview.returnedQuantity,
    soldQuantity: preview.soldQuantity,
    grossCashRemitted: preview.grossCashRemitted,
    commissionPayable: preview.commissionPayable,
    agencyNetSalesAmount: preview.agencyNetSalesAmount,
    depositRefundAmount: preview.depositRefundAmount,
    depositForfeitedAmount: preview.depositForfeitedAmount,
    forcedPurchaseAmount: preview.forcedPurchaseAmount,
    additionalAmountDue: preview.additionalAmountDue,
    late: preview.late,
    latePolicySnapshot: preview.latePolicySnapshot,
});
