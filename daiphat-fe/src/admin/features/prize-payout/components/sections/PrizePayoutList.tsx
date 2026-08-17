"use client";

import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { useEffect, useState, type SyntheticEvent } from 'react';
import {
    Box,
    Card,
    CircularProgress,
    Stack,
    styled,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tabs,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { AdminKpiCard, AdminKpiCardsGrid } from '@/admin/components/ui/AdminKpiCard';
import { AdminRowActionsMenu } from '@/admin/components/ui/AdminRowActionsMenu';
import { PERMISSIONS } from '@/admin/constants/permission.constants';
import { prefixAdmin } from '@/admin/constants/routes';
import { formatKpiAmount, formatVnd } from '@/admin/utils/currency';
import { dataGridContainerStyles, useSettings } from '@/admin/shared/data-grid';
import {
    formatPrizePayoutCurrency,
    PrizePayoutRequestStatus,
    resolvePrizePayoutOrderType,
    resolvePrizePayoutOrderTypeLabel,
} from '@/types/prize-payout.type';
import { ORDER_TYPE_CHIP_STYLES } from '@/types/order.type';
import { useGetStaffPrizePayouts } from '../../hooks/usePrizePayoutManagement';
import { PRIZE_PAYOUT_STATUS_TABS } from '../../constants/prizePayoutStatus.constants';
import {
    getPrizePayoutStatusBadgeClass,
    getPrizePayoutStatusLabel,
} from '../../utils/prizePayoutStatusBadge.util';
import { PrizePayoutToolbar } from './PrizePayoutToolbar';

const TabBadge = styled('span')(() => ({
    height: '24px',
    minWidth: '24px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '8px',
    padding: '0px 6px',
    borderRadius: 'var(--shape-borderRadius-sm)',
    fontSize: '0.75rem',
    fontWeight: 700,
    transition: 'all 0.2s',
}));

export const PrizePayoutList = () => {
    const router = useAdminRouter();
    const { settings, setSettings } = useSettings();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [statusTab, setStatusTab] = useState<string>(PrizePayoutRequestStatus.PENDING);

    const { data, isLoading } = useGetStaffPrizePayouts({
        page: page + 1,
        limit: rowsPerPage,
        status: statusTab || undefined,
        search: search || undefined,
    });

    const listData = data?.data;
    const rows = listData?.page?.recordList || [];
    const total = listData?.page?.pagination?.totalRecords || 0;
    const statusCounts = listData?.page?.statusCounts || {};

    useEffect(() => {
        setPage(0);
    }, [statusTab, search]);

    const getTabCount = (tabValue: string) => {
        if (!tabValue) {
            return Object.values(statusCounts).reduce((sum, value) => sum + Number(value || 0), 0);
        }
        return Number(statusCounts[tabValue]) || 0;
    };

    const handleTabChange = (_event: SyntheticEvent, newValue: string) => {
        setStatusTab(newValue);
    };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const detailPath = (id: number) => `/${prefixAdmin}/prize-payouts/detail/${id}`;

    const totalCount = getTabCount('');
    const completedCount = Number(statusCounts[PrizePayoutRequestStatus.COMPLETED]) || 0;
    const rejectedCount =
        (Number(statusCounts[PrizePayoutRequestStatus.REJECTED]) || 0) +
        (Number(statusCounts[PrizePayoutRequestStatus.MANUAL_RESOLUTION]) || 0);

    return (
        <Stack spacing={2.5} sx={{ pb: 5 }}>
            <AdminKpiCardsGrid columns={{ xs: 1, sm: 2, md: 3, xl: 5 }}>
                <AdminKpiCard
                    label="Tổng yêu cầu"
                    value={String(totalCount)}
                    icon={<AssignmentOutlinedIcon fontSize="small" />}
                    tone="blue"
                />
                <AdminKpiCard
                    label="Cần xử lý"
                    value={String(listData?.pendingCount ?? 0)}
                    icon={<HourglassEmptyOutlinedIcon fontSize="small" />}
                    tone="amber"
                />
                <AdminKpiCard
                    label="Đã chuyển"
                    value={String(completedCount)}
                    icon={<CheckCircleOutlinedIcon fontSize="small" />}
                    tone="green"
                />
                <AdminKpiCard
                    label="Từ chối / xử lý đại lý"
                    value={String(rejectedCount)}
                    icon={<HighlightOffOutlinedIcon fontSize="small" />}
                    tone="rose"
                />
                <AdminKpiCard
                    label="Tổng tiền chờ chi"
                    value={formatKpiAmount(listData?.pendingGrossTotal)}
                    valueTitle={formatVnd(listData?.pendingGrossTotal)}
                    icon={<PaymentsOutlinedIcon fontSize="small" />}
                    accent
                    valueSize="compact"
                />
            </AdminKpiCardsGrid>

            <Card elevation={0} className="admin-datagrid-card">
                <Tabs
                    value={statusTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons={false}
                    sx={{
                        px: '20px',
                        minHeight: '48px',
                        borderBottom: '1px solid var(--palette-background-neutral)',
                        '& .MuiTabs-flexContainer': { gap: 'calc(5 * var(--spacing))' },
                        '& .MuiTabs-indicator': {
                            backgroundColor: 'var(--palette-text-primary)',
                            height: 2,
                        },
                    }}
                >
                    {PRIZE_PAYOUT_STATUS_TABS.map((tab) => (
                        <Tab
                            key={tab.value || 'ALL'}
                            value={tab.value}
                            disableRipple
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography
                                        sx={{
                                            fontSize: '0.875rem',
                                            fontWeight: statusTab === tab.value ? 700 : 500,
                                            color:
                                                statusTab === tab.value
                                                    ? 'var(--palette-text-primary)'
                                                    : 'inherit',
                                        }}
                                    >
                                        {tab.label}
                                    </Typography>
                                    <TabBadge
                                        sx={{
                                            bgcolor: statusTab === tab.value ? tab.activeBg : tab.bg,
                                            color:
                                                statusTab === tab.value ? tab.activeColor : tab.color,
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        {getTabCount(tab.value)}
                                    </TabBadge>
                                </Box>
                            }
                            sx={{
                                minWidth: 0,
                                padding: 0,
                                minHeight: '48px',
                                textTransform: 'none',
                                color: 'var(--palette-text-secondary)',
                                '&.Mui-selected': {
                                    color: 'var(--palette-text-primary)',
                                },
                            }}
                        />
                    ))}
                </Tabs>

                <Box sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                    <PrizePayoutToolbar
                        settings={settings}
                        onSettingsChange={setSettings}
                        search={search}
                        onSearchChange={setSearch}
                    />
                </Box>

                <Box sx={dataGridContainerStyles}>
                    <TableContainer className="admin-table-container" sx={{ flex: 1, overflow: 'auto' }}>
                        <Table
                            className="admin-table"
                            sx={{
                                minWidth: 1080,
                                height: !isLoading && rows.length === 0 ? '100%' : 'auto',
                            }}
                            size={settings.density === 'compact' ? 'small' : 'medium'}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell>Mã yêu cầu</TableCell>
                                    <TableCell>Khách hàng</TableCell>
                                    <TableCell>Đài / Ngày quay</TableCell>
                                    <TableCell align="center">Loại đơn</TableCell>
                                    <TableCell align="right">Thực nhận</TableCell>
                                    <TableCell align="center">Trạng thái</TableCell>
                                    <TableCell>Ngày tạo</TableCell>
                                    <TableCell align="right" sx={{ width: 72 }} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ borderBottom: 'none', py: 10 }}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    minHeight: 320,
                                                }}
                                            >
                                                <CircularProgress size={32} />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ borderBottom: 'none', py: 10 }}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    minHeight: 320,
                                                }}
                                            >
                                                <span className="admin-datagrid-empty">
                                                    Không có yêu cầu trả thưởng
                                                </span>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((row) => (
                                        <TableRow key={row.id} hover>
                                            <TableCell>
                                                <Typography
                                                    className="admin-cell-title"
                                                    onClick={() => router.push(detailPath(row.id))}
                                                    sx={{
                                                        cursor: 'pointer',
                                                        textDecoration: 'underline',
                                                        '&:hover': {
                                                            color: 'var(--palette-primary-main)',
                                                        },
                                                    }}
                                                >
                                                    {row.requestCode}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <span className="admin-cell-text">
                                                    {row.customerName || row.customerId || '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Typography className="admin-cell-title" noWrap>
                                                    {row.stationName || '—'}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    display="block"
                                                >
                                                    {row.drawDate
                                                        ? dayjs(row.drawDate).format('DD/MM/YYYY')
                                                        : '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                {(() => {
                                                    const label = resolvePrizePayoutOrderTypeLabel(row);
                                                    const orderType = resolvePrizePayoutOrderType(row);
                                                    if (!orderType) {
                                                        return <span className="admin-cell-text">—</span>;
                                                    }
                                                    const chipStyle = ORDER_TYPE_CHIP_STYLES[orderType];
                                                    return (
                                                        <span
                                                            className="admin-status-badge admin-status-badge--compact"
                                                            style={{
                                                                color: chipStyle.color,
                                                                backgroundColor: chipStyle.bgcolor,
                                                            }}
                                                        >
                                                            {label}
                                                        </span>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell align="right">
                                                <span
                                                    className="admin-cell-text tabular-nums"
                                                    style={{ fontWeight: 700, color: 'var(--palette-error-main)' }}
                                                >
                                                    {formatPrizePayoutCurrency(
                                                        row.netAmount ?? row.grossAmount
                                                    )}
                                                </span>
                                            </TableCell>
                                            <TableCell align="center">
                                                <span
                                                    className={`admin-status-badge ${getPrizePayoutStatusBadgeClass(row.status)}`}
                                                >
                                                    {getPrizePayoutStatusLabel(row.status)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="admin-cell-date">
                                                    {row.createdAt
                                                        ? dayjs(row.createdAt).format('DD/MM/YYYY HH:mm')
                                                        : '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell align="right">
                                                <AdminRowActionsMenu
                                                    items={[
                                                        {
                                                            id: 'view',
                                                            label: 'Xem chi tiết',
                                                            icon: 'view',
                                                            permission: PERMISSIONS.PRIZE_PAYOUT.VIEW,
                                                            onClick: () => router.push(detailPath(row.id)),
                                                        },
                                                    ]}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[10, 25, 50]}
                        labelRowsPerPage="Số hàng mỗi trang:"
                        labelDisplayedRows={({ from, to, count }) =>
                            `${from}-${to} của ${count !== -1 ? count : `hơn ${to}`}`
                        }
                        sx={{
                            borderTop: '1px solid var(--palette-divider)',
                            color: 'var(--palette-text-secondary)',
                            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                fontSize: '0.875rem',
                            },
                        }}
                    />
                </Box>
            </Card>
        </Stack>
    );
};
