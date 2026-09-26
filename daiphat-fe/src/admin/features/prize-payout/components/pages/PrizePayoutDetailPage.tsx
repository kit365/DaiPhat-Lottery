"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    CircularProgress,
    FormControl,
    FormControlLabel,
    IconButton,
    Link,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { PageHeader } from '@/admin/components/ui/PageHeader';
import { SpinnerLoading } from '@/admin/components/ui/SpinnerLoading';
import { CanAccess } from '@/admin/components/auth/CanAccess';
import { PERMISSIONS } from '@/admin/constants/permission.constants';
import { prefixAdmin } from '@/admin/constants/routes';
import { PrizePayoutStatusBadge } from '@/client/components/prize-payout/PrizePayoutStatusBadge';
import { TransferEvidencePreview } from '@/admin/features/refund/components/TransferEvidencePreview';
import {
    ContractDocumentViewerDialog,
    mapContractPdfErrorMessage,
} from '@/admin/shared/contracts';
import {
    formatPrizePayoutCurrency,
    PrizePayoutPaymentMethod,
    PrizePayoutRequestStatus,
    PRIZE_PAYOUT_PAYMENT_METHOD_LABELS,
    PRIZE_PAYOUT_VERIFICATION_LABELS,
    resolvePrizePayoutOrderTypeLabel,
} from '@/types/prize-payout.type';
import { prizePayoutAdminApi } from "@/admin/features/prize-payout/services/prizePayoutService";
import {
    useApprovePrizePayout,
    useCompletePrizePayout,
    useGetStaffPrizePayoutDetail,
    useRejectPrizePayout,
} from '@/admin/features/prize-payout/hooks/usePrizePayoutManagement';
import { UploadSingleFile } from '@/admin/components/upload/UploadSingleFile';
import { AppToast as toast } from '@/utils/toast.util';
import { AdminLuckyDisplay } from '@/shared/lucky-number';
import CloseIcon from '@mui/icons-material/Close';

const REJECT_REASON_QUICK_REPLIES = [
    'Số tài khoản không hợp lệ. Vui lòng kiểm tra và gửi lại yêu cầu.',
    'Ngân hàng nhận không hỗ trợ giao dịch. Vui lòng chọn tài khoản khác.',
    'Thông tin tài khoản chưa chính xác. Vui lòng cập nhật và gửi lại.',
    'Cần đối chiếu trực tiếp tại đại lý. Vui lòng mang CCCD và vé đến quầy.',
] as const;

const cardSx = {
    borderRadius: 'var(--shape-borderRadius-lg)',
    boxShadow: 'var(--customShadows-card)',
} as const;

function FieldLabel({ children }: { children: ReactNode }) {
    return (
        <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', fontWeight: 600, display: 'block', mb: 0.5 }}>
            {children}
        </Typography>
    );
}

function FieldValue({ children, sx }: { children: ReactNode; sx?: object }) {
    return (
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)', ...sx }}>
            {children}
        </Typography>
    );
}

function CardSectionTitle({ title, icon, extra }: { title: string; icon?: string; extra?: ReactNode }) {
    return (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.25}>
                {icon && (
                    <Box
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'action.hover',
                            color: 'primary.main',
                            fontSize: '1.1rem',
                        }}
                    >
                        <Icon icon={icon} />
                    </Box>
                )}
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                    {title}
                </Typography>
            </Stack>
            {extra}
        </Stack>
    );
}

function OcrFieldTile({
    label,
    value,
    icon,
    mono,
}: {
    label: string;
    value?: ReactNode;
    icon?: string;
    mono?: boolean;
}) {
    return (
        <Box
            sx={{
                p: 1.5,
                borderRadius: '10px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.neutral',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
            }}
        >
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                {icon && (
                    <Box sx={{ color: 'text.disabled', display: 'flex', fontSize: '0.95rem' }}>
                        <Icon icon={icon} />
                    </Box>
                )}
                <Typography
                    variant="caption"
                    sx={{
                        color: 'text.secondary',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        fontSize: '0.7rem',
                        letterSpacing: '0.04em',
                    }}
                >
                    {label}
                </Typography>
            </Stack>
            <Typography
                variant="subtitle2"
                sx={{
                    fontWeight: 700,
                    color: value ? 'text.primary' : 'text.disabled',
                    fontFamily: mono ? 'monospace' : undefined,
                    wordBreak: 'break-word',
                    fontSize: '0.875rem',
                }}
            >
                {value || '—'}
            </Typography>
        </Box>
    );
}

function InfoRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
    return (
        <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="baseline"
            spacing={2}
            sx={{ py: 1.25, borderBottom: '1px dashed', borderColor: 'divider' }}
        >
            <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                {label}
            </Typography>
            <Typography
                variant="body2"
                sx={{
                    fontWeight: 600,
                    textAlign: 'right',
                    fontFamily: mono ? 'monospace' : undefined,
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {value}
            </Typography>
        </Stack>
    );
}

function resolveTransferAmount(detail: {
    paymentMethod?: PrizePayoutPaymentMethod | null;
    transferAmount?: number | string | null;
    cashAmount?: number | string | null;
    netAmount?: number | string | null;
    grossAmount?: number | string | null;
}): number {
    if (detail.transferAmount != null && detail.transferAmount !== '') {
        return Number(detail.transferAmount) || 0;
    }
    const net = Number(detail.netAmount ?? detail.grossAmount ?? 0) || 0;
    if (detail.paymentMethod === 'COMBINED') {
        return Math.max(0, net - (Number(detail.cashAmount) || 0));
    }
    if (detail.paymentMethod === 'CASH') {
        return 0;
    }
    return net;
}

function DialogAmountHint({ label, amount }: { label: string; amount: number }) {
    return (
        <Box sx={{ p: 2, mb: 2, borderRadius: '10px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.neutral' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                {label}
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', fontVariantNumeric: 'tabular-nums' }}>
                {formatPrizePayoutCurrency(amount)}
            </Typography>
        </Box>
    );
}

export const PrizePayoutDetailPage = () => {
    const { id } = useRouteParams();
    const router = useAdminRouter();
    const pathname = usePathname() ?? '';
    const searchParams = useSearchParams();
    const returnTo = searchParams?.get("returnTo") ?? undefined;
    const returnLabel = searchParams?.get("returnLabel") ?? undefined;
    const returnNav = { returnTo, returnLabel };
    const fromSupportTicketId = searchParams?.get("fromSupportTicketId");
    const complaintBackPath = fromSupportTicketId
        ? `/${prefixAdmin}/support-tickets/detail/${fromSupportTicketId}`
        : null;
    const backPath =
        returnNav?.returnTo && returnNav.returnTo.startsWith(`/${prefixAdmin}/`)
            ? returnNav.returnTo
            : complaintBackPath
                ? complaintBackPath
            : `/${prefixAdmin}/prize-payouts/list`;
    const backLabel = returnNav?.returnTo && returnNav.returnTo.startsWith(`/${prefixAdmin}/`)
        ? (returnNav.returnLabel || 'Quay lại khiếu nại')
        : complaintBackPath
            ? `Quay lại khiếu nại #${fromSupportTicketId}`
        : 'Quay lại';
    const requestId = Number(id);
    const { data, isLoading } = useGetStaffPrizePayoutDetail(requestId);
    const approveMutation = useApprovePrizePayout();
    const completeMutation = useCompletePrizePayout();
    const rejectMutation = useRejectPrizePayout();

    const [completeOpen, setCompleteOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [evidenceUrl, setEvidenceUrl] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PrizePayoutPaymentMethod>('TRANSFER');
    const [rejectReason, setRejectReason] = useState('');
    const [selectedRejectQuickReplyIndex, setSelectedRejectQuickReplyIndex] = useState<number | null>(null);
    const [uploading, setUploading] = useState(false);
    const [printingContract, setPrintingContract] = useState(false);
    const [viewSignedOpen, setViewSignedOpen] = useState(false);

    const detail = data?.data;

    const handlePrintSystemContract = async () => {
        if (!detail) return;
        try {
            setPrintingContract(true);
            await prizePayoutAdminApi.openConfirmationContractPdf(detail.id);
        } catch (error) {
            toast.error(
                mapContractPdfErrorMessage(
                    error instanceof Error ? error.message : undefined,
                ),
            );
        } finally {
            setPrintingContract(false);
        }
    };

    const copyToClipboard = async (text?: string, message?: string) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            toast.success(message || 'Đã sao chép vào bộ nhớ tạm');
        } catch {
            toast.error('Không thể sao chép');
        }
    };

    if (isLoading) {
        return (
            <Box sx={{ width: '100%' }}>
                <PageHeader
                    title={`Yêu cầu trả thưởng #${requestId}`}
                    breadcrumbItems={[
                        { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                        { label: 'Trả thưởng', to: `/${prefixAdmin}/prize-payouts/list` },
                        { label: `#${requestId}` },
                    ]}
                />
                <SpinnerLoading />
            </Box>
        );
    }

    if (!detail) {
        return (
            <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                    Không tìm thấy yêu cầu trả thưởng
                </Typography>
                <Button variant="outlined" onClick={() => router.push(backPath)}>
                    {backLabel === 'Quay lại' ? 'Quay lại danh sách' : backLabel}
                </Button>
            </Box>
        );
    }

    const isPending = detail.status === PrizePayoutRequestStatus.PENDING;
    const isApproved = detail.status === PrizePayoutRequestStatus.APPROVED;
    const canReject = isPending || isApproved;
    const transferAmountToPay = resolveTransferAmount(detail);
    const needsTransferDisplay =
        detail.channel === 'ONLINE'
        || detail.paymentMethod === 'TRANSFER'
        || detail.paymentMethod === 'COMBINED'
        || transferAmountToPay > 0;
    const dialogTransferAmount =
        paymentMethod === 'COMBINED' && detail.channel !== 'ONLINE'
            ? Number(
                detail.transferAmount
                ?? Math.max(0, Number(detail.netAmount || 0) - Number(detail.cashAmount || 0))
            ) || 0
            : transferAmountToPay;
    const showTransferInCompleteDialog =
        detail.channel === 'ONLINE'
        || paymentMethod === 'TRANSFER'
        || paymentMethod === 'COMBINED';

    const headerButtonSx = {
        height: 36,
        px: 2,
        borderRadius: '8px',
        fontWeight: 700,
        textTransform: 'none' as const,
        boxShadow: 'none',
    };

    const buildTransferCopyText = () =>
        [
            detail.customerName ? `Khách hàng: ${detail.customerName}` : null,
            `Ngân hàng: ${detail.bankName || '—'}`,
            `STK: ${detail.bankAccountNumber || '—'}`,
            `Chủ TK: ${detail.accountHolderName || '—'}`,
            needsTransferDisplay ? `Số tiền CK: ${formatPrizePayoutCurrency(transferAmountToPay)}` : null,
        ]
            .filter(Boolean)
            .join('\n');

    const resolvedCashAmount =
        detail.paymentMethod === 'CASH'
            ? Number(detail.cashAmount ?? detail.netAmount ?? 0)
            : detail.paymentMethod === 'COMBINED'
              ? Number(detail.cashAmount ?? 0)
              : 0;
    const resolvedTransferAmount =
        detail.paymentMethod === 'TRANSFER'
            ? Number(detail.transferAmount ?? detail.netAmount ?? 0)
            : detail.paymentMethod === 'COMBINED'
              ? Number(
                    detail.transferAmount
                    ?? Math.max(0, Number(detail.netAmount || 0) - Number(detail.cashAmount || 0))
                )
              : transferAmountToPay;

    const orderDetailPath = detail.orderId ? `/${prefixAdmin}/order/detail/${detail.orderId}` : null;
    const customerDetailPath = detail.customerId ? `/${prefixAdmin}/account-user/detail/${detail.customerId}` : null;
    const detailLinkSx = {
        fontWeight: 700,
        color: 'var(--palette-primary-main)',
        textDecoration: 'underline',
        cursor: 'pointer',
    } as const;

    const closeRejectDialog = () => {
        if (rejectMutation.isPending) return;
        setRejectOpen(false);
        setRejectReason('');
        setSelectedRejectQuickReplyIndex(null);
    };

    const dialogActionsSx = {
        px: 3,
        pb: 3,
        pt: 2,
        gap: 1.5,
        borderTop: '1px solid',
        borderColor: 'divider',
    } as const;

    const dialogCancelButtonSx = {
        minWidth: 96,
        height: 40,
        fontWeight: 700,
        textTransform: 'none',
        borderRadius: '10px',
    } as const;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mx-auto font-['Public_Sans',sans-serif]"
        >
            {/* Header Section */}
            <PageHeader
                title={`Yêu cầu trả thưởng ${detail.requestCode}`}
                breadcrumbItems={[
                    { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                    { label: 'Trả thưởng', to: `/${prefixAdmin}/prize-payouts/list` },
                    { label: detail.requestCode },
                ]}
                titleExtra={<PrizePayoutStatusBadge status={detail.status} />}
                action={
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                    <CanAccess permission={PERMISSIONS.PRIZE_PAYOUT.PROCESS}>
                        {isPending && detail.requiresFourEyes && (
                            <Button
                                variant="contained"
                                color="info"
                                disabled={detail.canCurrentStaffApprove === false || approveMutation.isPending}
                                startIcon={<Icon icon="solar:check-circle-bold-duotone" />}
                                onClick={() => approveMutation.mutate(detail.id)}
                                sx={headerButtonSx}
                            >
                                {approveMutation.isPending ? 'Đang duyệt...' : 'Duyệt'}
                            </Button>
                        )}
                        {(detail.requiresFourEyes ? isApproved : isPending) && (
                            <Button
                                variant="contained"
                                color="success"
                                disabled={detail.canCurrentStaffComplete === false}
                                startIcon={<Icon icon="solar:card-transfer-bold-duotone" />}
                                onClick={() => {
                                    setPaymentMethod(
                                        detail.channel === 'ONLINE'
                                            ? 'TRANSFER'
                                            : (detail.paymentMethod || 'TRANSFER')
                                    );
                                    setEvidenceUrl('');
                                    setCompleteOpen(true);
                                }}
                                sx={headerButtonSx}
                            >
                                Xác nhận trả thưởng
                            </Button>
                        )}
                        {canReject && (
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Icon icon="solar:close-circle-bold-duotone" />}
                                onClick={() => setRejectOpen(true)}
                                sx={headerButtonSx}
                            >
                                Từ chối
                            </Button>
                        )}
                    </CanAccess>
                </Stack>
                }
            />

            <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Stack spacing={2.5}>
                        {/* Card 1: Ticket & Prize Information */}
                        <Card sx={{ p: 3, ...cardSx }}>
                            <CardSectionTitle title="Thông tin vé & trúng thưởng" icon="solar:ticket-bold-duotone" />

                            {/* Station and Draw Date Bar */}
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                flexWrap="wrap"
                                gap={1.5}
                                sx={{
                                    p: 2,
                                    bgcolor: 'background.neutral',
                                    borderRadius: '12px',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    mb: 2.5,
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '10px',
                                            bgcolor: 'error.lighter',
                                            color: 'error.main',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Icon icon="solar:ticket-sale-bold-duotone" width={22} />
                                    </Box>
                                    <Box>
                                        <Typography
                                            variant="caption"
                                            sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}
                                        >
                                            Nhà đài phát hành
                                        </Typography>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                                            {detail.stationName || '—'}
                                        </Typography>
                                    </Box>
                                </Stack>

                                <Chip
                                    icon={<Icon icon="solar:calendar-bold-duotone" width={16} />}
                                    label={detail.drawDate ? `Ngày quay: ${dayjs(detail.drawDate).format('DD/MM/YYYY')}` : '—'}
                                    size="small"
                                    sx={{ fontWeight: 600, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
                                />
                            </Stack>

                            {/* Numbers and Prize Badge Box */}
                            <Box
                                sx={{
                                    textAlign: 'center',
                                    p: 2.5,
                                    mb: 2.5,
                                    borderRadius: '14px',
                                    border: '1px solid',
                                    borderColor: 'error.lighter',
                                    bgcolor: 'rgba(255, 72, 66, 0.04)',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'text.secondary',
                                        fontWeight: 700,
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        display: 'block',
                                        mb: 1,
                                    }}
                                >
                                    Dãy số trên vé
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'inline-block',
                                        py: 0.75,
                                        px: 2.5,
                                        borderRadius: '12px',
                                        bgcolor: 'background.paper',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                    }}
                                >
                                    <AdminLuckyDisplay value={detail.numbers} ticket sx={{ fontWeight: 800, fontSize: '1.4rem' }} />
                                </Box>
                                <Box sx={{ mt: 1.5 }}>
                                    <Chip
                                        icon={<Icon icon="solar:cup-star-bold-duotone" width={16} />}
                                        label={detail.prizeDisplayName || detail.prizeCode || '—'}
                                        color="error"
                                        size="medium"
                                        sx={{ fontWeight: 800, px: 1 }}
                                    />
                                </Box>
                            </Box>

                            {/* Order Details Grid */}
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 6, sm: 4 }}>
                                    <FieldLabel>Mã đơn hàng</FieldLabel>
                                    {orderDetailPath && detail.orderCode ? (
                                        <Link
                                            component="button"
                                            variant="subtitle2"
                                            onClick={() => router.push(orderDetailPath)}
                                            sx={{
                                                ...detailLinkSx,
                                                p: 0,
                                                border: 0,
                                                bgcolor: 'transparent',
                                                textAlign: 'left',
                                                fontWeight: 700,
                                            }}
                                        >
                                            {detail.orderCode}
                                        </Link>
                                    ) : (
                                        <FieldValue>{detail.orderCode || '—'}</FieldValue>
                                    )}
                                </Grid>
                                <Grid size={{ xs: 6, sm: 4 }}>
                                    <FieldLabel>Ngày tạo yêu cầu</FieldLabel>
                                    <FieldValue>
                                        {detail.createdAt ? dayjs(detail.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
                                    </FieldValue>
                                </Grid>
                                <Grid size={{ xs: 6, sm: 4 }}>
                                    <FieldLabel>Loại đơn hàng</FieldLabel>
                                    <FieldValue>{resolvePrizePayoutOrderTypeLabel(detail)}</FieldValue>
                                </Grid>
                                <Grid size={{ xs: 6, sm: 4 }}>
                                    <FieldLabel>Xác minh quyền sở hữu</FieldLabel>
                                    <FieldValue>
                                        {detail.ownershipVerificationLevel
                                            ? PRIZE_PAYOUT_VERIFICATION_LABELS[detail.ownershipVerificationLevel]
                                            : '—'}
                                    </FieldValue>
                                </Grid>
                                <Grid size={{ xs: 6, sm: 4 }}>
                                    <FieldLabel>Kênh nhận thưởng</FieldLabel>
                                    <FieldValue>
                                        {detail.channel === 'ONLINE' ? 'Trực tuyến' : 'Tại quầy / Đại lý'}
                                    </FieldValue>
                                </Grid>
                                <Grid size={{ xs: 6, sm: 4 }}>
                                    <FieldLabel>Hình thức chi trả</FieldLabel>
                                    <FieldValue>
                                        {detail.paymentMethod
                                            ? PRIZE_PAYOUT_PAYMENT_METHOD_LABELS[detail.paymentMethod]
                                            : '—'}
                                    </FieldValue>
                                </Grid>
                            </Grid>
                        </Card>

                        {/* Card 2: Financial Breakdown */}
                        <Card sx={{ p: 3, ...cardSx }}>
                            <CardSectionTitle title="Chi tiết tiền thưởng" icon="solar:wallet-money-bold-duotone" />

                            <Box sx={{ mb: 2.5 }}>
                                <InfoRow label="Giá trị giải thưởng (Gross)" value={formatPrizePayoutCurrency(detail.grossAmount)} />
                                <InfoRow
                                    label="Thuế thu nhập cá nhân (TNCN)"
                                    value={
                                        detail.taxAmount && detail.taxAmount > 0
                                            ? `-${formatPrizePayoutCurrency(detail.taxAmount)}`
                                            : '0 đ (Miễn thuế)'
                                    }
                                />
                                <InfoRow
                                    label="Hoa hồng đại lý"
                                    value={
                                        detail.commissionAmount && detail.commissionAmount > 0
                                            ? `-${formatPrizePayoutCurrency(detail.commissionAmount)}`
                                            : '0 đ'
                                    }
                                />
                            </Box>

                            {/* Highlighted Net Payout Box */}
                            <Box
                                sx={{
                                    p: 2.5,
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, rgba(238, 19, 20, 0.03) 0%, rgba(238, 19, 20, 0.08) 100%)',
                                    border: '1.5px solid',
                                    borderColor: 'rgba(238, 19, 20, 0.22)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 2,
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1.75}>
                                    <Box
                                        sx={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: '12px',
                                            bgcolor: 'error.main',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.3rem',
                                            boxShadow: '0 4px 12px rgba(238, 19, 20, 0.25)',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Icon icon="solar:wallet-check-bold-duotone" />
                                    </Box>
                                    <Box>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    fontWeight: 800,
                                                    color: 'error.darker',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.04em',
                                                    fontSize: '0.85rem',
                                                }}
                                            >
                                                Số tiền thực nhận (Net)
                                            </Typography>
                                            {detail.paymentMethod && (
                                                <Chip
                                                    size="small"
                                                    label={
                                                        detail.paymentMethod === 'TRANSFER'
                                                            ? 'Chuyển khoản'
                                                            : detail.paymentMethod === 'CASH'
                                                            ? 'Tiền mặt'
                                                            : 'Kết hợp'
                                                    }
                                                    sx={{
                                                        height: 20,
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        bgcolor: 'rgba(238, 19, 20, 0.1)',
                                                        color: 'error.dark',
                                                    }}
                                                />
                                            )}
                                        </Stack>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                                            Sau khi khấu trừ thuế và phí hoa hồng đại lý
                                        </Typography>
                                    </Box>
                                </Stack>

                                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                                    <Typography
                                        sx={{
                                            fontWeight: 900,
                                            color: 'error.main',
                                            fontSize: { xs: '1.45rem', sm: '1.75rem' },
                                            fontVariantNumeric: 'tabular-nums',
                                            letterSpacing: '-0.02em',
                                            lineHeight: 1.1,
                                        }}
                                    >
                                        {formatPrizePayoutCurrency(detail.netAmount ?? detail.grossAmount)}
                                    </Typography>
                                </Box>
                            </Box>

                            {detail.paymentMethod === 'COMBINED' && (
                                <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
                                    <InfoRow label="Thanh toán tiền mặt" value={formatPrizePayoutCurrency(resolvedCashAmount)} />
                                    <InfoRow label="Chuyển khoản ngân hàng" value={formatPrizePayoutCurrency(resolvedTransferAmount)} />
                                </Box>
                            )}
                        </Card>

                        {/* Card 3: Recipient & OCR Identity */}
                        {(detail.recipientFullName ||
                            detail.recipientIdNumber ||
                            detail.recipientIdImageUrl ||
                            detail.recipientIdImageBackUrl ||
                            detail.ekycOcrDob ||
                            detail.ekycOcrGender ||
                            detail.ekycOcrNationality ||
                            detail.ekycOcrPlaceOfBirth ||
                            detail.ekycOcrPlaceOfResidence ||
                            detail.ekycOcrIssueDate ||
                            detail.ekycOcrExpiryDate) && (
                            <Card sx={{ p: 3, ...cardSx }}>
                                <CardSectionTitle
                                    title="Thông tin người nhận & CCCD"
                                    icon="solar:user-id-bold-duotone"
                                    extra={
                                        <Chip
                                            size="small"
                                            label="Trích xuất từ OCR"
                                            color="primary"
                                            variant="outlined"
                                            sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                                        />
                                    }
                                />

                                {/* OCR Fields Grid */}
                                <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <OcrFieldTile
                                            label="Họ và tên người nhận"
                                            value={detail.recipientFullName || detail.ekycOcrName}
                                            icon="solar:user-bold-duotone"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <OcrFieldTile
                                            label="Số CCCD / CMND"
                                            value={detail.recipientIdNumber || detail.ekycOcrIdNumber}
                                            icon="solar:card-2-bold-duotone"
                                            mono
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 6, sm: 4 }}>
                                        <OcrFieldTile
                                            label="Ngày sinh"
                                            value={detail.ekycOcrDob}
                                            icon="solar:calendar-bold-duotone"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 6, sm: 4 }}>
                                        <OcrFieldTile
                                            label="Giới tính"
                                            value={detail.ekycOcrGender}
                                            icon="solar:users-group-two-rounded-bold-duotone"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <OcrFieldTile
                                            label="Quốc tịch"
                                            value={detail.ekycOcrNationality}
                                            icon="solar:flag-bold-duotone"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 6, sm: 6 }}>
                                        <OcrFieldTile
                                            label="Ngày cấp"
                                            value={detail.ekycOcrIssueDate}
                                            icon="solar:calendar-date-bold-duotone"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 6, sm: 6 }}>
                                        <OcrFieldTile
                                            label="Ngày hết hạn"
                                            value={detail.ekycOcrExpiryDate}
                                            icon="solar:clock-circle-bold-duotone"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <OcrFieldTile
                                            label="Quê quán / Nơi đăng ký khai sinh"
                                            value={detail.ekycOcrPlaceOfBirth}
                                            icon="solar:map-point-bold-duotone"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <OcrFieldTile
                                            label="Nơi thường trú"
                                            value={detail.ekycOcrPlaceOfResidence}
                                            icon="solar:home-bold-duotone"
                                        />
                                    </Grid>
                                </Grid>

                                {/* CCCD Photos */}
                                {(detail.recipientIdImageUrl || detail.recipientIdImageBackUrl) && (
                                    <Box sx={{ pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: 'text.secondary',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                fontSize: '0.72rem',
                                                letterSpacing: '0.04em',
                                                display: 'block',
                                                mb: 1.5,
                                            }}
                                        >
                                            Ảnh căn cước công dân đính kèm
                                        </Typography>
                                        <Grid container spacing={2}>
                                            {detail.recipientIdImageUrl && (
                                                <Grid size={{ xs: 12, sm: 6 }}>
                                                    <Box
                                                        sx={{
                                                            p: 1.5,
                                                            borderRadius: '12px',
                                                            border: '1px solid',
                                                            borderColor: 'divider',
                                                            bgcolor: 'background.neutral',
                                                        }}
                                                    >
                                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                                            <Chip
                                                                size="small"
                                                                label="Mặt trước"
                                                                color="default"
                                                                sx={{ fontWeight: 700, fontSize: '0.75rem', height: 22 }}
                                                            />
                                                        </Stack>
                                                        <TransferEvidencePreview
                                                            compact
                                                            imageUrl={detail.recipientIdImageUrl}
                                                            title="CCCD mặt trước"
                                                            showCaption={false}
                                                        />
                                                    </Box>
                                                </Grid>
                                            )}
                                            {detail.recipientIdImageBackUrl && (
                                                <Grid size={{ xs: 12, sm: 6 }}>
                                                    <Box
                                                        sx={{
                                                            p: 1.5,
                                                            borderRadius: '12px',
                                                            border: '1px solid',
                                                            borderColor: 'divider',
                                                            bgcolor: 'background.neutral',
                                                        }}
                                                    >
                                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                                            <Chip
                                                                size="small"
                                                                label="Mặt sau"
                                                                color="default"
                                                                sx={{ fontWeight: 700, fontSize: '0.75rem', height: 22 }}
                                                            />
                                                        </Stack>
                                                        <TransferEvidencePreview
                                                            compact
                                                            imageUrl={detail.recipientIdImageBackUrl}
                                                            title="CCCD mặt sau"
                                                            showCaption={false}
                                                        />
                                                    </Box>
                                                </Grid>
                                            )}
                                        </Grid>
                                    </Box>
                                )}
                            </Card>
                        )}

                        {/* Rejection Note Alert */}
                        {detail.rejectReason && (
                            <Alert severity="error" sx={{ borderRadius: '12px' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                    {detail.status === PrizePayoutRequestStatus.MANUAL_RESOLUTION
                                        ? 'Yêu cầu đã khóa trực tuyến'
                                        : 'Lý do từ chối yêu cầu'}
                                </Typography>
                                <Typography variant="body2">{detail.rejectReason}</Typography>
                                {detail.channel === 'ONLINE' && (
                                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                                        Số lần từ chối trực tuyến: {detail.rejectCount ?? 0} /{' '}
                                        {detail.maxOnlineRejectRetry ?? 3}
                                    </Typography>
                                )}
                            </Alert>
                        )}

                    </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={2.5}>
                        {detail.channel === 'IN_PERSON' && (
                            <Card sx={{ p: 3, ...cardSx }}>
                                <CardSectionTitle title="Hợp đồng trả thưởng" icon="solar:document-text-bold-duotone" />
                                <Stack spacing={1.25}>
                                    <Button
                                        variant="outlined"
                                        size="medium"
                                        fullWidth
                                        disabled={printingContract}
                                        onClick={() => void handlePrintSystemContract()}
                                        sx={{
                                            height: 38,
                                            borderRadius: '10px',
                                            fontWeight: 700,
                                            textTransform: 'none',
                                        }}
                                    >
                                        {printingContract ? 'Đang tạo hợp đồng...' : 'Xem / In hợp đồng'}
                                    </Button>
                                    {detail.confirmationContractUrl && (
                                        <Button
                                            variant="contained"
                                            size="medium"
                                            fullWidth
                                            onClick={() => setViewSignedOpen(true)}
                                            sx={{
                                                height: 38,
                                                borderRadius: '10px',
                                                fontWeight: 700,
                                                textTransform: 'none',
                                                boxShadow: 'none',
                                            }}
                                        >
                                            Xem bản đã ký
                                        </Button>
                                    )}
                                </Stack>
                                {detail.confirmationContractUrl && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
                                            Ảnh hợp đồng
                                        </Typography>
                                        <TransferEvidencePreview
                                            compact
                                            imageUrl={detail.confirmationContractUrl}
                                            title="Hợp đồng trả thưởng"
                                            showCaption={false}
                                        />
                                    </Box>
                                )}
                            </Card>
                        )}

                        <Card sx={{ p: 3, ...cardSx }}>
                            <CardSectionTitle title="Khách hàng" icon="solar:user-circle-bold-duotone" />
                            <InfoRow
                                label="Họ tên"
                                value={
                                    customerDetailPath && detail.customerName ? (
                                        <Link
                                            component="button"
                                            variant="body2"
                                            onClick={() => router.push(customerDetailPath)}
                                            sx={{
                                                ...detailLinkSx,
                                                p: 0,
                                                border: 0,
                                                bgcolor: 'transparent',
                                                fontSize: 'inherit',
                                            }}
                                        >
                                            {detail.customerName}
                                        </Link>
                                    ) : (
                                        detail.customerName || '—'
                                    )
                                }
                            />
                            <InfoRow label="Mã yêu cầu" value={detail.requestCode} />
                            {customerDetailPath && (
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={() => router.push(customerDetailPath)}
                                    sx={{
                                        mt: 2,
                                        height: 38,
                                        borderRadius: '10px',
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        color: 'var(--palette-text-primary)',
                                        borderColor: 'var(--palette-divider)',
                                    }}
                                >
                                    Hồ sơ khách hàng
                                </Button>
                            )}
                        </Card>

                        <Card sx={{ p: 3, ...cardSx }}>
                            <CardSectionTitle title="Chuyển khoản" icon="solar:card-transfer-bold-duotone" />
                            <InfoRow label="Ngân hàng" value={detail.bankName || '—'} />
                            <InfoRow label="Số tài khoản" value={detail.bankAccountNumber || '—'} mono />
                            <InfoRow label="Chủ tài khoản" value={detail.accountHolderName || '—'} />
                            {needsTransferDisplay && (
                                <InfoRow
                                    label="Số tiền CK"
                                    value={formatPrizePayoutCurrency(transferAmountToPay)}
                                />
                            )}
                            {detail.transferEvidenceUrl && (
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    spacing={2}
                                    sx={{ py: 1.25, borderBottom: '1px dashed', borderColor: 'divider' }}
                                >
                                    <Typography variant="body2" color="text.secondary">
                                        Biên lai
                                    </Typography>
                                    <TransferEvidencePreview
                                        compact
                                        imageUrl={detail.transferEvidenceUrl}
                                        title="Biên lai chuyển khoản"
                                        showCaption={false}
                                        infoItems={[
                                            { label: 'Mã yêu cầu', value: detail.requestCode || '—' },
                                            {
                                                label: 'Số tiền CK',
                                                value: formatPrizePayoutCurrency(transferAmountToPay),
                                            },
                                            {
                                                label: 'Thời gian',
                                                value: detail.completedAt
                                                    ? dayjs(detail.completedAt).format('DD/MM/YYYY HH:mm')
                                                    : '—',
                                            },
                                        ]}
                                    />
                                </Stack>
                            )}

                            <Button
                                variant="outlined"
                                size="medium"
                                fullWidth
                                onClick={() => copyToClipboard(buildTransferCopyText(), 'Đã sao chép thông tin chuyển khoản')}
                                sx={{
                                    mt: 2,
                                    height: 38,
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                }}
                            >
                                Sao chép thông tin CK
                            </Button>

                            {isPending && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, lineHeight: 1.5 }}>
                                    Kiểm tra thông tin trước khi hoàn tất. Trả thưởng tại quầy không bắt buộc chủ TK khớp tên khách.
                                </Typography>
                            )}
                        </Card>
                    </Stack>
                </Grid>
            </Grid>

            {/* Dialog Confirm Upload Evidence */}
            <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem' }}>Xác nhận trả thưởng</DialogTitle>
                <DialogContent>
                    {showTransferInCompleteDialog && (
                        <DialogAmountHint label="Số tiền cần chuyển khoản" amount={dialogTransferAmount} />
                    )}
                    {paymentMethod === 'CASH' && detail.channel !== 'ONLINE' && (
                        <DialogAmountHint
                            label="Số tiền chi tiền mặt"
                            amount={Number(detail.cashAmount ?? detail.netAmount ?? 0)}
                        />
                    )}
                    <FormControl sx={{ mb: 2, mt: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
                            Phương thức thanh toán
                        </Typography>
                        {detail.channel === 'ONLINE' ? (
                            <>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    Chuyển khoản
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                    Yêu cầu trực tuyến chỉ hoàn tất bằng chuyển khoản (không hỗ trợ tiền mặt / kết hợp).
                                </Typography>
                            </>
                        ) : (
                            <RadioGroup
                                row
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value as PrizePayoutPaymentMethod)}
                            >
                                <FormControlLabel value="TRANSFER" control={<Radio />} label="Chuyển khoản" />
                                <FormControlLabel value="CASH" control={<Radio />} label="Tiền mặt" />
                                <FormControlLabel value="COMBINED" control={<Radio />} label="Kết hợp" />
                            </RadioGroup>
                        )}
                    </FormControl>
                    {detail.channel !== 'ONLINE' && paymentMethod === 'COMBINED' && (
                        <Alert severity="info" sx={{ mb: 2, borderRadius: '10px' }}>
                            <Stack spacing={0.5}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    Thanh toán kết hợp
                                </Typography>
                                <Typography variant="body2">
                                    Tiền mặt: {formatPrizePayoutCurrency(detail.cashAmount)}
                                </Typography>
                                <Typography variant="body2">
                                    Chuyển khoản:{' '}
                                    {formatPrizePayoutCurrency(
                                        detail.transferAmount
                                        ?? Math.max(0, Number(detail.netAmount || 0) - Number(detail.cashAmount || 0))
                                    )}
                                </Typography>
                            </Stack>
                        </Alert>
                    )}
                    {(detail.channel === 'ONLINE' || paymentMethod === 'TRANSFER' || paymentMethod === 'COMBINED') ? (
                        <>
                            {detail.channel !== 'ONLINE' && paymentMethod === 'COMBINED' && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Xác nhận đã chi phần tiền mặt và tải biên lai phần chuyển khoản.
                                </Typography>
                            )}
                            <UploadSingleFile
                                value={evidenceUrl}
                                onChange={setEvidenceUrl}
                                customUpload={prizePayoutAdminApi.uploadTransferEvidence}
                                autoUpload
                                onUploadingChange={setUploading}
                                disabled={uploading || completeMutation.isPending}
                                label="Ảnh biên lai chuyển khoản"
                                required
                            />
                        </>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Xác nhận đã chi tiền mặt cho khách tại quầy.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setCompleteOpen(false)} sx={{ fontWeight: 700 }}>Hủy</Button>
                    <Button
                        variant="contained"
                        color="success"
                        disabled={
                            (detail.channel === 'ONLINE' || paymentMethod === 'TRANSFER' || paymentMethod === 'COMBINED'
                                ? !evidenceUrl
                                : false)
                            || completeMutation.isPending
                        }
                        sx={{ fontWeight: 800 }}
                        onClick={() => {
                            const method: PrizePayoutPaymentMethod =
                                detail.channel === 'ONLINE' ? 'TRANSFER' : paymentMethod;
                            completeMutation.mutate(
                                {
                                    id: requestId,
                                    data: {
                                        paymentMethod: method,
                                        cashAmount: method === 'COMBINED'
                                            ? Number(detail.cashAmount) || undefined
                                            : undefined,
                                        transferEvidenceUrl:
                                            method === 'TRANSFER' || method === 'COMBINED'
                                                ? evidenceUrl
                                                : undefined,
                                    },
                                },
                                { onSuccess: () => setCompleteOpen(false) }
                            );
                        }}
                    >
                        Hoàn tất trả thưởng
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Reject Reason */}
            <Dialog
                open={rejectOpen}
                onClose={closeRejectDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    className: 'admin-theme',
                    sx: { borderRadius: '16px' },
                }}
            >
                <DialogTitle
                    sx={{
                        pb: 1,
                        pr: 6,
                        fontWeight: 700,
                        fontSize: '1.125rem',
                        color: 'text.primary',
                    }}
                >
                    Từ chối yêu cầu trả thưởng
                    <IconButton
                        aria-label="Đóng"
                        onClick={closeRejectDialog}
                        disabled={rejectMutation.isPending}
                        sx={{ position: 'absolute', right: 12, top: 12 }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ pt: 2.5, pb: 3 }}>
                    {detail.channel === 'ONLINE' && (() => {
                        const maxRetry = detail.maxOnlineRejectRetry ?? 3;
                        const currentRejects = detail.rejectCount ?? 0;
                        const nextCount = currentRejects + 1;
                        const willLock = nextCount >= maxRetry;
                        return (
                            <Alert
                                severity={willLock ? 'error' : 'warning'}
                                sx={{ mb: 2.5, borderRadius: '10px' }}
                            >
                                {willLock
                                    ? `Đây là lần từ chối thứ ${nextCount}/${maxRetry}. Sau khi xác nhận, khách sẽ không gửi được yêu cầu trực tuyến nữa và phải đến đại lý.`
                                    : `Sau khi từ chối: ${nextCount}/${maxRetry} lần. Đến ${maxRetry} lần sẽ khóa trả thưởng trực tuyến.`}
                            </Alert>
                        );
                    })()}
                    <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        label="Lý do từ chối"
                        required
                        value={rejectReason}
                        onChange={(e) => {
                            const nextValue = e.target.value;
                            setRejectReason(nextValue);
                            if (
                                selectedRejectQuickReplyIndex != null &&
                                nextValue !== REJECT_REASON_QUICK_REPLIES[selectedRejectQuickReplyIndex]
                            ) {
                                setSelectedRejectQuickReplyIndex(null);
                            }
                        }}
                        disabled={rejectMutation.isPending}
                        helperText="Lý do này sẽ hiển thị cho khách hàng trên trang chi tiết trả thưởng."
                    />

                    <Box sx={{ mt: 2.5 }}>
                        <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{ display: 'block', mb: 1.25, fontWeight: 700 }}
                        >
                            Gợi ý nội dung
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                            {REJECT_REASON_QUICK_REPLIES.map((reply, index) => {
                                const selected = selectedRejectQuickReplyIndex === index;
                                return (
                                    <Chip
                                        key={reply}
                                        label={reply}
                                        size="small"
                                        clickable
                                        disabled={rejectMutation.isPending}
                                        color={selected ? 'error' : 'default'}
                                        variant={selected ? 'filled' : 'outlined'}
                                        onClick={() => {
                                            setRejectReason(reply);
                                            setSelectedRejectQuickReplyIndex(index);
                                        }}
                                        sx={{
                                            maxWidth: '100%',
                                            height: 'auto',
                                            py: 0.75,
                                            borderRadius: '10px',
                                            '& .MuiChip-label': {
                                                display: 'block',
                                                whiteSpace: 'normal',
                                                textAlign: 'left',
                                                lineHeight: 1.4,
                                                py: 0.25,
                                            },
                                        }}
                                    />
                                );
                            })}
                        </Stack>
                    </Box>
                </DialogContent>
                <DialogActions sx={dialogActionsSx}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={closeRejectDialog}
                        disabled={rejectMutation.isPending}
                        sx={dialogCancelButtonSx}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        disabled={!rejectReason.trim() || rejectMutation.isPending}
                        onClick={() => {
                            rejectMutation.mutate(
                                { id: requestId, data: { reason: rejectReason.trim() } },
                                {
                                    onSuccess: () => {
                                        closeRejectDialog();
                                    },
                                }
                            );
                        }}
                        sx={{
                            minWidth: 148,
                            height: 40,
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: '10px',
                            boxShadow: 'none',
                        }}
                    >
                        {rejectMutation.isPending ? 'Đang xử lý...' : 'Từ chối yêu cầu'}
                    </Button>
                </DialogActions>
            </Dialog>

            {detail.channel === 'IN_PERSON' && (
                <ContractDocumentViewerDialog
                    open={viewSignedOpen}
                    url={detail.confirmationContractUrl}
                    title="Bản hợp đồng đã ký"
                    fileName={detail.requestCode ? `Hop-dong-da-ky-${detail.requestCode}` : undefined}
                    onClose={() => setViewSignedOpen(false)}
                />
            )}
        </motion.div>
    );
};
