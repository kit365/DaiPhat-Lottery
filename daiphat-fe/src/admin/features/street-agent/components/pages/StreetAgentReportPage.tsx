"use client";

import { useMemo, useState, type ReactNode } from 'react';
import {
    Alert,
    Box,
    Card,
    CircularProgress,
    Stack,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
import type { GridColDef, GridSortModel } from '@mui/x-data-grid';
import { toast } from 'react-toastify';
import { PageHeader } from '@/admin/components/ui/PageHeader';
import { Button } from '@/admin/components/ui/Button';
import { LazyDataGrid, dataGridContainerStyles, dataGridStyles } from '@/admin/shared/data-grid';
import { DATA_GRID_LOCALE_VN } from '@/shared/components/DataTable/localeText.config';
import { ROUTES } from '@/admin/constants/routes';
import {
    useExportStreetAgentReport,
    useStreetAgentReportAgents,
    useStreetAgentReportOverview,
    useStreetAgentReportStations,
} from '../../hooks/useStreetAgentReport';
import {
    StreetAgentReportAgent,
    StreetAgentReportStation,
    StreetAgentReportStatus,
} from '../../types/street-agent.type';
import { formatCurrency, formatPercent } from '../../utils/format';
import {
    buildDateRangeSelection,
    normalizeDateRangeFilterValues,
    resolveReportDateRange,
    StreetAgentReportToolbar,
} from '../sections/StreetAgentReportToolbar';
import dayjs from 'dayjs';

type ReportTab = 'agents' | 'stations';
type TableState = {
    page: number;
    size: number;
    sortBy: string;
    direction: 'asc' | 'desc';
};

const KPI_CARD_SX = {
    p: 2.25,
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    bgcolor: '#fff',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
} as const;

const todayApiDate = () => dayjs().format('YYYY-MM-DD');

const initialRange = () => {
    const today = todayApiDate();
    return { from: today, to: today };
};

function KpiCard({
    label,
    value,
    icon,
    iconBg,
    iconColor,
    accent,
}: {
    label: string;
    value: string;
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    accent?: boolean;
}) {
    return (
        <Card
            elevation={0}
            sx={{
                ...KPI_CARD_SX,
                ...(accent
                    ? {
                          border: '1px solid #dcfce7',
                          bgcolor: '#f0fdf4',
                      }
                    : null),
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1.75}>
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '12px',
                        bgcolor: accent ? '#dcfce7' : iconBg,
                        color: accent ? '#166534' : iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        variant="caption"
                        fontWeight={accent ? 700 : 600}
                        color={accent ? '#166534' : '#64748b'}
                        display="block"
                    >
                        {label}
                    </Typography>
                    <Typography
                        variant="h6"
                        fontWeight={800}
                        color={accent ? '#15803d' : '#0f172a'}
                        sx={{ mt: 0.25, overflowWrap: 'anywhere' }}
                    >
                        {value}
                    </Typography>
                </Box>
            </Stack>
        </Card>
    );
}

function GridEmptyState({
    loading,
    error,
    onRetry,
    onReset,
}: {
    loading: boolean;
    error: boolean;
    onRetry: () => void;
    onReset: () => void;
}) {
    return (
        <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', px: 2 }}>
            {loading ? (
                <Stack alignItems="center" spacing={1}>
                    <CircularProgress size={30} />
                    <Typography variant="body2" color="text.secondary">Đang tải dữ liệu…</Typography>
                </Stack>
            ) : error ? (
                <Stack alignItems="center" spacing={1.25}>
                    <Typography className="admin-datagrid-empty" sx={{ textAlign: 'center' }}>
                        Không tải được dữ liệu bảng.
                    </Typography>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshOutlinedIcon />}
                        onClick={onRetry}
                    >
                        Thử lại
                    </Button>
                </Stack>
            ) : (
                <Stack alignItems="center" spacing={1.25}>
                    <Typography className="admin-datagrid-empty" sx={{ textAlign: 'center' }}>
                        Không có dữ liệu trong kỳ đã chọn.
                    </Typography>
                    <Button
                        variant="text"
                        size="small"
                        className="admin-list-action-button"
                        startIcon={<RestartAltOutlinedIcon />}
                        onClick={onReset}
                    >
                        Đặt lại bộ lọc
                    </Button>
                </Stack>
            )}
        </Box>
    );
}

export const StreetAgentReportPage = () => {
    const [range, setRange] = useState(initialRange);
    const [status, setStatus] = useState<StreetAgentReportStatus | ''>('');
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<ReportTab>('agents');
    const [agentTable, setAgentTable] = useState<TableState>({
        page: 0, size: 10, sortBy: 'grossSales', direction: 'desc',
    });
    const [stationTable, setStationTable] = useState<TableState>({
        page: 0, size: 10, sortBy: 'soldQuantity', direction: 'desc',
    });

    const reportParams = useMemo(() => ({
        from: range.from,
        to: range.to,
        status: status || undefined,
    }), [range, status]);
    const hasValidRange = Boolean(reportParams.from && reportParams.to);
    const agentParams = useMemo(() => ({
        ...reportParams,
        page: agentTable.page + 1,
        size: agentTable.size,
        sortBy: agentTable.sortBy,
        direction: agentTable.direction,
    }), [agentTable, reportParams]);
    const stationParams = useMemo(() => ({
        ...reportParams,
        page: stationTable.page + 1,
        size: stationTable.size,
        sortBy: stationTable.sortBy,
        direction: stationTable.direction,
    }), [reportParams, stationTable]);

    const overviewQuery = useStreetAgentReportOverview(reportParams);
    const agentsQuery = useStreetAgentReportAgents(agentParams);
    const stationsQuery = useStreetAgentReportStations(stationParams);
    const exportMutation = useExportStreetAgentReport();

    const resetTablePage = () => {
        setAgentTable((current) => ({ ...current, page: 0 }));
        setStationTable((current) => ({ ...current, page: 0 }));
    };

    const handleFilterChange = (fieldId: string, values: string[]) => {
        if (fieldId === 'dateRange') {
            const previous = buildDateRangeSelection(range.from, range.to);
            const normalized = normalizeDateRangeFilterValues(previous, values);
            // Empty → keep default "today" so the report always has a valid period.
            const nextRange = resolveReportDateRange(normalized) || initialRange();
            setRange(nextRange);
            resetTablePage();
            return;
        }
        if (fieldId === 'status') {
            const previous: string[] = status ? [status] : [];
            const added = values.find((value) => !previous.includes(value));
            // Status is single-select: newly checked wins, uncheck clears.
            setStatus((added || values[0] || '') as StreetAgentReportStatus | '');
            resetTablePage();
        }
    };

    const resetFilters = () => {
        setRange(initialRange());
        setStatus('');
        setSearch('');
        resetTablePage();
    };

    const handleExport = () => {
        exportMutation.mutate(reportParams, {
            onSuccess: () => toast.success('Đã xuất báo cáo Excel.'),
            onError: (error: Error) => toast.error(error.message || 'Xuất báo cáo thất bại.'),
        });
    };

    const agentColumns = useMemo<GridColDef<StreetAgentReportAgent>[]>(() => [
        { field: 'agentName', headerName: 'Người bán vé', minWidth: 220, flex: 1 },
        { field: 'allocatedQuantity', headerName: 'Đã giao', width: 115, align: 'right', headerAlign: 'right' },
        { field: 'soldQuantity', headerName: 'Đã bán', width: 110, align: 'right', headerAlign: 'right' },
        { field: 'returnedQuantity', headerName: 'Đã trả', width: 110, align: 'right', headerAlign: 'right' },
        { field: 'grossSales', headerName: 'Doanh thu', width: 150, align: 'right', headerAlign: 'right', valueFormatter: (value) => formatCurrency(value) },
        { field: 'commissionPayable', headerName: 'Hoa hồng phải trả', width: 180, align: 'right', headerAlign: 'right', valueFormatter: (value) => formatCurrency(value) },
        { field: 'agentCashRemitted', headerName: 'Tiền người bán giao lại', width: 190, align: 'right', headerAlign: 'right', valueFormatter: (value) => formatCurrency(value) },
        { field: 'sellThroughRate', headerName: 'Tỷ lệ bán', width: 130, align: 'right', headerAlign: 'right', valueFormatter: (value) => formatPercent(value, 2) },
    ], []);
    const stationColumns = useMemo<GridColDef<StreetAgentReportStation>[]>(() => [
        { field: 'stationName', headerName: 'Đài xổ số', minWidth: 240, flex: 1 },
        { field: 'allocatedQuantity', headerName: 'Đã giao', width: 125, align: 'right', headerAlign: 'right' },
        { field: 'soldQuantity', headerName: 'Đã bán', width: 120, align: 'right', headerAlign: 'right' },
        { field: 'returnedQuantity', headerName: 'Đã trả', width: 120, align: 'right', headerAlign: 'right' },
        { field: 'sellThroughRate', headerName: 'Tỷ lệ bán', width: 140, align: 'right', headerAlign: 'right', valueFormatter: (value) => formatPercent(value, 2) },
    ], []);

    const summary = overviewQuery.data?.summary;
    const agentSortModel: GridSortModel = [{ field: agentTable.sortBy, sort: agentTable.direction }];
    const stationSortModel: GridSortModel = [{ field: stationTable.sortBy, sort: stationTable.direction }];
    const searchNeedle = search.trim().toLowerCase();

    const agentRows = useMemo(() => {
        const rows = agentsQuery.data?.recordList || [];
        if (!searchNeedle) return rows;
        return rows.filter((row) => row.agentName?.toLowerCase().includes(searchNeedle));
    }, [agentsQuery.data?.recordList, searchNeedle]);

    const stationRows = useMemo(() => {
        const rows = stationsQuery.data?.recordList || [];
        if (!searchNeedle) return rows;
        return rows.filter((row) => row.stationName?.toLowerCase().includes(searchNeedle));
    }, [searchNeedle, stationsQuery.data?.recordList]);

    const quantityOrDash = (value: number | null | undefined) =>
        value == null ? '—' : value.toLocaleString('vi-VN');

    return (
        <Box sx={{ width: '100%', pb: 5 }}>
            <PageHeader
                title="Báo cáo người bán vé"
                breadcrumbItems={[
                    { label: 'Dashboard', to: ROUTES.ADMIN.DASHBOARD.ROOT },
                    { label: 'Người bán vé số', to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
                    { label: 'Báo cáo người bán vé' },
                ]}
                action={
                    <Button
                        variant="contained"
                        className="btn-primary-admin"
                        startIcon={<DownloadOutlinedIcon />}
                        disabled={!hasValidRange}
                        loading={exportMutation.isPending}
                        loadingLabel="Đang xuất..."
                        onClick={handleExport}
                    >
                        Xuất Excel
                    </Button>
                }
            />

            <Stack spacing={2} sx={{ mb: 2.5 }}>
                {(overviewQuery.data?.unsettledBatchCount ?? 0) > 0 ? (
                    <Alert severity="warning">
                        Có {overviewQuery.data?.unsettledBatchCount} phiếu chưa tất toán trong kỳ. Số liệu có thể thay đổi.
                    </Alert>
                ) : null}

                {overviewQuery.isError ? (
                    <Alert
                        severity="error"
                        action={
                            <Stack direction="row" spacing={0.5}>
                                <Button
                                    color="error"
                                    variant="text"
                                    size="small"
                                    startIcon={<RefreshOutlinedIcon />}
                                    onClick={() => void overviewQuery.refetch()}
                                >
                                    Thử lại
                                </Button>
                                <Button
                                    color="error"
                                    variant="text"
                                    size="small"
                                    startIcon={<RestartAltOutlinedIcon />}
                                    onClick={resetFilters}
                                >
                                    Đặt lại
                                </Button>
                            </Stack>
                        }
                    >
                        Không tải được số liệu báo cáo.
                    </Alert>
                ) : null}
            </Stack>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)',
                        lg: 'repeat(4, 1fr)',
                    },
                    gap: 2,
                    mb: 3,
                    width: '100%',
                }}
            >
                <KpiCard
                    label="Đã giao"
                    value={quantityOrDash(summary?.allocatedQuantity)}
                    icon={<ConfirmationNumberOutlinedIcon fontSize="small" />}
                    iconBg="#eff6ff"
                    iconColor="#2563eb"
                />
                <KpiCard
                    label="Đã bán"
                    value={quantityOrDash(summary?.soldQuantity)}
                    icon={<AssessmentOutlinedIcon fontSize="small" />}
                    iconBg="#fffbeb"
                    iconColor="#d97706"
                />
                <KpiCard
                    label="Đã trả"
                    value={quantityOrDash(summary?.returnedQuantity)}
                    icon={<ReplayOutlinedIcon fontSize="small" />}
                    iconBg="#f1f5f9"
                    iconColor="#334155"
                />
                <KpiCard
                    label="Doanh thu"
                    value={formatCurrency(summary?.grossSales)}
                    icon={<PaidOutlinedIcon fontSize="small" />}
                    iconBg="#dcfce7"
                    iconColor="#166534"
                    accent
                />
                <KpiCard
                    label="Hoa hồng phải trả"
                    value={formatCurrency(summary?.commissionPayable)}
                    icon={<AccountBalanceWalletOutlinedIcon fontSize="small" />}
                    iconBg="#fff7ed"
                    iconColor="#c2410c"
                />
                <KpiCard
                    label="Tiền người bán giao lại"
                    value={formatCurrency(summary?.agentCashRemitted)}
                    icon={<PaidOutlinedIcon fontSize="small" />}
                    iconBg="#ecfeff"
                    iconColor="#0891b2"
                />
                <KpiCard
                    label="Tỷ lệ bán"
                    value={formatPercent(summary?.sellThroughRate, 2)}
                    icon={<PercentOutlinedIcon fontSize="small" />}
                    iconBg="#fef2f2"
                    iconColor="#dc2626"
                />
            </Box>

            <Card elevation={0} className="admin-datagrid-card">
                <Tabs
                    value={tab}
                    onChange={(_event, value: ReportTab) => setTab(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                    className="admin-tabs"
                >
                    <Tab value="agents" label="Người bán vé" className="admin-tab" disableRipple />
                    <Tab value="stations" label="Đài xổ số" className="admin-tab" disableRipple />
                </Tabs>

                <StreetAgentReportToolbar
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder={tab === 'agents' ? 'Tìm người bán vé...' : 'Tìm đài xổ số...'}
                    from={range.from}
                    to={range.to}
                    status={status}
                    onFilterChange={handleFilterChange}
                    onClearFilters={resetFilters}
                />

                <Box sx={{ ...dataGridContainerStyles, flex: 1, minHeight: 0, width: '100%' }}>
                    {tab === 'agents' ? (
                        <LazyDataGrid<StreetAgentReportAgent>
                            rows={agentRows}
                            getRowId={(row) => row.agentId}
                            columns={agentColumns}
                            loading={agentsQuery.isLoading || agentsQuery.isFetching}
                            slots={{
                                noRowsOverlay: () => (
                                    <GridEmptyState
                                        loading={agentsQuery.isLoading}
                                        error={agentsQuery.isError}
                                        onRetry={() => void agentsQuery.refetch()}
                                        onReset={resetFilters}
                                    />
                                ),
                            }}
                            localeText={DATA_GRID_LOCALE_VN}
                            pagination
                            paginationMode="server"
                            sortingMode="server"
                            rowCount={agentsQuery.data?.pagination?.totalRecords || 0}
                            paginationModel={{ page: agentTable.page, pageSize: agentTable.size }}
                            onPaginationModelChange={(model) => setAgentTable((current) => ({ ...current, page: model.page, size: model.pageSize }))}
                            sortModel={agentSortModel}
                            onSortModelChange={(model) => {
                                const [nextSort] = model;
                                if (!nextSort?.field || !nextSort.sort) return;
                                setAgentTable((current) => ({ ...current, page: 0, sortBy: nextSort.field, direction: nextSort.sort as 'asc' | 'desc' }));
                            }}
                            pageSizeOptions={[10, 20, 50]}
                            disableRowSelectionOnClick
                            className="admin-datagrid"
                            sx={dataGridStyles}
                        />
                    ) : (
                        <LazyDataGrid<StreetAgentReportStation>
                            rows={stationRows}
                            getRowId={(row) => row.stationId}
                            columns={stationColumns}
                            loading={stationsQuery.isLoading || stationsQuery.isFetching}
                            slots={{
                                noRowsOverlay: () => (
                                    <GridEmptyState
                                        loading={stationsQuery.isLoading}
                                        error={stationsQuery.isError}
                                        onRetry={() => void stationsQuery.refetch()}
                                        onReset={resetFilters}
                                    />
                                ),
                            }}
                            localeText={DATA_GRID_LOCALE_VN}
                            pagination
                            paginationMode="server"
                            sortingMode="server"
                            rowCount={stationsQuery.data?.pagination?.totalRecords || 0}
                            paginationModel={{ page: stationTable.page, pageSize: stationTable.size }}
                            onPaginationModelChange={(model) => setStationTable((current) => ({ ...current, page: model.page, size: model.pageSize }))}
                            sortModel={stationSortModel}
                            onSortModelChange={(model) => {
                                const [nextSort] = model;
                                if (!nextSort?.field || !nextSort.sort) return;
                                setStationTable((current) => ({ ...current, page: 0, sortBy: nextSort.field, direction: nextSort.sort as 'asc' | 'desc' }));
                            }}
                            pageSizeOptions={[10, 20, 50]}
                            disableRowSelectionOnClick
                            className="admin-datagrid"
                            sx={dataGridStyles}
                        />
                    )}
                </Box>
            </Card>
        </Box>
    );
};

export default StreetAgentReportPage;
