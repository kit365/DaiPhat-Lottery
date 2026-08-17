"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useCallback, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Alert, Box, Card, Typography } from "@mui/material";
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
import { DATA_GRID_LOCALE_VN } from "@/admin/components/data-grid/localeText.config";
import { toast } from "react-toastify";
import { Breadcrumb } from "../../../../components/ui/Breadcrumb";
import { Title } from "../../../../components/ui/Title";
import { Button } from "../../../../components/ui/Button";
import { AdminConfirmDialog } from "../../../../components/ui/AdminConfirmDialog";
import { ROUTES } from "../../../../constants/routes";
import { PERMISSIONS } from "../../../../constants/permission.constants";
import { usePermissions } from "../../../../hooks/usePermission";
import { getStreetAgentProfileById } from "../../services/streetAgentService";
import { QUERY_KEYS } from "../../constants/queryKeys";
import {
    useCancelVendorAllocation,
    useOpenVendorAllocationReturnSession,
    useVendorAllocationBatches,
} from "../../hooks/useVendorAllocation";
import {
    StreetAgentProfile,
    VendorAllocationBatch,
} from "../../types/street-agent.type";
import {
    getVendorAllocationBatchColumns,
    vendorAllocationBatchColumnsInitialState,
} from "../configs/vendorAllocationBatchColumns";
import { VendorAllocationBatchToolbar } from "../configs/vendorAllocationBatchToolbar";
import {
    parseDisplayDateToApi,
} from "../../utils/format";
import { ConfirmVendorDepositDialog } from "../ConfirmVendorDepositDialog";

const getApiErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || fallback;

const profileLabel = (p?: StreetAgentProfile | null) => {
    if (!p) return "—";
    const name = `${p.lastName || ""} ${p.firstName || ""}`.trim();
    return name + (p.phone ? ` — ${p.phone}` : "");
};

export const VendorAllocationBatchListPage = () => {
    const router = useAdminRouter();
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
    const [confirmBatch, setConfirmBatch] = useState<VendorAllocationBatch | null>(null);
    const [cancelId, setCancelId] = useState<number | null>(null);
    const [returnSessionId, setReturnSessionId] = useState<number | null>(null);
    const [profileCache, setProfileCache] = useState<Map<number, StreetAgentProfile>>(new Map());

    const handleProfilesLoaded = useCallback((profiles: StreetAgentProfile[]) => {
        setProfileCache((prev) => {
            const next = new Map(prev);
            profiles.forEach((item) => next.set(item.id, item));
            return next;
        });
    }, []);

    const listParams = {
        page,
        size,
        search: search || undefined,
        profileId: profile?.id,
        status: status || undefined,
        businessDateFrom: parseDisplayDateToApi(businessDateFrom) || undefined,
        businessDateTo: parseDisplayDateToApi(businessDateTo) || undefined,
    };

    const { data: listData, isLoading, error: listError, refetch } = useVendorAllocationBatches(listParams);
    const rows = listData?.recordList || [];
    const total = listData?.pagination?.totalRecords || 0;

    const missingProfileIds = useMemo(() => {
        const ids = new Set(rows.map((row) => row.streetAgentProfileId));
        if (profile) ids.delete(profile.id);
        profileCache.forEach((_value, id) => ids.delete(id));
        return Array.from(ids);
    }, [profile, profileCache, rows]);

    const missingProfileQueries = useQueries({
        queries: missingProfileIds.map((id) => ({
            queryKey: [QUERY_KEYS.STREET_AGENT_PROFILE_DETAIL, id],
            queryFn: () => getStreetAgentProfileById(id),
            staleTime: 60_000,
        })),
    });

    const profileById = useMemo(() => {
        const map = new Map(profileCache);
        if (profile) map.set(profile.id, profile);
        missingProfileQueries.forEach((query) => {
            const item = query.data?.data;
            if (item) map.set(item.id, item);
        });
        return map;
    }, [missingProfileQueries, profile, profileCache]);

    const { mutate: cancelDraft, isPending: isCancelling } = useCancelVendorAllocation();
    const { mutate: openReturnSession, isPending: isOpeningReturn } =
        useOpenVendorAllocationReturnSession();
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
                router.push(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION_BATCH_DETAIL(id));
            },
            onError: (error: any) => {
                toast.error(getApiErrorMessage(error, "Mở phiên trả vé thất bại"));
            },
        });
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
                    className="btn-primary-admin"
                    onClick={() => router.push(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION)}
                >
                    Tạo bàn giao mới
                </Button>
            </div>

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
                                profile,
                                onProfileChange: (value: StreetAgentProfile | null) => {
                                    setProfile(value);
                                    setPage(1);
                                },
                                getProfileLabel: profileLabel,
                                status,
                                onStatusChange: (value: string) => {
                                    setStatus(value);
                                    setPage(1);
                                },
                                businessDateFrom,
                                businessDateTo,
                                onBusinessDateRangeChange: ({ startDate, endDate }: { startDate: string; endDate: string }) => {
                                    setBusinessDateFrom(startDate);
                                    setBusinessDateTo(endDate);
                                    setPage(1);
                                },
                                onClearFilters: () => {
                                    setProfile(null);
                                    setStatus('');
                                    setBusinessDateFrom('');
                                    setBusinessDateTo('');
                                    setPage(1);
                                },
                                onProfilesLoaded: handleProfilesLoaded,
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

            <AdminConfirmDialog
                open={!!cancelId}
                title="Hủy phiếu nháp?"
                loading={isCancelling}
                confirmColor="error"
                confirmLabel="Hủy phiếu"
                confirmLoadingLabel="Đang hủy..."
                onClose={() => setCancelId(null)}
                onConfirm={handleCancel}
            >
                <Typography variant="body2" color="text.secondary">
                    Vé đang giữ sẽ được nhả về kho. Thao tác không hoàn tác.
                </Typography>
            </AdminConfirmDialog>

            <AdminConfirmDialog
                open={!!returnSessionId}
                title="Mở phiên trả vé?"
                loading={isOpeningReturn}
                confirmLabel="Mở phiên trả"
                confirmLoadingLabel="Đang mở..."
                onClose={() => setReturnSessionId(null)}
                onConfirm={() => returnSessionId && handleOpenReturnSession(returnSessionId)}
            >
                <Typography variant="body2" color="text.secondary">
                    Phiếu sẽ chuyển sang trạng thái đang trả vé để quét serial trả về.
                </Typography>
            </AdminConfirmDialog>

        </Box>
    );
};
