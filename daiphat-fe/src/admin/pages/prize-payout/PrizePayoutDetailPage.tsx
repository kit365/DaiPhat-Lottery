"use client";

import { useState, type ReactNode } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    FormControl,
    FormControlLabel,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Icon } from '@iconify/react';
import dayjs from 'dayjs';
import { useNavigate, useParams, useLocation } from '@/components/router-compat';
import { motion } from 'framer-motion';
import { Title } from '../../components/ui/Title';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { CanAccess } from '../../components/auth/CanAccess';
import { PERMISSIONS } from '../../constants/permission.constants';
import { prefixAdmin } from '../../constants/routes';
import { PrizePayoutStatusBadge } from '../../../client/components/prize-payout/PrizePayoutStatusBadge';
import { TransferEvidencePreview } from '../refund/components/TransferEvidencePreview';
import {
    formatPrizePayoutCurrency,
    PrizePayoutPaymentMethod,
    PrizePayoutRequestStatus,
    PRIZE_PAYOUT_CHANNEL_LABELS,
    PRIZE_PAYOUT_PAYMENT_METHOD_LABELS,
    PRIZE_PAYOUT_TICKET_ORIGIN_LABELS,
    PRIZE_PAYOUT_VERIFICATION_LABELS,
} from '../../../types/prize-payout.type';
import { prizePayoutAdminApi } from '../../api/prizePayout.api';
import {
    useApprovePrizePayout,
    useCompletePrizePayout,
    useGetStaffPrizePayoutDetail,
    useRejectPrizePayout,
} from './hooks/usePrizePayoutManagement';
import { UploadSingleFile } from '../../components/upload/UploadSingleFile';
import { AppToast as toast } from '../../../utils/toast.util';

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

function FieldLabel({ children, icon }: { children: ReactNode; icon?: string }) {
    return (
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
            {icon && <Icon icon={icon} width={15} style={{ color: 'var(--palette-text-disabled)' }} />}
            <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', fontWeight: 600 }}>
                {children}
            </Typography>
        </Stack>
    );
}

function FieldValue({ children, sx }: { children: ReactNode; sx?: object }) {
    return (
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)', ...sx }}>
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
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
            <Icon icon={icon} width={24} style={{ color: iconColor }} />
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                {title}
            </Typography>
        </Stack>
    );
}

const splitTicketNumbers = (numbers?: string): string[] => {
    const digits = (numbers || '').replace(/\D/g, '');
    if (!digits) return [];
    if (digits.length % 2 === 0 && digits.length >= 2 && digits.length <= 12) {
        const pairs: string[] = [];
        for (let i = 0; i < digits.length; i += 2) {
            pairs.push(digits.slice(i, i + 2));
        }
        return pairs;
    }
    return digits.split('');
};

const formatCardNumber = (accountNumber?: string) => {
    if (!accountNumber) return '•••• •••• ••••';
    const clean = accountNumber.replace(/\s+/g, '');
    return clean.match(/.{1,4}/g)?.join(' ') || accountNumber;
};

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

function TransferAmountBanner({
    amount,
    onCopy,
    compact = false,
}: {
    amount: number;
    onCopy?: () => void;
    compact?: boolean;
}) {
    return (
        <Box
            sx={{
                p: compact ? 1.75 : 2.25,
                mb: 2,
                borderRadius: '12px',
                bgcolor: 'rgba(46, 125, 50, 0.08)',
                border: '1px solid rgba(46, 125, 50, 0.28)',
            }}
        >
            <Typography
                variant="caption"
                sx={{
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--palette-success-dark)',
                    display: 'block',
                    mb: 0.5,
                }}
            >
                Số tiền cần chuyển khoản
            </Typography>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Typography
                    sx={{
                        fontWeight: 900,
                        fontSize: compact ? '1.55rem' : '1.85rem',
                        lineHeight: 1.15,
                        color: 'var(--palette-success-dark)',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {formatPrizePayoutCurrency(amount)}
                </Typography>
                {onCopy && (
                    <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<Icon icon="solar:copy-bold-duotone" width={15} />}
                        onClick={onCopy}
                        sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '8px', flexShrink: 0 }}
                    >
                        Sao chép
                    </Button>
                )}
            </Stack>
        </Box>
    );
}

export const PrizePayoutDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const returnNav = location.state as { returnTo?: string; returnLabel?: string } | null;
    const fromSupportTicketId = new URLSearchParams(location.search || '').get('fromSupportTicketId');
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

    const detail = data?.data;

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
            <Box sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (!detail) {
        return (
            <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                    Không tìm thấy yêu cầu trả thưởng
                </Typography>
                <Button variant="outlined" onClick={() => navigate(backPath)}>
                    {backLabel === 'Quay lại' ? 'Quay lại danh sách' : backLabel}
                </Button>
            </Box>
        );
    }

    const isPending = detail.status === PrizePayoutRequestStatus.PENDING;
    const isApproved = detail.status === PrizePayoutRequestStatus.APPROVED;
    const canReject = isPending || isApproved;
    const numberParts = splitTicketNumbers(detail.numbers);
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mx-auto font-['Public_Sans',sans-serif]"
        >
            {/* Header Section */}
            <Box
                sx={{
                    mb: 3,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 2,
                    flexWrap: 'wrap',
                }}
            >
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                        <Title title={`Yêu cầu trả thưởng ${detail.requestCode}`} />
                        <PrizePayoutStatusBadge status={detail.status} />
                    </Stack>
                    <Breadcrumb
                        items={[
                            { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                            { label: 'Trả thưởng', to: `/${prefixAdmin}/prize-payouts/list` },
                            { label: detail.requestCode },
                        ]}
                    />
                </Box>

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
                                Duyệt (4 mắt)
                            </Button>
                        )}
                        {(isPending || isApproved) && (
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
                    <Button
                        variant="outlined"
                        onClick={() => navigate(backPath)}
                        startIcon={<Icon icon="eva:arrow-back-fill" />}
                        sx={{
                            ...headerButtonSx,
                            color: 'var(--palette-text-primary)',
                            borderColor: 'var(--palette-divider)',
                        }}
                    >
                        {backLabel}
                    </Button>
                </Stack>
            </Box>

            {/* 2-Column Main Layout Grid */}
            <Grid container spacing={2.5}>
                {/* Left Column: Ticket & Payout Summary */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Stack spacing={2.5}>
                        <Card sx={{ p: 3, ...cardSx }}>
                            <CardSectionTitle icon="solar:ticket-bold-duotone" title="Thông tin vé & Tiền thưởng" />

                            {/* Key Stats Row */}
                            <Grid container spacing={2} sx={{ mb: 2.5, p: 2, bgcolor: 'var(--palette-background-neutral)', borderRadius: '12px' }}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <FieldLabel icon="solar:info-circle-bold-duotone">Trạng thái</FieldLabel>
                                    <PrizePayoutStatusBadge status={detail.status} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <FieldLabel icon="solar:wallet-money-bold-duotone">Giá trị giải</FieldLabel>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'var(--palette-error-main)' }}>
                                        {formatPrizePayoutCurrency(detail.grossAmount)}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <FieldLabel icon="solar:bill-list-bold-duotone">Thực nhận</FieldLabel>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'var(--palette-success-main)' }}>
                                        {formatPrizePayoutCurrency(detail.netAmount ?? detail.grossAmount)}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <FieldLabel icon="solar:document-text-bold-duotone">Mã đơn hàng</FieldLabel>
                                    <FieldValue>{detail.orderCode || '—'}</FieldValue>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <FieldLabel icon="solar:calendar-bold-duotone">Ngày tạo</FieldLabel>
                                    <FieldValue>
                                        {detail.createdAt ? dayjs(detail.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
                                    </FieldValue>
                                </Grid>
                            </Grid>

                            <Grid container spacing={2} sx={{ mb: 2.5 }}>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                    <FieldLabel>Thuế TNCN</FieldLabel>
                                    <FieldValue>{formatPrizePayoutCurrency(detail.taxAmount)}</FieldValue>
                                </Grid>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                    <FieldLabel>Hoa hồng</FieldLabel>
                                    <FieldValue>{formatPrizePayoutCurrency(detail.commissionAmount)}</FieldValue>
                                </Grid>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                    <FieldLabel>Kênh</FieldLabel>
                                    <FieldValue>
                                        {detail.channel ? PRIZE_PAYOUT_CHANNEL_LABELS[detail.channel] : '—'}
                                    </FieldValue>
                                </Grid>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                    <FieldLabel>Nguồn vé</FieldLabel>
                                    <FieldValue>
                                        {detail.ticketOrigin
                                            ? PRIZE_PAYOUT_TICKET_ORIGIN_LABELS[detail.ticketOrigin]
                                            : '—'}
                                    </FieldValue>
                                </Grid>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                    <FieldLabel>Xác minh</FieldLabel>
                                    <FieldValue>
                                        {detail.ownershipVerificationLevel
                                            ? PRIZE_PAYOUT_VERIFICATION_LABELS[detail.ownershipVerificationLevel]
                                            : '—'}
                                    </FieldValue>
                                </Grid>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                    <FieldLabel>Thanh toán</FieldLabel>
                                    <FieldValue>
                                        {detail.paymentMethod
                                            ? PRIZE_PAYOUT_PAYMENT_METHOD_LABELS[detail.paymentMethod]
                                            : '—'}
                                    </FieldValue>
                                </Grid>
                                {detail.paymentMethod === 'COMBINED' ? (
                                    <>
                                        <Grid size={{ xs: 6, sm: 3 }}>
                                            <FieldLabel>Tiền mặt</FieldLabel>
                                            <Typography
                                                variant="subtitle2"
                                                sx={{ fontWeight: 700, color: 'var(--palette-warning-dark)' }}
                                            >
                                                {formatPrizePayoutCurrency(detail.cashAmount)}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6, sm: 3 }}>
                                            <FieldLabel>Chuyển khoản</FieldLabel>
                                            <Typography
                                                sx={{
                                                    fontWeight: 900,
                                                    fontSize: '1.2rem',
                                                    lineHeight: 1.2,
                                                    color: 'var(--palette-success-dark)',
                                                    fontVariantNumeric: 'tabular-nums',
                                                }}
                                            >
                                                {formatPrizePayoutCurrency(
                                                    detail.transferAmount
                                                    ?? Math.max(
                                                        0,
                                                        Number(detail.netAmount || 0) - Number(detail.cashAmount || 0)
                                                    )
                                                )}
                                            </Typography>
                                        </Grid>
                                    </>
                                ) : detail.paymentMethod === 'CASH' ? (
                                    <Grid size={{ xs: 6, sm: 3 }}>
                                        <FieldLabel>Tiền mặt</FieldLabel>
                                        <FieldValue>
                                            {formatPrizePayoutCurrency(detail.cashAmount ?? detail.netAmount)}
                                        </FieldValue>
                                    </Grid>
                                ) : detail.paymentMethod === 'TRANSFER' ? (
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldLabel>Chuyển khoản</FieldLabel>
                                        <Typography
                                            sx={{
                                                fontWeight: 900,
                                                fontSize: '1.35rem',
                                                lineHeight: 1.2,
                                                color: 'var(--palette-success-dark)',
                                                fontVariantNumeric: 'tabular-nums',
                                            }}
                                        >
                                            {formatPrizePayoutCurrency(
                                                detail.transferAmount ?? detail.netAmount
                                            )}
                                        </Typography>
                                    </Grid>
                                ) : null}
                            </Grid>

                            {/* Detailed Info Grid */}
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <FieldLabel icon="solar:user-bold-duotone">Khách hàng</FieldLabel>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <FieldValue>{detail.customerName || '—'}</FieldValue>
                                        {detail.customerName && (
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(detail.customerName, 'Đã sao chép tên khách hàng')}
                                                className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer"
                                                title="Sao chép tên"
                                            >
                                                <Icon icon="solar:copy-bold-duotone" width={14} />
                                            </button>
                                        )}
                                    </Stack>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <FieldLabel icon="solar:map-point-bold-duotone">Đài / Ngày quay</FieldLabel>
                                    <FieldValue>
                                        {detail.stationName || '—'}
                                        {detail.drawDate ? ` · ${dayjs(detail.drawDate).format('DD/MM/YYYY')}` : ''}
                                    </FieldValue>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <FieldLabel icon="solar:cup-star-bold-duotone">Giải trúng</FieldLabel>
                                    <Box className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/80 font-black text-xs">
                                        <Icon icon="solar:crown-bold-duotone" width={14} className="text-amber-600" />
                                        <span>{detail.prizeDisplayName || detail.prizeCode || '—'}</span>
                                    </Box>
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <FieldLabel icon="solar:hashtag-square-bold-duotone">Dãy số trên vé</FieldLabel>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                        {numberParts.length > 0 ? (
                                            numberParts.map((num, i) => (
                                                <div
                                                    key={`${num}-${i}`}
                                                    className="w-9 h-9 rounded-xl bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-xs border border-amber-300 font-black text-sm flex items-center justify-center tracking-tight"
                                                >
                                                    {num}
                                                </div>
                                            ))
                                        ) : (
                                            <FieldValue>{detail.numbers || '—'}</FieldValue>
                                        )}
                                    </Stack>
                                </Grid>

                                {(detail.recipientFullName || detail.recipientIdNumber) && (
                                    <>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <FieldLabel icon="solar:user-id-bold-duotone">Người nhận</FieldLabel>
                                            <FieldValue>{detail.recipientFullName || '—'}</FieldValue>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <FieldLabel icon="solar:card-bold-duotone">CCCD (masked)</FieldLabel>
                                            <FieldValue>{detail.recipientIdNumber || '—'}</FieldValue>
                                        </Grid>
                                        {detail.recipientIdImageUrl || detail.recipientIdImageBackUrl ? (
                                            <Grid size={{ xs: 12 }}>
                                                <FieldLabel icon="solar:gallery-bold-duotone">Ảnh CCCD</FieldLabel>
                                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                                                    {detail.recipientIdImageUrl && (
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                                                Mặt trước
                                                            </Typography>
                                                            <TransferEvidencePreview imageUrl={detail.recipientIdImageUrl} />
                                                        </Box>
                                                    )}
                                                    {detail.recipientIdImageBackUrl && (
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                                                Mặt sau
                                                            </Typography>
                                                            <TransferEvidencePreview imageUrl={detail.recipientIdImageBackUrl} />
                                                        </Box>
                                                    )}
                                                </Stack>
                                            </Grid>
                                        ) : null}
                                    </>
                                )}

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <FieldLabel icon="solar:user-bold-duotone">Người tạo yêu cầu</FieldLabel>
                                    <FieldValue>{detail.createdBy || '—'}</FieldValue>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <FieldLabel icon="solar:check-circle-bold-duotone">Người hoàn tất</FieldLabel>
                                    <FieldValue>{detail.completedBy || '—'}</FieldValue>
                                </Grid>
                            </Grid>
                        </Card>

                        {/* Rejection Note Alert */}
                        {detail.rejectReason && (
                            <Alert severity="error" sx={{ borderRadius: '12px' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                    {detail.status === PrizePayoutRequestStatus.MANUAL_RESOLUTION
                                        ? 'Yêu cầu đã khóa online'
                                        : 'Lý do từ chối yêu cầu'}
                                </Typography>
                                <Typography variant="body2">{detail.rejectReason}</Typography>
                                {detail.channel === 'ONLINE' && (
                                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                                        Số lần từ chối online: {detail.rejectCount ?? 0} /{' '}
                                        {detail.maxOnlineRejectRetry ?? 3}
                                    </Typography>
                                )}
                            </Alert>
                        )}

                        {/* Evidence Card */}
                        {detail.transferEvidenceUrl && (
                            <Card sx={{ p: 3, ...cardSx }}>
                                <CardSectionTitle
                                    icon="solar:receipt-item-bold-duotone"
                                    title="Biên lai chuyển khoản đã tải lên"
                                />
                                <TransferEvidencePreview
                                    imageUrl={detail.transferEvidenceUrl}
                                    title=""
                                    showCaption={false}
                                />
                            </Card>
                        )}

                        {detail.confirmationContractUrl && (
                            <Card sx={{ p: 3, ...cardSx }}>
                                <CardSectionTitle
                                    icon="solar:document-text-bold-duotone"
                                    title="Hợp đồng xác nhận trả thưởng"
                                />
                                <TransferEvidencePreview
                                    imageUrl={detail.confirmationContractUrl}
                                    title=""
                                    showCaption={false}
                                />
                            </Card>
                        )}
                    </Stack>
                </Grid>

                {/* Right Column: Bank Account & Transfer Details Card */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ p: 3, ...cardSx }}>
                        <CardSectionTitle
                            icon="solar:card-bold-duotone"
                            iconColor="var(--palette-primary-main)"
                            title="Tài khoản nhận thưởng"
                        />

                        {needsTransferDisplay && (
                            <TransferAmountBanner
                                amount={transferAmountToPay}
                                onCopy={() =>
                                    copyToClipboard(
                                        String(Math.round(transferAmountToPay)),
                                        'Đã sao chép số tiền chuyển khoản'
                                    )
                                }
                            />
                        )}

                        {/* Premium Metallic Bank Card Container */}
                        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 text-white rounded-2xl p-4 mb-4 shadow-md border border-slate-700 flex flex-col justify-between gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Icon icon="solar:banknotes-bold-duotone" width={18} className="text-amber-400" />
                                    <span className="font-extrabold text-xs text-slate-200 tracking-wide uppercase">
                                        {detail.bankName || 'Ngân hàng nhận'}
                                    </span>
                                </div>
                                <Icon icon="solar:sim-card-bold-duotone" width={20} className="text-slate-400" />
                            </div>

                            <div className="flex flex-col gap-0.5">
                                <span className="text-[9.5px] uppercase tracking-widest text-slate-400 font-bold">Số tài khoản</span>
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-base md:text-lg font-mono font-black tracking-wider text-amber-300">
                                        {formatCardNumber(detail.bankAccountNumber)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(detail.bankAccountNumber, 'Đã sao chép số tài khoản')}
                                        className="px-2 py-1 bg-white/10 hover:bg-white/20 text-amber-300 font-bold rounded-lg text-xs transition-colors border-none cursor-pointer flex items-center gap-1"
                                    >
                                        <Icon icon="solar:copy-bold-duotone" width={13} />
                                        <span>Sao chép</span>
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-700/70 flex flex-col">
                                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Chủ tài khoản</span>
                                <span className="text-xs font-black tracking-wider text-slate-100 uppercase">
                                    {detail.accountHolderName || '—'}
                                </span>
                            </div>
                        </div>

                        {/* Copy All Button */}
                        <Button
                            variant="outlined"
                            size="medium"
                            fullWidth
                            startIcon={<Icon icon="solar:copy-bold-duotone" />}
                            onClick={() => {
                                const text = [
                                    `Ngân hàng: ${detail.bankName}`,
                                    `STK: ${detail.bankAccountNumber}`,
                                    `Chủ TK: ${detail.accountHolderName}`,
                                    `Số tiền CK: ${formatPrizePayoutCurrency(
                                        detail.transferAmount ?? detail.netAmount ?? detail.grossAmount
                                    )}`,
                                ].join('\n');
                                copyToClipboard(text, 'Đã sao chép đầy đủ thông tin chuyển khoản');
                            }}
                            sx={{
                                height: 38,
                                borderRadius: '10px',
                                fontWeight: 700,
                                textTransform: 'none',
                                color: 'var(--palette-text-primary)',
                                borderColor: 'var(--palette-divider)',
                            }}
                        >
                            Sao chép toàn bộ thông tin
                        </Button>

                        {isPending && (
                            <>
                                <Divider sx={{ my: 2.5, borderStyle: 'dashed' }} />
                                <Alert severity="warning" sx={{ borderRadius: '10px', fontSize: '0.75rem', py: 0.5 }}>
                                    Kiểm tra thông tin chuyển khoản trước khi hoàn tất (trả thưởng tại quầy không bắt buộc chủ TK khớp tên KH).
                                </Alert>
                            </>
                        )}
                    </Card>
                </Grid>
            </Grid>

            {/* Dialog Confirm Upload Evidence */}
            <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem' }}>Xác nhận trả thưởng</DialogTitle>
                <DialogContent>
                    {showTransferInCompleteDialog && (
                        <TransferAmountBanner
                            amount={dialogTransferAmount}
                            onCopy={() =>
                                copyToClipboard(
                                    String(Math.round(dialogTransferAmount)),
                                    'Đã sao chép số tiền chuyển khoản'
                                )
                            }
                        />
                    )}
                    {paymentMethod === 'CASH' && detail.channel !== 'ONLINE' && (
                        <Box
                            sx={{
                                p: 2.25,
                                mb: 2,
                                borderRadius: '12px',
                                bgcolor: 'rgba(237, 108, 2, 0.08)',
                                border: '1px solid rgba(237, 108, 2, 0.28)',
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 800,
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    color: 'var(--palette-warning-dark)',
                                    display: 'block',
                                    mb: 0.5,
                                }}
                            >
                                Số tiền chi tiền mặt
                            </Typography>
                            <Typography
                                sx={{
                                    fontWeight: 900,
                                    fontSize: '1.85rem',
                                    lineHeight: 1.15,
                                    color: 'var(--palette-warning-dark)',
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {formatPrizePayoutCurrency(detail.cashAmount ?? detail.netAmount)}
                            </Typography>
                        </Box>
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
                                    Yêu cầu online chỉ hoàn tất bằng chuyển khoản (không hỗ trợ tiền mặt / kết hợp).
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
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {detail.channel !== 'ONLINE' && paymentMethod === 'COMBINED'
                                    ? 'Xác nhận đã chi phần tiền mặt và tải biên lai phần chuyển khoản.'
                                    : 'Tải ảnh biên lai chuyển khoản thành công trước khi hoàn tất xử lý.'}
                            </Typography>
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
                onClose={() => {
                    setRejectOpen(false);
                    setRejectReason('');
                    setSelectedRejectQuickReplyIndex(null);
                }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 800, color: 'error.main', fontSize: '1rem' }}>Từ chối yêu cầu trả thưởng</DialogTitle>
                <DialogContent>
                    {detail.channel === 'ONLINE' && (() => {
                        const maxRetry = detail.maxOnlineRejectRetry ?? 3;
                        const currentRejects = detail.rejectCount ?? 0;
                        const nextCount = currentRejects + 1;
                        const willLock = nextCount >= maxRetry;
                        return (
                            <Alert
                                severity={willLock ? 'error' : 'warning'}
                                sx={{ mb: 2, borderRadius: '12px' }}
                            >
                                {willLock
                                    ? `Đây là lần từ chối thứ ${nextCount}/${maxRetry}. Sau khi xác nhận, khách sẽ không gửi được yêu cầu online nữa và phải đến đại lý.`
                                    : `Sau khi từ chối: ${nextCount}/${maxRetry} lần. Đến ${maxRetry} lần sẽ khóa trả thưởng online.`}
                            </Alert>
                        );
                    })()}
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        label="Lý do từ chối *"
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
                        sx={{ mt: 1 }}
                        helperText="Lý do này sẽ hiển thị cho khách hàng trên trang chi tiết trả thưởng."
                    />

                    <Box sx={{ mt: 1.5 }}>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={700}
                            sx={{ display: 'block', mb: 1 }}
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
                                            '& .MuiChip-label': {
                                                display: 'block',
                                                whiteSpace: 'normal',
                                                textAlign: 'left',
                                                lineHeight: 1.35,
                                                py: 0.25,
                                            },
                                        }}
                                    />
                                );
                            })}
                        </Stack>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => {
                            setRejectOpen(false);
                            setRejectReason('');
                            setSelectedRejectQuickReplyIndex(null);
                        }}
                        sx={{ fontWeight: 700 }}
                    >
                        Hủy
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        disabled={!rejectReason.trim() || rejectMutation.isPending}
                        sx={{ fontWeight: 800 }}
                        onClick={() => {
                            rejectMutation.mutate(
                                { id: requestId, data: { reason: rejectReason.trim() } },
                                {
                                    onSuccess: () => {
                                        setRejectOpen(false);
                                        setRejectReason('');
                                        setSelectedRejectQuickReplyIndex(null);
                                    },
                                }
                            );
                        }}
                    >
                        Từ chối yêu cầu
                    </Button>
                </DialogActions>
            </Dialog>
        </motion.div>
    );
};
