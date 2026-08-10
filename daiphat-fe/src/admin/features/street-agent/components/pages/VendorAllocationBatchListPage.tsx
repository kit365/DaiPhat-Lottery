"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useAppSearchParams } from "@/hooks/useAppSearchParams";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Autocomplete,
    Box,
    Card,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Drawer,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import { Breadcrumb } from "../../../../components/ui/Breadcrumb";
import { Title } from "../../../../components/ui/Title";
import { Button } from "../../../../components/ui/Button";
import { ROUTES } from "../../../../constants/routes";
import { PERMISSIONS } from "../../../../constants/permission.constants";
import { usePermissions } from "../../../../hooks/usePermission";
import { useStreetAgentProfiles } from "../../hooks/useStreetAgent";
import {
    useCancelVendorAllocation,
    useConfirmVendorReturnInspection,
    useOpenVendorAllocationReturnSession,
    useReturnVendorAllocationSerials,
    useSettleVendorAllocation,
    useVendorAllocationBatch,
    useVendorAllocationBatches,
    useVendorSettlementPreview,
} from "../../hooks/useVendorAllocation";
import {
    StreetAgentProfile,
    VendorAllocationBatch,
} from "../../types/street-agent.type";
import {
    ALLOCATION_BATCH_STATUS_FILTER_OPTIONS,
    ALLOCATION_BATCH_STATUS_LABELS,
} from "../configs/constants";
import {
    formatCountdown,
    formatCurrency,
    formatDate,
    formatDateTime,
} from "../../utils/format";
import { ConfirmVendorDepositDialog } from "../ConfirmVendorDepositDialog";
import {
    VendorBatchInfoSection,
    VendorBatchDepositSnapshotSection,
    VendorSettlementBreakdown,
    mapPreviewToBreakdown,
} from "../sections/VendorBatchDrawerSections";

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
    if (status === "HANDED_OVER" || status === "CONFIRMED") return "Chưa quyết toán — chờ mở phiên trả";
    if (status === "RETURN_OPEN") return "Đang nhận trả";
    if (status === "SETTLED") return "Đúng hạn";
    if (status === "LATE_SETTLED") return "Trễ hạn";
    if (status === "CANCELLED" || status === "EXPIRED" || status === "DRAFT") return "Không áp dụng";
    return "Chưa quyết toán";
};

export const VendorAllocationBatchListPage = () => {
    const router = useAdminRouter();
    const [searchParams, setSearchParams] = useAppSearchParams();
    const { can } = usePermissions();
    const canEdit = can(PERMISSIONS.STREET_AGENT.EDIT);

    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [status, setStatus] = useState<string>("");
    const [profile, setProfile] = useState<StreetAgentProfile | null>(null);
    const [businessDateFrom, setBusinessDateFrom] = useState("");
    const [businessDateTo, setBusinessDateTo] = useState("");
    const [nowMs, setNowMs] = useState(Date.now());
    const [detailId, setDetailId] = useState<number | null>(() => {
        const raw = searchParams.get("batchId");
        const parsed = raw ? Number(raw) : NaN;
        return Number.isFinite(parsed) ? parsed : null;
    });
    const [confirmBatch, setConfirmBatch] = useState<VendorAllocationBatch | null>(null);
    const [cancelId, setCancelId] = useState<number | null>(null);
    const [returnSessionId, setReturnSessionId] = useState<number | null>(null);
    const [selectedSerialIds, setSelectedSerialIds] = useState<number[]>([]);
    const [scanInput, setScanInput] = useState("");
    const [previewEnabled, setPreviewEnabled] = useState(false);
    const [settleConfirmOpen, setSettleConfirmOpen] = useState(false);
    const [inspectionConfirmOpen, setInspectionConfirmOpen] = useState(false);
    const [rejectedInspectionSerialIds, setRejectedInspectionSerialIds] = useState<number[]>([]);
    const [inspectionNote, setInspectionNote] = useState("");
    const [cashReceivedFromVendor, setCashReceivedFromVendor] = useState("");
    const [cashPaidToVendor, setCashPaidToVendor] = useState("");

    useEffect(() => {
        const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const current = searchParams.get("batchId");
        const nextId = detailId != null ? String(detailId) : null;
        if ((current ?? null) === nextId) {
            return;
        }
        const next = new URLSearchParams(searchParams);
        if (detailId != null) {
            next.set("batchId", String(detailId));
        } else {
            next.delete("batchId");
        }
        setSearchParams(next, { replace: true });
        // Only sync URL when detailId changes; avoid loops from searchParams identity.
    }, [detailId]);

    useEffect(() => {
        setSelectedSerialIds([]);
        setScanInput("");
        setPreviewEnabled(false);
        setSettleConfirmOpen(false);
        setInspectionConfirmOpen(false);
        setRejectedInspectionSerialIds([]);
        setInspectionNote("");
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
    const { mutate: confirmReturnInspection, isPending: isConfirmingInspection } =
        useConfirmVendorReturnInspection();
    const { mutate: settleBatch, isPending: isSettling } = useSettleVendorAllocation();

    const expectedCashReceived = settlementPreview
        ? (settlementPreview.forcedPurchaseAmount > 0
            ? settlementPreview.additionalAmountDue
            : settlementPreview.grossCashRemitted)
        : 0;
    const expectedCashPaid = settlementPreview
        ? settlementPreview.commissionPayable
            + settlementPreview.depositRefundAmount
            + (settlementPreview.depositExcessRefundAmount || 0)
        : 0;

    useEffect(() => {
        if (!settleConfirmOpen || !settlementPreview) return;
        setCashReceivedFromVendor(String(expectedCashReceived));
        setCashPaidToVendor(String(expectedCashPaid));
    }, [settleConfirmOpen, settlementPreview, expectedCashReceived, expectedCashPaid]);

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
                    toast.success(response.message || "Đã tạo phiếu nhận vé trả, chờ kiểm nhận.");
                    setSelectedSerialIds([]);
                    setPreviewEnabled(false);
                    refetchDetail();
                    refetch();
                },
                onError: (error: any) => {
                    toast.error(getApiErrorMessage(error, "Gửi serial trả thất bại"));
                },
            }
        );
    };

    const openInspectionConfirmation = () => {
        if (!detailBatch) return;
        const pendingSerials = (detailBatch.serials || []).filter(
            (serial) => serial.allocationStatus === "RETURN_PENDING_INSPECTION"
        );
        if (pendingSerials.length === 0) {
            toast.info("Không có serial nào đang chờ kiểm nhận.");
            return;
        }
        setRejectedInspectionSerialIds([]);
        setInspectionNote("");
        setInspectionConfirmOpen(true);
    };

    const handleConfirmInspection = () => {
        if (!detailId) return;
        confirmReturnInspection(
            {
                id: detailId,
                data: {
                    rejectedSerialIds: rejectedInspectionSerialIds,
                    note: inspectionNote.trim() || undefined,
                },
            },
            {
                onSuccess: (response) => {
                    toast.success(response.message || "Đã hoàn tất kiểm nhận vé trả.");
                    setInspectionConfirmOpen(false);
                    setRejectedInspectionSerialIds([]);
                    setInspectionNote("");
                    refetchDetail();
                    refetch();
                },
                onError: (error: any) => {
                    toast.error(getApiErrorMessage(error, "Xác nhận kiểm nhận thất bại"));
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
        const received = Number(cashReceivedFromVendor);
        const paid = Number(cashPaidToVendor);
        if (!Number.isFinite(received) || !Number.isFinite(paid)) {
            toast.error("Nhập số tiền thực nhận và thực chi trước khi quyết toán.");
            return;
        }
        if (received !== expectedCashReceived || paid !== expectedCashPaid) {
            toast.error("Số tiền xác nhận phải khớp với preview quyết toán.");
            return;
        }
        settleBatch({ id: detailId, data: { cashReceivedFromVendor: received, cashPaidToVendor: paid } }, {
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
    const pendingInspectionSerials = (detailBatch?.serials || []).filter(
        (serial) => serial.allocationStatus === "RETURN_PENDING_INSPECTION"
    );

    return (
        <Box sx={{ maxWidth: 1400, mx: "auto", pb: 5 }}>
            <div className="mb-[calc(3*var(--spacing))] flex items-start justify-end gap-[calc(2*var(--spacing))] flex-wrap">
                <div className="mr-auto">
                    <Title title="Phiếu bàn giao vé" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Đại lý bán dạo" },
                            { label: "Phiếu bàn giao vé" },
                        ]}
                    />
                </div>
                <Button
                    variant="contained"
                    onClick={() => router.push(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION)}
                >
                    Tạo bàn giao mới
                </Button>
            </div>

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
                                                {row.depositReceivedAmount != null || row.depositRequiredAmount != null ? (
                                                    <Box sx={{ whiteSpace: "nowrap" }}>
                                                        <Typography variant="caption" color="text.secondary">Cần thu:</Typography> {formatCurrency(row.depositRequiredAmount)}<br />
                                                        <Typography variant="caption" color="text.secondary">Đã thu:</Typography> {formatCurrency(row.depositReceivedAmount)}
                                                    </Box>
                                                ) : "—"}
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
                                                            Mở phiên trả vé
                                                        </Button>
                                                    )}
                                                    {isReturnOpen && (
                                                        <>
                                                            <Button
                                                                size="small"
                                                                onClick={() => setDetailId(row.id)}
                                                            >
                                                                {canEdit ? "Quét trả" : "Xem trả"}
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
                                                            {canEdit && (
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
                                                            )}
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
                        <Stack spacing={3}>
                            <VendorBatchInfoSection batch={detailBatch} profile={profileById.get(detailBatch.streetAgentProfileId)} />
                            <VendorBatchDepositSnapshotSection batch={detailBatch} />

                            <Button
                                variant="contained"
                                color="primary"
                                size="large"
                                onClick={() => router.push(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION_BATCH_DETAIL(detailId!))}
                                fullWidth
                                sx={{ mt: 2 }}
                            >
                                Mở trang xử lý phiếu
                            </Button>
                        </Stack>
                    )}
                </Box>
            </Drawer>

            <Dialog
                open={inspectionConfirmOpen}
                onClose={() => !isConfirmingInspection && setInspectionConfirmOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Kiểm nhận vé vendor trả</DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Các serial không bị đánh dấu từ chối sẽ được nhận vào phiếu trả. Vé bị từ chối vẫn tính là vendor chưa trả khi quyết toán.
                    </Alert>
                    <Stack spacing={0.5} sx={{ maxHeight: 280, overflowY: "auto" }}>
                        {pendingInspectionSerials.map((serial) => {
                            const rejected = rejectedInspectionSerialIds.includes(serial.serialId);
                            return (
                                <Stack key={serial.serialId} direction="row" alignItems="center" spacing={1}>
                                    <Checkbox
                                        checked={rejected}
                                        onChange={() => setRejectedInspectionSerialIds((current) =>
                                            rejected
                                                ? current.filter((id) => id !== serial.serialId)
                                                : [...current, serial.serialId]
                                        )}
                                    />
                                    <Typography variant="body2" sx={{ flex: 1 }}>
                                        {serial.ticketNumbers} · <Box component="span" sx={{ fontFamily: "monospace" }}>{serial.serialNumber}</Box>
                                    </Typography>
                                    <Chip size="small" color={rejected ? "error" : "success"} label={rejected ? "Từ chối" : "Nhận"} />
                                </Stack>
                            );
                        })}
                    </Stack>
                    <TextField
                        label="Ghi chú kiểm nhận"
                        value={inspectionNote}
                        onChange={(event) => setInspectionNote(event.target.value)}
                        fullWidth
                        multiline
                        minRows={2}
                        sx={{ mt: 2 }}
                        helperText="Bắt buộc nhập khi có vé từ chối."
                    />
                </DialogContent>
                <DialogActions>
                    <Button disabled={isConfirmingInspection} onClick={() => setInspectionConfirmOpen(false)}>Hủy</Button>
                    <Button
                        loading={isConfirmingInspection}
                        label="Xác nhận kiểm nhận"
                        loadingLabel="Đang xác nhận..."
                        disabled={rejectedInspectionSerialIds.length > 0 && !inspectionNote.trim()}
                        onClick={handleConfirmInspection}
                    />
                </DialogActions>
            </Dialog>

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
                        <Stack spacing={2.5} sx={{ pt: 1 }}>
                            <VendorSettlementBreakdown {...mapPreviewToBreakdown(settlementPreview)} />
                            <Alert severity="info">
                                Nhập lại số tiền thực tế nhân viên đã thu/chi. Hệ thống chỉ chốt khi khớp preview.
                            </Alert>
                            <TextField
                                autoFocus
                                type="number"
                                label="Tiền thực nhận từ vendor (VNĐ)"
                                value={cashReceivedFromVendor}
                                onChange={(event) => setCashReceivedFromVendor(event.target.value)}
                                inputProps={{ min: 0, step: 1 }}
                                helperText={`Theo preview: ${formatCurrency(expectedCashReceived)}`}
                                fullWidth
                            />
                            <TextField
                                type="number"
                                label="Tiền thực chi cho vendor (VNĐ)"
                                value={cashPaidToVendor}
                                onChange={(event) => setCashPaidToVendor(event.target.value)}
                                inputProps={{ min: 0, step: 1 }}
                                helperText={`Theo preview: ${formatCurrency(expectedCashPaid)}`}
                                fullWidth
                            />
                        </Stack>
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
