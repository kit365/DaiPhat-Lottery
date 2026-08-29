"use client";

import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import dayjs from 'dayjs';
import { AppToast as toast } from '@/utils/toast.util';
import {
    PrizePayoutPaymentMethod,
    PrizePayoutRequestStatus,
    formatPrizePayoutCurrency,
} from '@/types/prize-payout.type';
import {
    useCommitmentVoucher,
    usePayout,
    usePayoutInstallments,
    usePayoutPartial,
    usePayFinalInstallment,
    useWriteOffRemaining,
} from '../hooks/usePrizeClaimSubmission';

const PAYMENT_METHODS: PrizePayoutPaymentMethod[] = ['CASH', 'TRANSFER', 'COMBINED'];

const PAYMENT_METHOD_LABELS: Record<PrizePayoutPaymentMethod, string> = {
    CASH: 'Tiền mặt',
    TRANSFER: 'Chuyển khoản',
    COMBINED: 'Kết hợp',
};

const WRITE_OFF_THRESHOLD = 10_000_000;

interface PrizePayoutPartialPayoutPanelProps {
    requestId: number;
    /** Số dư quỹ đại lý — hiển thị ở UI */
    agencyBalance?: number;
    /** Người dùng hiện tại có phải MANAGER không */
    isManager?: boolean;
}

/**
 * Panel hành động cho Partial Payout trên PrizePayoutDetailPage.
 * Hiển thị:
 * - Tabs: Thanh toán | Cam kết | Lịch sử đợt trả
 * - Actions: Trả đủ / Trả 1 phần / Trả nốt / Xóa bỏ nghĩa vụ
 */
export const PrizePayoutPartialPayoutPanel = ({
    requestId,
    agencyBalance = 0,
    isManager = false,
}: PrizePayoutPartialPayoutPanelProps) => {
    const { data: installmentsData } = usePayoutInstallments(requestId);
    const { data: voucherData } = useCommitmentVoucher(requestId);

    const payoutMutation = usePayout();
    const payoutPartialMutation = usePayoutPartial();
    const payFinalMutation = usePayFinalInstallment();
    const writeOffMutation = useWriteOffRemaining();

    const installments = installmentsData?.data ?? [];
    const voucher = voucherData?.data;

    // ─── Dialog states ───────────────────────────────────────────────
    const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
    const [partialDialogOpen, setPartialDialogOpen] = useState(false);
    const [finalDialogOpen, setFinalDialogOpen] = useState(false);
    const [writeOffDialogOpen, setWriteOffDialogOpen] = useState(false);

    const [paymentMethod, setPaymentMethod] = useState<PrizePayoutPaymentMethod>('TRANSFER');
    const [partialAmount, setPartialAmount] = useState('');
    const [partialNote, setPartialNote] = useState('');
    const [finalAmount, setFinalAmount] = useState('');
    const [finalEvidence, setFinalEvidence] = useState('');
    const [writeOffReason, setWriteOffReason] = useState('');

    // ─── Handlers ─────────────────────────────────────────────────

    const handlePayout = async () => {
        try {
            await payoutMutation.mutateAsync({
                requestId,
                data: { method: paymentMethod, paidBy: '' },
            });
            setPayoutDialogOpen(false);
        } catch {
            toast.error('Không thể trả thưởng');
        }
    };

    const handlePayoutPartial = async () => {
        if (!partialAmount || Number(partialAmount) <= 0) {
            toast.error('Nhập số tiền hợp lệ');
            return;
        }
        try {
            await payoutPartialMutation.mutateAsync({
                requestId,
                data: {
                    availableAmount: Number(partialAmount),
                    note: partialNote || undefined,
                    paidBy: '',
                    method: paymentMethod,
                },
            });
            setPartialDialogOpen(false);
        } catch {
            toast.error('Không thể trả một phần');
        }
    };

    const handlePayFinal = async () => {
        if (!finalAmount || Number(finalAmount) <= 0) {
            toast.error('Nhập số tiền hợp lệ');
            return;
        }
        try {
            await payFinalMutation.mutateAsync({
                requestId,
                data: {
                    amount: Number(finalAmount),
                    evidence: finalEvidence || undefined,
                    paidBy: '',
                    method: paymentMethod,
                },
            });
            setFinalDialogOpen(false);
        } catch {
            toast.error('Không thể trả đợt cuối');
        }
    };

    const handleWriteOff = async () => {
        if (!writeOffReason) {
            toast.error('Nhập lý do xóa bỏ');
            return;
        }
        // Manager approval check
        const remaining = voucher?.remainingAmount ?? 0;
        if (remaining >= WRITE_OFF_THRESHOLD && !isManager) {
            toast.error(`Số tiền ≥ ${WRITE_OFF_THRESHOLD.toLocaleString('vi-VN')}đ cần MANAGER duyệt`);
            return;
        }
        try {
            await writeOffMutation.mutateAsync({
                requestId,
                data: { reason: writeOffReason, approvedBy: '' },
            });
            setWriteOffDialogOpen(false);
        } catch {
            toast.error('Không thể xóa bỏ nghĩa vụ');
        }
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                    Partial Payout
                </Typography>

                {/* Commitment Voucher Info */}
                {voucher && (
                    <Box sx={{ mb: 2, p: 2, border: '2px solid', borderColor: 'warning.main', borderRadius: 2, bgcolor: 'warning.50' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                            PHIẾU CAM KẾT CHI TRẢ
                        </Typography>
                        <Stack direction="row" spacing={2} mt={1}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Mã tra cứu</Typography>
                                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                    {voucher.commitmentVoucherCode}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Còn nợ</Typography>
                                <Typography sx={{ fontWeight: 700, color: 'error.main', fontVariantNumeric: 'tabular-nums' }}>
                                    {formatPrizePayoutCurrency(voucher.remainingAmount)}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Hạn</Typography>
                                <Typography sx={{ fontWeight: 700, color: 'warning.dark' }}>
                                    {dayjs(voucher.commitmentExpiresAt).format('DD/MM/YYYY')}
                                </Typography>
                            </Box>
                        </Stack>
                        {voucher.fundAdvanceNote && (
                            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                                Ghi chú: {voucher.fundAdvanceNote}
                            </Typography>
                        )}
                    </Box>
                )}

                {/* Quick Status */}
                <Stack direction="row" spacing={2} mb={2}>
                    <Box>
                        <Typography variant="caption" color="text.secondary">Quỹ khả dụng</Typography>
                        <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {formatPrizePayoutCurrency(agencyBalance)}
                        </Typography>
                    </Box>
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {/* Action Buttons */}
                <Stack spacing={1.5}>
                    <Button
                        variant="contained"
                        color="success"
                        fullWidth
                        onClick={() => setPayoutDialogOpen(true)}
                    >
                        Trả đủ
                    </Button>
                    <Button
                        variant="outlined"
                        color="warning"
                        fullWidth
                        onClick={() => setPartialDialogOpen(true)}
                    >
                        Trả một phần
                    </Button>
                    <Button
                        variant="outlined"
                        color="info"
                        fullWidth
                        onClick={() => setFinalDialogOpen(true)}
                    >
                        Trả đợt cuối
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        fullWidth
                        onClick={() => setWriteOffDialogOpen(true)}
                    >
                        Xóa bỏ nghĩa vụ còn lại
                    </Button>
                </Stack>

                {/* Installment History */}
                {installments.length > 0 && (
                    <Box mt={3}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                            Lịch sử đợt trả ({installments.length})
                        </Typography>
                        <Stack spacing={1}>
                            {installments.map((inst) => (
                                <Box key={inst.id} sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="body2">
                                            {formatPrizePayoutCurrency(inst.installmentAmount)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {dayjs(inst.paidAt).format('DD/MM/YYYY HH:mm')}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary">
                                        {PAYMENT_METHOD_LABELS[inst.paymentMethod] ?? inst.paymentMethod}
                                        {inst.note ? ` — ${inst.note}` : ''}
                                    </Typography>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                )}
            </CardContent>

            {/* Payout Full Dialog */}
            <Dialog open={payoutDialogOpen} onClose={() => setPayoutDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Trả đủ</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <Alert severity="info">
                            Hệ thống sẽ tự lấy tổng số tiền từ request. Nếu quỹ không đủ, sẽ chuyển sang trả một phần.
                        </Alert>
                        <Box>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Phương thức</Typography>
                            {PAYMENT_METHODS.map((m) => (
                                <Box key={m} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                                    <input
                                        type="radio"
                                        name="payMethod"
                                        checked={paymentMethod === m}
                                        onChange={() => setPaymentMethod(m)}
                                    />
                                    <Typography variant="body2">{PAYMENT_METHOD_LABELS[m]}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setPayoutDialogOpen(false)}>Hủy</Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handlePayout}
                        disabled={payoutMutation.isPending}
                    >
                        Xác nhận trả đủ
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Payout Partial Dialog */}
            <Dialog open={partialDialogOpen} onClose={() => setPartialDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Trả một phần</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <Alert severity="warning">
                            Sẽ tạo phiếu cam kết chi trả. Số tiền mỗi lần không được vượt quá số còn phải trả.
                        </Alert>
                        <TextField
                            label="Số tiền trả (VND)"
                            type="number"
                            fullWidth
                            value={partialAmount}
                            onChange={(e) => setPartialAmount(e.target.value)}
                        />
                        <TextField
                            label="Ghi chú lý do chờ quỹ"
                            multiline
                            rows={2}
                            fullWidth
                            value={partialNote}
                            onChange={(e) => setPartialNote(e.target.value)}
                        />
                        <Box>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Phương thức</Typography>
                            {PAYMENT_METHODS.map((m) => (
                                <Box key={m} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                                    <input
                                        type="radio"
                                        name="partialMethod"
                                        checked={paymentMethod === m}
                                        onChange={() => setPaymentMethod(m)}
                                    />
                                    <Typography variant="body2">{PAYMENT_METHOD_LABELS[m]}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setPartialDialogOpen(false)}>Hủy</Button>
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={handlePayoutPartial}
                        disabled={payoutPartialMutation.isPending}
                    >
                        Trả một phần
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Pay Final Dialog */}
            <Dialog open={finalDialogOpen} onClose={() => setFinalDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Trả đợt cuối</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <Alert severity="info">
                            Nhập số tiền đợt trả cuối. Nếu đủ tổng, trạng thái chuyển COMPLETED.
                        </Alert>
                        <TextField
                            label="Số tiền (VND)"
                            type="number"
                            fullWidth
                            value={finalAmount}
                            onChange={(e) => setFinalAmount(e.target.value)}
                        />
                        <TextField
                            label="URL ảnh chứng từ"
                            fullWidth
                            value={finalEvidence}
                            onChange={(e) => setFinalEvidence(e.target.value)}
                        />
                        <Box>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Phương thức</Typography>
                            {PAYMENT_METHODS.map((m) => (
                                <Box key={m} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                                    <input
                                        type="radio"
                                        name="finalMethod"
                                        checked={paymentMethod === m}
                                        onChange={() => setPaymentMethod(m)}
                                    />
                                    <Typography variant="body2">{PAYMENT_METHOD_LABELS[m]}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setFinalDialogOpen(false)}>Hủy</Button>
                    <Button
                        variant="contained"
                        color="info"
                        onClick={handlePayFinal}
                        disabled={payFinalMutation.isPending}
                    >
                        Trả đợt cuối
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Write Off Dialog */}
            <Dialog open={writeOffDialogOpen} onClose={() => setWriteOffDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Xóa bỏ nghĩa vụ còn lại</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <Alert severity="error">
                            Khách hàng từ bỏ phần còn lại. Không trừ thêm quỹ. Hành động này không thể hoàn tác.
                        </Alert>
                        {voucher && voucher.remainingAmount >= WRITE_OFF_THRESHOLD && (
                            <Alert severity="warning">
                                Số tiền ≥ {WRITE_OFF_THRESHOLD.toLocaleString('vi-VN')}đ — cần <strong>MANAGER</strong> duyệt.
                            </Alert>
                        )}
                        <TextField
                            label="Lý do xóa bỏ"
                            multiline
                            rows={3}
                            fullWidth
                            value={writeOffReason}
                            onChange={(e) => setWriteOffReason(e.target.value)}
                            required
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setWriteOffDialogOpen(false)}>Hủy</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleWriteOff}
                        disabled={writeOffMutation.isPending}
                    >
                        Xác nhận xóa bỏ
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
};
