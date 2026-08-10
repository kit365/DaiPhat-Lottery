"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import {
    Alert,
    Box,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { SpinnerLoading } from '../../../../../components/ui/SpinnerLoading';
import { CollapsibleCard } from '../../../../../components/ui/CollapsibleCard';
import { Button } from '../../../../../components/ui/Button';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { UploadSingleFile } from '../../../../../components/upload/UploadSingleFile';
import { uploadAdminImage } from '../../../../../api/upload.api';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import {
    useConfirmReturnHandover,
    useReturnBatchDetail,
    useStartReturnInspection,
} from '../../hooks/useReturnBatch';
import {
    canStartInspection,
    formatMinutesUntilCutoff,
    getReturnBatchLineStatusBadgeClass,
    getReturnBatchLineStatusLabel,
    getReturnBatchStatusChipColor,
    getReturnBatchStatusLabel,
} from '../../utils/returnBatchLabels';
import { RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE } from '../../types/returnBatch.type';
import { ReturnBatchTicketsModal } from '../sections/ReturnBatchTicketsModal';

const isPersistableEvidenceUrl = (url?: string | null): boolean => {
    const trimmed = (url || '').trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return false;
    return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('/');
};

export const ReturnBatchDetailPage = () => {
    const router = useAdminRouter();
    const { id } = useRouteParams();
    const { data: batch, isLoading, isError, refetch } = useReturnBatchDetail(id);
    const confirmHandover = useConfirmReturnHandover();
    const startInspection = useStartReturnInspection();
    const [ticketsModalOpen, setTicketsModalOpen] = useState(false);
    const [selectedStationName, setSelectedStationName] = useState<string | null>(null);
    const [handoverDialogOpen, setHandoverDialogOpen] = useState(false);
    const [handoverNote, setHandoverNote] = useState('');
    const [returnEvidenceUrl, setReturnEvidenceUrl] = useState('');
    const [isEvidenceUploading, setIsEvidenceUploading] = useState(false);
    const [evidenceUploadError, setEvidenceUploadError] = useState<string | null>(null);

    const clearHandoverForm = () => {
        setHandoverNote('');
        setReturnEvidenceUrl('');
        setIsEvidenceUploading(false);
        setEvidenceUploadError(null);
    };

    const closeHandoverDialog = () => {
        setHandoverDialogOpen(false);
        clearHandoverForm();
    };

    useEffect(() => {
        // Evidence/note are only for HANDED_OVER confirmation — clear if batch leaves PENDING_HANDOVER.
        if (batch?.status && batch.status !== 'PENDING_HANDOVER') {
            setHandoverDialogOpen(false);
            setHandoverNote('');
            setReturnEvidenceUrl('');
            setIsEvidenceUploading(false);
            setEvidenceUploadError(null);
        }
    }, [batch?.status]);

    if (isLoading) {
        return (
            <Box sx={{ width: '100%', pb: 5 }}>
                <PageHeader
                    title={`Phiếu trả vé #${id}`}
                    breadcrumbItems={[
                        { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                        { label: 'Trả vé NCC', to: ROUTES.ADMIN.RETURN_BATCH.LIST },
                        { label: `#${id}` },
                    ]}
                />
                <SpinnerLoading />
            </Box>
        );
    }

    if (isError || !batch) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <Typography color="text.secondary">Không tìm thấy phiếu trả vé.</Typography>
            </Box>
        );
    }

    const canConfirmHandover =
        isPersistableEvidenceUrl(returnEvidenceUrl) && !isEvidenceUploading && !confirmHandover.isPending;

    const handleOpenHandoverDialog = () => {
        if (batch.status !== 'PENDING_HANDOVER') {
            toast.error('Chỉ có thể bàn giao khi phiếu đang ở trạng thái chờ bàn giao.');
            return;
        }
        // Note is optional and starts empty — do not prefill seed/existing batch.note.
        clearHandoverForm();
        setHandoverDialogOpen(true);
    };

    const uploadHandoverEvidence = async (file: File): Promise<string> => {
        setEvidenceUploadError(null);
        try {
            // Prefer backend upload (Cloudinary server-side / local storage) — more reliable than
            // browser-direct Cloudinary when NEXT_PUBLIC_* presets are missing.
            const url = await uploadAdminImage(file);
            if (!isPersistableEvidenceUrl(url)) {
                throw new Error('Không nhận được URL ảnh hợp lệ từ Cloudinary.');
            }
            return url;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                'Tải ảnh bằng chứng thất bại. Vui lòng thử lại.';
            setEvidenceUploadError(message);
            setReturnEvidenceUrl('');
            throw new Error(message);
        }
    };

    const handleExecuteHandover = async () => {
        if (!isPersistableEvidenceUrl(returnEvidenceUrl)) {
            toast.error('Vui lòng tải lên ảnh bằng chứng trả vé trước khi xác nhận bàn giao.');
            return;
        }
        if (isEvidenceUploading) {
            toast.warning('Ảnh đang được tải lên. Vui lòng đợi hoàn tất.');
            return;
        }
        try {
            await confirmHandover.mutateAsync({
                id: batch.id,
                payload: {
                    returnReceiptUrl: batch.returnReceiptUrl || undefined,
                    returnEvidenceUrl: returnEvidenceUrl.trim(),
                    note: handoverNote.trim() || undefined,
                },
            });
            toast.success('Đã xác nhận bàn giao — sê-ri chuyển sang Đã trả.');
            closeHandoverDialog();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể xác nhận bàn giao.');
        }
    };

    const handleInspectTickets = async () => {
        if (batch.inspectionExpired || batch.status === 'CANCELLED') {
            router.push(ROUTES.ADMIN.RETURN_BATCH.INSPECT(batch.id));
            return;
        }
        if (canStartInspection(batch.status)) {
            try {
                await startInspection.mutateAsync(batch.id);
            } catch (err: any) {
                const message = err?.response?.data?.message || 'Không thể bắt đầu kiểm tra vé.';
                if (
                    message === RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE ||
                    err?.response?.data?.errorCode === 'LT_120'
                ) {
                    await Swal.fire({
                        icon: 'warning',
                        title: 'Inspection period expired',
                        text: RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE,
                        confirmButtonColor: '#1C252E',
                    });
                    refetch();
                    return;
                }
                toast.error(message);
                return;
            }
        }
        router.push(ROUTES.ADMIN.RETURN_BATCH.INSPECT(batch.id));
    };

    return (
        <Box sx={{ width: '100%', pb: 5 }}>
            {/* Page Header */}
            <PageHeader
                title={`Phiếu trả vé ${batch.batchCode?.trim() || `#${batch.id}`}`}
                breadcrumbItems={[
                    { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                    { label: 'Trả vé NCC', to: ROUTES.ADMIN.RETURN_BATCH.LIST },
                    { label: batch.batchCode?.trim() || `#${batch.id}` },
                ]}
                titleExtra={
                    <Chip
                        size="small"
                        label={getReturnBatchStatusLabel(batch.status, batch.statusLabel)}
                        color={getReturnBatchStatusChipColor(batch.status)}
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                    />
                }
                action={
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    {(batch.status === 'PENDING_INSPECTION' || batch.status === 'INSPECTING') && !batch.inspectionExpired && (
                        <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                            <Button
                                label={batch.status === 'INSPECTING' ? 'Kiểm tra vé (Tiếp tục)' : 'Kiểm tra vé'}
                                className="btn-primary-admin"
                                loading={startInspection.isPending}
                                onClick={handleInspectTickets}
                            />
                        </CanAccess>
                    )}
                    {batch.status === 'PENDING_HANDOVER' && (
                        <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                            <Button
                                label="Xác nhận bàn giao"
                                className="btn-primary-admin"
                                loading={confirmHandover.isPending}
                                onClick={handleOpenHandoverDialog}
                            />
                        </CanAccess>
                    )}
                </Stack>
                }
            />

            {/* System Status Alerts */}
            {batch.status === 'CANCELLED' && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>
                    Phiếu trả vé đã bị hủy
                    {batch.cancelReason ? `: ${batch.cancelReason}` : '.'}
                    {batch.cancelledAt
                        ? ` (${dayjs(batch.cancelledAt).format('DD/MM/YYYY HH:mm')})`
                        : ''}
                </Alert>
            )}

            {batch.urgentReminder && !batch.inspectionExpired && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>
                    Nhắc khẩn: còn {formatMinutesUntilCutoff(batch.minutesUntilCutoff)} đến hạn trả NCC (
                    {batch.returnCutOffTime || '—'}). Vui lòng hoàn tất kiểm tra ngay.
                </Alert>
            )}

            {batch.inInspectionWindow && !batch.urgentReminder && !batch.inspectionExpired && (
                <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '12px' }}>
                    Cửa sổ kiểm tra đã mở — còn {formatMinutesUntilCutoff(batch.minutesUntilCutoff)} đến hạn
                    trả ({batch.returnCutOffTime || '—'}). Vui lòng bắt đầu kiểm tra vé ngay.
                </Alert>
            )}

            {batch.supplierSettlementId && (
                <Alert severity="info" sx={{ mb: 2.5, borderRadius: '12px' }}>
                    Liên kết đối soát #{batch.supplierSettlementId}. Giá trị trả của kỳ đối soát được
                    cập nhật khi vé đã kiểm tra và sẵn sàng trả NCC (chờ trả / đã trả).
                </Alert>
            )}

            {batch.status === 'PENDING_HANDOVER' && (
                <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '12px' }}>
                    Kiểm tra đã hoàn tất — vé đang chờ bàn giao nhà cung cấp. Sau khi giao xong, bấm{' '}
                    <strong>Xác nhận bàn giao</strong>.
                </Alert>
            )}

            {/* Main Content Layout */}
            <Stack spacing={3}>
                {/* Thông tin phiếu Card */}
                <CollapsibleCard title="Thông tin phiếu" expanded onToggle={() => undefined}>
                    <Box sx={{ p: 3 }}>
                        {/* 4 Financial / Summary Box Row */}
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                                gap: 2,
                                mb: 3,
                            }}
                        >
                            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                    Nhà cung cấp
                                </Typography>
                                <Typography variant="body1" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                                    {batch.supplierName || '—'}
                                </Typography>
                                {batch.supplierCode && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                        {batch.supplierCode}
                                    </Typography>
                                )}
                            </Box>

                            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                    Ngày quay
                                </Typography>
                                <Typography variant="body1" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                                    {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                                </Typography>
                            </Box>

                            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                    Tổng số lượng vé
                                </Typography>
                                <Typography variant="body1" fontWeight={800} color="#0284c7" sx={{ mt: 0.5 }}>
                                    {new Intl.NumberFormat('vi-VN').format(batch.totalQuantity ?? 0)} vé
                                </Typography>
                            </Box>

                            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                <Typography variant="caption" color="#166534" fontWeight={700} display="block">
                                    Tổng giá trị trả
                                </Typography>
                                <Typography variant="body1" fontWeight={800} color="#15803d" sx={{ mt: 0.5 }}>
                                    {formatImportCost(batch.totalReturnValue)} VNĐ
                                </Typography>
                            </Box>
                        </Box>

                        {/* Metadata Rows */}
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                                gap: 2,
                            }}
                        >
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>Ghi chú</Typography>
                                <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {batch.note || '—'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>Biên nhận trả</Typography>
                                <Typography variant="body2" sx={{ mt: 0.25 }}>
                                    {batch.returnReceiptUrl ? (
                                        <a href={batch.returnReceiptUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>
                                            Xem biên nhận
                                        </a>
                                    ) : (
                                        '—'
                                    )}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>Giao trả lúc</Typography>
                                <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {batch.returnedAt
                                        ? dayjs(batch.returnedAt).format('DD/MM/YYYY HH:mm')
                                        : '—'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>Xác nhận lúc</Typography>
                                <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {batch.confirmedAt
                                        ? dayjs(batch.confirmedAt).format('DD/MM/YYYY HH:mm')
                                        : '—'}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </CollapsibleCard>

                {/* Dòng theo nhà đài Table - Exact Columns requested: STT, Tên nhà đài, Số lượng, Giá trị trả, Trạng thái */}
                <CollapsibleCard
                    title="Dòng theo nhà đài"
                    expanded
                    onToggle={() => undefined}
                    extraAction={
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<VisibilityIcon fontSize="small" />}
                            onClick={() => {
                                setSelectedStationName(null);
                                setTicketsModalOpen(true);
                            }}
                            sx={{
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.825rem',
                                color: '#0f172a',
                                borderColor: '#cbd5e1',
                                bgcolor: '#fff',
                                boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)',
                                px: 1.75,
                                py: 0.5,
                                '&:hover': {
                                    borderColor: '#94a3b8',
                                    bgcolor: '#f8fafc',
                                },
                            }}
                        >
                            Xem danh sách vé
                        </Button>
                    }
                >
                    <TableContainer sx={{ px: 1, pb: 2 }}>
                        <Table size="medium">
                            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                <TableRow>
                                    <TableCell align="center" width={60} sx={{ fontWeight: 700, color: '#334155' }}>
                                        STT
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#334155' }}>
                                        Tên nhà đài
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#334155' }}>
                                        Số lượng
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#166534' }}>
                                        Giá trị trả
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: '#334155' }}>
                                        Trạng thái
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(batch.lines || []).map((line, index) => (
                                    <TableRow key={line.id} hover>
                                        <TableCell align="center" sx={{ fontWeight: 700, color: '#64748b' }}>
                                            {index + 1}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                                            {line.lotteryStationName || `#${line.lotteryStationId}`}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#0284c7' }}>
                                            {new Intl.NumberFormat('vi-VN').format(line.totalQuantity ?? 0)} vé
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800, color: '#15803d' }}>
                                            {formatImportCost(line.totalReturnValue)} VNĐ
                                        </TableCell>
                                        <TableCell align="center">
                                            <span
                                                className={`admin-status-badge ${getReturnBatchLineStatusBadgeClass(line.status)}`}
                                            >
                                                {getReturnBatchLineStatusLabel(line.status, line.statusLabel)}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(batch.lines || []).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            <Typography color="text.secondary" sx={{ py: 3 }}>
                                                Chưa có dòng trả vé.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CollapsibleCard>
            </Stack>

            <ReturnBatchTicketsModal
                open={ticketsModalOpen}
                batchId={batch.id}
                initialStationName={selectedStationName}
                onClose={() => setTicketsModalOpen(false)}
            />

            {/* returnEvidenceUrl + note only for confirming Đã bàn giao vé */}
            <Dialog
                open={handoverDialogOpen && batch.status === 'PENDING_HANDOVER'}
                onClose={closeHandoverDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: '16px' } }}
            >
                <DialogTitle sx={{ fontWeight: 800, pr: 6 }}>
                    Xác nhận bàn giao phiếu trả vé #{batch.id}
                    <IconButton
                        onClick={closeHandoverDialog}
                        sx={{ position: 'absolute', right: 12, top: 12 }}
                        size="small"
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2.5}>
                        <Typography variant="body2" color="text.secondary">
                            Bạn có chắc chắn muốn xác nhận bàn giao{' '}
                            <strong>{batch.totalQuantity ?? 0} vé</strong> trả cho nhà cung cấp{' '}
                            <strong>{batch.supplierName || ''}</strong> không?
                        </Typography>

                        <Box
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                bgcolor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                            }}
                        >
                            <Stack spacing={1}>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Nhà cung cấp</Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                        {batch.supplierName || '—'}
                                        {batch.supplierCode ? ` (${batch.supplierCode})` : ''}
                                    </Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Ngày quay</Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                        {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                                    </Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Tổng số lượng</Typography>
                                    <Typography variant="body2" fontWeight={700} color="#0284C7">
                                        {batch.totalQuantity ?? 0} vé
                                    </Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Tổng giá trị trả</Typography>
                                    <Typography variant="body2" fontWeight={700} color="#15803D">
                                        {formatImportCost(batch.totalReturnValue)} VNĐ
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>

                        {(batch.lines || []).length > 0 && (
                            <TableContainer sx={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                                            <TableCell sx={{ fontWeight: 700 }}>Nhà đài</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>Số lượng</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>Giá trị trả</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(batch.lines || []).map((line) => (
                                            <TableRow key={line.id}>
                                                <TableCell sx={{ fontWeight: 600 }}>
                                                    {line.lotteryStationName || `#${line.lotteryStationId}`}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: '#0284C7', fontWeight: 700 }}>
                                                    {line.totalQuantity ?? 0} vé
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: '#15803D', fontWeight: 700 }}>
                                                    {formatImportCost(line.totalReturnValue)} VNĐ
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        <TextField
                            label="Ghi chú bàn giao (không bắt buộc)"
                            placeholder="Nhập ghi chú bàn giao (nếu có)..."
                            value={handoverNote}
                            onChange={(e) => setHandoverNote(e.target.value)}
                            multiline
                            rows={2}
                            fullWidth
                            size="small"
                        />

                        <Box>
                            <Typography variant="body2" fontWeight={600} color="#334155" sx={{ mb: 1 }}>
                                Bằng chứng trả vé (Hình ảnh / Biên nhận){' '}
                                <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                            </Typography>
                            <UploadSingleFile
                                value={returnEvidenceUrl}
                                onChange={(url) => {
                                    const next = typeof url === 'string' ? url : '';
                                    setReturnEvidenceUrl(next);
                                    if (isPersistableEvidenceUrl(next)) {
                                        setEvidenceUploadError(null);
                                    }
                                }}
                                label="Tải lên ảnh bằng chứng trả vé"
                                autoUpload
                                required
                                customUpload={uploadHandoverEvidence}
                                onUploadingChange={setIsEvidenceUploading}
                                error={evidenceUploadError || undefined}
                            />
                            {!returnEvidenceUrl && !isEvidenceUploading && !evidenceUploadError && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                                    Bắt buộc tải ảnh bằng chứng thành công trước khi xác nhận bàn giao.
                                </Typography>
                            )}
                            {evidenceUploadError && (
                                <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block' }}>
                                    Tải ảnh thất bại. Vui lòng chọn lại ảnh để thử lại.
                                </Typography>
                            )}
                        </Box>

                        <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                            <strong>Lưu ý:</strong> Sau khi bàn giao, toàn bộ vé trong phiếu sẽ chuyển sang trạng thái{' '}
                            <strong>Đã trả</strong>.
                        </Alert>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, py: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={closeHandoverDialog}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        variant="contained"
                        loading={confirmHandover.isPending || isEvidenceUploading}
                        disabled={!canConfirmHandover}
                        onClick={() => void handleExecuteHandover()}
                        label="Xác nhận bàn giao"
                        sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#0F172A' }}
                    />
                </DialogActions>
            </Dialog>
        </Box>
    );
};
