import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    Link,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { Title } from '../../components/ui/Title';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { CanAccess } from '../../components/auth/CanAccess';
import { PERMISSIONS } from '../../constants/permission.constants';
import { prefixAdmin } from '../../constants/routes';
import { RefundStatusStepper } from '../../../client/components/refund/RefundStatusStepper';
import { RefundStatusBadge } from '../../../client/components/refund/RefundStatusBadge';
import {
    isRefundTransferComplete,
    maskBankAccountNo,
    RefundRequestStatus,
} from '../../../types/refund.type';
import {
    useApproveRefund,
    useGetStaffRefundDetail,
    useRejectRefund,
    useTransferRefund,
} from './hooks/useRefundManagement';
import { RejectRefundDialog } from './components/RejectRefundDialog';
import { TransferRefundDialog } from './components/TransferRefundDialog';

export const RefundDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const refundId = Number(id);

    const [rejectOpen, setRejectOpen] = useState(false);
    const [transferOpen, setTransferOpen] = useState(false);

    const { data, isLoading, isError } = useGetStaffRefundDetail(refundId);
    const approveMutation = useApproveRefund();
    const rejectMutation = useRejectRefund();
    const transferMutation = useTransferRefund();

    const detail = data?.data;
    const refund = detail?.refund;

    const canApprove = refund?.status === RefundRequestStatus.PENDING;
    const canReject = refund?.status === RefundRequestStatus.PENDING;
    const canTransfer =
        refund?.status === RefundRequestStatus.APPROVED ||
        refund?.status === RefundRequestStatus.READY_TO_PAY;

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" py={8}>
                <CircularProgress />
            </Box>
        );
    }

    if (isError || !detail || !refund) {
        return (
            <Box textAlign="center" py={8}>
                <Typography color="text.secondary">Không tìm thấy yêu cầu hoàn tiền</Typography>
                <Button sx={{ mt: 2 }} onClick={() => navigate(`/${prefixAdmin}/refunds/list`)}>
                    Quay lại danh sách
                </Button>
            </Box>
        );
    }

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <Title title={`Yêu cầu hoàn tiền #${refund.id}`} />
                    <Breadcrumb
                        items={[
                            { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                            { label: 'Hoàn tiền', to: `/${prefixAdmin}/refunds/list` },
                            { label: `#${refund.id}` },
                        ]}
                    />
                </div>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <CanAccess permission={PERMISSIONS.REFUND.APPROVE}>
                        {canApprove && (
                            <Button
                                variant="contained"
                                color="success"
                                onClick={() => approveMutation.mutate(refundId)}
                                disabled={approveMutation.isPending}
                            >
                                Duyệt
                            </Button>
                        )}
                    </CanAccess>
                    <CanAccess permission={PERMISSIONS.REFUND.REJECT}>
                        {canReject && (
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => setRejectOpen(true)}
                            >
                                Từ chối
                            </Button>
                        )}
                    </CanAccess>
                    <CanAccess permission={PERMISSIONS.REFUND.PROCESS}>
                        {canTransfer && (
                            <Button
                                variant="contained"
                                onClick={() => setTransferOpen(true)}
                            >
                                Xác nhận chuyển khoản
                            </Button>
                        )}
                    </CanAccess>
                </Box>
            </div>

            <Box sx={{ mb: 3 }}>
                <RefundStatusStepper status={refund.status} rejectReason={refund.rejectReason} />
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Thông tin yêu cầu
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Trạng thái
                                    </Typography>
                                    <Box sx={{ mt: 0.5 }}>
                                        <RefundStatusBadge status={refund.status} />
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Số tiền hoàn
                                    </Typography>
                                    <Typography fontWeight={600}>
                                        {refund.refundAmount?.toLocaleString('vi-VN')}đ
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">
                                        Lý do
                                    </Typography>
                                    <Typography>{refund.refundReason}</Typography>
                                </Grid>
                                {refund.rejectReason && (
                                    <Grid item xs={12}>
                                        <Typography variant="body2" color="text.secondary">
                                            Lý do từ chối
                                        </Typography>
                                        <Typography color="error.main">{refund.rejectReason}</Typography>
                                    </Grid>
                                )}
                                {refund.transferEvidenceUrl && (
                                    <Grid item xs={12}>
                                        <Typography variant="body2" color="text.secondary">
                                            Minh chứng chuyển khoản
                                        </Typography>
                                        <Link href={refund.transferEvidenceUrl} target="_blank" rel="noopener">
                                            {refund.transferEvidenceUrl}
                                        </Link>
                                    </Grid>
                                )}
                                {refund.transferNote && (
                                    <Grid item xs={12}>
                                        <Typography variant="body2" color="text.secondary">
                                            Ghi chú chuyển khoản
                                        </Typography>
                                        <Typography>{refund.transferNote}</Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Lịch sử xử lý
                            </Typography>
                            {detail.processingHistory?.length ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {detail.processingHistory.map((item, index) => (
                                        <Box key={`${item.action}-${index}`}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                                <Typography fontWeight={600}>{item.action}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {item.occurredAt
                                                        ? dayjs(item.occurredAt).format('DD/MM/YYYY HH:mm')
                                                        : '—'}
                                                </Typography>
                                            </Box>
                                            {item.detail && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                    {item.detail}
                                                </Typography>
                                            )}
                                            {index < detail.processingHistory.length - 1 && (
                                                <Divider sx={{ mt: 2 }} />
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Typography color="text.secondary">Chưa có lịch sử xử lý</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Đơn hàng
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Mã đơn
                            </Typography>
                            <Link
                                component="button"
                                variant="body1"
                                onClick={() =>
                                    navigate(`/${prefixAdmin}/order/detail/${detail.orderSummary.id}`)
                                }
                                sx={{ mb: 1, display: 'block' }}
                            >
                                {detail.orderSummary.orderCode}
                            </Link>
                            <Chip label={detail.orderSummary.status} size="small" sx={{ mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                                Tổng tiền
                            </Typography>
                            <Typography sx={{ mb: 1 }}>
                                {detail.orderSummary.totalAmount?.toLocaleString('vi-VN')}đ
                            </Typography>
                            {detail.orderSummary.cancelReason && (
                                <>
                                    <Typography variant="body2" color="text.secondary">
                                        Lý do hủy
                                    </Typography>
                                    <Typography>{detail.orderSummary.cancelReason}</Typography>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Khách hàng
                            </Typography>
                            <Typography fontWeight={600}>
                                {detail.customerSummary.fullName || '—'}
                            </Typography>
                            <Typography variant="body2">{detail.customerSummary.email || '—'}</Typography>
                            <Typography variant="body2">{detail.customerSummary.phone || '—'}</Typography>
                        </CardContent>
                    </Card>

                    {refund.bankAccount && (
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Tài khoản nhận hoàn
                                </Typography>
                                <Typography fontWeight={600}>{refund.bankAccount.bankName}</Typography>
                                <Typography variant="body2">
                                    {maskBankAccountNo(refund.bankAccount.bankAccountNo)}
                                </Typography>
                                <Typography variant="body2">{refund.bankAccount.bankAccountName}</Typography>
                            </CardContent>
                        </Card>
                    )}

                    {(detail.reviewerName || detail.transferrerName) && (
                        <Card sx={{ mt: 3 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Nhân viên xử lý
                                </Typography>
                                {detail.reviewerName && (
                                    <Typography variant="body2">
                                        Duyệt/Từ chối: <strong>{detail.reviewerName}</strong>
                                    </Typography>
                                )}
                                {detail.transferrerName && (
                                    <Typography variant="body2">
                                        Chuyển khoản: <strong>{detail.transferrerName}</strong>
                                    </Typography>
                                )}
                                {isRefundTransferComplete(refund.status) && refund.transferredAt && (
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                        Hoàn tất: {dayjs(refund.transferredAt).format('DD/MM/YYYY HH:mm')}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </Grid>
            </Grid>

            <RejectRefundDialog
                open={rejectOpen}
                loading={rejectMutation.isPending}
                onClose={() => setRejectOpen(false)}
                onConfirm={(reason) =>
                    rejectMutation.mutate(
                        { id: refundId, data: { rejectReason: reason } },
                        { onSuccess: () => setRejectOpen(false) }
                    )
                }
            />

            <TransferRefundDialog
                open={transferOpen}
                loading={transferMutation.isPending}
                onClose={() => setTransferOpen(false)}
                onConfirm={(payload) =>
                    transferMutation.mutate(
                        { id: refundId, data: payload },
                        { onSuccess: () => setTransferOpen(false) }
                    )
                }
            />
        </>
    );
};
