import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CircularProgress,
    Divider,
    Grid,
    Link,
    Stack,
    ThemeProvider,
    Typography,
    createTheme,
    useTheme,
    Chip,
} from '@mui/material';
import { Icon } from '@iconify/react';
import dayjs from 'dayjs';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Title } from '../../components/ui/Title';
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
} from '../../../types/refund.type';
import {
    useGetStaffRefundDetail,
    useRequestBankInfoUpdate,
    useTransferRefund,
} from './hooks/useRefundManagement';
import { TransferRefundDialog } from './components/TransferRefundDialog';
import { TransferEvidencePreview } from './components/TransferEvidencePreview';
import { ProcessingDeadlineCard } from './components/ProcessingDeadlineCard';
import { RefundTicketsTable } from './components/RefundTicketsTable';

function FieldLabel({ children }: { children: ReactNode }) {
    return (
        <Typography
            variant="caption"
            sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 1 }}
        >
            {children}
        </Typography>
    );
}

function FieldValue({ children, sx }: { children: ReactNode; sx?: object }) {
    return (
        <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, color: 'var(--palette-text-primary)', ...sx }}
        >
            {children}
        </Typography>
    );
}

function CardSectionTitle({
    icon,
    iconColor = 'var(--palette-success-main)',
    title,
}: {
    icon: string;
    iconColor?: string;
    title: string;
}) {
    return (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <Icon icon={icon} width={24} style={{ color: iconColor }} />
            <Typography
                sx={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: 'var(--palette-text-primary)',
                }}
            >
                {title}
            </Typography>
        </Stack>
    );
}

function formatHistoryDetail(detail?: string | null): string {
    if (!detail) return '';
    const isoMatch = detail.match(
        /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)/
    );
    if (!isoMatch) return detail;
    const formatted = dayjs(isoMatch[1]).isValid()
        ? dayjs(isoMatch[1]).format('DD/MM/YYYY HH:mm')
        : isoMatch[1];
    return detail.replace(isoMatch[1], formatted);
}

const cardSx = {
    borderRadius: 'var(--shape-borderRadius-lg)',
    boxShadow: 'var(--customShadows-card)',
} as const;

export const RefundDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const refundId = Number(id);

    const [transferOpen, setTransferOpen] = useState(false);

    const { data, isLoading, isError } = useGetStaffRefundDetail(refundId);
    const transferMutation = useTransferRefund();
    const requestBankUpdateMutation = useRequestBankInfoUpdate();

    const outerTheme = useTheme();
    const localTheme = useMemo(
        () =>
            createTheme(outerTheme, {
                components: {
                    MuiCard: {
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none !important',
                                backdropFilter: 'none !important',
                                backgroundColor: 'var(--palette-background-paper) !important',
                                boxShadow: 'var(--customShadows-card)',
                                borderRadius: 'var(--shape-borderRadius-lg)',
                                color: 'var(--palette-text-primary)',
                            },
                        },
                    },
                },
            }),
        [outerTheme]
    );

    const detail = data?.data;
    const refund = detail?.refund;

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

    const canTransfer =
        (refund.status === RefundRequestStatus.APPROVED ||
            refund.status === RefundRequestStatus.READY_TO_PAY) &&
        !!refund.bankAccountId;
    const actionsDisabled = !isRefundProcessingActionable(refund.status);
    const retryCount = refund.retryCount ?? 0;
    const maxRetry = refund.maxRefundBankInfoRetry ?? 3;
    const canRequestBankUpdate =
        canTransfer && !actionsDisabled && retryCount < maxRetry;
    const customerUpdatedBankInfo =
        canTransfer && !actionsDisabled && retryCount > 0 && !refund.operatorNote;
    const sortedHistory = [...(detail.processingHistory || [])].sort((a, b) => {
        const aTime = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
        const bTime = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
        return bTime - aTime;
    });

    const headerButtonSx = {
        height: 36,
        px: 2,
        borderRadius: '8px',
        fontWeight: 700,
        textTransform: 'none' as const,
        boxShadow: 'none',
    };

    return (
        <ThemeProvider theme={localTheme}>
            <Box sx={{ width: '100%', mx: 'auto' }}>
                {/* Header — same pattern as Order Detail */}
                <Box
                    sx={{
                        mb: 5,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 2,
                        flexWrap: 'wrap',
                    }}
                >
                    <Box>
                        <Title title={`Yêu cầu hoàn tiền #${refund.id}`} />
                        <Breadcrumb
                            items={[
                                { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                                { label: 'Hoàn tiền', to: `/${prefixAdmin}/refunds/list` },
                                { label: 'Chi tiết yêu cầu' },
                            ]}
                        />
                    </Box>

                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                        <CanAccess permission={PERMISSIONS.REFUND.PROCESS}>
                            {canTransfer && !actionsDisabled && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<Icon icon="solar:card-transfer-bold-duotone" />}
                                    onClick={() => setTransferOpen(true)}
                                    sx={headerButtonSx}
                                >
                                    Xác nhận chuyển khoản
                                </Button>
                            )}
                        </CanAccess>
                        <Button
                            variant="outlined"
                            onClick={() => navigate(`/${prefixAdmin}/refunds/list`)}
                            startIcon={<Icon icon="eva:arrow-back-fill" />}
                            sx={{
                                ...headerButtonSx,
                                color: 'var(--palette-text-primary)',
                                borderColor: 'var(--palette-divider)',
                                '&:hover': {
                                    bgcolor: 'var(--palette-action-hover)',
                                    borderColor: 'var(--palette-text-primary)',
                                },
                            }}
                        >
                            Quay lại
                        </Button>
                    </Stack>
                </Box>

                {/* Stepper */}
                <Card sx={{ p: 3, mb: 3, ...cardSx }}>
                    <RefundStatusStepper
                        status={refund.status}
                        requestRole={refund.requestRole}
                    />
                </Card>

                <ProcessingDeadlineCard
                    status={refund.status}
                    processingDeadlineAt={refund.processingDeadlineAt}
                    remainingProcessingSeconds={refund.remainingProcessingSeconds}
                    processingUrgency={refund.processingUrgency}
                />

                {customerUpdatedBankInfo && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        Khách hàng đã cập nhật lại thông tin tài khoản ngân hàng. Vui lòng kiểm tra lại
                        thông tin và tiếp tục thực hiện chuyển khoản nếu hợp lệ.
                    </Alert>
                )}

                <Grid container spacing={3}>
                    {/* Left column */}
                    <Grid size={{ xs: 12, md: 8, lg: 9 }}>
                        <Stack spacing={3}>
                            {/* Summary */}
                            <Card sx={{ p: 3, ...cardSx }}>
                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                        <FieldLabel>Trạng thái</FieldLabel>
                                        <RefundStatusBadge status={refund.status} />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                        <FieldLabel>Số tiền hoàn</FieldLabel>
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                fontWeight: 700,
                                                color: 'var(--palette-error-main)',
                                            }}
                                        >
                                            {refund.refundAmount?.toLocaleString('vi-VN')}đ
                                        </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                        <FieldLabel>Mã đơn hàng</FieldLabel>
                                        {detail.orderSummary ? (
                                            <Link
                                                component="button"
                                                variant="subtitle2"
                                                onClick={() =>
                                                    navigate(
                                                        `/${prefixAdmin}/order/detail/${detail.orderSummary.id}`
                                                    )
                                                }
                                                sx={{
                                                    fontWeight: 700,
                                                    color: 'var(--palette-primary-main)',
                                                    textDecoration: 'underline',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                }}
                                            >
                                                {detail.orderSummary.orderCode}
                                            </Link>
                                        ) : (
                                            <FieldValue>—</FieldValue>
                                        )}
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                        <FieldLabel>Thời gian tạo</FieldLabel>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Icon
                                                icon="solar:calendar-date-bold-duotone"
                                                width={18}
                                                style={{ color: 'var(--palette-text-secondary)' }}
                                            />
                                            <FieldValue>
                                                {refund.createdAt
                                                    ? dayjs(refund.createdAt).format(
                                                          'DD/MM/YYYY HH:mm'
                                                      )
                                                    : '—'}
                                            </FieldValue>
                                        </Stack>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 3, borderStyle: 'dashed' }} />

                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <FieldLabel>Loại hoàn tiền</FieldLabel>
                                        <FieldValue>
                                            {refund.refundType === RefundType.FULL_ORDER
                                                ? 'Hoàn toàn bộ đơn'
                                                : 'Hoàn một phần'}
                                        </FieldValue>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 8 }}>
                                        <FieldLabel>Lý do yêu cầu</FieldLabel>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: 600,
                                                color: 'var(--palette-text-primary)',
                                                lineHeight: 1.6,
                                            }}
                                        >
                                            {refund.refundReason || 'Không có'}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Card>

                            {/* Order info */}
                            <Card sx={{ p: 3, ...cardSx }}>
                                <CardSectionTitle
                                    icon="solar:bill-list-bold-duotone"
                                    title="Thông tin đơn hàng"
                                />
                                {detail.orderSummary ? (
                                    <>
                                        <Grid container spacing={3}>
                                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                                <FieldLabel>Mã đơn hàng</FieldLabel>
                                                <Link
                                                    component="button"
                                                    variant="subtitle2"
                                                    onClick={() =>
                                                        navigate(
                                                            `/${prefixAdmin}/order/detail/${detail.orderSummary.id}`
                                                        )
                                                    }
                                                    sx={{
                                                        fontWeight: 700,
                                                        color: 'var(--palette-primary-main)',
                                                        textDecoration: 'underline',
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                    }}
                                                >
                                                    {detail.orderSummary.orderCode}
                                                </Link>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                                <FieldLabel>Trạng thái đơn hàng</FieldLabel>
                                                <Chip
                                                    label={detail.orderSummary.status}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 700,
                                                        height: 24,
                                                        fontSize: '0.75rem',
                                                        borderRadius: '6px',
                                                        color: 'var(--palette-info-dark)',
                                                        bgcolor: 'var(--palette-info-lighter)',
                                                    }}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                                <FieldLabel>Tổng giá trị đơn</FieldLabel>
                                                <FieldValue>
                                                    {detail.orderSummary.totalAmount?.toLocaleString(
                                                        'vi-VN'
                                                    )}
                                                    đ
                                                </FieldValue>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                                <FieldLabel>Phương thức thanh toán</FieldLabel>
                                                <FieldValue>PayOS (Chuyển khoản QR)</FieldValue>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                                <FieldLabel>Thời gian thanh toán</FieldLabel>
                                                <FieldValue>
                                                    {detail.orderSummary.createdAt
                                                        ? dayjs(detail.orderSummary.createdAt).format(
                                                              'DD/MM/YYYY HH:mm'
                                                          )
                                                        : '—'}
                                                </FieldValue>
                                            </Grid>
                                        </Grid>
                                        {detail.orderSummary.cancelReason && (
                                            <>
                                                <Divider sx={{ my: 3, borderStyle: 'dashed' }} />
                                                <FieldLabel>Lý do hủy đơn</FieldLabel>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: 'var(--palette-text-primary)',
                                                        lineHeight: 1.6,
                                                    }}
                                                >
                                                    {detail.orderSummary.cancelReason}
                                                </Typography>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <Typography
                                        variant="body2"
                                        sx={{ color: 'var(--palette-text-secondary)' }}
                                    >
                                        Không tìm thấy thông tin đơn hàng liên kết.
                                    </Typography>
                                )}
                            </Card>

                            {/* Bank account */}
                            <Card sx={{ p: 3, ...cardSx }}>
                                <CardSectionTitle
                                    icon="solar:card-bold-duotone"
                                    title="Tài khoản nhận hoàn tiền"
                                />
                                {refund.bankAccount ? (
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Avatar
                                            variant="rounded"
                                            src={refund.bankAccount.bankLogo || undefined}
                                            sx={{
                                                width: 56,
                                                height: 56,
                                                bgcolor: 'var(--palette-background-neutral)',
                                            }}
                                        >
                                            <Icon icon="solar:card-bold-duotone" width={28} />
                                        </Avatar>
                                        <Grid container spacing={2} sx={{ flex: 1 }}>
                                            <Grid size={{ xs: 12, sm: 4 }}>
                                                <FieldLabel>Ngân hàng</FieldLabel>
                                                <FieldValue
                                                    sx={{ color: 'var(--palette-primary-main)' }}
                                                >
                                                    {refund.bankAccount.bankName}
                                                </FieldValue>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 4 }}>
                                                <FieldLabel>Số tài khoản</FieldLabel>
                                                <FieldValue
                                                    sx={{
                                                        fontFamily:
                                                            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                                    }}
                                                >
                                                    {maskBankAccountNo(
                                                        refund.bankAccount.bankAccountNo
                                                    )}
                                                </FieldValue>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 4 }}>
                                                <FieldLabel>Chủ tài khoản</FieldLabel>
                                                <FieldValue sx={{ textTransform: 'uppercase' }}>
                                                    {refund.bankAccount.bankAccountName}
                                                </FieldValue>
                                            </Grid>
                                        </Grid>
                                    </Stack>
                                ) : (
                                    <Typography
                                        variant="body2"
                                        sx={{ color: 'var(--palette-warning-dark)', fontWeight: 600 }}
                                    >
                                        Đang chờ khách hàng cung cấp số tài khoản ngân hàng nhận hoàn
                                        tiền.
                                    </Typography>
                                )}
                            </Card>

                            {/* Tickets */}
                            <Card sx={cardSx}>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    sx={{ pt: 3, px: 3, pb: 3 }}
                                >
                                    <Icon
                                        icon="solar:ticket-bold-duotone"
                                        width={24}
                                        style={{ color: 'var(--palette-success-main)' }}
                                    />
                                    <Typography
                                        sx={{
                                            fontSize: '1.125rem',
                                            fontWeight: 700,
                                            color: 'var(--palette-text-primary)',
                                        }}
                                    >
                                        Danh sách vé hoàn tiền
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: 'var(--palette-text-secondary)', ml: 1 }}
                                    >
                                        ({detail.refundTickets?.length || 0} vé)
                                    </Typography>
                                </Stack>
                                <Box sx={{ px: 0, pb: 0 }}>
                                    <RefundTicketsTable tickets={detail.refundTickets} />
                                </Box>
                            </Card>
                        </Stack>
                    </Grid>

                    {/* Right column */}
                    <Grid size={{ xs: 12, md: 4, lg: 3 }}>
                        <Stack spacing={3}>
                            {/* Customer */}
                            <Card sx={{ p: 3, ...cardSx }}>
                                <CardSectionTitle
                                    icon="solar:user-bold"
                                    title="Thông tin khách hàng"
                                />
                                <Stack
                                    direction="row"
                                    spacing={2}
                                    alignItems="flex-start"
                                    sx={{ mb: 3 }}
                                >
                                    <Avatar
                                        sx={{
                                            width: 64,
                                            height: 64,
                                            bgcolor: 'var(--palette-background-neutral)',
                                            color: 'var(--palette-text-secondary)',
                                        }}
                                    >
                                        <Icon icon="solar:user-rounded-bold" width={32} />
                                    </Avatar>
                                    <Stack spacing={1} sx={{ minWidth: 0 }}>
                                        <Typography
                                            variant="subtitle1"
                                            sx={{
                                                fontWeight: 700,
                                                color: 'var(--palette-text-primary)',
                                            }}
                                        >
                                            {detail.customerSummary.fullName || '—'}
                                        </Typography>
                                        {detail.customerSummary.phone && (
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: 'var(--palette-text-primary)',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {detail.customerSummary.phone}
                                            </Typography>
                                        )}
                                        {detail.customerSummary.email && (
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: 'var(--palette-text-primary)',
                                                    fontWeight: 500,
                                                    wordBreak: 'break-all',
                                                }}
                                            >
                                                {detail.customerSummary.email}
                                            </Typography>
                                        )}
                                        {!detail.customerSummary.phone &&
                                            !detail.customerSummary.email && (
                                                <Typography
                                                    variant="body2"
                                                    sx={{ color: 'var(--palette-text-secondary)' }}
                                                >
                                                    Không có thông tin liên hệ
                                                </Typography>
                                            )}
                                    </Stack>
                                </Stack>
                                {detail.customerSummary.id && (
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        startIcon={<Icon icon="solar:user-id-linear" />}
                                        onClick={() =>
                                            navigate(
                                                `/${prefixAdmin}/account-user/detail/${detail.customerSummary.id}`
                                            )
                                        }
                                        sx={{
                                            py: 1,
                                            fontWeight: 700,
                                            color: 'var(--palette-text-primary)',
                                            borderColor: 'var(--palette-divider)',
                                            borderRadius: '8px',
                                            textTransform: 'none',
                                            '&:hover': {
                                                bgcolor: 'var(--palette-action-hover)',
                                                borderColor: 'var(--palette-text-primary)',
                                            },
                                        }}
                                    >
                                        Xem chi tiết khách hàng
                                    </Button>
                                )}
                            </Card>

                            {/* Evidence & transaction */}
                            <Card sx={{ p: 3, ...cardSx }}>
                                <CardSectionTitle
                                    icon="solar:gallery-bold-duotone"
                                    title="Minh chứng & giao dịch"
                                />
                                {refund.payoutTransaction?.paymentEvidenceUrl ? (
                                    <Box sx={{ mb: 2.5 }}>
                                        <TransferEvidencePreview
                                            imageUrl={refund.payoutTransaction.paymentEvidenceUrl}
                                            infoItems={[
                                                { label: 'Mã yêu cầu', value: `#${refund.id}` },
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
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            size="small"
                                            startIcon={<Icon icon="eva:external-link-fill" />}
                                            href={refund.payoutTransaction.paymentEvidenceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{
                                                mt: 1.5,
                                                borderRadius: '8px',
                                                textTransform: 'none',
                                                fontWeight: 600,
                                            }}
                                        >
                                            Mở ảnh trong tab mới
                                        </Button>
                                    </Box>
                                ) : (
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: 'var(--palette-text-secondary)',
                                            mb: 2.5,
                                        }}
                                    >
                                        Chưa thực hiện chuyển khoản hoàn tiền.
                                    </Typography>
                                )}

                                <Divider sx={{ mb: 2.5, borderStyle: 'dashed' }} />

                                {isRefundTransferComplete(refund.status) ? (
                                    <Stack spacing={2}>
                                        {refund.payoutTransaction?.id != null && (
                                            <Box>
                                                <FieldLabel>Mã giao dịch</FieldLabel>
                                                <FieldValue>#{refund.payoutTransaction.id}</FieldValue>
                                            </Box>
                                        )}
                                        {refund.payoutTransaction?.refundRequestId != null && (
                                            <Box>
                                                <FieldLabel>Yêu cầu hoàn tiền</FieldLabel>
                                                <FieldValue>
                                                    #{refund.payoutTransaction.refundRequestId}
                                                </FieldValue>
                                            </Box>
                                        )}
                                        <Box>
                                            <FieldLabel>Loại giao dịch</FieldLabel>
                                            <FieldValue>
                                                {refund.payoutTransaction?.type === 'REFUND'
                                                    ? 'Hoàn tiền (REFUND)'
                                                    : refund.payoutTransaction?.type || '—'}
                                            </FieldValue>
                                        </Box>
                                        <Box>
                                            <FieldLabel>Số tiền</FieldLabel>
                                            <FieldValue>
                                                {(
                                                    refund.payoutTransaction?.amount ??
                                                    refund.refundAmount
                                                )?.toLocaleString('vi-VN') ?? '—'}
                                                đ
                                            </FieldValue>
                                        </Box>
                                        <Box>
                                            <FieldLabel>Người thực hiện</FieldLabel>
                                            <FieldValue>
                                                {detail.transferrerName ||
                                                    refund.payoutTransaction?.paymentBy ||
                                                    '—'}
                                            </FieldValue>
                                        </Box>
                                        <Box>
                                            <FieldLabel>Thời gian giao dịch</FieldLabel>
                                            <FieldValue>
                                                {refund.payoutTransaction?.paidAt
                                                    ? dayjs(refund.payoutTransaction.paidAt).format(
                                                          'DD/MM/YYYY HH:mm'
                                                      )
                                                    : '—'}
                                            </FieldValue>
                                        </Box>
                                        <Box>
                                            <FieldLabel>Ghi chú giao dịch</FieldLabel>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: 'var(--palette-text-primary)',
                                                }}
                                            >
                                                {refund.payoutTransaction?.note || 'Không có ghi chú'}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                ) : (
                                    <Typography
                                        variant="body2"
                                        sx={{ color: 'var(--palette-text-secondary)' }}
                                    >
                                        Chưa có thông tin giao dịch hoàn tiền.
                                    </Typography>
                                )}
                            </Card>

                            {/* History */}
                            {sortedHistory.length > 0 && (
                                <Card sx={{ p: 3, ...cardSx }}>
                                    <CardSectionTitle
                                        icon="solar:history-bold-duotone"
                                        title="Nhật ký xử lý"
                                    />
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 2,
                                            pl: 0.5,
                                            position: 'relative',
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                left: 7,
                                                top: 8,
                                                bottom: 8,
                                                width: '1px',
                                                bgcolor: 'var(--palette-divider)',
                                                zIndex: 1,
                                            }}
                                        />
                                        {sortedHistory.map((item, index) => (
                                            <Box
                                                key={`${item.action}-${index}`}
                                                sx={{
                                                    display: 'flex',
                                                    gap: 1.5,
                                                    position: 'relative',
                                                    zIndex: 2,
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: '50%',
                                                        bgcolor:
                                                            index === 0
                                                                ? 'var(--palette-primary-main)'
                                                                : 'var(--palette-text-disabled)',
                                                        border: '2px solid var(--palette-background-paper)',
                                                        boxShadow: 1,
                                                        mt: 0.65,
                                                        ml: 0.25,
                                                        flexShrink: 0,
                                                    }}
                                                />
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            flexWrap: 'wrap',
                                                            gap: 0.5,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="subtitle2"
                                                            sx={{
                                                                fontWeight: 700,
                                                                fontSize: '0.8rem',
                                                            }}
                                                        >
                                                            {item.action}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: 'var(--palette-text-secondary)',
                                                                fontSize: '0.75rem',
                                                            }}
                                                        >
                                                            {item.occurredAt
                                                                ? dayjs(item.occurredAt).format(
                                                                      'DD/MM/YYYY HH:mm'
                                                                  )
                                                                : '—'}
                                                        </Typography>
                                                    </Box>
                                                    {item.detail && (
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                mt: 0.35,
                                                                fontSize: '0.75rem',
                                                                color: 'var(--palette-text-secondary)',
                                                                lineHeight: 1.45,
                                                            }}
                                                        >
                                                            {formatHistoryDetail(item.detail)}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                </Card>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
            </Box>

            <TransferRefundDialog
                open={transferOpen}
                loading={transferMutation.isPending}
                bankUpdateLoading={requestBankUpdateMutation.isPending}
                bankAccount={refund.bankAccount}
                retryCount={retryCount}
                maxRetry={maxRetry}
                canRequestBankUpdate={canRequestBankUpdate}
                onClose={() => setTransferOpen(false)}
                onConfirm={(payload) =>
                    transferMutation.mutate(
                        { id: refundId, data: payload },
                        { onSuccess: () => setTransferOpen(false) }
                    )
                }
                onRequestBankUpdate={(operatorNote) =>
                    requestBankUpdateMutation.mutate(
                        { id: refundId, operatorNote },
                        { onSuccess: () => setTransferOpen(false) }
                    )
                }
            />
        </ThemeProvider>
    );
};
