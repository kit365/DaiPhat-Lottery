import { useEffect, useState, type SyntheticEvent } from 'react';
import React from 'react';
import {
    Box,
    Card,
    Tabs,
    Tab,
    styled,
    CircularProgress,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    TablePagination,
    Stack,
    Avatar,
    Menu,
    MenuItem,
} from '@mui/material';
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
import { useSettings } from '../../../shared/data-grid';
import { RefundToolbar } from './RefundToolbar';

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

const STATUS_TABS: {
    value: string;
    label: string;
    color: string;
    bg: string;
    activeColor: string;
    activeBg: string;
}[] = [
    {
        value: 'WAITING_FOR_INFO,APPROVED,READY_TO_PAY',
        label: 'Cần xử lý',
        color: 'var(--palette-warning-dark)',
        bg: 'var(--palette-warning-lighter)',
        activeColor: 'var(--palette-warning-contrastText)',
        activeBg: 'var(--palette-warning-main)',
    },
    {
        value: 'WAITING_FOR_INFO',
        label: 'Chờ STK',
        color: 'var(--palette-warning-dark)',
        bg: 'var(--palette-warning-lighter)',
        activeColor: 'var(--palette-warning-contrastText)',
        activeBg: 'var(--palette-warning-main)',
    },
    {
        value: 'READY_TO_PAY',
        label: 'Chờ chuyển khoản',
        color: 'var(--palette-info-dark)',
        bg: 'var(--palette-info-lighter)',
        activeColor: 'var(--palette-info-contrastText)',
        activeBg: 'var(--palette-info-main)',
    },
    {
        value: 'PAID',
        label: 'Đã chuyển khoản',
        color: 'var(--palette-success-dark)',
        bg: 'var(--palette-success-lighter)',
        activeColor: 'var(--palette-success-contrastText)',
        activeBg: 'var(--palette-success-main)',
    },
    {
        value: 'MANUAL_RESOLUTION',
        label: 'Xử lý thủ công',
        color: 'var(--palette-error-dark)',
        bg: 'var(--palette-error-lighter)',
        activeColor: 'var(--palette-error-contrastText)',
        activeBg: 'var(--palette-error-main)',
    },
    {
        value: 'WAITING_FOR_INFO,APPROVED,READY_TO_PAY,PAID,MANUAL_RESOLUTION',
        label: 'Tất cả',
        color: 'var(--palette-common-white)',
        bg: 'var(--palette-grey-800)',
        activeColor: 'var(--palette-common-white)',
        activeBg: 'var(--palette-grey-800)',
    },
];

const cellBorderSx = {
    borderBottom: '1px dashed var(--palette-background-neutral)',
};

const headerCellSx = {
    borderBottom: 'none',
    color: 'var(--palette-text-secondary)',
    fontWeight: 600,
    fontSize: '0.875rem',
};

const canConfirmTransfer = (refund: RefundRequestResponse) =>
    (refund.status === RefundRequestStatus.APPROVED ||
        refund.status === RefundRequestStatus.READY_TO_PAY) &&
    !!refund.bankAccountId &&
    isRefundProcessingActionable(refund.status);

const isOverdueRow = (refund: RefundRequestResponse) =>
    refund.processingUrgency === RefundProcessingUrgency.OVERDUE &&
    (refund.status === RefundRequestStatus.READY_TO_PAY ||
        refund.status === RefundRequestStatus.WAITING_FOR_INFO ||
        refund.status === RefundRequestStatus.APPROVED);

const resolveCustomerLabel = (refund: RefundRequestResponse) => {
    if (refund.bankAccount?.bankAccountName?.trim()) {
        return refund.bankAccount.bankAccountName.trim();
    }
    return 'Khách hàng';
};

const resolveCustomerSubLabel = (refund: RefundRequestResponse) => {
    if (refund.bankAccount) {
        const bank = refund.bankAccount.bankName?.trim();
        const masked = refund.bankAccount.bankAccountNo
            ? `****${refund.bankAccount.bankAccountNo.slice(-4)}`
            : '';
        return [bank, masked].filter(Boolean).join(' · ') || 'STK nhận hoàn';
    }
    return 'Chưa có STK nhận hoàn';
};

const resolveAssignedStaff = (refund: RefundRequestResponse) => {
    const note = refund.payoutTransaction?.note?.trim();
    if (note) {
        const match = note.match(/bởi nhân viên\s+(.+?)\.?$/i);
        const name = match?.[1]?.trim();
        if (name && name !== 'không xác định') {
            return name;
        }
    }
    return '—';
};

export const RefundList = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [statusTab, setStatusTab] = useState(STATUS_TABS[0].value);
    const [anchorEl, setAnchorEl] = useState<{ [key: number]: HTMLElement | null }>({});

    const { settings, setSettings } = useSettings();

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

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, id: number) => {
        setAnchorEl({ ...anchorEl, [id]: event.currentTarget });
    };

    const handleCloseMenu = (id: number) => {
        setAnchorEl({ ...anchorEl, [id]: null });
    };

    const handleViewDetail = (id: number) => {
        navigate(detailPath(id));
    };

    const handleConfirmTransfer = (id: number) => {
        navigate(detailPath(id), { state: { openTransfer: true } });
    };

    const emptyMessage =
        statusTab.includes('READY_TO_PAY') && !statusTab.includes(',')
            ? 'Không có yêu cầu chờ chuyển khoản'
            : 'Không có yêu cầu hoàn tiền';

    return (
        <Card
            sx={{
                borderRadius: 'var(--shape-borderRadius-lg)',
                bgcolor: 'var(--palette-background-paper)',
                boxShadow: 'var(--customShadows-card)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Tabs
                value={statusTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons={false}
                sx={{
                    px: '20px',
                    minHeight: '48px',
                    borderBottom: `1px solid var(--palette-background-neutral)`,
                    '& .MuiTabs-flexContainer': { gap: 'calc(5 * var(--spacing))' },
                    '& .MuiTabs-indicator': {
                        backgroundColor: 'var(--palette-text-primary)',
                        height: 2,
                    },
                }}
            >
                {STATUS_TABS.map((tab) => (
                    <Tab
                        key={tab.value}
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
                                        bgcolor:
                                            statusTab === tab.value ? tab.activeBg : tab.bg,
                                        color:
                                            statusTab === tab.value
                                                ? tab.activeColor
                                                : tab.color,
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

            <Box sx={{ borderBottom: `1px dashed var(--palette-background-neutral)` }}>
                <RefundToolbar
                    settings={settings}
                    onSettingsChange={setSettings as any}
                    search={search}
                    onSearchChange={setSearch}
                />
            </Box>

            <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                <Table
                    sx={{ minWidth: 1100 }}
                    size={settings.density === 'compact' ? 'small' : 'medium'}
                >
                    <TableHead sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                        <TableRow>
                            <TableCell sx={headerCellSx}>Mã yêu cầu</TableCell>
                            <TableCell sx={headerCellSx}>Đơn hàng</TableCell>
                            <TableCell sx={headerCellSx}>Khách hàng</TableCell>
                            <TableCell sx={headerCellSx}>Số tiền hoàn</TableCell>
                            <TableCell sx={headerCellSx}>Trạng thái</TableCell>
                            <TableCell sx={headerCellSx}>Hạn xử lý</TableCell>
                            <TableCell sx={headerCellSx}>Ngày tạo</TableCell>
                            <TableCell sx={headerCellSx}>NV phụ trách</TableCell>
                            <TableCell sx={{ ...headerCellSx, width: 80 }} align="right" />
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                                    <CircularProgress size={32} />
                                </TableCell>
                            </TableRow>
                        ) : refunds.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                                    <Typography sx={{ color: 'var(--palette-text-secondary)' }}>
                                        {emptyMessage}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            refunds.map((refund) => {
                                const secondsLeft = computeProcessingSecondsLeft(
                                    refund.processingDeadlineAt,
                                    refund.remainingProcessingSeconds
                                );
                                const overdue = isOverdueRow(refund);

                                return (
                                    <TableRow
                                        key={refund.id}
                                        hover
                                        sx={{
                                            '&:hover': {
                                                bgcolor: 'var(--palette-action-hover)',
                                            },
                                            ...(overdue && {
                                                bgcolor: 'var(--palette-error-lighter)',
                                                '&:hover': {
                                                    bgcolor: 'var(--palette-error-lighter)',
                                                },
                                            }),
                                            transition: 'background-color 0.2s',
                                        }}
                                    >
                                        <TableCell sx={cellBorderSx}>
                                            <Typography
                                                onClick={() => handleViewDetail(refund.id)}
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: '0.875rem',
                                                    color: 'var(--palette-text-primary)',
                                                    textDecoration: 'underline',
                                                    cursor: 'pointer',
                                                    '&:hover': {
                                                        color: 'var(--palette-primary-main)',
                                                    },
                                                }}
                                            >
                                                #{refund.id}
                                            </Typography>
                                        </TableCell>

                                        <TableCell sx={cellBorderSx}>
                                            <Typography
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: '0.875rem',
                                                    color: 'var(--palette-text-primary)',
                                                }}
                                            >
                                                {refund.orderCode ||
                                                    (refund.orderId
                                                        ? String(refund.orderId).slice(0, 8)
                                                        : '—')}
                                            </Typography>
                                            {refund.refundReason ? (
                                                <Typography
                                                    sx={{
                                                        color: 'var(--palette-text-secondary)',
                                                        fontSize: '0.75rem',
                                                        mt: 0.25,
                                                        maxWidth: 180,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                    title={refund.refundReason}
                                                >
                                                    {refund.refundReason}
                                                </Typography>
                                            ) : null}
                                        </TableCell>

                                        <TableCell sx={cellBorderSx}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Avatar
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius:
                                                            'var(--shape-borderRadius-sm)',
                                                    }}
                                                >
                                                    <Icon icon="eva:person-fill" width={24} />
                                                </Avatar>
                                                <Stack spacing={0.25}>
                                                    <Typography
                                                        sx={{
                                                            fontWeight: 600,
                                                            fontSize: '0.875rem',
                                                            color: 'var(--palette-text-primary)',
                                                        }}
                                                    >
                                                        {resolveCustomerLabel(refund)}
                                                    </Typography>
                                                    <Typography
                                                        sx={{
                                                            color: 'var(--palette-text-secondary)',
                                                            fontSize: '0.75rem',
                                                        }}
                                                    >
                                                        {resolveCustomerSubLabel(refund)}
                                                    </Typography>
                                                </Stack>
                                            </Stack>
                                        </TableCell>

                                        <TableCell sx={cellBorderSx}>
                                            <Typography
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: '0.875rem',
                                                    color: 'var(--palette-text-primary)',
                                                }}
                                            >
                                                {new Intl.NumberFormat('vi-VN', {
                                                    style: 'currency',
                                                    currency: 'VND',
                                                }).format(Number(refund.refundAmount || 0))}
                                            </Typography>
                                        </TableCell>

                                        <TableCell sx={cellBorderSx}>
                                            <RefundStatusBadge status={refund.status} />
                                        </TableCell>

                                        <TableCell sx={cellBorderSx}>
                                            <Stack spacing={0.5}>
                                                {refund.processingDeadlineAt ? (
                                                    <Typography
                                                        sx={{
                                                            fontSize: '0.875rem',
                                                            color: 'var(--palette-text-primary)',
                                                        }}
                                                    >
                                                        {dayjs(refund.processingDeadlineAt).format(
                                                            'DD MMM YYYY'
                                                        )}
                                                    </Typography>
                                                ) : null}
                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    alignItems="center"
                                                    flexWrap="wrap"
                                                    useFlexGap
                                                >
                                                    <Typography
                                                        sx={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: 500,
                                                            color: 'var(--palette-text-secondary)',
                                                        }}
                                                    >
                                                        {formatProcessingCountdown(secondsLeft)}
                                                    </Typography>
                                                    <RefundProcessingStatusBadge
                                                        urgency={refund.processingUrgency}
                                                    />
                                                </Stack>
                                            </Stack>
                                        </TableCell>

                                        <TableCell sx={cellBorderSx}>
                                            <Stack spacing={0}>
                                                <Typography
                                                    sx={{
                                                        fontWeight: 400,
                                                        fontSize: '0.875rem',
                                                        color: 'var(--palette-text-primary)',
                                                    }}
                                                >
                                                    {refund.createdAt
                                                        ? dayjs(refund.createdAt).format(
                                                              'DD MMM YYYY'
                                                          )
                                                        : '—'}
                                                </Typography>
                                                <Typography
                                                    sx={{
                                                        color: 'var(--palette-text-secondary)',
                                                        fontSize: '0.75rem',
                                                    }}
                                                >
                                                    {refund.createdAt
                                                        ? dayjs(refund.createdAt).format('h:mm a')
                                                        : '—'}
                                                </Typography>
                                            </Stack>
                                        </TableCell>

                                        <TableCell sx={cellBorderSx}>
                                            <Typography
                                                sx={{
                                                    fontSize: '0.875rem',
                                                    color: 'var(--palette-text-secondary)',
                                                }}
                                            >
                                                {resolveAssignedStaff(refund)}
                                            </Typography>
                                        </TableCell>

                                        <TableCell
                                            align="right"
                                            sx={{ ...cellBorderSx, width: 80 }}
                                        >
                                            <IconButton
                                                onClick={(e) => handleOpenMenu(e, refund.id)}
                                                sx={{
                                                    color: 'var(--palette-text-primary)',
                                                    bgcolor: anchorEl[refund.id]
                                                        ? 'var(--palette-action-hover)'
                                                        : 'transparent',
                                                    '&:hover': {
                                                        bgcolor:
                                                            'rgba(var(--palette-action-activeChannel) / var(--palette-action-hoverOpacity))',
                                                    },
                                                }}
                                            >
                                                <Icon icon="eva:more-vertical-fill" width={20} />
                                            </IconButton>

                                            <Menu
                                                anchorEl={anchorEl[refund.id]}
                                                open={Boolean(anchorEl[refund.id])}
                                                onClose={() => handleCloseMenu(refund.id)}
                                                anchorOrigin={{
                                                    vertical: 'bottom',
                                                    horizontal: 'right',
                                                }}
                                                transformOrigin={{
                                                    vertical: 'top',
                                                    horizontal: 'right',
                                                }}
                                                slotProps={{
                                                    paper: {
                                                        sx: {
                                                            width: 220,
                                                            boxShadow: 'var(--customShadows-z20)',
                                                            borderRadius:
                                                                'var(--shape-borderRadius-md)',
                                                            p: 0.5,
                                                        },
                                                    },
                                                }}
                                            >
                                                <MenuItem
                                                    onClick={() => {
                                                        handleCloseMenu(refund.id);
                                                        handleViewDetail(refund.id);
                                                    }}
                                                >
                                                    <Icon
                                                        icon="eva:eye-fill"
                                                        width={18}
                                                        style={{ marginRight: 8 }}
                                                    />
                                                    Chi tiết
                                                </MenuItem>

                                                {canConfirmTransfer(refund) && (
                                                    <CanAccess
                                                        permission={PERMISSIONS.REFUND.PROCESS}
                                                    >
                                                        <MenuItem
                                                            onClick={() => {
                                                                handleCloseMenu(refund.id);
                                                                handleConfirmTransfer(refund.id);
                                                            }}
                                                            sx={{
                                                                color: 'var(--palette-success-main)',
                                                            }}
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
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={total}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Số hàng mỗi trang:"
            />
        </Card>
    );
};
