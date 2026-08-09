"use client";

import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    FormControlLabel,
    FormHelperText,
    Grid,
    IconButton,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';
import { toast } from 'react-toastify';
import { UploadSingleFile } from '../../../components/upload/UploadSingleFile';
import { refundAdminApi } from '../../../api/refund.api';
import type { UserBankAccountResponse } from '../../../../types/refund.type';

const OPERATOR_NOTE_QUICK_REPLIES = [
    'Số tài khoản không hợp lệ. Vui lòng kiểm tra và cập nhật lại.',
    'Tên chủ tài khoản không khớp với thông tin ngân hàng.',
    'Ngân hàng nhận không hỗ trợ giao dịch. Vui lòng chọn tài khoản khác.',
    'Vui lòng kiểm tra lại thông tin tài khoản ngân hàng và gửi lại yêu cầu.',
    'Chúng tôi không thể chuyển khoản do thông tin tài khoản chưa chính xác.',
] as const;

interface TransferRefundDialogProps {
    open: boolean;
    loading?: boolean;
    bankUpdateLoading?: boolean;
    bankAccount?: UserBankAccountResponse | null;
    retryCount?: number;
    maxRetry?: number;
    canRequestBankUpdate?: boolean;
    onClose: () => void;
    onConfirm: (data: { paymentEvidenceUrl: string }) => void;
    onRequestBankUpdate?: (operatorNote: string) => void;
}

async function copyToClipboard(value: string, successMessage: string) {
    try {
        await navigator.clipboard.writeText(value);
        toast.success(successMessage);
    } catch {
        toast.error('Không thể sao chép. Vui lòng thử lại.');
    }
}

export const TransferRefundDialog = ({
    open,
    loading,
    bankUpdateLoading,
    bankAccount,
    retryCount = 0,
    maxRetry = 3,
    canRequestBankUpdate = false,
    onClose,
    onConfirm,
    onRequestBankUpdate,
}: TransferRefundDialogProps) => {
    const [evidenceUrl, setEvidenceUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [showRequiredHint, setShowRequiredHint] = useState(false);
    const [bankUpdateMode, setBankUpdateMode] = useState(false);
    const [operatorNote, setOperatorNote] = useState('');
    const [noteError, setNoteError] = useState('');
    const [selectedQuickReplyIndex, setSelectedQuickReplyIndex] = useState<number | null>(null);
    const [confirmBankUpdateOpen, setConfirmBankUpdateOpen] = useState(false);

    useEffect(() => {
        if (!open) {
            setEvidenceUrl('');
            setIsUploading(false);
            setShowRequiredHint(false);
            setBankUpdateMode(false);
            setOperatorNote('');
            setNoteError('');
            setSelectedQuickReplyIndex(null);
            setConfirmBankUpdateOpen(false);
        }
    }, [open]);

    const busy = Boolean(loading || bankUpdateLoading || isUploading);
    const hasUploadedEvidence = Boolean(evidenceUrl.trim());
    const canConfirmTransfer = !bankUpdateMode && hasUploadedEvidence && !busy;
    const nextRetryCount = retryCount + 1;
    const willBecomeManual = nextRetryCount >= maxRetry;
    const showBankUpdateToggle = Boolean(canRequestBankUpdate && onRequestBankUpdate);

    const discardUploadedEvidence = () => {
        setEvidenceUrl('');
        setIsUploading(false);
        setShowRequiredHint(false);
    };

    const handleClose = () => {
        if (busy) return;
        onClose();
    };

    const handleBankUpdateModeChange = (enabled: boolean) => {
        setBankUpdateMode(enabled);
        if (enabled) {
            // Requesting STK update must never keep a pending transfer receipt.
            discardUploadedEvidence();
            setNoteError('');
        } else {
            setOperatorNote('');
            setNoteError('');
            setSelectedQuickReplyIndex(null);
            setConfirmBankUpdateOpen(false);
        }
    };

    const handleConfirmTransfer = () => {
        if (bankUpdateMode) {
            return;
        }
        if (!hasUploadedEvidence || busy) {
            setShowRequiredHint(true);
            return;
        }
        onConfirm({ paymentEvidenceUrl: evidenceUrl.trim() });
    };

    const handleSendBankUpdateClick = () => {
        const trimmed = operatorNote.trim();
        if (!trimmed) {
            setNoteError('Vui lòng nhập ghi chú cho khách hàng.');
            return;
        }
        if (trimmed.length > 1000) {
            setNoteError('Ghi chú không được vượt quá 1000 ký tự.');
            return;
        }
        setNoteError('');
        setConfirmBankUpdateOpen(true);
    };

    const handleConfirmBankUpdate = () => {
        if (!onRequestBankUpdate) return;
        // Only bank-info retry fields are submitted — never payment evidence / transfer.
        discardUploadedEvidence();
        onRequestBankUpdate(operatorNote.trim());
        setConfirmBankUpdateOpen(false);
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        maxHeight: '90vh',
                    },
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>Xác nhận chuyển khoản hoàn tiền</DialogTitle>
                <DialogContent dividers sx={{ pt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                        Kiểm tra tài khoản nhận hoàn, thực hiện chuyển khoản, rồi tải ảnh biên lai làm minh
                        chứng. Chỉ xác nhận chuyển khoản khi đã tải biên lai thành công.
                    </Typography>

                    <Grid container spacing={2.5} alignItems="stretch">
                        <Grid size={{ xs: 12, md: 6 }}>
                            <BankAccountCard bankAccount={bankAccount} compact />
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Card
                                variant="outlined"
                                sx={{
                                    height: '100%',
                                    borderRadius: 2,
                                    opacity: bankUpdateMode ? 0.55 : 1,
                                    transition: 'opacity 0.2s ease',
                                }}
                            >
                                <CardHeader
                                    title="Tải ảnh biên lai chuyển khoản"
                                    subheader={
                                        bankUpdateMode
                                            ? 'Đã tạm khóa vì đang yêu cầu cập nhật STK'
                                            : 'Bắt buộc trước khi xác nhận chuyển khoản'
                                    }
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
                                        value={evidenceUrl}
                                        onChange={(url) => {
                                            setEvidenceUrl(typeof url === 'string' ? url : '');
                                            if (typeof url === 'string' && url.trim()) {
                                                setShowRequiredHint(false);
                                            }
                                        }}
                                        customUpload={refundAdminApi.uploadTransferEvidence}
                                        autoUpload
                                        onUploadingChange={setIsUploading}
                                        disabled={busy || bankUpdateMode}
                                        error={
                                            !bankUpdateMode && showRequiredHint && !hasUploadedEvidence
                                                ? 'Vui lòng tải ảnh biên lai trước khi xác nhận'
                                                : undefined
                                        }
                                    />
                                    {!bankUpdateMode && !hasUploadedEvidence && !isUploading && (
                                        <FormHelperText sx={{ mt: 1 }}>
                                            Chưa có ảnh biên lai — nút Xác nhận sẽ bị khóa.
                                        </FormHelperText>
                                    )}
                                    {isUploading && (
                                        <FormHelperText sx={{ mt: 1 }}>
                                            Đang tải ảnh biên lai lên hệ thống...
                                        </FormHelperText>
                                    )}
                                    {!bankUpdateMode && hasUploadedEvidence && (
                                        <FormHelperText sx={{ mt: 1, color: 'success.main' }}>
                                            Đã tải ảnh biên lai thành công.
                                        </FormHelperText>
                                    )}
                                    {bankUpdateMode && (
                                        <Alert severity="info" sx={{ mt: 1.5 }}>
                                            Biên lai đã tải (nếu có) sẽ bị bỏ qua và không tạo giao dịch hoàn
                                            tiền khi gửi yêu cầu cập nhật STK.
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {showBankUpdateToggle && (
                        <Box
                            sx={{
                                mt: 2.5,
                                border: '1px solid',
                                borderColor: bankUpdateMode ? 'warning.main' : 'divider',
                                borderRadius: 2,
                                bgcolor: bankUpdateMode ? 'rgba(255, 171, 0, 0.08)' : 'background.paper',
                                overflow: 'hidden',
                            }}
                        >
                            <Box
                                sx={{
                                    px: 2,
                                    py: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 2,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        Không thể chuyển khoản do sai thông tin tài khoản?
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Bật tùy chọn này để yêu cầu khách cập nhật STK. Hiện tại:{' '}
                                        <Box component="span" fontWeight={700}>
                                            {retryCount}/{maxRetry}
                                        </Box>{' '}
                                        lần đã yêu cầu.
                                    </Typography>
                                </Box>
                                <FormControlLabel
                                    sx={{ mr: 0 }}
                                    control={
                                        <Switch
                                            checked={bankUpdateMode}
                                            onChange={(e) => handleBankUpdateModeChange(e.target.checked)}
                                            disabled={busy}
                                            color="warning"
                                        />
                                    }
                                    label={bankUpdateMode ? 'Đang bật' : 'Tắt'}
                                />
                            </Box>

                            <Collapse in={bankUpdateMode} unmountOnExit>
                                <Divider />
                                <Box sx={{ p: 2 }}>
                                    {willBecomeManual && (
                                        <Alert severity="error" sx={{ mb: 1.5 }}>
                                            Đây sẽ là lần thử thứ {nextRetryCount}/{maxRetry}. Sau khi gửi, yêu
                                            cầu sẽ chuyển sang trạng thái Cần xử lý thủ công.
                                        </Alert>
                                    )}

                                    <TextField
                                        fullWidth
                                        multiline
                                        minRows={3}
                                        label="Ghi chú cho khách hàng"
                                        placeholder="Ví dụ: Số tài khoản không hợp lệ hoặc không khớp tên chủ tài khoản. Vui lòng kiểm tra và cập nhật lại."
                                        value={operatorNote}
                                        onChange={(e) => {
                                            const nextValue = e.target.value;
                                            setOperatorNote(nextValue);
                                            if (noteError) setNoteError('');
                                            if (
                                                selectedQuickReplyIndex != null &&
                                                nextValue !==
                                                    OPERATOR_NOTE_QUICK_REPLIES[selectedQuickReplyIndex]
                                            ) {
                                                setSelectedQuickReplyIndex(null);
                                            }
                                        }}
                                        error={Boolean(noteError)}
                                        helperText={
                                            noteError ||
                                            'Ghi chú này sẽ hiển thị cho khách hàng trên trang chi tiết hoàn tiền.'
                                        }
                                        disabled={busy}
                                        inputProps={{ maxLength: 1000 }}
                                    />

                                    <Box sx={{ mt: 1.5, mb: 1.5 }}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            fontWeight={700}
                                            sx={{ display: 'block', mb: 1 }}
                                        >
                                            Gợi ý nội dung
                                        </Typography>
                                        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                                            {OPERATOR_NOTE_QUICK_REPLIES.map((reply, index) => {
                                                const selected = selectedQuickReplyIndex === index;
                                                return (
                                                    <Chip
                                                        key={reply}
                                                        label={reply}
                                                        size="small"
                                                        clickable
                                                        disabled={busy}
                                                        color={selected ? 'warning' : 'default'}
                                                        variant={selected ? 'filled' : 'outlined'}
                                                        onClick={() => {
                                                            setOperatorNote(reply);
                                                            setSelectedQuickReplyIndex(index);
                                                            if (noteError) setNoteError('');
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

                                    <Button
                                        fullWidth
                                        variant="contained"
                                        color={willBecomeManual ? 'error' : 'warning'}
                                        onClick={handleSendBankUpdateClick}
                                        disabled={busy}
                                        startIcon={<Icon icon="mdi:send" />}
                                        sx={{ fontWeight: 700 }}
                                    >
                                        {bankUpdateLoading ? 'Đang gửi...' : 'Gửi yêu cầu cập nhật STK'}
                                    </Button>
                                </Box>
                            </Collapse>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={handleClose} disabled={busy}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleConfirmTransfer}
                        color="primary"
                        variant="contained"
                        disabled={!canConfirmTransfer}
                    >
                        {loading ? 'Đang xác nhận...' : 'Xác nhận chuyển khoản'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmBankUpdateOpen}
                onClose={() => !bankUpdateLoading && setConfirmBankUpdateOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Xác nhận gửi yêu cầu</DialogTitle>
                <DialogContent>
                    <DialogContentText component="div">
                        {willBecomeManual
                            ? 'Bạn có chắc muốn chuyển yêu cầu này sang xử lý thủ công? Khách hàng sẽ không thể cập nhật STK trực tuyến nữa.'
                            : 'Bạn có chắc muốn yêu cầu khách hàng cập nhật thông tin tài khoản ngân hàng?'}
                        <Box component="p" sx={{ mt: 1.5, mb: 0 }}>
                            Ảnh biên lai đã tải (nếu có) sẽ bị bỏ qua. Hệ thống sẽ không tạo giao dịch hoàn
                            tiền và không lưu minh chứng chuyển khoản cho thao tác này.
                        </Box>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setConfirmBankUpdateOpen(false)}
                        disabled={bankUpdateLoading}
                    >
                        Quay lại
                    </Button>
                    <Button
                        variant="contained"
                        color={willBecomeManual ? 'error' : 'warning'}
                        onClick={handleConfirmBankUpdate}
                        disabled={bankUpdateLoading}
                    >
                        {bankUpdateLoading ? 'Đang gửi...' : 'Xác nhận gửi'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

function BankAccountCard({
    bankAccount,
    compact = false,
}: {
    bankAccount?: UserBankAccountResponse | null;
    compact?: boolean;
}) {
    return (
        <Card
            variant="outlined"
            sx={{
                height: '100%',
                borderRadius: 2,
                bgcolor: 'action.hover',
            }}
        >
            <CardHeader
                title="Thông tin tài khoản nhận hoàn tiền"
                subheader="Chỉ xem — dùng để đối chiếu khi chuyển khoản"
                slotProps={{
                    title: { sx: { fontWeight: 700, fontSize: '1rem' } },
                    subheader: { sx: { fontSize: '0.75rem' } },
                }}
                sx={{ pb: 1 }}
            />
            <Divider />
            <CardContent sx={{ pt: 2 }}>
                {bankAccount ? (
                    <Stack spacing={compact ? 1.5 : 2}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            {bankAccount.bankLogo ? (
                                <Box
                                    component="img"
                                    src={bankAccount.bankLogo}
                                    alt={bankAccount.bankName}
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        objectFit: 'contain',
                                        borderRadius: 1,
                                        bgcolor: 'background.paper',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        p: 0.5,
                                    }}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 1,
                                        bgcolor: 'background.paper',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Icon icon="mdi:bank" width={22} />
                                </Box>
                            )}
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Ngân hàng
                                </Typography>
                                <Typography variant="body1" fontWeight={700} color="primary.main">
                                    {bankAccount.bankName || '—'}
                                </Typography>
                            </Box>
                        </Stack>

                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                                Số tài khoản
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                                <Typography
                                    component="span"
                                    sx={{
                                        fontFamily:
                                            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                        fontSize: '1.25rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.04em',
                                        color: 'text.primary',
                                        wordBreak: 'break-all',
                                    }}
                                >
                                    {bankAccount.bankAccountNo || '—'}
                                </Typography>
                                {bankAccount.bankAccountNo ? (
                                    <Tooltip title="Sao chép số tài khoản">
                                        <IconButton
                                            size="small"
                                            aria-label="Sao chép số tài khoản"
                                            onClick={() =>
                                                copyToClipboard(
                                                    bankAccount.bankAccountNo,
                                                    'Đã sao chép số tài khoản'
                                                )
                                            }
                                            sx={{ color: 'primary.main' }}
                                        >
                                            <Icon icon="solar:copy-bold-duotone" width={18} />
                                        </IconButton>
                                    </Tooltip>
                                ) : null}
                            </Stack>
                        </Box>

                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                                Chủ tài khoản
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                                <Typography
                                    variant="body1"
                                    fontWeight={700}
                                    sx={{ textTransform: 'uppercase' }}
                                >
                                    {bankAccount.bankAccountName || '—'}
                                </Typography>
                                {bankAccount.bankAccountName ? (
                                    <Tooltip title="Sao chép tên chủ tài khoản">
                                        <IconButton
                                            size="small"
                                            aria-label="Sao chép tên chủ tài khoản"
                                            onClick={() =>
                                                copyToClipboard(
                                                    bankAccount.bankAccountName,
                                                    'Đã sao chép tên chủ tài khoản'
                                                )
                                            }
                                            sx={{ color: 'primary.main' }}
                                        >
                                            <Icon icon="solar:copy-bold-duotone" width={18} />
                                        </IconButton>
                                    </Tooltip>
                                ) : null}
                            </Stack>
                        </Box>
                    </Stack>
                ) : (
                    <Typography variant="body2" color="warning.main">
                        Chưa có thông tin tài khoản ngân hàng trên yêu cầu hoàn tiền.
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}
