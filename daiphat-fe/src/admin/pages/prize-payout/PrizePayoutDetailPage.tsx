import { useState, type ReactNode } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Icon } from '@iconify/react';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
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
    PrizePayoutRequestStatus,
} from '../../../types/prize-payout.type';
import { prizePayoutAdminApi } from '../../api/prizePayout.api';
import {
    useCompletePrizePayout,
    useGetStaffPrizePayoutDetail,
    useRejectPrizePayout,
} from './hooks/usePrizePayoutManagement';
import { UploadSingleFile } from '../../components/upload/UploadSingleFile';
import { AppToast as toast } from '../../../utils/toast.util';

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

export const PrizePayoutDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const requestId = Number(id);
    const { data, isLoading } = useGetStaffPrizePayoutDetail(requestId);
    const completeMutation = useCompletePrizePayout();
    const rejectMutation = useRejectPrizePayout();

    const [completeOpen, setCompleteOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [evidenceUrl, setEvidenceUrl] = useState('');
    const [rejectReason, setRejectReason] = useState('');
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
                <Button variant="outlined" onClick={() => navigate(`/${prefixAdmin}/prize-payouts/list`)}>
                    Quay lại danh sách
                </Button>
            </Box>
        );
    }

    const isPending = detail.status === PrizePayoutRequestStatus.PENDING;
    const numberParts = splitTicketNumbers(detail.numbers);

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
                    {isPending && (
                        <CanAccess permission={PERMISSIONS.PRIZE_PAYOUT.PROCESS}>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<Icon icon="solar:card-transfer-bold-duotone" />}
                                onClick={() => setCompleteOpen(true)}
                                sx={headerButtonSx}
                            >
                                Xác nhận chuyển khoản
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Icon icon="solar:close-circle-bold-duotone" />}
                                onClick={() => setRejectOpen(true)}
                                sx={headerButtonSx}
                            >
                                Từ chối
                            </Button>
                        </CanAccess>
                    )}
                    <Button
                        variant="outlined"
                        onClick={() => navigate(`/${prefixAdmin}/prize-payouts/list`)}
                        startIcon={<Icon icon="eva:arrow-back-fill" />}
                        sx={{
                            ...headerButtonSx,
                            color: 'var(--palette-text-primary)',
                            borderColor: 'var(--palette-divider)',
                        }}
                    >
                        Quay lại
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
                                    <FieldLabel icon="solar:wallet-money-bold-duotone">Số tiền trúng</FieldLabel>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'var(--palette-error-main)' }}>
                                        {formatPrizePayoutCurrency(detail.grossAmount)}
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
                                    <FieldLabel icon="solar:hashtag-square-bold-duotone">Dãy số trúng thưởng</FieldLabel>
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
                            </Grid>
                        </Card>

                        {/* Rejection Note Alert */}
                        {detail.rejectReason && (
                            <Alert severity="error" sx={{ borderRadius: '12px' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                    Lý do từ chối yêu cầu
                                </Typography>
                                <Typography variant="body2">{detail.rejectReason}</Typography>
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
                                    `Số tiền: ${formatPrizePayoutCurrency(detail.grossAmount)}`,
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
                                    Quản trị viên cần kiểm tra tên chủ tài khoản khớp với khách hàng trước khi thực hiện chuyển tiền.
                                </Alert>
                            </>
                        )}
                    </Card>
                </Grid>
            </Grid>

            {/* Dialog Confirm Upload Evidence */}
            <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem' }}>Xác nhận chuyển khoản trả thưởng</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Tải ảnh biên lai chuyển khoản thành công trước khi hoàn tất xử lý.
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
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setCompleteOpen(false)} sx={{ fontWeight: 700 }}>Hủy</Button>
                    <Button
                        variant="contained"
                        color="success"
                        disabled={!evidenceUrl || completeMutation.isPending}
                        sx={{ fontWeight: 800 }}
                        onClick={() => {
                            completeMutation.mutate(
                                { id: requestId, data: { transferEvidenceUrl: evidenceUrl } },
                                { onSuccess: () => setCompleteOpen(false) }
                            );
                        }}
                    >
                        Hoàn tất chuyển khoản
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Reject Reason */}
            <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, color: 'error.main', fontSize: '1rem' }}>Từ chối yêu cầu trả thưởng</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        label="Lý do từ chối *"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setRejectOpen(false)} sx={{ fontWeight: 700 }}>Hủy</Button>
                    <Button
                        color="error"
                        variant="contained"
                        disabled={!rejectReason.trim() || rejectMutation.isPending}
                        sx={{ fontWeight: 800 }}
                        onClick={() => {
                            rejectMutation.mutate(
                                { id: requestId, data: { reason: rejectReason.trim() } },
                                { onSuccess: () => setRejectOpen(false) }
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
