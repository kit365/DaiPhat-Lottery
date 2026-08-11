"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useAppSearchParams } from "@/hooks/useAppSearchParams";
import { useEffect, useMemo, useState } from "react";
import {
    Alert, Autocomplete, Box, Card, Dialog, DialogActions, DialogContent,
    DialogTitle, Drawer, FormControl, IconButton, InputLabel, MenuItem, Paper,
    Select, Stack, TextField, Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from "../../../../assets/icons";
import {
    useSettings,
    adminDataGridRowHeightProps,
    adminDataGridRowHeightSx,
    ADMIN_DATAGRID_ROW_MIN_HEIGHT,
    columnsPanelStyles,
    dataGridContainerStyles,
    dataGridStyles,
    filterPanelStyles,
} from "../../../../shared/data-grid";
import { DATA_GRID_LOCALE_VN } from "../../../../../shared/components/DataTable/localeText.config";
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
} from "../configs/constants";
import {
    getVendorAllocationBatchColumns,
    vendorAllocationBatchColumnsInitialState,
} from "../configs/vendorAllocationBatchColumns";
import { VendorAllocationBatchToolbar } from "../configs/vendorAllocationBatchToolbar";
import {
    formatCurrency,
} from "../../utils/format";
import { ConfirmVendorDepositDialog } from "../ConfirmVendorDepositDialog";
import {
    VendorBatchInfoSection,
    VendorBatchDepositSnapshotSection,
    VendorSettlementBreakdown,
    VendorSettlementConfirmationSummary,
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

export const VendorAllocationBatchListPage = () => {
    const router = useAdminRouter();
    const [searchParams, setSearchParams] = useAppSearchParams();
    const { can } = usePermissions();
    const canEdit = can(PERMISSIONS.STREET_AGENT.EDIT);
    const canManage = can(PERMISSIONS.STREET_AGENT.MANAGE);
    const { settings, setSettings } = useSettings();

    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [status, setStatus] = useState<string>("");
    const [search, setSearch] = useState("");
    const [profile, setProfile] = useState<StreetAgentProfile | null>(null);
    const [businessDateFrom, setBusinessDateFrom] = useState("");
    const [businessDateTo, setBusinessDateTo] = useState("");
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
        search: search || undefined,
        profileId: profile?.id,
        status: status || undefined,
        businessDateFrom: businessDateFrom || undefined,
        businessDateTo: businessDateTo || undefined,
    };

    const { data: listData, isLoading, error: listError, refetch } = useVendorAllocationBatches(listParams);
    const rows = listData?.recordList || [];
    const total = listData?.pagination?.totalRecords || 0;

    const { data: detailBatch, isLoading: isLoadingDetail, refetch: refetchDetail } =
        useVendorAllocationBatch(detailId);
    const pendingInspectionCount = (detailBatch?.serials || []).filter(
        (serial) => serial.allocationStatus === "RETURN_PENDING_INSPECTION"
    ).length;
    const hasLoadedSerials = Array.isArray(detailBatch?.serials);
    const {
        data: settlementPreview,
        isLoading: isLoadingPreview,
        isFetching: isFetchingPreview,
        error: previewError,
        refetch: refetchPreview,
    } = useVendorSettlementPreview(
        detailId,
        previewEnabled &&
            detailBatch?.status === "RETURN_OPEN" &&
            hasLoadedSerials &&
            pendingInspectionCount === 0
    );

    const { mutate: cancelDraft, isPending: isCancelling } = useCancelVendorAllocation();
    const { mutate: openReturnSession, isPending: isOpeningReturn } =
        useOpenVendorAllocationReturnSession();
    const { mutate: submitReturns, isPending: isSubmittingReturns } =
        useReturnVendorAllocationSerials();
    const { mutate: confirmReturnInspection, isPending: isConfirmingInspection } =
        useConfirmVendorReturnInspection();
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
                    rejectedSerials: rejectedInspectionSerialIds.map((serialId) => ({
                        serialId,
                        reason: inspectionNote.trim(),
                    })),
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
        if (!detailId || !settlementPreview) return;
        if (selectedSerialIds.length > 0) {
            toast.error(
                `Còn ${selectedSerialIds.length} vé đã chọn chưa gửi trả. Bấm "Gửi trả" trước khi quyết toán.`
            );
            return;
        }
        settleBatch(
            {
                id: detailId,
                data: {
                    settlementFingerprint: settlementPreview.settlementFingerprint,
                    confirmed: true,
                },
            },
            {
                onSuccess: (response) => {
                    toast.success(response.message || "Đã quyết toán phiếu bàn giao.");
                    setSettleConfirmOpen(false);
                    refetchDetail();
                    refetch();
                },
                onError: (error: any) => {
                    if (error?.response?.status === 409) {
                        toast.error("Dữ liệu đã thay đổi, hệ thống đang tính lại...");
                        setSettleConfirmOpen(false);
                        refetchPreview();
                    } else {
                        toast.error(getApiErrorMessage(error, "Quyết toán thất bại"));
                    }
                },
            }
        );
    };

    const columns = useMemo(
        () =>
            getVendorAllocationBatchColumns({
                profileById,
                canEdit,
                canManage,
                onView: (batch) => router.push(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION_BATCH_DETAIL(batch.id)),
                onContinueDraft: continueDraft,
                onConfirmDraft: (batch) => setConfirmBatch(batch),
                onCancelDraft: (batch) => setCancelId(batch.id),
                onOpenReturn: (batch) => setReturnSessionId(batch.id),
                onPreview: (batch) => {
                    router.push(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION_BATCH_DETAIL(batch.id));
                },
                onSettle: (batch) => {
                    router.push(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION_BATCH_DETAIL(batch.id));
                },
            }),
        [canEdit, canManage, profileById, router]
    );

    return (
        <Box sx={{ maxWidth: 1400, mx: "auto", pb: 5 }}>
            <div className="mb-[calc(3*var(--spacing))] flex items-start justify-end gap-[calc(2*var(--spacing))] flex-wrap">
                <div className="mr-auto">
                    <Title title="Phiếu bàn giao vé" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: ROUTES.ADMIN.DASHBOARD.ROOT },
                            { label: "Người bán vé số", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
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
                            <TextField {...params} label="Người bán vé số" sx={fieldSx} />
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

            {listError && (
                <Alert
                    severity="error"
                    sx={{ mb: 3 }}
                    action={
                        <Button color="inherit" size="small" onClick={() => refetch()}>
                            Thử lại
                        </Button>
                    }
                >
                    Không tải được danh sách phiếu bàn giao. Kiểm tra kết nối rồi thử lại.
                </Alert>
            )}

            <Card elevation={0} className="admin-datagrid-card">
                <Box sx={dataGridContainerStyles}>
                    <DataGrid
                        rows={rows}
                        getRowId={(row) => row.id}
                        columns={columns}
                        density={settings.density || "comfortable"}
                        showCellVerticalBorder={settings.showCellBorders}
                        showColumnVerticalBorder={settings.showColumnBorders}
                        showToolbar
                        disableColumnMenu
                        disableColumnSorting
                        slots={{
                            toolbar: VendorAllocationBatchToolbar as any,
                            columnSortedAscendingIcon: SortAscendingIcon,
                            columnSortedDescendingIcon: SortDescendingIcon,
                            columnUnsortedIcon: UnsortedIcon,
                            noRowsOverlay: () => (
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                                    {isLoading ? "Đang tải..." : listError ? "Không tải được dữ liệu" : "Không có phiếu bàn giao vé"}
                                </Box>
                            ),
                        }}
                        slotProps={{
                            columnsManagement: {
                                getTogglableColumns: (gridColumns: any[]) =>
                                    gridColumns.filter((column) => column.field !== "actions").map((column) => column.field),
                            },
                            columnsPanel: { sx: columnsPanelStyles },
                            filterPanel: { sx: filterPanelStyles },
                            toolbar: {
                                settings,
                                onSettingsChange: setSettings,
                                search,
                                onSearchChange: (value: string) => {
                                    setSearch(value);
                                    setPage(1);
                                },
                            } as any,
                        }}
                        localeText={DATA_GRID_LOCALE_VN}
                        pagination
                        paginationMode="server"
                        loading={isLoading}
                        rowCount={total}
                        paginationModel={{ page: Math.max(0, page - 1), pageSize: size }}
                        onPaginationModelChange={(model) => {
                            setPage(model.page + 1);
                            setSize(model.pageSize);
                        }}
                        pageSizeOptions={[10, 20, 50]}
                        initialState={vendorAllocationBatchColumnsInitialState}
                        {...adminDataGridRowHeightProps}
                        disableRowSelectionOnClick
                        className="admin-datagrid"
                        sx={{
                            ...dataGridStyles,
                            ...adminDataGridRowHeightSx,
                            "& .MuiDataGrid-row": {
                                minHeight: `${ADMIN_DATAGRID_ROW_MIN_HEIGHT}px !important`,
                            },
                        } as import("@mui/material/styles").SxProps<import("@mui/material/styles").Theme>}
                    />
                </Box>
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

                            {canEdit && detailBatch.status === "RETURN_OPEN" && pendingInspectionCount > 0 && (
                                <Alert
                                    severity="warning"
                                    sx={{ py: 0.5 }}
                                    action={
                                        <Button
                                            size="small"
                                            color="warning"
                                            variant="contained"
                                            onClick={openInspectionConfirmation}
                                        >
                                            Kiểm nhận {pendingInspectionCount} vé
                                        </Button>
                                    }
                                >
                                    Có {pendingInspectionCount} vé đang chờ kiểm nhận thực tế.
                                </Alert>
                            )}

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
                <DialogTitle>Xác nhận kiểm nhận vé trả</DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Các serial không bị đánh dấu từ chối sẽ được nhận vào phiếu trả. Vé bị từ chối sẽ vẫn tính là đã bán.
                    </Alert>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Danh sách {pendingInspectionCount} vé chờ kiểm nhận:
                        </Typography>
                        <Stack spacing={1} sx={{ maxHeight: 280, overflowY: "auto", p: 0.5 }}>
                            {(detailBatch?.serials || []).filter(s => s.allocationStatus === "RETURN_PENDING_INSPECTION").map((s) => {
                                const rejected = rejectedInspectionSerialIds.includes(s.serialId);
                                return (
                                    <Paper
                                        key={s.serialId}
                                        variant="outlined"
                                        sx={{
                                            p: 1.5,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderColor: rejected ? 'error.main' : 'divider',
                                            bgcolor: rejected ? 'error.50' : 'transparent',
                                            opacity: rejected ? 0.75 : 1
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ flex: 1, textDecoration: rejected ? 'line-through' : 'none' }}>
                                            {s.ticketNumbers} · <Box component="span" sx={{ fontFamily: 'monospace' }}>{s.serialNumber}</Box>
                                        </Typography>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                                            <Typography variant="body2" color={rejected ? 'error.main' : 'success.main'} fontWeight={600}>
                                                {rejected ? "Từ chối" : "Nhận"}
                                            </Typography>
                                            <input
                                                type="checkbox"
                                                checked={rejected}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setRejectedInspectionSerialIds(prev => [...prev, s.serialId]);
                                                    } else {
                                                        setRejectedInspectionSerialIds(prev => prev.filter(id => id !== s.serialId));
                                                    }
                                                }}
                                            />
                                        </label>
                                    </Paper>
                                );
                            })}
                        </Stack>
                    </Box>
                    <TextField
                        size="small"
                        label="Ghi chú kiểm nhận"
                        value={inspectionNote}
                        onChange={(event) => setInspectionNote(event.target.value)}
                        fullWidth
                        multiline
                        minRows={2}
                        error={rejectedInspectionSerialIds.length > 0 && !inspectionNote.trim()}
                        helperText={rejectedInspectionSerialIds.length > 0 && !inspectionNote.trim() ? "Bắt buộc nhập lý do khi có vé từ chối." : "Tuỳ chọn nếu nhận đủ."}
                    />
                </DialogContent>
                <DialogActions>
                    <Button disabled={isConfirmingInspection} onClick={() => setInspectionConfirmOpen(false)}>Hủy</Button>
                    <Button
                        loading={isConfirmingInspection}
                        variant="contained"
                        onClick={handleConfirmInspection}
                        disabled={rejectedInspectionSerialIds.length > 0 && !inspectionNote.trim()}
                    >
                        Xác nhận kiểm nhận
                    </Button>
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
                    >
                        Hủy phiếu
                    </Button>
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
                    >
                        Mở phiên trả
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={settleConfirmOpen} onClose={() => setSettleConfirmOpen(false)}>
                <DialogTitle>Xác nhận quyết toán?</DialogTitle>
                <DialogContent>
                    {settlementPreview ? (
                        <VendorSettlementConfirmationSummary preview={settlementPreview} />
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
