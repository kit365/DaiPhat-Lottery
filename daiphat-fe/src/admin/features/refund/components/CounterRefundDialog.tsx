"use client";

import { useEffect, useState, type ReactNode } from 'react';
import {
    Alert,
    Box,
    Card,
    CardContent,
    CardHeader,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    FormHelperText,
    Grid,
    InputAdornment,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { Button } from '@/admin/components/ui/Button';
import { Icon } from '@/admin/components/ui/AdminIcon';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';
import {
    getOrderStatusBadge,
    getOrderStatusAdminBadgeModifier,
} from '@/shared/components/StatusBadge/orderStatusMap';
import { AdminLuckyDisplay } from '@/shared/lucky-number';
import {
    TICKET_NUMBERS_LABEL,
    TICKET_SERIAL_PREFIX,
} from '@/constants/ticketDisplay.constants';
import { UploadSingleFile } from '@/admin/components/upload/UploadSingleFile';
import { CccdOcrFieldsGrid, OcrFieldTile } from '@/admin/components/ekyc/CccdOcrFieldsGrid';
import { refundAdminApi } from '@/admin/features/refund/services/refundService';
import {
    useRefundCustomerBankAccounts,
    useVerifyCounterIdentity,
} from '@/admin/features/refund/hooks/useRefundManagement';
import { RefundBankAccountCard } from './RefundBankAccountCard';
import { CustomerBankAccountFormDialog } from './CustomerBankAccountFormDialog';
import type {
    CompleteCounterRefundRequest,
    RefundCounterIdentitySummary,
    RefundCounterPayoutMethod,
    RefundEligibleTicketItem,
    RefundOrderSummary,
    UserBankAccountResponse,
} from '@/types/refund.type';

type CccdSide = 'front' | 'back';

interface CounterOcrError {
    message: string;
    missingFieldLabels: string[];
    retakeSides: CccdSide[];
}

interface CounterRefundDialogProps {
    open: boolean;
    refundId: number;
    refundAmount: number;
    orderSummary?: RefundOrderSummary | null;
    tickets?: RefundEligibleTicketItem[];
    refundReason?: string;
    orderCode?: string;
    customerId?: string;
    customerName?: string;
    bankAccount?: UserBankAccountResponse | null;
    initialIdentity?: RefundCounterIdentitySummary | null;
    loading?: boolean;
    onClose: () => void;
    onConfirm: (data: CompleteCounterRefundRequest) => void;
}

const SIDE_LABELS: Record<CccdSide, string> = {
    front: 'mặt trước',
    back: 'mặt sau',
};

const parseCounterOcrError = (error: any): CounterOcrError => {
    const body = error?.response?.data;
    const data = body?.data;
    const labels: string[] = Array.isArray(data?.missingFieldLabels)
        ? data.missingFieldLabels.map((label: unknown) => String(label).trim()).filter(Boolean)
        : [];
    const retakeSides: CccdSide[] = Array.isArray(data?.retakeSides)
        ? data.retakeSides.filter((side: unknown): side is CccdSide => side === 'front' || side === 'back')
        : [];
    return {
        message: body?.message || error?.message || 'Không đọc được thông tin CCCD. Vui lòng thử lại.',
        missingFieldLabels: labels,
        retakeSides,
    };
};

const describeRetakeSides = (sides: CccdSide[]): string => {
    if (sides.length === 2) return 'cả mặt trước và mặt sau CCCD';
    if (sides.length === 1) return `${SIDE_LABELS[sides[0]]} CCCD`;
    return 'ảnh CCCD';
};

const normalizeName = (value?: string | null) =>
    (value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/gi, 'd')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();

export const CounterRefundDialog = ({
    open,
    refundId,
    refundAmount,
    orderSummary,
    tickets,
    refundReason,
    orderCode,
    customerId,
    customerName,
    bankAccount,
    initialIdentity,
    loading,
    onClose,
    onConfirm,
}: CounterRefundDialogProps) => {
    const verifyMutation = useVerifyCounterIdentity();

    const [frontUrl, setFrontUrl] = useState('');
    const [backUrl, setBackUrl] = useState('');
    const [frontUploading, setFrontUploading] = useState(false);
    const [backUploading, setBackUploading] = useState(false);
    const [verified, setVerified] = useState<RefundCounterIdentitySummary | null>(null);
    const [ocrError, setOcrError] = useState<CounterOcrError | null>(null);
    const [identityConfirmed, setIdentityConfirmed] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<RefundCounterPayoutMethod>('CASH');
    const [receiptUrl, setReceiptUrl] = useState('');
    const [receiptUploading, setReceiptUploading] = useState(false);
    const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | null>(null);
    const [createdBankAccount, setCreatedBankAccount] = useState<UserBankAccountResponse | null>(null);
    const [createAccountOpen, setCreateAccountOpen] = useState(false);

    const { data: customerAccountsData, isFetching: loadingCustomerAccounts } = useRefundCustomerBankAccounts(
        customerId,
        open && paymentMethod === 'TRANSFER'
    );
    const customerAccounts = customerAccountsData?.data ?? [];

    useEffect(() => {
        if (!open) return;
        const alreadyVerified =
            initialIdentity?.ekycStatus === 'VERIFIED' &&
            !!initialIdentity.cccdFrontImageUrl &&
            !!initialIdentity.cccdBackImageUrl;
        setFrontUrl(alreadyVerified ? initialIdentity!.cccdFrontImageUrl! : '');
        setBackUrl(alreadyVerified ? initialIdentity!.cccdBackImageUrl! : '');
        setVerified(alreadyVerified ? initialIdentity! : null);
        setOcrError(null);
        setIdentityConfirmed(false);
        setPaymentMethod('CASH');
        setReceiptUrl('');
        setFrontUploading(false);
        setBackUploading(false);
        setReceiptUploading(false);
        setSelectedBankAccountId(bankAccount?.id ?? null);
        setCreatedBankAccount(null);
        setCreateAccountOpen(false);
        // Reset only when the dialog opens; later detail refetches must not wipe staff input.
    }, [open]);

    const verifying = verifyMutation.isPending;
    const uploading = frontUploading || backUploading || receiptUploading;
    const busy = Boolean(loading || verifying || uploading);
    const cccdUploadLocked = Boolean(loading || verifying);

    const hasBothImages = Boolean(frontUrl.trim() && backUrl.trim());
    const isVerified = verified?.ekycStatus === 'VERIFIED';
    const isTransfer = paymentMethod === 'TRANSFER';
    const hasReceipt = Boolean(receiptUrl.trim());
    const selectedBankAccount =
        customerAccounts.find((account) => account.id === selectedBankAccountId) ??
        [createdBankAccount, bankAccount].find((account) => account?.id === selectedBankAccountId) ??
        null;
    const accountOptions = [...customerAccounts];
    if (selectedBankAccount && !accountOptions.some((account) => account.id === selectedBankAccount.id)) {
        accountOptions.unshift(selectedBankAccount);
    }
    const namesMatch =
        !!verified?.ocrName && !!customerName && normalizeName(verified.ocrName) === normalizeName(customerName);

    const canConfirm =
        isVerified &&
        identityConfirmed &&
        (isTransfer ? !!selectedBankAccount && hasReceipt : true) &&
        !busy;

    const resetVerification = () => {
        setVerified(null);
        setOcrError(null);
        setIdentityConfirmed(false);
    };

    const handleImageChange = (side: CccdSide, url: unknown) => {
        const next = typeof url === 'string' ? url : '';
        if (side === 'front') setFrontUrl(next);
        else setBackUrl(next);
        resetVerification();
    };

    const handleVerify = () => {
        if (!hasBothImages || busy) return;
        setOcrError(null);
        verifyMutation.mutate(
            {
                id: refundId,
                data: { cccdFrontImageUrl: frontUrl.trim(), cccdBackImageUrl: backUrl.trim() },
            },
            {
                onSuccess: (response) => {
                    if (response.success && response.data?.ekycStatus === 'VERIFIED') {
                        setVerified(response.data);
                        return;
                    }
                    setVerified(null);
                    setOcrError({
                        message: response.message || 'Không đọc được thông tin CCCD. Vui lòng thử lại.',
                        missingFieldLabels: [],
                        retakeSides: [],
                    });
                },
                onError: (error) => {
                    setVerified(null);
                    setOcrError(parseCounterOcrError(error));
                },
            }
        );
    };

    const handleConfirm = () => {
        if (!canConfirm) return;
        onConfirm({
            paymentMethod,
            amount: Number(refundAmount),
            transferEvidenceUrl: isTransfer ? receiptUrl.trim() : undefined,
            identityConfirmed: true,
            bankAccountId: isTransfer ? selectedBankAccount?.id : undefined,
        });
    };

    const handlePaymentMethodChange = (next: RefundCounterPayoutMethod | null) => {
        if (!next || next === paymentMethod) return;
        setPaymentMethod(next);
        if (next === 'CASH') setReceiptUrl('');
    };

    const handleClose = () => {
        if (busy) return;
        onClose();
    };

    const retakeSides = new Set<CccdSide>(ocrError?.retakeSides ?? []);

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{ className: 'admin-theme', sx: { maxHeight: '92vh' } }}
        >
            <DialogTitle sx={{ pb: 1 }}>Xử lý hoàn tiền tại quầy</DialogTitle>
            <DialogContent dividers sx={{ pt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    Chụp/tải ảnh mặt trước và mặt sau CCCD của khách hàng, bấm &quot;Đọc thông tin CCCD&quot; để hệ
                    thống trích xuất thông tin bằng OCR. Sau đó nhân viên đối chiếu CCCD với khách hàng tại quầy.
                </Typography>

                <Stack spacing={2.5}>
                    <SectionCard
                        step={1}
                        title="Đọc thông tin CCCD của khách hàng"
                        subheader="Bắt buộc — ảnh rõ nét, đủ 4 góc, không lóa"
                    >
                        <Grid container spacing={2}>
                            {(['front', 'back'] as const).map((side) => (
                                <Grid key={side} size={{ xs: 12, sm: 6 }}>
                                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                        <Typography variant="caption" fontWeight={700}>
                                            {side === 'front' ? 'Mặt trước CCCD' : 'Mặt sau CCCD'}
                                        </Typography>
                                        {retakeSides.has(side) && (
                                            <Typography variant="caption" fontWeight={700} color="error.main">
                                                Cần chụp lại
                                            </Typography>
                                        )}
                                    </Stack>
                                    <UploadSingleFile
                                        label={side === 'front' ? 'Ảnh mặt trước CCCD' : 'Ảnh mặt sau CCCD'}
                                        required
                                        value={side === 'front' ? frontUrl : backUrl}
                                        onChange={(url) => handleImageChange(side, url)}
                                        customUpload={refundAdminApi.uploadCounterIdentityImage}
                                        autoUpload
                                        onUploadingChange={side === 'front' ? setFrontUploading : setBackUploading}
                                        disabled={cccdUploadLocked}
                                        error={retakeSides.has(side) ? 'Ảnh chưa đọc được đủ thông tin' : undefined}
                                    />
                                </Grid>
                            ))}
                        </Grid>

                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleVerify}
                                disabled={!hasBothImages || busy || isVerified}
                                loading={verifying}
                                loadingLabel="Đang đọc CCCD..."
                                label={isVerified ? 'Đã đọc đủ thông tin' : 'Đọc thông tin CCCD'}
                                startIcon={<Icon icon="solar:shield-check-bold-duotone" />}
                                sx={{ boxShadow: 'none !important' }}
                            />
                            {!hasBothImages ? (
                                <FormHelperText sx={{ m: 0 }}>
                                    Có thể tải mặt trước và mặt sau cùng lúc. Cần đủ cả hai ảnh trước khi đọc thông tin.
                                </FormHelperText>
                            ) : (frontUploading || backUploading) ? (
                                <FormHelperText sx={{ m: 0 }}>Đang tải ảnh CCCD lên hệ thống...</FormHelperText>
                            ) : null}
                        </Stack>

                        {ocrError && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                <Typography variant="body2" fontWeight={700}>
                                    {ocrError.message}
                                </Typography>
                                {ocrError.missingFieldLabels.length > 0 && (
                                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                                        Thông tin chưa đọc được: {ocrError.missingFieldLabels.join(', ')}.
                                    </Typography>
                                )}
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    Vui lòng chụp lại {describeRetakeSides(ocrError.retakeSides)} rồi đọc lại.
                                </Typography>
                            </Alert>
                        )}

                        {isVerified && (
                            <Alert severity="success" sx={{ mt: 2 }}>
                                Đã đọc đủ thông tin từ CCCD. Kết quả hiển thị ở bước 2 — vui lòng đối chiếu với
                                khách hàng.
                            </Alert>
                        )}
                    </SectionCard>

                    <SectionCard
                        step={2}
                        title="Đối chiếu danh tính"
                        subheader={
                            verifying
                                ? 'Đang đọc thông tin CCCD bằng OCR...'
                                : 'Thông tin trích xuất từ CCCD bằng OCR — nhân viên đối chiếu trực tiếp với người nhận tiền'
                        }
                        disabled={!isVerified}
                    >
                        <CccdOcrFieldsGrid
                            fields={{
                                name: verified?.ocrName,
                                idNumber: verified?.ocrIdNumber,
                                dob: verified?.ocrDob,
                                gender: verified?.ocrGender,
                                nationality: verified?.ocrNationality,
                                issueDate: verified?.ocrIssueDate,
                                expiryDate: verified?.ocrExpiryDate,
                                placeOfBirth: verified?.ocrPlaceOfBirth,
                                placeOfResidence: verified?.ocrPlaceOfResidence,
                            }}
                        />
                        <Grid container spacing={1.5} sx={{ mt: 0 }}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <OcrFieldTile
                                    label="Tên tài khoản khách hàng"
                                    value={customerName}
                                    icon="solar:user-circle-bold-duotone"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <OcrFieldTile
                                    label="Chủ tài khoản ngân hàng"
                                    value={(isTransfer ? selectedBankAccount : bankAccount)?.bankAccountName}
                                    icon="solar:card-bold-duotone"
                                />
                            </Grid>
                        </Grid>
                        {isVerified && !namesMatch && (
                            <Alert severity="warning" sx={{ mt: 1.5 }}>
                                Họ tên trên CCCD khác với tên tài khoản khách hàng. Vui lòng kiểm tra kỹ trước khi
                                xác nhận.
                            </Alert>
                        )}
                        <FormControlLabel
                            sx={{ mt: 1.5, alignItems: 'flex-start' }}
                            control={
                                <Checkbox
                                    checked={identityConfirmed}
                                    onChange={(e) => setIdentityConfirmed(e.target.checked)}
                                    disabled={!isVerified || busy}
                                    sx={{ pt: 0.25 }}
                                />
                            }
                            label={
                                <Typography variant="body2">
                                    Tôi đã đối chiếu CCCD với khách hàng có mặt tại quầy và xác nhận đúng người nhận
                                    hoàn tiền.
                                </Typography>
                            }
                        />
                    </SectionCard>

                    <SectionCard
                        step={3}
                        title="Hình thức hoàn tiền"
                        subheader="Chọn tiền mặt hoặc chuyển khoản — khách hàng nhận hoàn tiền trực tiếp tại đại lý"
                        disabled={!isVerified}
                    >
                        {/* Tóm tắt thông tin đơn hàng, chi tiết vé đã mua và số tiền tổng */}
                        <Box
                            sx={{
                                mb: 2.5,
                                p: 2,
                                borderRadius: 1.5,
                                bgcolor: 'var(--palette-background-neutral)',
                                border: '1px solid var(--palette-divider)',
                            }}
                        >
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                flexWrap="wrap"
                                gap={1}
                                sx={{ mb: 1.25 }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                    <Icon
                                        icon="solar:bill-list-bold-duotone"
                                        width={20}
                                        style={{ color: 'var(--palette-primary-main)' }}
                                    />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                        Đơn hàng #{orderSummary?.orderCode || orderCode || `#${refundId}`}
                                    </Typography>
                                    {orderSummary?.status && (
                                        <AdminStatusBadge
                                            label={getOrderStatusBadge(orderSummary.status).label}
                                            modifier={getOrderStatusAdminBadgeModifier(orderSummary.status)}
                                        />
                                    )}
                                </Stack>
                                {orderSummary?.createdAt && (
                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)' }}>
                                        Ngày đặt: {dayjs(orderSummary.createdAt).format('DD/MM/YYYY HH:mm')}
                                    </Typography>
                                )}
                            </Stack>

                            {refundReason && (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        display: 'block',
                                        mb: 1.5,
                                        color: 'var(--palette-text-secondary)',
                                        bgcolor: 'var(--palette-background-paper)',
                                        p: 1,
                                        borderRadius: 1,
                                        border: '1px solid var(--palette-divider)',
                                    }}
                                >
                                    Lý do hoàn tiền: <strong style={{ color: 'var(--palette-text-primary)' }}>{refundReason}</strong>
                                </Typography>
                            )}

                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 700,
                                    color: 'var(--palette-text-secondary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    mb: 0.75,
                                    display: 'block',
                                }}
                            >
                                Chi tiết vé đã mua ({tickets?.length ?? 0} loại vé):
                            </Typography>

                            <TableContainer
                                sx={{
                                    maxHeight: 180,
                                    borderRadius: 1,
                                    border: '1px solid var(--palette-divider)',
                                    bgcolor: 'var(--palette-background-paper)',
                                    overflow: 'auto',
                                }}
                            >
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow
                                            sx={{
                                                '& th': {
                                                    bgcolor: 'var(--palette-background-neutral)',
                                                    fontWeight: 700,
                                                    fontSize: '0.75rem',
                                                    py: 0.75,
                                                    px: 1.5,
                                                    whiteSpace: 'nowrap',
                                                    color: 'var(--palette-text-secondary)',
                                                },
                                            }}
                                        >
                                            <TableCell align="center">{TICKET_NUMBERS_LABEL}</TableCell>
                                            <TableCell>Đài / Ngày xổ</TableCell>
                                            <TableCell align="center">SL</TableCell>
                                            <TableCell align="right">Đơn giá</TableCell>
                                            <TableCell align="right">Thành tiền</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {tickets && tickets.length > 0 ? (
                                            tickets.map((ticket, index) => {
                                                const subtotal =
                                                    ticket.subtotalAmount ??
                                                    (Number(ticket.quantity || 1) * Number(ticket.unitPrice || 0));
                                                return (
                                                    <TableRow
                                                        key={ticket.orderDetailId ?? `${ticket.numbers}-${index}`}
                                                        sx={{ '&:last-child td': { border: 0 } }}
                                                    >
                                                        <TableCell align="center" sx={{ py: 1, px: 1.5 }}>
                                                            <AdminLuckyDisplay
                                                                value={ticket.numbers}
                                                                ticket
                                                                fontSize="0.85rem"
                                                                fontWeight={700}
                                                                letterSpacing="0.05em"
                                                                sx={{ color: 'var(--palette-text-primary)' }}
                                                            />
                                                            {ticket.serialNumber && (
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        color: 'var(--palette-text-secondary)',
                                                                        display: 'block',
                                                                        fontSize: '0.7rem',
                                                                        lineHeight: 1.3,
                                                                    }}
                                                                >
                                                                    {TICKET_SERIAL_PREFIX}: {ticket.serialNumber}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1, px: 1.5 }}>
                                                            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                                                {ticket.stationName || '—'}
                                                            </Typography>
                                                            {ticket.drawDate && (
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{ color: 'var(--palette-text-secondary)', display: 'block', fontSize: '0.72rem' }}
                                                                >
                                                                    {dayjs(ticket.drawDate).isValid()
                                                                        ? dayjs(ticket.drawDate).format('DD/MM/YYYY')
                                                                        : String(ticket.drawDate)}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="center" sx={{ py: 1, px: 1, fontSize: '0.8rem', fontWeight: 600 }}>
                                                            {ticket.quantity ?? 1}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ py: 1, px: 1.5, fontSize: '0.8rem' }}>
                                                            {Number(ticket.unitPrice ?? 0).toLocaleString('vi-VN')}đ
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ py: 1, px: 1.5, fontSize: '0.8rem', fontWeight: 700 }}>
                                                            {Number(subtotal).toLocaleString('vi-VN')}đ
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 2, color: 'var(--palette-text-secondary)', fontSize: '0.8rem' }}>
                                                    Không có thông tin vé chi tiết
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                flexWrap="wrap"
                                gap={1.5}
                                sx={{ mt: 1.5, pt: 1.25, borderTop: '1px dashed var(--palette-divider)' }}
                            >
                                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                                    {orderSummary?.totalAmount != null && (
                                        <Stack direction="row" spacing={0.5} alignItems="baseline">
                                            <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)' }}>
                                                Tổng giá trị đơn:
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {Number(orderSummary.totalAmount).toLocaleString('vi-VN')}đ
                                            </Typography>
                                        </Stack>
                                    )}
                                    {tickets && tickets.length > 0 && (
                                        <Chip
                                            size="small"
                                            variant="outlined"
                                            label={`Tổng: ${tickets.reduce((acc, t) => acc + (t.quantity || 1), 0)} vé`}
                                            sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                                        />
                                    )}
                                </Stack>

                                <Stack direction="row" spacing={1} alignItems="baseline">
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--palette-text-secondary)' }}>
                                        Tổng tiền hoàn:
                                    </Typography>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--palette-primary-main)' }}>
                                        {Number(refundAmount ?? 0).toLocaleString('vi-VN')}đ
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Box>

                        <ToggleButtonGroup
                            exclusive
                            fullWidth
                            color="primary"
                            value={paymentMethod}
                            onChange={(_, next: RefundCounterPayoutMethod | null) => handlePaymentMethodChange(next)}
                            disabled={!isVerified || busy}
                            sx={{ mb: 2.5, '& .MuiToggleButton-root': { py: 1.25, gap: 1, fontWeight: 700, textTransform: 'none' } }}
                        >
                            <ToggleButton value="CASH">
                                <Icon icon="solar:wallet-money-bold-duotone" width={20} />
                                Tiền mặt
                            </ToggleButton>
                            <ToggleButton value="TRANSFER">
                                <Icon icon="solar:card-transfer-bold-duotone" width={20} />
                                Chuyển khoản
                            </ToggleButton>
                        </ToggleButtonGroup>

                        {!isTransfer ? (
                            <TextField
                                fullWidth
                                label="Số tiền hoàn"
                                value={Number(refundAmount ?? 0).toLocaleString('vi-VN')}
                                disabled={!isVerified || busy}
                                InputProps={{
                                    readOnly: true,
                                    endAdornment: <InputAdornment position="end">đ</InputAdornment>,
                                }}
                                slotProps={{
                                    input: {
                                        readOnly: true,
                                        endAdornment: <InputAdornment position="end">đ</InputAdornment>,
                                    },
                                }}
                                helperText=""
                                sx={{
                                    '& .MuiInputBase-root': {
                                        bgcolor: 'var(--palette-action-hover, rgba(0, 0, 0, 0.04))',
                                        cursor: 'default',
                                    },
                                    '& .MuiInputBase-input': {
                                        cursor: 'default',
                                        fontWeight: 700,
                                        color: 'var(--palette-text-primary)',
                                    },
                                }}
                            />
                        ) : (
                            <Grid container spacing={2.5} alignItems="stretch">
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <RefundBankAccountCard
                                        bankAccount={selectedBankAccount}
                                        compact
                                        subheader={`Số tiền chuyển khoản: ${Number(refundAmount).toLocaleString('vi-VN')}đ`}
                                        emptyMessage="Chưa chọn tài khoản nhận hoàn tiền. Chọn tài khoản của khách hàng hoặc tạo tài khoản mới."
                                        action={
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="primary"
                                                onClick={() => setCreateAccountOpen(true)}
                                                disabled={!isVerified || busy || !customerId}
                                                label="Tạo tài khoản"
                                                startIcon={<Icon icon="mingcute:add-line" />}
                                                sx={{ whiteSpace: 'nowrap' }}
                                            />
                                        }
                                    >
                                        {accountOptions.length > 1 && (
                                            <TextField
                                                select
                                                fullWidth
                                                size="small"
                                                label="Tài khoản nhận hoàn tiền"
                                                value={selectedBankAccount?.id ?? ''}
                                                onChange={(e) => setSelectedBankAccountId(Number(e.target.value))}
                                                disabled={!isVerified || busy}
                                                helperText={loadingCustomerAccounts ? 'Đang tải tài khoản của khách hàng...' : undefined}
                                                sx={{ mb: 2, bgcolor: 'background.paper' }}
                                            >
                                                {accountOptions.map((account) => (
                                                    <MenuItem key={account.id} value={account.id}>
                                                        {account.bankName} — {account.bankAccountNo} — {account.bankAccountName}
                                                        {account.id === bankAccount?.id ? ' (trên yêu cầu)' : ''}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        )}
                                    </RefundBankAccountCard>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                                        <CardHeader
                                            title="Tải ảnh biên lai chuyển khoản"
                                            subheader="Bắt buộc trước khi xác nhận hoàn tiền"
                                            slotProps={{
                                                title: { sx: { fontWeight: 700, fontSize: '1rem' } },
                                                subheader: { sx: { fontSize: '0.75rem' } },
                                            }}
                                            sx={{ pb: 1 }}
                                        />
                                        <Divider />
                                        <CardContent sx={{ pt: 2 }}>
                                            <UploadSingleFile
                                                label="Ảnh biên lai chuyển khoản"
                                                required
                                                value={receiptUrl}
                                                onChange={(url) => setReceiptUrl(typeof url === 'string' ? url : '')}
                                                customUpload={refundAdminApi.uploadTransferEvidence}
                                                autoUpload
                                                onUploadingChange={setReceiptUploading}
                                                disabled={!isVerified || busy}
                                            />
                                            {receiptUploading ? (
                                                <FormHelperText sx={{ mt: 1 }}>
                                                    Đang tải ảnh biên lai lên hệ thống...
                                                </FormHelperText>
                                            ) : hasReceipt ? (
                                                <FormHelperText sx={{ mt: 1, color: 'success.main' }}>
                                                    Đã tải ảnh biên lai thành công.
                                                </FormHelperText>
                                            ) : (
                                                <FormHelperText sx={{ mt: 1 }}>
                                                    Chưa có ảnh biên lai — nút Xác nhận sẽ bị khóa.
                                                </FormHelperText>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        )}
                    </SectionCard>
                </Stack>
            </DialogContent>
            <DialogActions
                sx={{ px: 3, pb: 3, pt: 1.5, gap: 1, borderTop: '1px solid var(--palette-divider)' }}
            >
                <Button
                    onClick={handleClose}
                    color="inherit"
                    variant="outlined"
                    className="btn-outlined-admin"
                    disabled={busy}
                    label="Hủy"
                    sx={{ minWidth: 96 }}
                />
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    className="btn-primary-admin"
                    disabled={!canConfirm}
                    loading={loading}
                    loadingLabel="Đang xác nhận..."
                    label="Xác nhận hoàn tiền"
                    sx={{
                        minWidth: 168,
                        backgroundColor: '#1C252E !important',
                        color: '#FFFFFF !important',
                        '&:hover': { backgroundColor: '#454F5B !important' },
                        '&.Mui-disabled': {
                            backgroundColor: 'rgba(145, 158, 171, 0.24) !important',
                            color: 'rgba(145, 158, 171, 0.8) !important',
                        },
                    }}
                />
            </DialogActions>
            {customerId && (
                <CustomerBankAccountFormDialog
                    open={createAccountOpen}
                    refundId={refundId}
                    customerId={customerId}
                    defaultAccountName={verified?.ocrName || customerName}
                    onClose={() => setCreateAccountOpen(false)}
                    onCreated={(account) => {
                        setCreatedBankAccount(account);
                        setSelectedBankAccountId(account.id);
                    }}
                />
            )}
        </Dialog>
    );
};

function SectionCard({
    step,
    title,
    subheader,
    disabled = false,
    children,
}: {
    step: number;
    title: string;
    subheader: string;
    disabled?: boolean;
    children: ReactNode;
}) {
    return (
        <Card
            variant="outlined"
            sx={{ borderRadius: 2, opacity: disabled ? 0.55 : 1, transition: 'opacity 0.2s ease' }}
        >
            <CardHeader
                title={`${step}. ${title}`}
                subheader={subheader}
                slotProps={{
                    title: { sx: { fontWeight: 700, fontSize: '1rem' } },
                    subheader: { sx: { fontSize: '0.75rem' } },
                }}
                sx={{ pb: 1 }}
            />
            <Divider />
            <CardContent sx={{ pt: 2 }}>{children}</CardContent>
        </Card>
    );
}
