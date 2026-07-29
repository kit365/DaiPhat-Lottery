import { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
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
} from '@mui/material';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { Title } from '../../components/ui/Title';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { prefixAdmin } from '../../constants/routes';
import { PrizePayoutStatusBadge } from '../../../client/components/prize-payout/PrizePayoutStatusBadge';
import { formatPrizePayoutCurrency, PrizePayoutRequestStatus } from '../../../types/prize-payout.type';
import { useGetStaffPrizePayouts } from './hooks/usePrizePayoutManagement';

export const PrizePayoutListPage = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [status, setStatus] = useState<string>('PENDING');
    const [search, setSearch] = useState('');

    const { data, isLoading } = useGetStaffPrizePayouts({
        page: page + 1,
        limit: rowsPerPage,
        status: status || undefined,
        search: search || undefined,
    });

    const listData = data?.data;
    const rows = listData?.page?.recordList || [];
    const total = listData?.page?.pagination?.totalRecords || 0;

    return (
        <>
            <div className="mb-6">
                <Title title="Quản lý trả thưởng" />
                <Breadcrumb
                    items={[
                        { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                        { label: 'Trả thưởng' },
                    ]}
                />
            </div>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Typography variant="body2" color="text.secondary">Chờ xử lý</Typography>
                        <Typography variant="h4">{listData?.pendingCount ?? 0}</Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Typography variant="body2" color="text.secondary">Tổng tiền chờ chi</Typography>
                        <Typography variant="h5" color="error.main">
                            {formatPrizePayoutCurrency(listData?.pendingGrossTotal)}
                        </Typography>
                    </CardContent>
                </Card>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                {(['PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED', ''] as const).map((value) => (
                    <Chip
                        key={value || 'ALL'}
                        label={value || 'Tất cả'}
                        color={status === value ? 'primary' : 'default'}
                        onClick={() => {
                            setStatus(value);
                            setPage(0);
                        }}
                    />
                ))}
            </Stack>

            <TextField
                size="small"
                placeholder="Tìm mã / tên khách..."
                value={search}
                onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                }}
                sx={{ mb: 2, minWidth: 280 }}
            />

            <TableContainer component={Card}>
                {isLoading ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <CircularProgress size={28} />
                    </Box>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Mã</TableCell>
                                <TableCell>Khách</TableCell>
                                <TableCell>Đài / Ngày</TableCell>
                                <TableCell>Số tiền</TableCell>
                                <TableCell>Trạng thái</TableCell>
                                <TableCell>Ngày tạo</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    hover
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/${prefixAdmin}/prize-payouts/detail/${row.id}`)}
                                >
                                    <TableCell>{row.requestCode}</TableCell>
                                    <TableCell>{row.customerName || row.customerId}</TableCell>
                                    <TableCell>
                                        {row.stationName}
                                        <br />
                                        <Typography variant="caption" color="text.secondary">
                                            {row.drawDate ? dayjs(row.drawDate).format('DD/MM/YYYY') : '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{formatPrizePayoutCurrency(row.grossAmount)}</TableCell>
                                    <TableCell>
                                        <PrizePayoutStatusBadge status={row.status as PrizePayoutRequestStatus} />
                                    </TableCell>
                                    <TableCell>
                                        {row.createdAt ? dayjs(row.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                />
            </TableContainer>
        </>
    );
};
