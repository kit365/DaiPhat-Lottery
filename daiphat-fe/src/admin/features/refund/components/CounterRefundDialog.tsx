"use client";

import { useEffect, useState, type ReactNode } from 'react';
import {
    Alert,
    Box,
    Card,
    CardContent,
    CardHeader,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    FormHelperText,
    Grid,
    InputAdornment,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Button } from '@/admin/components/ui/Button';
import { Icon } from '@/admin/components/ui/AdminIcon';
import { UploadSingleFile } from '@/admin/components/upload/UploadSingleFile';
import { refundAdminApi } from '@/admin/features/refund/services/refundService';
import { useVerifyCounterIdentity } from '@/admin/features/refund/hooks/useRefundManagement';
import type {
    CompleteCounterRefundRequest,
    RefundCounterIdentitySummary,
    RefundCounterPayoutMethod,
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
        message: body?.message || error?.message || 'Không thể xác thực CCCD. Vui lòng thử lại.',
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
    const [amountInput, setAmountInput] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<RefundCounterPayoutMethod>('CASH');
    const [receiptUrl, setReceiptUrl] = useState('');
    const [receiptUploading, setReceiptUploading] = useState(false);

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
        setAmountInput(String(refundAmount ?? ''));
        setPaymentMethod('CASH');
        setReceiptUrl('');
        setFrontUploading(false);
        setBackUploading(false);
        setReceiptUploading(false);
        // Reset only when the dialog opens; later detail refetches must not wipe staff input.
    }, [open]);

    const verifying = verifyMutation.isPending;
    const uploading = frontUploading || backUploading || receiptUploading;
    const busy = Boolean(loading || verifying || uploading);

    const hasBothImages = Boolean(frontUrl.trim() && backUrl.trim());
    const isVerified = verified?.ekycStatus === 'VERIFIED';
    const amountValue = Number(amountInput.replace(/[^\d]/g, ''));
    const amountMatches = Number.isFinite(amountValue) && amountValue === Number(refundAmount);
    const needsReceipt = paymentMethod === 'TRANSFER';
    const hasReceipt = Boolean(receiptUrl.trim());
    const namesMatch =
        !!verified?.ocrName && !!customerName && normalizeName(verified.ocrName) === normalizeName(customerName);

    const canConfirm =
        isVerified && identityConfirmed && amountMatches && (!needsReceipt || hasReceipt) && !busy;

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
                        message: response.message || 'Không thể xác thực CCCD. Vui lòng thử lại.',
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
            amount: amountValue,
            transferEvidenceUrl: needsReceipt ? receiptUrl.trim() : undefined,
            identityConfirmed: true,
        });
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
                    Chụp/tải ảnh mặt trước và mặt sau CCCD của khách hàng, bấm &quot;Xác thực CCCD&quot; để hệ
                    thống đọc thông tin. Chỉ có thể hoàn tất sau khi CCCD được xác thực thành công.
                </Typography>

                <Stack spacing={2.5}>
                    <SectionCard
                        step={1}
                        title="Xác thực CCCD của khách hàng"
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
                                        disabled={busy}
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
                                loadingLabel="Đang xác thực..."
                                label={isVerified ? 'Đã xác thực' : 'Xác thực CCCD'}
                                startIcon={<Icon icon="solar:shield-check-bold-duotone" />}
                                sx={{ boxShadow: 'none !important' }}
                            />
                            {!hasBothImages && (
                                <FormHelperText sx={{ m: 0 }}>
                                    Cần tải đủ ảnh mặt trước và mặt sau trước khi xác thực.
                                </FormHelperText>
                            )}
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
                                    Vui lòng chụp lại {describeRetakeSides(ocrError.retakeSides)} rồi xác thực lại.
                                </Typography>
                            </Alert>
                        )}

                        {isVerified && verified && (
                            <Box
                                sx={{
                                    mt: 2,
                                    p: 2,
                                    borderRadius: 1.5,
                                    border: '1px solid',
                                    borderColor: 'success.light',
                                    bgcolor: 'rgba(34, 197, 94, 0.06)',
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                                    <Icon icon="solar:check-circle-bold" width={20} style={{ color: 'var(--palette-success-main)' }} />
                                    <Typography variant="subtitle2" fontWeight={700} color="success.dark">
                                        CCCD đã được xác thực
                                    </Typography>
                                </Stack>
                                <Grid container spacing={1.5}>
                                    <OcrField label="Họ và tên" value={verified.ocrName} highlight />
                                    <OcrField label="Số CCCD" value={verified.ocrIdNumber} highlight />
                                    <OcrField label="Ngày sinh" value={verified.ocrDob} />
                                    <OcrField label="Giới tính" value={verified.ocrGender} />
                                    <OcrField label="Quốc tịch" value={verified.ocrNationality} />
                                    <OcrField label="Ngày cấp" value={verified.ocrIssueDate} />
                                    <OcrField label="Quê quán" value={verified.ocrPlaceOfBirth} wide />
                                    <OcrField label="Nơi thường trú" value={verified.ocrPlaceOfResidence} wide />
                                </Grid>
                            </Box>
                        )}
                    </SectionCard>

                    <SectionCard
                        step={2}
                        title="Đối chiếu danh tính"
                        subheader="Nhân viên xác nhận người nhận tiền đúng là chủ CCCD"
                        disabled={!isVerified}
                    >
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Họ tên trên CCCD
                                </Typography>
                                <Typography variant="body2" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
                                    {verified?.ocrName || '—'}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Tên tài khoản khách hàng
                                </Typography>
                                <Typography variant="body2" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
                                    {customerName || '—'}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Chủ tài khoản ngân hàng
                                </Typography>
                                <Typography variant="body2" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
                                    {bankAccount?.bankAccountName || '—'}
                                </Typography>
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
                        title="Thông tin hoàn tiền"
                        subheader="Số tiền phải bằng số tiền của yêu cầu hoàn tiền"
                        disabled={!isVerified}
                    >
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Số tiền hoàn"
                                    value={amountInput ? Number(amountInput.replace(/[^\d]/g, '') || 0).toLocaleString('vi-VN') : ''}
                                    onChange={(e) => setAmountInput(e.target.value.replace(/[^\d]/g, ''))}
                                    disabled={!isVerified || busy}
                                    error={isVerified && !amountMatches}
                                    helperText={
                                        isVerified && !amountMatches
                                            ? `Số tiền phải bằng ${Number(refundAmount).toLocaleString('vi-VN')}đ`
                                            : `Số tiền yêu cầu: ${Number(refundAmount).toLocaleString('vi-VN')}đ`
                                    }
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">đ</InputAdornment>,
                                    }}
                                    inputProps={{ inputMode: 'numeric' }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Hình thức hoàn tiền
                                </Typography>
                                <RadioGroup
                                    row
                                    value={paymentMethod}
                                    onChange={(e) => {
                                        const next = e.target.value as RefundCounterPayoutMethod;
                                        setPaymentMethod(next);
                                        if (next === 'CASH') setReceiptUrl('');
                                    }}
                                >
                                    <FormControlLabel
                                        value="CASH"
                                        control={<Radio disabled={!isVerified || busy} />}
                                        label="Tiền mặt"
                                    />
                                    <FormControlLabel
                                        value="TRANSFER"
                                        control={<Radio disabled={!isVerified || busy} />}
                                        label="Chuyển khoản"
                                    />
                                </RadioGroup>
                            </Grid>
                            {needsReceipt && (
                                <Grid size={{ xs: 12 }}>
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
                                    {!hasReceipt && !receiptUploading && (
                                        <FormHelperText sx={{ mt: 1 }}>
                                            Bắt buộc tải ảnh biên lai khi hoàn tiền bằng chuyển khoản.
                                        </FormHelperText>
                                    )}
                                </Grid>
                            )}
                        </Grid>
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

function OcrField({
    label,
    value,
    highlight = false,
    wide = false,
}: {
    label: string;
    value?: string | null;
    highlight?: boolean;
    wide?: boolean;
}) {
    return (
        <Grid size={{ xs: 12, sm: wide ? 12 : 6, md: wide ? 6 : 4 }}>
            <Typography variant="caption" color="text.secondary" display="block">
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={highlight ? 700 : 600}>
                {value || '—'}
            </Typography>
        </Grid>
    );
}
