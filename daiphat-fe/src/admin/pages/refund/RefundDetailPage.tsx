import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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
    isRefundProcessingActionable,
    isRefundTransferComplete,
    maskBankAccountNo,
    RefundRequestStatus,
    UserBankAccountResponse,
} from '../../../types/refund.type';
import {
    useAttachRefundBankAccount,
    useGetStaffRefundDetail,
    useTransferRefund,
} from './hooks/useRefundManagement';
import { TransferRefundDialog } from './components/TransferRefundDialog';
import { AttachBankAccountDialog } from './components/AttachBankAccountDialog';
import { TransferEvidencePreview } from './components/TransferEvidencePreview';
import { ProcessingDeadlineCard } from './components/ProcessingDeadlineCard';
import { RefundTicketsTable } from './components/RefundTicketsTable';
import { refundAdminApi } from '../../api/refund.api';

export const RefundDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const refundId = Number(id);

    const [transferOpen, setTransferOpen] = useState(false);
    const [attachBankOpen, setAttachBankOpen] = useState(false);
    const [customerBanks, setCustomerBanks] = useState<UserBankAccountResponse[]>([]);

    const { data, isLoading, isError } = useGetStaffRefundDetail(refundId);
    const transferMutation = useTransferRefund();
    const attachBankMutation = useAttachRefundBankAccount();

    const detail = data?.data;
    const refund = detail?.refund;

    useEffect(() => {
        const customerId = detail?.customerSummary?.id;
        if (!customerId || refund?.status !== RefundRequestStatus.WAITING_FOR_INFO) {
            setCustomerBanks([]);
            return;
        }
        refundAdminApi
            .getCustomerBankAccounts(customerId)
            .then((res) => setCustomerBanks(res.data || []))
            .catch(() => setCustomerBanks([]));
    }, [detail?.customerSummary?.id, refund?.status]);

    useEffect(() => {
        const shouldOpenTransfer = Boolean(
            (location.state as { openTransfer?: boolean } | null)?.openTransfer
        );
        if (!shouldOpenTransfer || !refund) {
            return;
        }

        const canOpenTransfer =
            (refund.status === RefundRequestStatus.APPROVED ||
                refund.status === RefundRequestStatus.READY_TO_PAY) &&
            !!refund.bankAccountId &&
            isRefundProcessingActionable(refund.status);

        if (canOpenTransfer) {
            setTransferOpen(true);
        }

        navigate(location.pathname, { replace: true, state: {} });
    }, [location.pathname, location.state, navigate, refund]);

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

    const canAttachBank = refund.status === RefundRequestStatus.WAITING_FOR_INFO;
    const canTransfer =
        (refund.status === RefundRequestStatus.APPROVED ||
            refund.status === RefundRequestStatus.READY_TO_PAY) &&
        !!refund.bankAccountId;
    const isExpired = refund.status === RefundRequestStatus.EXPIRED;
    const actionsDisabled = isExpired || !isRefundProcessingActionable(refund.status);

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
                    <CanAccess permission={PERMISSIONS.REFUND.PROCESS}>
                        {canAttachBank && !actionsDisabled && (
                            <Button variant="contained" color="warning" onClick={() => setAttachBankOpen(true)}>
                                Gắn STK
                            </Button>
                        )}
                    </CanAccess>
                    <CanAccess permission={PERMISSIONS.REFUND.PROCESS}>
                        {canTransfer && !actionsDisabled && (
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
                <RefundStatusStepper
                    status={refund.status}
                    requestRole={refund.requestRole}
                />
            </Box>

            <ProcessingDeadlineCard
                status={refund.status}
                processingDeadlineAt={refund.processingDeadlineAt}
                remainingProcessingSeconds={refund.remainingProcessingSeconds}
                processingUrgency={refund.processingUrgency}
            />

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
                            </Grid>
                        </CardContent>
                    </Card>

                    {(isRefundTransferComplete(refund.status) ||
                        refund.payoutTransaction?.paymentEvidenceUrl) && (
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Thông tin thanh toán hoàn tiền
                                </Typography>
                                <Grid container spacing={2}>
                                    {refund.payoutTransaction?.paidAt && (
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Thời gian chuyển khoản
                                            </Typography>
                                            <Typography>
                                                {dayjs(refund.payoutTransaction.paidAt).format(
                                                    'DD/MM/YYYY HH:mm'
                                                )}
                                            </Typography>
                                        </Grid>
                                    )}
                                    {detail.transferrerName && (
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Nhân viên xử lý
                                            </Typography>
                                            <Typography fontWeight={600}>
                                                {detail.transferrerName}
                                            </Typography>
                                        </Grid>
                                    )}
                                    {refund.payoutTransaction?.note && (
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                Ghi chú
                                            </Typography>
                                            <Typography>{refund.payoutTransaction.note}</Typography>
                                        </Grid>
                                    )}
                                    {refund.payoutTransaction?.paymentEvidenceUrl ? (
                                        <Grid item xs={12}>
                                            <TransferEvidencePreview
                                                imageUrl={refund.payoutTransaction.paymentEvidenceUrl}
                                                infoItems={[
                                                    {
                                                        label: 'Mã yêu cầu',
                                                        value: `#${refund.id}`,
                                                    },
                                                    {
                                                        label: 'Số tiền hoàn',
                                                        value: `${refund.refundAmount?.toLocaleString('vi-VN') ?? '—'}đ`,
                                                    },
                                                    {
                                                        label: 'Thời gian',
                                                        value: refund.payoutTransaction.paidAt
                                                            ? dayjs(
                                                                  refund.payoutTransaction.paidAt
                                                              ).format('DD/MM/YYYY HH:mm')
                                                            : '—',
                                                    },
                                                    {
                                                        label: 'Nhân viên',
                                                        value: detail.transferrerName || '—',
                                                    },
                                                ]}
                                            />
                                        </Grid>
                                    ) : (
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                Chưa có ảnh biên lai chuyển khoản.
                                            </Typography>
                                        </Grid>
                                    )}
                                </Grid>
                            </CardContent>
                        </Card>
                    )}

                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Vé hoàn tiền
                            </Typography>
                            <RefundTicketsTable tickets={detail.refundTickets} />
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
                            {detail.orderSummary ? (
                                <>
                                    <Typography variant="body2" color="text.secondary">
                                        Mã đơn
                                    </Typography>
                                    <Link
                                        component="button"
                                        variant="body1"
                                        onClick={() =>
                                            navigate(
                                                `/${prefixAdmin}/order/detail/${detail.orderSummary.id}`
                                            )
                                        }
                                        sx={{ mb: 1, display: 'block' }}
                                    >
                                        {detail.orderSummary.orderCode}
                                    </Link>
                                    <Chip
                                        label={detail.orderSummary.status}
                                        size="small"
                                        sx={{ mb: 1 }}
                                    />
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
                                </>
                            ) : (
                                <Typography color="text.secondary" variant="body2">
                                    Không tìm thấy đơn hàng liên kết với yêu cầu hoàn tiền này.
                                </Typography>
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

                    {refund.bankAccount ? (
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
                    ) : refund.status === RefundRequestStatus.WAITING_FOR_INFO ? (
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Tài khoản nhận hoàn
                                </Typography>
                                <Typography color="warning.main" variant="body2">
                                    Đang chờ khách hàng cung cấp STK. Bạn có thể gắn STK giúp khách nếu đã
                                    có tài khoản lưu sẵn.
                                </Typography>
                            </CardContent>
                        </Card>
                    ) : null}

                    {(detail.reviewerName || detail.transferrerName) && (
                        <Card sx={{ mt: 3 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Nhân viên xử lý
                                </Typography>
                                {detail.reviewerName && (
                                    <Typography variant="body2">
                                        Xử lý: <strong>{detail.reviewerName}</strong>
                                    </Typography>
                                )}
                                {detail.transferrerName && (
                                    <Typography variant="body2">
                                        Chuyển khoản: <strong>{detail.transferrerName}</strong>
                                    </Typography>
                                )}
                                {isRefundTransferComplete(refund.status) && refund.payoutTransaction?.paidAt && (
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                        Hoàn tất: {dayjs(refund.payoutTransaction.paidAt).format('DD/MM/YYYY HH:mm')}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </Grid>
            </Grid>

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

            <AttachBankAccountDialog
                open={attachBankOpen}
                loading={attachBankMutation.isPending}
                accounts={customerBanks}
                onClose={() => setAttachBankOpen(false)}
                onConfirm={(bankAccountId) =>
                    attachBankMutation.mutate(
                        { id: refundId, bankAccountId },
                        { onSuccess: () => setAttachBankOpen(false) }
                    )
                }
            />
        </>
    );
};
