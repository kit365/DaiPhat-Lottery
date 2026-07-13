import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    Link,
    Stack,
    ThemeProvider,
    Typography,
    createTheme,
    useTheme,
} from '@mui/material';
import { Icon } from '@iconify/react';
import dayjs from 'dayjs';
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
    RefundType,
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

    const outerTheme = useTheme();

    const localTheme = useMemo(() => createTheme(outerTheme, {
        components: {
            MuiCard: {
                styleOverrides: {
                    root: {
                        backgroundImage: "none !important",
                        backdropFilter: "none !important",
                        backgroundColor: "var(--palette-background-paper) !important",
                        boxShadow: "var(--customShadows-card)",
                        borderRadius: "var(--shape-borderRadius-lg)",
                        color: "var(--palette-text-primary)",
                        border: "1px solid var(--palette-divider)",
                    },
                }
            }
        }
    }), [outerTheme]);

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
        <ThemeProvider theme={localTheme}>
            {/* Breadcrumb row */}
            <Box sx={{ mb: 2 }}>
                <Breadcrumb
                    items={[
                        { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                        { label: 'Hoàn tiền', to: `/${prefixAdmin}/refunds/list` },
                        { label: `#${refund.id}` },
                    ]}
                />
            </Box>

            {/* 1. Compact Summary Header */}
            <Card sx={{ mb: 3, p: 2.5 }}>
                <Grid container spacing={2} alignItems="center" justifyContent="space-between">
                    <Grid item xs={12} sm={4}>
                        <Stack spacing={0.5}>
                            <Typography variant="h5" fontWeight={800} color="text.primary">
                                Yêu cầu hoàn tiền #{refund.id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Tạo lúc: {refund.createdAt ? dayjs(refund.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
                            </Typography>
                        </Stack>
                    </Grid>
                    <Grid item xs={12} sm={8}>
                        <Box sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                            gap: { xs: 2.5, md: 5 }
                        }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Trạng thái</Typography>
                                <Box sx={{ mt: 0.5 }}>
                                    <RefundStatusBadge status={refund.status} />
                                </Box>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Số tiền hoàn trả</Typography>
                                <Typography variant="h5" fontWeight={800} color="error.main" sx={{ mt: 0.5 }}>
                                    {refund.refundAmount?.toLocaleString('vi-VN')}đ
                                </Typography>
                            </Box>
                            {detail.orderSummary && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block">Mã đơn hàng</Typography>
                                    <Link
                                        component="button"
                                        variant="subtitle2"
                                        fontWeight={800}
                                        onClick={() => navigate(`/${prefixAdmin}/order/detail/${detail.orderSummary.id}`)}
                                        sx={{
                                            mt: 0.5,
                                            color: 'primary.main',
                                            textDecoration: 'underline',
                                            cursor: 'pointer',
                                            '&:hover': { color: 'primary.dark' }
                                        }}
                                    >
                                        {detail.orderSummary.orderCode}
                                    </Link>
                                </Box>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            </Card>

            {/* Stepper and Countdown row */}
            <Box sx={{ mb: 3 }}>
                <RefundStatusStepper
                    status={refund.status}
                    requestRole={refund.requestRole}
                />
            </Box>

            <Box sx={{ mb: 3 }}>
                <ProcessingDeadlineCard
                    status={refund.status}
                    processingDeadlineAt={refund.processingDeadlineAt}
                    remainingProcessingSeconds={refund.remainingProcessingSeconds}
                    processingUrgency={refund.processingUrgency}
                />
            </Box>

            {/* 2. Main content (two-column layout) */}
            <Grid container spacing={3}>
                {/* Left Column (65% width) */}
                <Grid item xs={12} md={7.8}>
                    {/* Card 1: Customer Information */}
                    <Card sx={{ mb: 3 }}>
                        <CardHeader
                            title="Thông tin khách hàng"
                            slotProps={{ title: { sx: { fontWeight: 700, fontSize: "1.05rem" } } }}
                            sx={{ pb: 1.5 }}
                        />
                        <Divider />
                        <CardContent>
                            <Grid container spacing={2.5}>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary" display="block">Họ và tên</Typography>
                                    <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                                        {detail.customerSummary.fullName || '—'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary" display="block">Số điện thoại</Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                                        {detail.customerSummary.phone || '—'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="text.secondary" display="block">Email</Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                                        {detail.customerSummary.email || '—'}
                                    </Typography>
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary" display="block">Tài khoản nhận hoàn tiền</Typography>
                                    {refund.bankAccount ? (
                                        <Box sx={{ mt: 1, p: 2, bgcolor: 'action.hover', border: '1px solid var(--palette-divider)', borderRadius: 1.5 }}>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={4}>
                                                    <Typography variant="caption" color="text.secondary" display="block">Ngân hàng</Typography>
                                                    <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ mt: 0.25 }}>
                                                        {refund.bankAccount.bankName}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={4}>
                                                    <Typography variant="caption" color="text.secondary" display="block">Số tài khoản</Typography>
                                                    <Typography variant="body2" fontWeight={600} sx={{ mt: 0.25 }}>
                                                        {maskBankAccountNo(refund.bankAccount.bankAccountNo)}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={4}>
                                                    <Typography variant="caption" color="text.secondary" display="block">Chủ tài khoản</Typography>
                                                    <Typography variant="body2" fontWeight={700} sx={{ mt: 0.25, textTransform: 'uppercase' }}>
                                                        {refund.bankAccount.bankAccountName}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    ) : (
                                        <Box sx={{
                                            mt: 1,
                                            p: 2,
                                            borderRadius: 1.5,
                                            bgcolor: 'rgba(255, 171, 0, 0.04)',
                                            border: '1px dashed rgba(255, 171, 0, 0.25)',
                                            color: 'warning.main'
                                        }}>
                                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                                Đang chờ khách hàng cung cấp số tài khoản ngân hàng nhận hoàn tiền.
                                            </Typography>
                                        </Box>
                                    )}
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Card 2: Order Information */}
                    <Card sx={{ mb: 3 }}>
                        <CardHeader
                            title="Thông tin đơn hàng"
                            slotProps={{ title: { sx: { fontWeight: 700, fontSize: "1.05rem" } } }}
                            sx={{ pb: 1.5 }}
                        />
                        <Divider />
                        <CardContent>
                            {detail.orderSummary ? (
                                <Stack spacing={2.5}>
                                    <Grid container spacing={2.5}>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="caption" color="text.secondary" display="block">Mã đơn hàng</Typography>
                                            <Link
                                                component="button"
                                                variant="body2"
                                                fontWeight={700}
                                                onClick={() => navigate(`/${prefixAdmin}/order/detail/${detail.orderSummary.id}`)}
                                                sx={{
                                                    mt: 0.5,
                                                    color: 'primary.main',
                                                    textDecoration: 'underline',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    '&:hover': { color: 'primary.dark' }
                                                }}
                                            >
                                                {detail.orderSummary.orderCode}
                                            </Link>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="caption" color="text.secondary" display="block">Trạng thái đơn hàng</Typography>
                                            <Box sx={{ mt: 0.5 }}>
                                                <Chip
                                                    label={detail.orderSummary.status}
                                                    size="small"
                                                    variant="outlined"
                                                    color="info"
                                                />
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="caption" color="text.secondary" display="block">Tổng giá trị đơn</Typography>
                                            <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                                                {detail.orderSummary.totalAmount?.toLocaleString('vi-VN')}đ
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="caption" color="text.secondary" display="block">Phương thức thanh toán</Typography>
                                            <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                                                PayOS (Chuyển khoản QR)
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="caption" color="text.secondary" display="block">Thời gian thanh toán</Typography>
                                            <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                                                {detail.orderSummary.createdAt ? dayjs(detail.orderSummary.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
                                            </Typography>
                                        </Grid>
                                    </Grid>

                                    {detail.orderSummary.cancelReason && (
                                        <Box sx={{ p: 2, bgcolor: 'rgba(255, 86, 48, 0.03)', border: '1px solid rgba(255, 86, 48, 0.08)', borderRadius: 1.5 }}>
                                            <Typography variant="caption" color="error.main" display="block" fontWeight={700}>Lý do hủy đơn</Typography>
                                            <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic', color: 'text.primary' }}>
                                                "{detail.orderSummary.cancelReason}"
                                            </Typography>
                                        </Box>
                                    )}
                                </Stack>
                            ) : (
                                <Typography color="text.secondary" variant="body2">
                                    Không tìm thấy thông tin đơn hàng liên kết.
                                </Typography>
                            )}
                        </CardContent>
                    </Card>

                    {/* Card 3: Refund Details */}
                    <Card>
                        <CardHeader
                            title="Chi tiết yêu cầu hoàn tiền"
                            slotProps={{ title: { sx: { fontWeight: 700, fontSize: "1.05rem" } } }}
                            sx={{ pb: 1.5 }}
                        />
                        <Divider />
                        <CardContent>
                            <Stack spacing={2.5}>
                                <Grid container spacing={2.5}>
                                    <Grid item xs={12} sm={4}>
                                        <Typography variant="caption" color="text.secondary" display="block">Loại hoàn tiền</Typography>
                                        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                                            {refund.refundType === RefundType.FULL_ORDER ? 'Hoàn toàn bộ đơn' : 'Hoàn một phần'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={8}>
                                        <Typography variant="caption" color="text.secondary" display="block">Lý do yêu cầu</Typography>
                                        <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic', color: 'text.primary', wordBreak: 'break-word' }}>
                                            "{refund.refundReason}"
                                        </Typography>
                                    </Grid>
                                </Grid>

                                <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                        Danh sách vé hoàn tiền
                                    </Typography>
                                    <Box sx={{ border: '1px solid var(--palette-divider)', borderRadius: 1.5, overflow: 'hidden' }}>
                                        <RefundTicketsTable tickets={detail.refundTickets} />
                                    </Box>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right Column (35% width) */}
                <Grid item xs={12} md={4.2}>
                    {/* Card 1: Refund Payment */}
                    <Card sx={{ mb: 3 }}>
                        <CardHeader
                            title="Minh chứng chuyển khoản"
                            slotProps={{ title: { sx: { fontWeight: 700, fontSize: "1.05rem" } } }}
                            sx={{ pb: 1.5 }}
                        />
                        <Divider />
                        <CardContent>
                            {refund.payoutTransaction?.paymentEvidenceUrl ? (
                                <Box sx={{ p: 1.5, border: '1px solid var(--palette-divider)', borderRadius: 1.5, bgcolor: 'var(--palette-background-neutral)', textAlign: 'center' }}>
                                    <TransferEvidencePreview
                                        imageUrl={refund.payoutTransaction.paymentEvidenceUrl}
                                        infoItems={[
                                            { label: 'Mã yêu cầu', value: `#${refund.id}` },
                                            { label: 'Số tiền hoàn', value: `${refund.refundAmount?.toLocaleString('vi-VN') ?? '—'}đ` },
                                            { label: 'Thời gian', value: refund.payoutTransaction.paidAt ? dayjs(refund.payoutTransaction.paidAt).format('DD/MM/YYYY HH:mm') : '—' },
                                            { label: 'Nhân viên', value: detail.transferrerName || '—' }
                                        ]}
                                    />
                                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<Icon icon="eva:external-link-fill" />}
                                            href={refund.payoutTransaction.paymentEvidenceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Mở ảnh trong tab mới
                                        </Button>
                                    </Box>
                                </Box>
                            ) : (
                                <Box sx={{ p: 3, border: '1px dashed var(--palette-divider)', borderRadius: 1.5, textAlign: 'center', bgcolor: 'action.hover' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Chưa thực hiện chuyển khoản hoàn tiền.
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    {/* Card 2: Transaction Information */}
                    <Card sx={{ mb: 3 }}>
                        <CardHeader
                            title="Thông tin giao dịch"
                            slotProps={{ title: { sx: { fontWeight: 700, fontSize: "1.05rem" } } }}
                            sx={{ pb: 1.5 }}
                        />
                        <Divider />
                        <CardContent>
                            {isRefundTransferComplete(refund.status) ? (
                                <Stack spacing={2}>
                                    {refund.payoutTransaction?.id != null && (
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">Mã giao dịch</Typography>
                                            <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                                                #{refund.payoutTransaction.id}
                                            </Typography>
                                        </Box>
                                    )}
                                    {refund.payoutTransaction?.refundRequestId != null && (
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">Yêu cầu hoàn tiền</Typography>
                                            <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                                                #{refund.payoutTransaction.refundRequestId}
                                            </Typography>
                                        </Box>
                                    )}
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" display="block">Loại giao dịch</Typography>
                                        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                                            {refund.payoutTransaction?.type === 'REFUND' ? 'Hoàn tiền (REFUND)' : (refund.payoutTransaction?.type || '—')}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" display="block">Số tiền</Typography>
                                        <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                                            {(refund.payoutTransaction?.amount ?? refund.refundAmount)?.toLocaleString('vi-VN') ?? '—'}đ
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" display="block">Người thực hiện</Typography>
                                        <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                                            {detail.transferrerName || refund.payoutTransaction?.paymentBy || '—'}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" display="block">Thời gian giao dịch</Typography>
                                        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                                            {refund.payoutTransaction?.paidAt
                                                ? dayjs(refund.payoutTransaction.paidAt).format('DD/MM/YYYY HH:mm')
                                                : '—'}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" display="block">Ghi chú giao dịch</Typography>
                                        <Typography variant="body2" sx={{ mt: 0.5, p: 1.5, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid var(--palette-divider)' }}>
                                            {refund.payoutTransaction?.note || 'Không có ghi chú'}
                                        </Typography>
                                    </Box>
                                </Stack>
                            ) : (
                                <Typography color="text.secondary" variant="body2">
                                    Chưa có thông tin giao dịch hoàn tiền.
                                </Typography>
                            )}
                        </CardContent>
                    </Card>

                    {/* Card 3: Actions */}
                    <Card>
                        <CardHeader
                            title="Thao tác"
                            slotProps={{ title: { sx: { fontWeight: 700, fontSize: "1.05rem" } } }}
                            sx={{ pb: 1.5 }}
                        />
                        <Divider />
                        <CardContent>
                            <Stack spacing={2}>
                                <CanAccess permission={PERMISSIONS.REFUND.PROCESS}>
                                    {canAttachBank && !actionsDisabled && (
                                        <Button
                                            variant="contained"
                                            color="warning"
                                            fullWidth
                                            startIcon={<Icon icon="eva:plus-circle-fill" />}
                                            onClick={() => setAttachBankOpen(true)}
                                            sx={{ fontWeight: 600, py: 1 }}
                                        >
                                            Gắn STK khách hàng
                                        </Button>
                                    )}
                                </CanAccess>
                                <CanAccess permission={PERMISSIONS.REFUND.PROCESS}>
                                    {canTransfer && !actionsDisabled && (
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            fullWidth
                                            startIcon={<Icon icon="solar:card-transfer-bold" />}
                                            onClick={() => setTransferOpen(true)}
                                            sx={{ fontWeight: 600, py: 1 }}
                                        >
                                            Xác nhận chuyển khoản
                                        </Button>
                                    )}
                                </CanAccess>
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    fullWidth
                                    startIcon={<Icon icon="eva:arrow-back-fill" />}
                                    onClick={() => navigate(`/${prefixAdmin}/refunds/list`)}
                                    sx={{ py: 1 }}
                                >
                                    Quay lại danh sách
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* Card 4: History log inside right column */}
                    {detail.processingHistory?.length > 0 && (
                        <Card sx={{ mt: 3 }}>
                            <CardHeader
                                title="Nhật ký xử lý"
                                slotProps={{ title: { sx: { fontWeight: 700, fontSize: "1.05rem" } } }}
                                sx={{ pb: 1.5 }}
                            />
                            <Divider />
                            <CardContent>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pl: 1, position: 'relative' }}>
                                    <Box sx={{
                                        position: 'absolute',
                                        left: 9,
                                        top: 8,
                                        bottom: 8,
                                        width: '1px',
                                        bgcolor: 'var(--palette-divider, #E5E8EB)',
                                        zIndex: 1
                                    }} />
                                    {detail.processingHistory.map((item, index) => (
                                        <Box key={`${item.action}-${index}`} sx={{ display: 'flex', gap: 2, position: 'relative', zIndex: 2 }}>
                                            <Box sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                bgcolor: index === 0 ? 'var(--palette-primary-main)' : 'var(--palette-text-disabled)',
                                                border: '2px solid var(--palette-background-paper)',
                                                boxShadow: 1,
                                                mt: 0.65,
                                                ml: 0.5
                                            }} />
                                            <Box sx={{ flex: 1 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                                                        {item.action}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                        {item.occurredAt ? dayjs(item.occurredAt).format('DD/MM/YYYY HH:mm') : '—'}
                                                    </Typography>
                                                </Box>
                                                {item.detail && (
                                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.75rem' }}>
                                                        {item.detail}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
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
        </ThemeProvider>
    );
};
