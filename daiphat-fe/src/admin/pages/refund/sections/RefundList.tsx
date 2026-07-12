import { useEffect, useState } from 'react';
import {
    Box,
    Card,
    Chip,
    CircularProgress,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tabs,
    Tab,
    Tooltip,
    Typography,
} from '@mui/material';
import { Icon } from '@iconify/react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { Search } from '../../../components/ui/Search';
import { CanAccess } from '../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../constants/permission.constants';
import { prefixAdmin } from '../../../constants/routes';
import { RefundStatusBadge } from '../../../../client/components/refund/RefundStatusBadge';
import {
    computeProcessingSecondsLeft,
    formatProcessingCountdown,
    RefundProcessingUrgency,
    RefundRequestStatus,
} from '../../../../types/refund.type';
import {
    useApproveRefund,
    useGetStaffRefunds,
    useRejectRefund,
} from '../hooks/useRefundManagement';
import { RejectRefundDialog } from '../components/RejectRefundDialog';
import { RefundProcessingStatusBadge } from '../components/RefundProcessingStatusBadge';

const STATUS_TABS: { value: string; label: string }[] = [
    { value: 'PENDING,WAITING_FOR_INFO,APPROVED,READY_TO_PAY', label: 'Cần xử lý' },
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'WAITING_FOR_INFO', label: 'Chờ STK' },
    { value: 'READY_TO_PAY', label: 'Chờ chuyển khoản' },
    { value: 'REJECTED', label: 'Từ chối' },
    { value: 'PAID', label: 'Đã chuyển khoản' },
    { value: 'EXPIRED', label: 'Hết hạn' },
    { value: 'PENDING,WAITING_FOR_INFO,APPROVED,READY_TO_PAY,REJECTED,PAID,CANCELLED,EXPIRED', label: 'Tất cả' },
];

export const RefundList = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [statusTab, setStatusTab] = useState(STATUS_TABS[0].value);
    const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);

    const approveMutation = useApproveRefund();
    const rejectMutation = useRejectRefund();

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

    const handleApprove = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        approveMutation.mutate(id);
    };

    const handleRejectConfirm = (reason: string) => {
        if (!rejectTargetId) return;
        rejectMutation.mutate(
            { id: rejectTargetId, data: { rejectReason: reason } },
            { onSuccess: () => setRejectTargetId(null) }
        );
    };

    return (
        <Card>
            <Box sx={{ px: 2, pt: 2 }}>
                <Search
                    placeholder="Tìm theo mã đơn, khách hàng, lý do hoàn tiền..."
                    value={search}
                    onChange={(value) => setSearch(value)}
                />
            </Box>

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

            {isLoading ? (
                <Box display="flex" justifyContent="center" py={6}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>ID</TableCell>
                                    <TableCell>Đơn hàng</TableCell>
                                    <TableCell>Số tiền</TableCell>
                                    <TableCell>Lý do</TableCell>
                                    <TableCell>Trạng thái</TableCell>
                                    <TableCell>Hạn xử lý</TableCell>
                                    <TableCell>Ngày tạo</TableCell>
                                    <TableCell align="right">Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {refunds.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">
                                            {statusTab === 'PENDING'
                                                ? 'Không có yêu cầu chờ duyệt. Kiểm tra tab Cần xử lý hoặc Chờ chuyển khoản.'
                                                : 'Không có yêu cầu hoàn tiền'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    refunds.map((refund) => {
                                        const isOverdue =
                                            refund.processingUrgency === RefundProcessingUrgency.OVERDUE &&
                                            (refund.status === RefundRequestStatus.READY_TO_PAY ||
                                                refund.status === RefundRequestStatus.WAITING_FOR_INFO ||
                                                refund.status === RefundRequestStatus.PENDING ||
                                                refund.status === RefundRequestStatus.APPROVED);
                                        return (
                                        <TableRow
                                            key={refund.id}
                                            hover
                                            sx={{
                                                cursor: 'pointer',
                                                ...(isOverdue
                                                    ? {
                                                          bgcolor: 'error.lighter',
                                                          '&:hover': { bgcolor: 'error.lighter' },
                                                      }
                                                    : {}),
                                            }}
                                            onClick={() =>
                                                navigate(`/${prefixAdmin}/refunds/detail/${refund.id}`)
                                            }
                                        >
                                            <TableCell>#{refund.id}</TableCell>
                                            <TableCell>{refund.orderCode || refund.orderId?.slice(0, 8)}</TableCell>
                                            <TableCell>
                                                {refund.refundAmount?.toLocaleString('vi-VN')}đ
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 240 }} className="truncate">
                                                {refund.refundReason}
                                            </TableCell>
                                            <TableCell>
                                                <RefundStatusBadge status={refund.status} />
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    {refund.processingDeadlineAt ? (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {dayjs(refund.processingDeadlineAt).format('DD/MM/YYYY HH:mm')}
                                                        </Typography>
                                                    ) : null}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                        <Typography variant="body2">
                                                            {formatProcessingCountdown(
                                                                computeProcessingSecondsLeft(
                                                                    refund.processingDeadlineAt,
                                                                    refund.remainingProcessingSeconds
                                                                )
                                                            )}
                                                        </Typography>
                                                        <RefundProcessingStatusBadge urgency={refund.processingUrgency} />
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                {refund.createdAt
                                                    ? dayjs(refund.createdAt).format('DD/MM/YYYY HH:mm')
                                                    : '—'}
                                            </TableCell>
                                            <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                {refund.status === RefundRequestStatus.PENDING && (
                                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                                        <CanAccess permission={PERMISSIONS.REFUND.APPROVE}>
                                                            <Tooltip title="Duyệt">
                                                                <IconButton
                                                                    size="small"
                                                                    color="success"
                                                                    onClick={(e) => handleApprove(refund.id, e)}
                                                                    disabled={approveMutation.isPending}
                                                                >
                                                                    <Icon icon="mdi:check" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </CanAccess>
                                                        <CanAccess permission={PERMISSIONS.REFUND.REJECT}>
                                                            <Tooltip title="Từ chối">
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={() => setRejectTargetId(refund.id)}
                                                                >
                                                                    <Icon icon="mdi:close" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </CanAccess>
                                                    </Box>
                                                )}
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
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        labelRowsPerPage="Số dòng:"
                    />
                </>
            )}

            <RejectRefundDialog
                open={rejectTargetId !== null}
                loading={rejectMutation.isPending}
                onClose={() => setRejectTargetId(null)}
                onConfirm={handleRejectConfirm}
            />
        </Card>
    );
};
