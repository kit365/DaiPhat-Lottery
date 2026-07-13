import { useEffect, useState, useMemo } from 'react';
import {
    Box,
    Card,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Tabs,
    Tab,
    Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Icon } from '@iconify/react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { CanAccess } from '../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../constants/permission.constants';
import { prefixAdmin } from '../../../constants/routes';
import { RefundStatusBadge } from '../../../../client/components/refund/RefundStatusBadge';
import {
    computeProcessingSecondsLeft,
    formatProcessingCountdown,
    isRefundProcessingActionable,
    RefundProcessingUrgency,
    RefundRequestResponse,
    RefundRequestStatus,
} from '../../../../types/refund.type';
import { useGetStaffRefunds } from '../hooks/useRefundManagement';
import { RefundProcessingStatusBadge } from '../components/RefundProcessingStatusBadge';
import { useSettings } from '../../ticket/hooks/useSettings';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { RefundToolbar } from './RefundToolbar';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../assets/icons';
import {
    dataGridCardStyles,
    dataGridContainerStyles,
    columnsPanelStyles,
    filterPanelStyles,
    dataGridStyles,
} from '../configs/styles.config';

const STATUS_TABS: { value: string; label: string }[] = [
    { value: 'WAITING_FOR_INFO,APPROVED,READY_TO_PAY', label: 'Cần xử lý' },
    { value: 'WAITING_FOR_INFO', label: 'Chờ STK' },
    { value: 'READY_TO_PAY', label: 'Chờ chuyển khoản' },
    { value: 'PAID', label: 'Đã chuyển khoản' },
    { value: 'MANUAL_RESOLUTION', label: 'Xử lý thủ công' },
    { value: 'WAITING_FOR_INFO,APPROVED,READY_TO_PAY,PAID,MANUAL_RESOLUTION', label: 'Tất cả' },
];

const canConfirmTransfer = (refund: RefundRequestResponse) =>
    (refund.status === RefundRequestStatus.APPROVED ||
        refund.status === RefundRequestStatus.READY_TO_PAY) &&
    !!refund.bankAccountId &&
    isRefundProcessingActionable(refund.status);

export const RefundList = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [statusTab, setStatusTab] = useState(STATUS_TABS[0].value);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [menuRefund, setMenuRefund] = useState<RefundRequestResponse | null>(null);

    const { settings, setSettings } = useSettings();
    const localeText = useDataGridLocale();

    const { data, isLoading } = useGetStaffRefunds({
        page: page + 1,
        limit: rowsPerPage,
        status: statusTab,
        search: search || undefined,
    });

    const refunds = data?.data?.recordList || [];
    const total = data?.data?.pagination?.totalRecords || 0;
    const statusCounts = data?.data?.statusCounts || {};

    useEffect(() => {
        setPage(0);
    }, [statusTab, search]);

    const getTabCount = (tabValue: string) => {
        if (tabValue.includes(',')) {
            return tabValue
                .split(',')
                .reduce((sum, key) => sum + (Number(statusCounts[key.trim()]) || 0), 0);
        }
        return Number(statusCounts[tabValue]) || 0;
    };

    const detailPath = (id: number) => `/${prefixAdmin}/refunds/detail/${id}`;

    const handleOpenMenu = (
        event: React.MouseEvent<HTMLElement>,
        refund: RefundRequestResponse
    ) => {
        event.stopPropagation();
        setMenuAnchor(event.currentTarget);
        setMenuRefund(refund);
    };

    const handleCloseMenu = () => {
        setMenuAnchor(null);
        setMenuRefund(null);
    };

    const handleViewDetails = () => {
        if (!menuRefund) return;
        const id = menuRefund.id;
        handleCloseMenu();
        navigate(detailPath(id));
    };

    const handleConfirmTransfer = () => {
        if (!menuRefund) return;
        const id = menuRefund.id;
        handleCloseMenu();
        navigate(detailPath(id), { state: { openTransfer: true } });
    };

    const columns: GridColDef<RefundRequestResponse>[] = useMemo(() => [
        {
            field: 'id',
            headerName: 'ID',
            width: 100,
            renderCell: (params) => (
                <span style={{ fontWeight: 600 }}>#{params.value}</span>
            ),
        },
        {
            field: 'orderCode',
            headerName: 'Đơn hàng',
            width: 160,
            renderCell: (params) => (
                <span className="refund-order" style={{ fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s' }}>
                    {params.row.orderCode || params.row.orderId?.slice(0, 8) || '—'}
                </span>
            ),
        },
        {
            field: 'refundAmount',
            headerName: 'Số tiền',
            width: 160,
            renderCell: (params) => (
                <span style={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                    {params.value ? `${params.value.toLocaleString('vi-VN')}đ` : '—'}
                </span>
            ),
        },
        {
            field: 'refundReason',
            headerName: 'Lý do',
            flex: 1,
            minWidth: 200,
            renderCell: (params) => (
                <span title={params.value as string} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }}>
                    {params.value}
                </span>
            ),
        },
        {
            field: 'status',
            headerName: 'Trạng thái',
            width: 180,
            renderCell: (params) => (
                <RefundStatusBadge status={params.value as RefundRequestStatus} />
            ),
        },
        {
            field: 'processingDeadlineAt',
            headerName: 'Hạn xử lý',
            width: 240,
            renderCell: (params) => {
                const refund = params.row;
                const secondsLeft = computeProcessingSecondsLeft(
                    refund.processingDeadlineAt,
                    refund.remainingProcessingSeconds
                );
                return (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5,
                            py: 1,
                            justifyContent: 'center'
                        }}
                    >
                        {refund.processingDeadlineAt ? (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                className="date-text"
                                sx={{ transition: 'color 0.2s' }}
                            >
                                {dayjs(refund.processingDeadlineAt).format('DD/MM/YYYY HH:mm')}
                            </Typography>
                        ) : null}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                flexWrap: 'wrap',
                            }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {formatProcessingCountdown(secondsLeft)}
                            </Typography>
                            <RefundProcessingStatusBadge
                                urgency={refund.processingUrgency}
                            />
                        </Box>
                    </Box>
                );
            }
        },
        {
            field: 'createdAt',
            headerName: 'Ngày tạo',
            width: 160,
            renderCell: (params) => (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                        justifyContent: 'center'
                    }}
                >
                    <Typography variant="body2" sx={{ color: 'var(--palette-text-primary)' }}>
                        {params.value ? dayjs(params.value as string).format('DD/MM/YYYY') : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" className="date-text" sx={{ transition: 'color 0.2s' }}>
                        {params.value ? dayjs(params.value as string).format('HH:mm') : '—'}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'actions',
            headerName: '',
            sortable: false,
            filterable: false,
            hideable: false,
            disableColumnMenu: true,
            width: 80,
            align: 'center',
            renderCell: (params) => {
                const refund = params.row;
                return (
                    <IconButton
                        size="small"
                        aria-label="Thao tác"
                        onClick={(e) => handleOpenMenu(e, refund)}
                        sx={{
                            color: 'text.primary',
                            bgcolor: menuRefund?.id === refund.id && Boolean(menuAnchor)
                                ? 'action.hover'
                                : 'transparent',
                            '&:hover': {
                                bgcolor: 'action.hover',
                            },
                        }}
                    >
                        <Icon
                            icon="eva:more-vertical-fill"
                            width={20}
                        />
                    </IconButton>
                );
            }
        }
    ], [menuRefund, menuAnchor]);

    return (
        <Card elevation={0} sx={dataGridCardStyles}>
            <Tabs
                value={statusTab}
                onChange={(_, value) => setStatusTab(value)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
            >
                {STATUS_TABS.map((tab) => (
                    <Tab
                        key={tab.value}
                        value={tab.value}
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {tab.label}
                                <Chip size="small" label={getTabCount(tab.value)} />
                            </Box>
                        }
                    />
                ))}
            </Tabs>

            <div style={dataGridContainerStyles}>
                <DataGrid
                    rows={refunds}
                    columns={columns}
                    density={settings.density}
                    showCellVerticalBorder={settings.showCellBorders}
                    showColumnVerticalBorder={settings.showColumnBorders}
                    showToolbar
                    slots={{
                        toolbar: RefundToolbar as any,
                        columnSortedAscendingIcon: SortAscendingIcon,
                        columnSortedDescendingIcon: SortDescendingIcon,
                        columnUnsortedIcon: UnsortedIcon,
                        noRowsOverlay: () => (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <span className='text-[1.125rem]'>
                                    {statusTab.includes('READY_TO_PAY') && !statusTab.includes(',')
                                        ? 'Không có yêu cầu chờ chuyển khoản'
                                        : 'Không có yêu cầu hoàn tiền'}
                                </span>
                            </Box>
                        )
                    }}
                    slotProps={{
                        columnsManagement: {
                            getTogglableColumns: (cols: GridColDef[]) =>
                                cols.filter(col => col.field !== '__check__' && col.field !== 'actions')
                                    .map(col => col.field),
                        },
                        columnsPanel: {
                            sx: columnsPanelStyles,
                        },
                        filterPanel: {
                            sx: filterPanelStyles,
                        },
                        toolbar: {
                            settings,
                            onSettingsChange: setSettings,
                            search,
                            onSearchChange: (value: string) => {
                                setSearch(value);
                            },
                        } as any,
                    }}
                    localeText={localeText}
                    pagination
                    paginationMode="server"
                    loading={isLoading}
                    rowCount={total}
                    paginationModel={{
                        page: page,
                        pageSize: rowsPerPage,
                    }}
                    onPaginationModelChange={(model) => {
                        if (model.page !== page) {
                            setPage(model.page);
                        }
                        if (model.pageSize !== rowsPerPage) {
                            setRowsPerPage(model.pageSize);
                            setPage(0);
                        }
                    }}
                    pageSizeOptions={[5, 10, 20, 50]}
                    getRowHeight={() => 'auto'}
                    disableRowSelectionOnClick
                    onRowClick={(params) => {
                        if (params.field === 'actions') {
                            return;
                        }
                        navigate(detailPath(params.row.id as number));
                    }}
                    getRowClassName={(params) => {
                        const refund = params.row;
                        const isOverdue =
                            refund.processingUrgency ===
                                RefundProcessingUrgency.OVERDUE &&
                            (refund.status === RefundRequestStatus.READY_TO_PAY ||
                                refund.status === RefundRequestStatus.WAITING_FOR_INFO ||
                                refund.status === RefundRequestStatus.APPROVED);
                        return isOverdue ? 'row-overdue' : '';
                    }}
                    sx={{
                        ...dataGridStyles,
                        '& .row-overdue': {
                            bgcolor: 'var(--palette-error-lighter) !important',
                            '&:hover': {
                                bgcolor: 'var(--palette-error-lighter) !important',
                            },
                        }
                    }}
                />
            </div>

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor) && !!menuRefund}
                onClose={handleCloseMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                slotProps={{
                    paper: {
                        sx: {
                            width: 200,
                            boxShadow: 'var(--customShadows-z20)',
                            borderRadius: 'var(--shape-borderRadius-md)',
                            p: 0.5,
                        },
                    },
                }}
            >
                <MenuItem onClick={handleViewDetails}>
                    <Icon icon="eva:eye-fill" width={18} style={{ marginRight: 8 }} />
                    Xem chi tiết
                </MenuItem>
                {menuRefund && canConfirmTransfer(menuRefund) && (
                    <CanAccess permission={PERMISSIONS.REFUND.PROCESS}>
                        <MenuItem
                            onClick={handleConfirmTransfer}
                            sx={{ color: 'var(--palette-success-main)' }}
                        >
                            <Icon
                                icon="solar:card-transfer-bold"
                                width={18}
                                style={{ marginRight: 8 }}
                            />
                            Xác nhận chuyển khoản
                        </MenuItem>
                    </CanAccess>
                )}
            </Menu>
        </Card>
    );
};
