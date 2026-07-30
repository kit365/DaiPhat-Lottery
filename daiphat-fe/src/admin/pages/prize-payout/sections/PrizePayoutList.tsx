import { useEffect, useState, type SyntheticEvent } from 'react';
import React from 'react';
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
import { useNavigate } from 'react-router-dom';
import { prefixAdmin } from '../../../constants/routes';
import { PrizePayoutStatusBadge } from '../../../../client/components/prize-payout/PrizePayoutStatusBadge';
import {
    formatPrizePayoutCurrency,
    PrizePayoutRequestStatus,
} from '../../../../types/prize-payout.type';
import { useGetStaffPrizePayouts } from '../hooks/usePrizePayoutManagement';
import { PRIZE_PAYOUT_STATUS_TABS } from '../constants/prizePayoutStatus.constants';
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

const cellBorderSx = {
    borderBottom: '1px dashed var(--palette-background-neutral)',
};

const headerCellSx = {
    borderBottom: 'none',
    color: 'var(--palette-text-secondary)',
    fontWeight: 600,
    fontSize: '0.875rem',
};

export const PrizePayoutList = () => {
    const navigate = useNavigate();
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

    return (
        <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <Card
                    sx={{
                        flex: 1,
                        borderRadius: 'var(--shape-borderRadius-lg)',
                        boxShadow: 'var(--customShadows-card)',
                    }}
                >
                    <Box sx={{ p: 2.5 }}>
                        <Typography variant="body2" color="text.secondary">
                            Cần xử lý
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                            {listData?.pendingCount ?? 0}
                        </Typography>
                    </Box>
                </Card>
                <Card
                    sx={{
                        flex: 1,
                        borderRadius: 'var(--shape-borderRadius-lg)',
                        boxShadow: 'var(--customShadows-card)',
                    }}
                >
                    <Box sx={{ p: 2.5 }}>
                        <Typography variant="body2" color="text.secondary">
                            Tổng tiền chờ chi
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                            {formatPrizePayoutCurrency(listData?.pendingGrossTotal)}
                        </Typography>
                    </Box>
                </Card>
            </Stack>

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
                                            color: statusTab === tab.value ? tab.activeColor : tab.color,
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
                    <PrizePayoutToolbar search={search} onSearchChange={setSearch} />
                </Box>

                <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                    <Table sx={{ minWidth: 960 }}>
                        <TableHead sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                            <TableRow>
                                <TableCell sx={headerCellSx}>Mã yêu cầu</TableCell>
                                <TableCell sx={headerCellSx}>Khách hàng</TableCell>
                                <TableCell sx={headerCellSx}>Đài / Ngày quay</TableCell>
                                <TableCell sx={headerCellSx}>Số tiền trúng</TableCell>
                                <TableCell sx={headerCellSx}>Trạng thái</TableCell>
                                <TableCell sx={headerCellSx}>Ngày tạo</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                                        <CircularProgress size={32} />
                                    </TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                                        <Typography sx={{ color: 'var(--palette-text-secondary)' }}>
                                            Không có yêu cầu trả thưởng
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        hover
                                        sx={{ cursor: 'pointer' }}
                                        onClick={() => navigate(detailPath(row.id))}
                                    >
                                        <TableCell sx={cellBorderSx}>
                                            <Typography
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: '0.875rem',
                                                    color: 'var(--palette-text-primary)',
                                                }}
                                            >
                                                {row.requestCode}
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
                                                {row.customerName || row.customerId || '—'}
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
                                                {row.stationName || '—'}
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    color: 'var(--palette-text-secondary)',
                                                    fontSize: '0.75rem',
                                                    mt: 0.25,
                                                }}
                                            >
                                                {row.drawDate ? dayjs(row.drawDate).format('DD/MM/YYYY') : '—'}
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
                                                {formatPrizePayoutCurrency(row.grossAmount)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={cellBorderSx}>
                                            <PrizePayoutStatusBadge
                                                status={row.status as PrizePayoutRequestStatus}
                                            />
                                        </TableCell>
                                        <TableCell sx={cellBorderSx}>
                                            <Typography
                                                sx={{
                                                    fontSize: '0.875rem',
                                                    color: 'var(--palette-text-secondary)',
                                                }}
                                            >
                                                {row.createdAt
                                                    ? dayjs(row.createdAt).format('DD/MM/YYYY HH:mm')
                                                    : '—'}
                                            </Typography>
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
                    labelRowsPerPage="Số dòng mỗi trang:"
                    labelDisplayedRows={({ from, to, count }) =>
                        `${from}–${to} trong ${count !== -1 ? count : `hơn ${to}`}`
                    }
                />
            </Card>
        </Stack>
    );
};
