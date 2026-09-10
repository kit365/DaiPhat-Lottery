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
    FormControl,
    FormControlLabel,
    IconButton,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/admin/components/ui/PageHeader';
import { ROUTES } from '@/admin/constants/routes';
import { uploadAdminImage } from '@/admin/shared/services/upload.service';
import { UploadSingleFile } from '@/admin/components/upload/UploadSingleFile';
import { useRouteParams } from '@/hooks/useRouteParams';
import {
    LINE_OUTCOME_LABELS,
    LINE_STATUS_LABELS,
    REJECTION_REASON_LABELS,
    getPrizeClaimLineStatusChipColor,
    PRIZE_CIM_SUBMISSION_STATUS_LABELS,
    PrizeClaimLineOutcome,
    PrizeClaimSubmissionLineStatus,
    PrizeClaimSubmissionStatus,
    PrizeClaimRejectionReason,
    computeSupplierExpectedAmount,
    formatPrizePayoutCurrency,
} from '@/types/prize-payout.type';
import {
    useCancelPrizeClaim,
    useConfirmPrizeClaimHandover,
    useConfirmPrizeClaimInspection,
    useExportPrizeClaimSubmission,
    usePrizeClaimSubmissionDetail,
    usePrizeClaimSubmissionLines,
    useRecordLineOutcome,
    useRemovePrizeClaimLine,
    useStartPrizeClaimInspection,
    useUpdatePrizeClaimActualReceived,
} from '../../hooks/usePrizeClaimSubmission';
import { EligibleTicketsPicker } from '../EligibleTicketsPicker';
import { SpinnerLoading } from '@/admin/components/ui/SpinnerLoading';
import { AppToast as toast } from '@/utils/toast.util';

const STATUS_COLORS: Record<PrizeClaimSubmissionStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
    [PrizeClaimSubmissionStatus.DRAFT]: 'default',
    [PrizeClaimSubmissionStatus.INSPECTING]: 'warning',
    [PrizeClaimSubmissionStatus.PENDING_HANDOVER]: 'info',
    [PrizeClaimSubmissionStatus.HANDED_OVER]: 'info',
    [PrizeClaimSubmissionStatus.CLOSED]: 'success',
    [PrizeClaimSubmissionStatus.CANCELLED]: 'error',
};

const formatMoneyInput = (value: string | number | null | undefined) => {
    if (value == null || value === '') return '';
    const digits = String(value).replace(/[^\d]/g, '');
    if (!digits) return '';
    return new Intl.NumberFormat('vi-VN').format(Number(digits));
};

function InfoRow({
    label,
    value,
    mono,
    tooltip,
}: {
    label: string;
    value?: string | number | null;
    mono?: boolean;
    tooltip?: string;
}) {
    return (
        <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="baseline"
            spacing={2}
            sx={{ py: 1.25, borderBottom: '1px dashed', borderColor: 'divider' }}
        >
            <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                {tooltip && (
                    <Tooltip title={tooltip} arrow>
                        <IconButton size="small" sx={{ p: 0.25 }}>
                            <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>
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
    const recordOutcomeMutation = useRecordLineOutcome();
    const startInspectionMutation = useStartPrizeClaimInspection();
    const confirmInspectionMutation = useConfirmPrizeClaimInspection();
    const confirmHandoverMutation = useConfirmPrizeClaimHandover();
    const cancelMutation = useCancelPrizeClaim();
    const exportMutation = useExportPrizeClaimSubmission();
    const updateActualReceivedMutation = useUpdatePrizeClaimActualReceived();

    const submission = subData?.data;
    const lines = linesData?.data ?? [];

    const expectedFromSupplier = useMemo(
        () => computeSupplierExpectedAmount(submission?.totalGrossPrizeAmount, submission?.totalTaxAmount),
        [submission?.totalGrossPrizeAmount, submission?.totalTaxAmount],
    );

    const [actualReceivedInput, setActualReceivedInput] = useState('');
    const [actualReceivedEvidenceUrl, setActualReceivedEvidenceUrl] = useState<string | null>(null);
    const [isActualReceivedEvidenceUploading, setIsActualReceivedEvidenceUploading] = useState(false);

    const [deliveryMode, setDeliveryMode] = useState<'RETAILER_DELIVERS' | 'SUPPLIER_COLLECTS'>('RETAILER_DELIVERS');
    const [handoverNote, setHandoverNote] = useState('');
    const [handoverEvidenceFile, setHandoverEvidenceFile] = useState<File | null>(null);
    const [isHandoverUploading, setIsHandoverUploading] = useState(false);

    const [outcomeOpen, setOutcomeOpen] = useState(false);
    const [outcomeLineId, setOutcomeLineId] = useState<number | null>(null);
    const [outcome, setOutcome] = useState<PrizeClaimLineOutcome>(PrizeClaimLineOutcome.HANDED_OVER);
    const [outcomeReason, setOutcomeReason] = useState<PrizeClaimRejectionReason>(PrizeClaimRejectionReason.PAPER_DAMAGED);
    const [outcomeNote, setOutcomeNote] = useState('');
    const [outcomeEvidenceFile, setOutcomeEvidenceFile] = useState<File | null>(null);
    const [isOutcomeUploading, setIsOutcomeUploading] = useState(false);

    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    useEffect(() => {
        if (submission?.actualReceivedAmount != null) {
            setActualReceivedInput(formatMoneyInput(submission.actualReceivedAmount));
        } else {
            setActualReceivedInput('');
        }
        setActualReceivedEvidenceUrl(submission?.actualReceivedEvidenceUrl ?? null);
    }, [submission?.actualReceivedAmount, submission?.actualReceivedEvidenceUrl]);

    if (subLoading || linesLoading) {
        return (
            <div className="admin-list-page">
                <PageHeader title="Chi tiết phiếu nộp" breadcrumbItems={[]} />
                <SpinnerLoading />
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="admin-list-page">
                <PageHeader title="Chi tiết phiếu nộp" breadcrumbItems={[]} />
                <Alert severity="error">Không tìm thấy phiếu nộp.</Alert>
            </div>
        );
    }

    const isDraft = submission.status === PrizeClaimSubmissionStatus.DRAFT;
    const isInspecting = submission.status === PrizeClaimSubmissionStatus.INSPECTING;
    const isPendingHandover = submission.status === PrizeClaimSubmissionStatus.PENDING_HANDOVER;
    const isHandedOver = submission.status === PrizeClaimSubmissionStatus.HANDED_OVER;
    const isClosed = submission.status === PrizeClaimSubmissionStatus.CLOSED;
    const isCancelled = submission.status === PrizeClaimSubmissionStatus.CANCELLED;
    const canEditLines = isDraft || isInspecting;
    const canCancel = isDraft || isInspecting || isPendingHandover;
    const pendingOutcomeCount = submission.pendingOutcomeCount ?? 0;
    const hasPendingOutcomes = isHandedOver && pendingOutcomeCount > 0;

    const parsedActualReceived = actualReceivedInput.trim() === ''
        ? null
        : Number(actualReceivedInput.replace(/[^\d]/g, ''));
    const canEditActualReceived = isHandedOver || isClosed;

    const handleSaveActualReceived = async () => {
        if (!canEditActualReceived) return;
        if (parsedActualReceived != null && (Number.isNaN(parsedActualReceived) || parsedActualReceived < 0)) {
            toast.error('Số tiền thực nhận không hợp lệ');
            return;
        }
        try {
            await updateActualReceivedMutation.mutateAsync({
                submissionId: id,
                actualReceivedAmount: parsedActualReceived,
                actualReceivedEvidenceUrl,
            });
        } catch {
            // toast handled in hook
        }
    };

    const openOutcomeDialog = (lineId: number) => {
        setOutcomeLineId(lineId);
        setOutcome(PrizeClaimLineOutcome.HANDED_OVER);
        setOutcomeReason(PrizeClaimRejectionReason.PAPER_DAMAGED);
        setOutcomeNote('');
        setOutcomeEvidenceFile(null);
        setOutcomeOpen(true);
    };

    const handleRecordOutcome = async () => {
        if (!outcomeLineId) return;
        if (outcome !== PrizeClaimLineOutcome.HANDED_OVER && !outcomeReason) {
            toast.error('Vui lòng chọn lý do');
            return;
        }
        if (outcome === PrizeClaimLineOutcome.HANDED_OVER && !outcomeEvidenceFile) {
            toast.error('Vui lòng tải ảnh chứng từ Nhà cung cấp đã xử lý');
            return;
        }
        try {
            setIsOutcomeUploading(true);
            let outcomeEvidenceUrl: string | undefined;
            if (outcomeEvidenceFile) {
                outcomeEvidenceUrl = await uploadAdminImage(outcomeEvidenceFile);
            }
            await recordOutcomeMutation.mutateAsync({
                submissionId: id,
                lineId: outcomeLineId,
                data: {
                    outcome,
                    ...(outcome !== PrizeClaimLineOutcome.HANDED_OVER ? { reason: outcomeReason } : {}),
                    note: outcomeNote || undefined,
                    outcomeEvidenceUrl,
                },
            });
            setOutcomeOpen(false);
        } catch {
            toast.error('Không thể ghi nhận kết quả');
        } finally {
            setIsOutcomeUploading(false);
        }
    };

    const handleStartInspection = async () => {
        try {
            await startInspectionMutation.mutateAsync(id);
        } catch {
            toast.error('Không thể bắt đầu kiểm tra');
        }
    };

    const handleConfirmInspection = async () => {
        try {
            await confirmInspectionMutation.mutateAsync({
                submissionId: id,
                data: { deliveryMode },
            });
        } catch {
            toast.error('Không thể xác nhận kiểm tra');
        }
    };

    const handleConfirmHandover = async () => {
        if (!handoverEvidenceFile) {
            toast.error('Vui lòng tải ảnh bằng chứng bàn giao');
            return;
        }
        try {
            setIsHandoverUploading(true);
            const handoverEvidenceUrl = await uploadAdminImage(handoverEvidenceFile);
            await confirmHandoverMutation.mutateAsync({
                submissionId: id,
                data: {
                    handoverEvidenceUrl,
                    note: handoverNote || undefined,
                },
            });
            setHandoverEvidenceFile(null);
            setHandoverNote('');
        } catch {
            toast.error('Không thể xác nhận bàn giao');
        } finally {
            setIsHandoverUploading(false);
        }
    };

    const handleRemoveLine = async (lineId: number) => {
        try {
            await removeLineMutation.mutateAsync({ submissionId: id, lineId });
        } catch {
            toast.error('Không thể xóa vé');
        }
    };

    const handleCancel = async () => {
        try {
            await cancelMutation.mutateAsync({
                submissionId: id,
                data: { cancelReason: cancelReason || undefined },
            });
            setCancelOpen(false);
        } catch {
            toast.error('Không thể hủy phiếu');
        }
    };

    const canExport =
        (isPendingHandover || isHandedOver || isClosed) && lines.length > 0;

    const handleExport = async () => {
        try {
            await exportMutation.mutateAsync(id);
        } catch {
            // toast handled by mutation
        }
    };

    const canConfirmOutcome =
        outcome !== PrizeClaimLineOutcome.HANDED_OVER || Boolean(outcomeEvidenceFile);

    return (
        <div className="admin-list-page">
            <PageHeader
                disableBottomMargin
                title={`Phiếu nộp ${submission.submissionCode ?? '#' + id}`}
                breadcrumbItems={[
                    { label: 'Bảng điều khiển', to: ROUTES.ADMIN.ROOT },
                    { label: 'Phiếu nộp', to: ROUTES.ADMIN.PRIZE_CLAIM_SUBMISSIONS.LIST },
                    { label: submission.submissionCode ?? '#' + id },
                ]}
                action={
                    canExport ? (
                        <Button
                            variant="outlined"
                            startIcon={<FileDownloadOutlinedIcon />}
                            onClick={handleExport}
                            disabled={exportMutation.isPending}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: '10px',
                                borderColor: '#cbd5e1',
                                color: '#475569',
                                bgcolor: '#ffffff',
                                '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                            }}
                        >
                            Xuất phiếu nộp
                        </Button>
                    ) : undefined
                }
            />

            {hasPendingOutcomes && (
                <Alert severity={submission.needsOutcome ? 'error' : 'warning'} sx={{ mb: 2 }}>
                    {submission.needsOutcome
                        ? `Phiếu đã bàn giao quá 3 ngày — còn ${pendingOutcomeCount} vé chưa ghi nhận kết quả. Vui lòng cập nhật ngay.`
                        : `Phiếu đã bàn giao — còn ${pendingOutcomeCount} vé chờ ghi nhận kết quả từ Nhà cung cấp. Nhấn "Ghi nhận kết quả" cho từng vé bên dưới.`}
                </Alert>
            )}

            <Card sx={{ width: '100%' }}>
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Thông tin phiếu nộp</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            {hasPendingOutcomes && (
                                <Chip
                                    label={`Còn ${pendingOutcomeCount} vé chờ ghi nhận`}
                                    color={submission.needsOutcome ? 'error' : 'warning'}
                                    size="small"
                                />
                            )}
                            <Chip
                                label={PRIZE_CIM_SUBMISSION_STATUS_LABELS[submission.status] ?? submission.status}
                                color={STATUS_COLORS[submission.status]}
                            />
                        </Stack>
                    </Stack>
                    <InfoRow label="Mã phiếu" value={submission.submissionCode} mono />
                    <InfoRow label="Số vé" value={submission.totalTicketCount ?? 0} />
                    <InfoRow label="Tổng giải thưởng" value={formatPrizePayoutCurrency(submission.totalGrossPrizeAmount)} />
                    <InfoRow label="Tổng thuế TNCN" value={formatPrizePayoutCurrency(submission.totalTaxAmount)} />
                    <InfoRow
                        label="Giải thưởng sau thuế (chưa trừ hoa hồng Nhà cung cấp)"
                        value={formatPrizePayoutCurrency(expectedFromSupplier)}
                        tooltip="Số tiền lý thuyết trước khi Nhà cung cấp trừ hoa hồng của họ — số thực nhận thường thấp hơn con số này."
                    />
                    {canEditActualReceived && (
                        <Stack
                            spacing={1}
                            sx={{ py: 1.25, borderBottom: '1px dashed', borderColor: 'divider' }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                Số tiền thực nhận
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                                <TextField
                                    size="small"
                                    type="text"
                                    placeholder="Nhập số tiền Nhà cung cấp đã thanh toán"
                                    value={actualReceivedInput}
                                    onChange={(e) => setActualReceivedInput(formatMoneyInput(e.target.value))}
                                    inputProps={{ inputMode: 'numeric' }}
                                    sx={{ flex: 1 }}
                                />
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleSaveActualReceived}
                                    disabled={updateActualReceivedMutation.isPending || isActualReceivedEvidenceUploading}
                                    sx={{ whiteSpace: 'nowrap' }}
                                >
                                    Lưu
                                </Button>
                            </Stack>
                            <Box>
                                <UploadSingleFile
                                    value={actualReceivedEvidenceUrl}
                                    onChange={(url) => {
                                        setActualReceivedEvidenceUrl(typeof url === 'string' && url ? url : null);
                                    }}
                                    label="Ảnh chứng từ thanh toán từ Nhà cung cấp"
                                    autoUpload
                                    onUploadingChange={setIsActualReceivedEvidenceUploading}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                                    Đính kèm ảnh biên lai/chuyển khoản khi Nhà cung cấp đã thanh toán số tiền thực nhận.
                                </Typography>
                            </Box>
                        </Stack>
                    )}
                    {!canEditActualReceived && submission.actualReceivedAmount != null && (
                        <InfoRow
                            label="Số tiền thực nhận"
                            value={formatPrizePayoutCurrency(submission.actualReceivedAmount)}
                        />
                    )}
                    {!canEditActualReceived && submission.actualReceivedEvidenceUrl && (
                        <Stack
                            spacing={1}
                            sx={{ py: 1.25, borderBottom: '1px dashed', borderColor: 'divider' }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                Ảnh chứng từ thanh toán
                            </Typography>
                            <Button
                                size="small"
                                variant="outlined"
                                href={submission.actualReceivedEvidenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                Xem chứng từ
                            </Button>
                        </Stack>
                    )}
                    {submission.deliveryMode && (
                        <InfoRow
                            label="Hình thức giao"
                            value={submission.deliveryMode === 'RETAILER_DELIVERS' ? 'Đại lý mang nộp' : 'Nhà cung cấp đến lấy'}
                        />
                    )}
                </CardContent>
            </Card>

            <Card sx={{ width: '100%' }}>
                <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                        Danh sách vé ({lines.length})
                    </Typography>
                    {canEditLines && (
                        <EligibleTicketsPicker submissionId={id} />
                    )}
                    <Box sx={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f5f5f5' }}>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Nhà đài</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Serial</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Số vé</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Giải</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Tiền giải</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Thuế</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Sau thuế</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Trạng thái</th>
                                    {(isHandedOver || canEditLines) && (
                                        <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Hành động</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {lines.length === 0 ? (
                                    <tr>
                                        <td colSpan={isHandedOver || canEditLines ? 9 : 8} style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                                            Chưa có vé nào
                                        </td>
                                    </tr>
                                ) : (
                                    lines.map((line) => (
                                        <tr key={line.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '8px 12px' }}>
                                                {line.stationName ?? (line.stationId ? `Đài #${line.stationId}` : '—')}
                                            </td>
                                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.85em' }}>
                                                {line.serialNumber ?? 'Serial #' + line.serialId}
                                            </td>
                                            <td style={{ padding: '8px 12px' }}>{line.ticketNumbers ?? '—'}</td>
                                            <td style={{ padding: '8px 12px' }}>{line.prizeDisplayName ?? line.prizeCode ?? '—'}</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                                {formatPrizePayoutCurrency(line.grossPrizeAmount)}
                                            </td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                                {formatPrizePayoutCurrency(line.taxAmount)}
                                            </td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                                {formatPrizePayoutCurrency(
                                                    computeSupplierExpectedAmount(line.grossPrizeAmount, line.taxAmount),
                                                )}
                                            </td>
                                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                <Chip
                                                    label={LINE_STATUS_LABELS[line.lineStatus] ?? line.lineStatus}
                                                    color={getPrizeClaimLineStatusChipColor(line.lineStatus)}
                                                    size="small"
                                                />
                                            </td>
                                            {isHandedOver && (
                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                    {line.lineStatus === PrizeClaimSubmissionLineStatus.AWAITING_OUTCOME ? (
                                                        <Button
                                                            size="small"
                                                            color="primary"
                                                            variant="outlined"
                                                            onClick={() => openOutcomeDialog(line.id)}
                                                        >
                                                            Ghi nhận kết quả
                                                        </Button>
                                                    ) : line.outcomeEvidenceUrl ? (
                                                        <Button
                                                            size="small"
                                                            href={line.outcomeEvidenceUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            Xem chứng từ
                                                        </Button>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                            )}
                                            {canEditLines && (
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

            <Card sx={{ width: '100%' }}>
                <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Hành động</Typography>

                    {(isDraft || isInspecting) && (
                        <Stack spacing={2}>
                            <Alert severity="info">
                                {isDraft
                                    ? 'Chọn vé đã trả thưởng, bắt đầu kiểm tra và xác nhận danh sách trước khi bàn giao.'
                                    : 'Đang kiểm tra — xác nhận kiểm xong khi danh sách vé đã chính xác.'}
                            </Alert>
                            {isDraft && (
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    fullWidth
                                    onClick={handleStartInspection}
                                    disabled={startInspectionMutation.isPending || lines.length === 0}
                                >
                                    Bắt đầu kiểm tra
                                </Button>
                            )}
                            {(isDraft || isInspecting) && (
                                <FormControl>
                                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Hình thức giao nộp</Typography>
                                    <RadioGroup
                                        value={deliveryMode}
                                        onChange={(e) => setDeliveryMode(e.target.value as 'RETAILER_DELIVERS' | 'SUPPLIER_COLLECTS')}
                                    >
                                        <FormControlLabel value="RETAILER_DELIVERS" control={<Radio />} label="Đại lý mang nộp" />
                                        <FormControlLabel value="SUPPLIER_COLLECTS" control={<Radio />} label="Nhà cung cấp đến lấy" />
                                    </RadioGroup>
                                </FormControl>
                            )}
                            {(isDraft || isInspecting) && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    onClick={handleConfirmInspection}
                                    disabled={confirmInspectionMutation.isPending || lines.length === 0}
                                >
                                    Xác nhận kiểm tra xong
                                </Button>
                            )}
                            {canCancel && (
                                <Button
                                    variant="outlined"
                                    color="error"
                                    fullWidth
                                    onClick={() => setCancelOpen(true)}
                                >
                                    Hủy phiếu
                                </Button>
                            )}
                        </Stack>
                    )}

                    {isPendingHandover && (
                        <Stack spacing={2}>
                            <Alert severity="info">
                                Đã kiểm xong — tải ảnh bằng chứng bàn giao vật lý để xác nhận đã nộp cho Nhà cung cấp.
                            </Alert>
                            <TextField
                                label="Ghi chú bàn giao (tuỳ chọn)"
                                multiline
                                rows={2}
                                fullWidth
                                size="small"
                                value={handoverNote}
                                onChange={(e) => setHandoverNote(e.target.value)}
                            />
                            <Box>
                                <UploadSingleFile
                                    value={handoverEvidenceFile}
                                    onChange={(file) => {
                                        setHandoverEvidenceFile(file instanceof File ? file : null);
                                    }}
                                    label="Ảnh bằng chứng bàn giao"
                                    required
                                    useRawFile
                                    onUploadingChange={setIsHandoverUploading}
                                />
                                {!handoverEvidenceFile && !isHandoverUploading && (
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                                        Bắt buộc chọn ảnh bằng chứng trước khi xác nhận bàn giao.
                                    </Typography>
                                )}
                            </Box>
                            <Button
                                variant="contained"
                                color="success"
                                fullWidth
                                onClick={handleConfirmHandover}
                                disabled={confirmHandoverMutation.isPending || isHandoverUploading || !handoverEvidenceFile}
                                sx={{ fontWeight: 800 }}
                            >
                                Xác nhận bàn giao
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

                    {isHandedOver && (
                        <Alert severity={hasPendingOutcomes ? 'warning' : 'info'}>
                            {hasPendingOutcomes
                                ? `Còn ${pendingOutcomeCount} vé chưa ghi nhận kết quả. Vé được Nhà cung cấp nhận cần đính kèm ảnh chứng từ. Phiếu sẽ tự đóng khi tất cả vé đã có kết quả.`
                                : 'Ghi nhận kết quả từng vé sau khi Nhà cung cấp xử lý. Vé được nhận cần đính kèm ảnh chứng từ. Phiếu sẽ tự đóng khi tất cả vé đã có kết quả.'}
                        </Alert>
                    )}

                    {isClosed && (
                        <Alert severity="success">Phiếu đã đóng — tất cả vé đã có kết quả.</Alert>
                    )}

                    {isCancelled && (
                        <Alert severity="error">
                            Phiếu đã hủy{submission.cancelReason ? `: ${submission.cancelReason}` : '.'}
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <Dialog open={outcomeOpen} onClose={() => setOutcomeOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Ghi nhận kết quả vé</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Box>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Kết quả</Typography>
                            {Object.values(PrizeClaimLineOutcome).map((opt) => (
                                <Box key={opt} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <input
                                        type="radio"
                                        name="outcome"
                                        checked={outcome === opt}
                                        onChange={() => setOutcome(opt)}
                                    />
                                    <Typography variant="body2">{LINE_OUTCOME_LABELS[opt]}</Typography>
                                </Box>
                            ))}
                        </Box>
                        {outcome !== PrizeClaimLineOutcome.HANDED_OVER && (
                            <TextField
                                select
                                label="Lý do"
                                fullWidth
                                value={outcomeReason}
                                onChange={(e) => setOutcomeReason(e.target.value as PrizeClaimRejectionReason)}
                                SelectProps={{ native: true }}
                                required
                            >
                                {Object.values(PrizeClaimRejectionReason).map((r) => (
                                    <option key={r} value={r}>{REJECTION_REASON_LABELS[r]}</option>
                                ))}
                            </TextField>
                        )}
                        {outcome === PrizeClaimLineOutcome.HANDED_OVER && (
                            <UploadSingleFile
                                value={outcomeEvidenceFile}
                                onChange={(file) => {
                                    setOutcomeEvidenceFile(file instanceof File ? file : null);
                                }}
                                label="Ảnh chứng từ Nhà cung cấp đã xử lý"
                                required
                                useRawFile
                                onUploadingChange={setIsOutcomeUploading}
                            />
                        )}
                        <TextField
                            label="Ghi chú thêm"
                            multiline
                            rows={2}
                            fullWidth
                            value={outcomeNote}
                            onChange={(e) => setOutcomeNote(e.target.value)}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button variant="outlined" onClick={() => setOutcomeOpen(false)} sx={{ fontWeight: 700 }}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleRecordOutcome}
                        disabled={recordOutcomeMutation.isPending || isOutcomeUploading || !canConfirmOutcome}
                        sx={{ fontWeight: 800 }}
                    >
                        Xác nhận
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Hủy phiếu nộp</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Lý do hủy (tuỳ chọn)"
                            multiline
                            rows={2}
                            fullWidth
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setCancelOpen(false)}>Đóng</Button>
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
        </div>
    );
};
