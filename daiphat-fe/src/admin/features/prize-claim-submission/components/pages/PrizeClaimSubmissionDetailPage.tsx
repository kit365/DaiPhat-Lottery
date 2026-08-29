"use client";

import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Stack, TextField, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useState } from 'react';
import { PageHeader } from '@/admin/components/ui/PageHeader';
import { ROUTES } from '@/admin/constants/routes';
import { useRouteParams } from '@/hooks/useRouteParams';
import {
    LINE_STATUS_LABELS,
    PRIZE_CIM_SUBMISSION_STATUS_LABELS,
    PrizeClaimSubmissionLineStatus,
    PrizeClaimSubmissionStatus,
    PrizeClaimRejectionReason,
    formatPrizePayoutCurrency,
} from '@/types/prize-payout.type';
import {
    useCancelPrizeClaim,
    useCompletePrizeClaim,
    useConfirmPrizeClaim,
    useMarkPaymentPending,
    usePrizeClaimSubmissionDetail,
    usePrizeClaimSubmissionLines,
    useRejectPrizeClaimLine,
    useRemovePrizeClaimLine,
    useSubmitPrizeClaim,
} from '../../hooks/usePrizeClaimSubmission';
import { EligibleTicketsPicker } from '../EligibleTicketsPicker';
import { SpinnerLoading } from '@/admin/components/ui/SpinnerLoading';
import { AppToast as toast } from '@/utils/toast.util';

const STATUS_COLORS: Record<PrizeClaimSubmissionStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
    [PrizeClaimSubmissionStatus.DRAFT]: 'default',
    [PrizeClaimSubmissionStatus.SUBMITTED]: 'info',
    [PrizeClaimSubmissionStatus.CONFIRMED]: 'info',
    [PrizeClaimSubmissionStatus.PAYMENT_PENDING]: 'warning',
    [PrizeClaimSubmissionStatus.COMPLETED]: 'success',
    [PrizeClaimSubmissionStatus.CANCELLED]: 'error',
};

function InfoRow({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
    return (
        <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="baseline"
            spacing={2}
            sx={{ py: 1.25, borderBottom: '1px dashed', borderColor: 'divider' }}
        >
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography
                variant="body2"
                sx={{ fontWeight: 600, textAlign: 'right', fontFamily: mono ? 'monospace' : undefined, fontVariantNumeric: 'tabular-nums' }}
            >
                {value ?? '—'}
            </Typography>
        </Stack>
    );
}

export const PrizeClaimSubmissionDetailPage = () => {
    const { id: idParam } = useRouteParams<{ id: string }>();
    const id = Number(idParam);

    const { data: subData, isLoading: subLoading } = usePrizeClaimSubmissionDetail(id);
    const { data: linesData, isLoading: linesLoading } = usePrizeClaimSubmissionLines(id);
    const removeLineMutation = useRemovePrizeClaimLine();
    const rejectMutation = useRejectPrizeClaimLine();
    const submitMutation = useSubmitPrizeClaim();
    const confirmMutation = useConfirmPrizeClaim();
    const markPaymentPendingMutation = useMarkPaymentPending();
    const completeMutation = useCompletePrizeClaim();
    const cancelMutation = useCancelPrizeClaim();

    const submission = subData?.data;
    const lines = linesData?.data ?? [];

    // Dialog states
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectingLineId, setRejectingLineId] = useState<number | null>(null);
    const [rejectionType, setRejectionType] = useState<'RETRYABLE' | 'FINAL'>('RETRYABLE');
    const [rejectionReason, setRejectionReason] = useState<PrizeClaimRejectionReason>(PrizeClaimRejectionReason.PAPER_DAMAGED);
    const [rejectionNote, setRejectionNote] = useState('');

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confRef, setConfRef] = useState('');
    const [confEvidence, setConfEvidence] = useState('');

    const [completeOpen, setCompleteOpen] = useState(false);
    const [paidAmount, setPaidAmount] = useState('');
    const [paymentNote, setPaymentNote] = useState('');

    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [approverId, setApproverId] = useState('');

    if (subLoading || linesLoading) {
        return (
            <Box>
                <PageHeader title="Chi tiết phiếu nộp" breadcrumbItems={[]} />
                <SpinnerLoading />
            </Box>
        );
    }

    if (!submission) {
        return (
            <Box>
                <PageHeader title="Chi tiết phiếu nộp" breadcrumbItems={[]} />
                <Alert severity="error">Không tìm thấy phiếu nộp.</Alert>
            </Box>
        );
    }

    const isDraft = submission.status === PrizeClaimSubmissionStatus.DRAFT;
    const isSubmitted = submission.status === PrizeClaimSubmissionStatus.SUBMITTED;
    const isPaymentPending = submission.status === PrizeClaimSubmissionStatus.PAYMENT_PENDING;

    const openRejectDialog = (lineId: number) => {
        setRejectingLineId(lineId);
        setRejectOpen(true);
    };

    const handleReject = async () => {
        if (!rejectingLineId) return;
        try {
            await rejectMutation.mutateAsync({
                submissionId: id,
                data: {
                    lineId: rejectingLineId,
                    rejectionType,
                    reason: rejectionReason,
                    note: rejectionNote || undefined,
                },
            });
            setRejectOpen(false);
        } catch {
            toast.error('Không thể từ chối vé');
        }
    };

    const handleSubmit = async () => {
        try {
            await submitMutation.mutateAsync({ submissionId: id, submittedBy: '' });
        } catch {
            toast.error('Không thể gửi phiếu');
        }
    };

    const handleRemoveLine = async (lineId: number) => {
        try {
            await removeLineMutation.mutateAsync({ submissionId: id, lineId });
        } catch {
            toast.error('Không thể xóa vé');
        }
    };

    const handleMarkPaymentPending = async () => {
        try {
            await markPaymentPendingMutation.mutateAsync(id);
        } catch {
            toast.error('Không thể chuyển trạng thái');
        }
    };

    const handleConfirm = async () => {
        if (!confRef || !confEvidence) {
            toast.error('Vui lòng nhập đầy đủ thông tin');
            return;
        }
        try {
            await confirmMutation.mutateAsync({
                submissionId: id,
                data: { confirmedBy: '', confirmationReference: confRef, confirmationEvidenceUrl: confEvidence },
            });
            setConfirmOpen(false);
        } catch {
            toast.error('Không thể xác nhận');
        }
    };

    const handleComplete = async () => {
        if (!paidAmount) {
            toast.error('Vui lòng nhập số tiền thanh toán');
            return;
        }
        try {
            await completeMutation.mutateAsync({
                submissionId: id,
                data: { completedBy: '', paidAmount: Number(paidAmount), paymentEvidenceUrls: [], paymentNote: paymentNote || undefined },
            });
            setCompleteOpen(false);
        } catch {
            toast.error('Không thể hoàn thành phiếu');
        }
    };

    const handleCancel = async () => {
        if (!isDraft && (!cancelReason || !approverId)) {
            toast.error('Vui lòng nhập đầy đủ thông tin');
            return;
        }
        try {
            await cancelMutation.mutateAsync({
                submissionId: id,
                data: {
                    cancelReason: cancelReason || undefined,
                    cancelledBy: '',
                    ...(isDraft ? {} : { approvedBy: approverId }),
                },
            });
            setCancelOpen(false);
        } catch {
            toast.error('Không thể hủy phiếu');
        }
    };

    return (
        <Box>
            <PageHeader
                title={`Phiếu nộp ${submission.submissionCode ?? '#' + id}`}
                breadcrumbItems={[
                    { label: 'Bảng điều khiển', to: ROUTES.ADMIN.ROOT },
                    { label: 'Phiếu nộp', to: ROUTES.ADMIN.PRIZE_CLAIM_SUBMISSIONS.LIST },
                    { label: submission.submissionCode ?? '#' + id },
                ]}
            />

            <Grid container spacing={3}>
                {/* Left: Submission Info + Lines */}
                <Grid size={{ xs: 12, md: 7 }}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Thông tin phiếu nộp</Typography>
                                <Chip
                                    label={PRIZE_CIM_SUBMISSION_STATUS_LABELS[submission.status] ?? submission.status}
                                    color={STATUS_COLORS[submission.status]}
                                />
                            </Stack>
                            <InfoRow label="Mã phiếu" value={submission.submissionCode} mono />
                            <InfoRow label="Nhà đài" value={submission.supplierName ?? 'Nhà đài #' + submission.supplierId} />
                            <InfoRow label="Số vé" value={submission.totalTicketCount ?? 0} />
                            <InfoRow label="Tổng giải thưởng (gross)" value={formatPrizePayoutCurrency(submission.totalGrossPrizeAmount)} />
                            <InfoRow label="Tổng claim (net)" value={formatPrizePayoutCurrency(submission.totalNetClaimAmount)} />
                            <InfoRow label="Tổng hoa hồng" value={formatPrizePayoutCurrency(submission.totalCommissionAmount)} />
                            {isPaymentPending && (
                                <>
                                    <InfoRow label="Đã thanh toán" value={formatPrizePayoutCurrency(submission.paidAmount)} />
                                    <InfoRow label="Trạng thái settlement" value={submission.settlementStatus} />
                                    <InfoRow label="Chênh lệch" value={formatPrizePayoutCurrency(submission.settlementDifferenceAmount)} />
                                    <InfoRow
                                        label="Hạn thanh toán"
                                        value={submission.paymentDeadline ? dayjs(submission.paymentDeadline).format('DD/MM/YYYY') : '—'}
                                    />
                                    {submission.isOverdue && <Alert severity="error" sx={{ mt: 2 }}>Phiếu đã quá hạn!</Alert>}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Lines Table */}
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                                Danh sách vé ({lines.length})
                            </Typography>
                            {isDraft && submission.supplierId && (
                                <EligibleTicketsPicker submissionId={id} supplierId={submission.supplierId} />
                            )}
                            <Box sx={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f5f5f5' }}>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Serial</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Số vé</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Giải</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Số tiền</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Trạng thái</th>
                                            {isSubmitted && <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Hành động</th>}
                                            {isDraft && <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Hành động</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.length === 0 ? (
                                            <tr>
                                                <td colSpan={isSubmitted || isDraft ? 6 : 5} style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                                                    Chưa có vé nào
                                                </td>
                                            </tr>
                                        ) : (
                                            lines.map((line) => (
                                                <tr key={line.id} style={{ borderBottom: '1px solid #eee' }}>
                                                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.85em' }}>
                                                        {line.serialNumber ?? 'Serial #' + line.serialId}
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>{line.ticketNumbers ?? '—'}</td>
                                                    <td style={{ padding: '8px 12px' }}>{line.prizeDisplayName ?? line.prizeCode ?? '—'}</td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                                        {formatPrizePayoutCurrency(line.netClaimAmount)}
                                                    </td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                        <Chip
                                                            label={LINE_STATUS_LABELS[line.lineStatus] ?? line.lineStatus}
                                                            size="small"
                                                        />
                                                    </td>
                                                    {isSubmitted && (
                                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                            <Button
                                                                size="small"
                                                                color="error"
                                                                variant="outlined"
                                                                onClick={() => openRejectDialog(line.id)}
                                                            >
                                                                Từ chối
                                                            </Button>
                                                        </td>
                                                    )}
                                                    {isDraft && (
                                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                            <Button
                                                                size="small"
                                                                color="error"
                                                                variant="outlined"
                                                                onClick={() => handleRemoveLine(line.id)}
                                                                disabled={removeLineMutation.isPending}
                                                            >
                                                                Xóa
                                                            </Button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right: Actions */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Hành động</Typography>

                            {isDraft && (
                                <Stack spacing={2}>
                                    <Alert severity="info">Phiếu đang ở trạng thái nháp. Chọn vé đã trả thưởng rồi gửi nộp.</Alert>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                        onClick={handleSubmit}
                                        disabled={submitMutation.isPending || lines.length === 0}
                                    >
                                        Gửi phiếu nộp
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        fullWidth
                                        onClick={() => setCancelOpen(true)}
                                    >
                                        Hủy phiếu
                                    </Button>
                                </Stack>
                            )}

                            {isSubmitted && (
                                <Stack spacing={2}>
                                    <Alert severity="info" sx={{ fontSize: '0.8em' }}>
                                        <strong>Maker-checker:</strong> người xác nhận phải khác người gửi phiếu.
                                    </Alert>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                        onClick={() => setConfirmOpen(true)}
                                    >
                                        Xác nhận từ nhà đài
                                    </Button>
                                </Stack>
                            )}

                            {isPaymentPending && (
                                <Stack spacing={2}>
                                    <Alert severity="warning" sx={{ fontSize: '0.8em' }}>
                                        Nhập số tiền nhà đài thực trả. Settlement: FULL / UNDERPAID / OVERPAID tự động.
                                    </Alert>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        fullWidth
                                        onClick={() => setCompleteOpen(true)}
                                    >
                                        Hoàn thành thanh toán
                                    </Button>
                                </Stack>
                            )}

                            {submission.status === PrizeClaimSubmissionStatus.CONFIRMED && (
                                <Stack spacing={2}>
                                    <Alert severity="info">Chuyển sang trạng thái chờ thanh toán.</Alert>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                        onClick={handleMarkPaymentPending}
                                        disabled={markPaymentPendingMutation.isPending}
                                    >
                                        Chuyển chờ thanh toán
                                    </Button>
                                </Stack>
                            )}

                            {submission.status === PrizeClaimSubmissionStatus.COMPLETED && (
                                <Alert severity="success">Phiếu đã hoàn thành.</Alert>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Reject Dialog */}
            <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Từ chối vé</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Box>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Loại từ chối</Typography>
                            {(['RETRYABLE', 'FINAL'] as const).map((opt) => (
                                <Box key={opt} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <input
                                        type="radio"
                                        name="rejectType"
                                        checked={rejectionType === opt}
                                        onChange={() => setRejectionType(opt)}
                                    />
                                    <Typography variant="body2">
                                        {opt === 'RETRYABLE' ? 'Từ chối - có thể nộp lại' : 'Từ chối vĩnh viễn (gian lận)'}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                        <TextField
                            select
                            label="Lý do"
                            fullWidth
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value as PrizeClaimRejectionReason)}
                            SelectProps={{ native: true }}
                        >
                            {Object.values(PrizeClaimRejectionReason).map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </TextField>
                        <TextField
                            label="Ghi chú thêm"
                            multiline
                            rows={2}
                            fullWidth
                            value={rejectionNote}
                            onChange={(e) => setRejectionNote(e.target.value)}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setRejectOpen(false)}>Hủy</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleReject}
                        disabled={rejectMutation.isPending}
                    >
                        Từ chối
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirm Dialog */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Xác nhận từ nhà đài</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Alert severity="info" sx={{ fontSize: '0.8em' }}>
                            <strong>Maker-checker:</strong> người xác nhận phải khác người gửi phiếu.
                        </Alert>
                        <TextField
                            label="Số biên bản xác nhận"
                            fullWidth
                            value={confRef}
                            onChange={(e) => setConfRef(e.target.value)}
                            required
                        />
                        <TextField
                            label="URL ảnh/PDF giấy xác nhận"
                            fullWidth
                            value={confEvidence}
                            onChange={(e) => setConfEvidence(e.target.value)}
                            required
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setConfirmOpen(false)}>Hủy</Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirm}
                        disabled={confirmMutation.isPending || !confRef || !confEvidence}
                    >
                        Xác nhận
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Complete Dialog */}
            <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Hoàn thành thanh toán</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Alert severity="info" sx={{ fontSize: '0.8em' }}>
                            <strong>Maker-checker:</strong> người hoàn thành phải khác người gửi phiếu.
                        </Alert>
                        <TextField
                            label="Số tiền thanh toán (VND)"
                            type="number"
                            fullWidth
                            value={paidAmount}
                            onChange={(e) => setPaidAmount(e.target.value)}
                            required
                        />
                        <TextField
                            label="Ghi chú"
                            multiline
                            rows={2}
                            fullWidth
                            value={paymentNote}
                            onChange={(e) => setPaymentNote(e.target.value)}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setCompleteOpen(false)}>Hủy</Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleComplete}
                        disabled={completeMutation.isPending || !paidAmount}
                    >
                        Hoàn thành
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Cancel Dialog */}
            <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Hủy phiếu nộp</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {!isDraft && (
                            <Alert severity="warning" sx={{ fontSize: '0.8em' }}>
                                <strong>Maker-checker:</strong> cần người duyệt khác người gửi phiếu.
                            </Alert>
                        )}
                        <TextField
                            label="Lý do hủy"
                            multiline
                            rows={2}
                            fullWidth
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            required={!isDraft}
                        />
                        {!isDraft && (
                            <TextField
                                label="Mã người duyệt hủy (UUID)"
                                fullWidth
                                value={approverId}
                                onChange={(e) => setApproverId(e.target.value)}
                                required
                            />
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setCancelOpen(false)}>Hủy</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleCancel}
                        disabled={cancelMutation.isPending}
                    >
                        Xác nhận hủy
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
