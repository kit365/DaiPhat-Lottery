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
    Paper,
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
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { SpinnerLoading } from '../../../../../components/ui/SpinnerLoading';
import { CollapsibleCard } from '../../../../../components/ui/CollapsibleCard';
import { Button } from '../../../../../components/ui/Button';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { UploadSingleFile } from '../../../../../components/upload/UploadSingleFile';
import { uploadAdminImage } from '@/admin/shared/services/upload.service';
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
    formatReturnBatchCancelReason,
    getReturnBatchCancelledAlertMessage,
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

const getReturnBatchTypeLabel = (type?: string | null): string => {
    if (type === 'STREET_AGENT_RETURN') return 'Trả vé đại lý đường phố';
    if (type === 'SUPPLIER_RETURN') return 'Trả vé nhà cung cấp';
    return type || '—';
};

const getDeliveryModeLabel = (mode?: string | null, label?: string | null): string => {
    if (label) return label;
    if (mode === 'RETAILER_DELIVERS') return 'Đại lý giao trả';
    if (mode === 'SUPPLIER_COLLECTS') return 'NCC đến lấy';
    return '—';
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
    const [returnEvidenceFile, setReturnEvidenceFile] = useState<File | null>(null);
    const [isEvidenceUploading, setIsEvidenceUploading] = useState(false);
    const [evidenceUploadError, setEvidenceUploadError] = useState<string | null>(null);

    const clearHandoverForm = () => {
        setHandoverNote('');
        setReturnEvidenceFile(null);
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
            setReturnEvidenceFile(null);
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
        returnEvidenceFile != null && !isEvidenceUploading && !confirmHandover.isPending;
    const remainingInspectable = batch.remainingInspectableQuantity ?? 0;
    const inspectedQuantity = Math.max(0, (batch.totalQuantity ?? 0) - remainingInspectable);
    const showInspectButton =
        !batch.inspectionExpired &&
        batch.status !== 'CANCELLED' &&
        (batch.status === 'PENDING_INSPECTION' ||
            batch.status === 'INSPECTING' ||
            (batch.status === 'PENDING_HANDOVER' && remainingInspectable > 0));
    const canInspectTickets = showInspectButton && Boolean(batch.inInspectionWindow);
    const inspectionLockedBeforeWindow =
        showInspectButton && !batch.inInspectionWindow && !batch.inspectionExpired;
    const inspectionWindowStartLabel = batch.inspectionWindowStartAt
        ? dayjs(batch.inspectionWindowStartAt).format('HH:mm · DD/MM/YYYY')
        : null;
    const returnCutOffLabel = batch.returnCutOffAt
        ? dayjs(batch.returnCutOffAt).format('HH:mm · DD/MM/YYYY')
        : batch.returnCutOffTime || null;

    const handleOpenHandoverDialog = () => {
        if (batch.status !== 'PENDING_HANDOVER') {
            toast.error('Chỉ có thể bàn giao khi phiếu đang ở trạng thái chờ bàn giao.');
            return;
        }
        // Note is optional and starts empty — do not prefill seed/existing batch.note.
        clearHandoverForm();
        setHandoverDialogOpen(true);
    };

    const handleExecuteHandover = async () => {
        if (!returnEvidenceFile) {
            toast.error('Vui lòng tải lên ảnh bằng chứng trả vé trước khi xác nhận bàn giao.');
            return;
        }
        if (isEvidenceUploading) {
            toast.warning('Ảnh đang được tải lên. Vui lòng đợi hoàn tất.');
            return;
        }
        try {
            setIsEvidenceUploading(true);
            setEvidenceUploadError(null);
            const uploadedUrl = await uploadAdminImage(returnEvidenceFile);
            if (!uploadedUrl) {
                throw new Error('Không nhận được URL ảnh hợp lệ.');
            }

            await confirmHandover.mutateAsync({
                id: batch.id,
                payload: {
                    returnReceiptUrl: batch.returnReceiptUrl || undefined,
                    returnEvidenceUrl: uploadedUrl,
                    note: handoverNote.trim() || undefined,
                },
            });
            toast.success('Đã xác nhận bàn giao — sê-ri chuyển sang Đã trả.');
            closeHandoverDialog();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Không thể xác nhận bàn giao hoặc lỗi tải ảnh.';
            setEvidenceUploadError(message);
            toast.error(message);
        } finally {
            setIsEvidenceUploading(false);
        }
    };

    const handleInspectTickets = async () => {
        if (batch.inspectionExpired || batch.status === 'CANCELLED') {
            toast.warning('Đã quá hạn trả vé. Chỉ có thể xem chi tiết phiếu trả, không thể kiểm tra.');
            return;
        }
        if (!batch.inInspectionWindow) {
            const startLabel = batch.inspectionWindowStartAt
                ? dayjs(batch.inspectionWindowStartAt).format('HH:mm DD/MM/YYYY')
                : 'mốc thời gian đệm trả vé';
            toast.warning(`Chưa đến giờ chuẩn bị/kiểm tra vé trả (mở từ ${startLabel}).`);
            return;
        }
        if (
            canStartInspection(batch.status) ||
            (batch.status === 'PENDING_HANDOVER' && remainingInspectable > 0)
        ) {
            try {
                await startInspection.mutateAsync(batch.id);
            } catch (err: any) {
                const message = err?.response?.data?.message || 'Không thể bắt đầu kiểm tra vé.';
                if (
                    message === RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE ||
                    err?.response?.data?.errorCode === 'LT_120'
                ) {
                    const { default: Swal } = await import('sweetalert2');
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
                    {showInspectButton && (
                        <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                            <Button
                                label={
                                    batch.status === 'INSPECTING' || remainingInspectable > 0
                                        ? 'Tiến hành kiểm tra (Tiếp tục)'
                                        : 'Tiến hành kiểm tra'
                                }
                                className="btn-primary-admin"
                                loading={startInspection.isPending}
                                disabled={!canInspectTickets}
                                onClick={handleInspectTickets}
                                sx={
                                    !canInspectTickets
                                        ? {
                                              opacity: 0.55,
                                              cursor: 'not-allowed',
                                              '&.Mui-disabled': {
                                                  bgcolor: '#cbd5e1',
                                                  color: '#64748b',
                                              },
                                          }
                                        : undefined
                                }
                            />
                        </CanAccess>
                    )}
                    {batch.status === 'PENDING_HANDOVER' && remainingInspectable === 0 && !batch.inspectionExpired && (
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
            {batch.status === 'CANCELLED' && (() => {
                const alertInfo = getReturnBatchCancelledAlertMessage(batch.cancelReason);
                return (
                    <Paper
                        elevation={0}
                        sx={{
                            mb: 2.5,
                            p: { xs: 1.75, sm: 2 },
                            borderRadius: '14px',
                            border: '1px solid #fecaca',
                            bgcolor: '#fef2f2',
                            background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)',
                            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.04)',
                            display: 'flex',
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            justifyContent: 'space-between',
                            flexWrap: { xs: 'wrap', md: 'nowrap' },
                            gap: 2,
                        }}
                    >
                        <Stack direction="row" spacing={1.75} alignItems="flex-start" sx={{ flex: 1 }}>
                            <Box
                                sx={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: '10px',
                                    bgcolor: '#fee2e2',
                                    color: '#dc2626',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    boxShadow: '0 1px 3px rgba(220, 38, 38, 0.1)',
                                }}
                            >
                                <CancelOutlinedIcon sx={{ fontSize: '1.35rem' }} />
                            </Box>

                            <Box sx={{ flex: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                                    <Typography variant="subtitle2" fontWeight={800} color="#991b1b" sx={{ fontSize: '0.925rem' }}>
                                        {alertInfo.title}
                                    </Typography>
                                    {batch.cancelledAt && (
                                        <Chip
                                            label={`Thời gian hủy: ${dayjs(batch.cancelledAt).format('HH:mm DD/MM/YYYY')}`}
                                            size="small"
                                            sx={{
                                                height: 22,
                                                fontSize: '0.725rem',
                                                fontWeight: 700,
                                                bgcolor: '#ffffff',
                                                color: '#b91c1c',
                                                border: '1px solid #fca5a5',
                                            }}
                                        />
                                    )}
                                </Stack>
                                <Typography variant="body2" color="#7f1d1d" sx={{ fontSize: '0.835rem', lineHeight: 1.5 }}>
                                    {alertInfo.description}
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>
                );
            })()}

            {batch.inspectionExpired && batch.status !== 'CANCELLED' && (
                <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '12px' }}>
                    Đã quá hạn trả vé NCC. Phiếu này chỉ xem chi tiết — không thể tiếp tục kiểm tra / thao tác kiểm đếm.
                </Alert>
            )}

            {inspectionLockedBeforeWindow && (
                <Paper
                    elevation={0}
                    sx={{
                        mb: 2.5,
                        p: { xs: 1.75, sm: 2 },
                        borderRadius: '14px',
                        border: '1px solid #bfdbfe',
                        bgcolor: '#f0f7ff',
                        background: 'linear-gradient(135deg, #f0f7ff 0%, #f8fafc 100%)',
                        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.04)',
                        display: 'flex',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        justifyContent: 'space-between',
                        flexWrap: { xs: 'wrap', md: 'nowrap' },
                        gap: 2,
                    }}
                >
                    <Stack direction="row" spacing={1.75} alignItems="flex-start" sx={{ flex: 1 }}>
                        <Box
                            sx={{
                                width: 42,
                                height: 42,
                                borderRadius: '10px',
                                bgcolor: '#dbeafe',
                                color: '#1d4ed8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.1)',
                            }}
                        >
                            <AccessTimeOutlinedIcon sx={{ fontSize: '1.35rem' }} />
                        </Box>

                        <Box sx={{ flex: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.925rem' }}>
                                    Chưa đến giờ chuẩn bị / kiểm tra vé trả
                                </Typography>
                                {inspectionWindowStartLabel && (
                                    <Chip
                                        size="small"
                                        icon={<AccessTimeOutlinedIcon sx={{ fontSize: '0.85rem !important', color: '#1d4ed8' }} />}
                                        label={`Mở lúc: ${inspectionWindowStartLabel}`}
                                        sx={{
                                            bgcolor: '#dbeafe',
                                            color: '#1e40af',
                                            fontWeight: 700,
                                            fontSize: '0.725rem',
                                            border: '1px solid #bfdbfe',
                                            height: 24,
                                        }}
                                    />
                                )}
                            </Stack>

                            <Typography variant="body2" color="#475569" sx={{ fontSize: '0.825rem', lineHeight: 1.5 }}>
                                {batch.returnBufferMinutes === 0
                                    ? 'Thời gian đệm trả vé = 0 nên cửa sổ kiểm tra mở từ đầu ngày quay đến trước hạn trả NCC. Hệ thống sẽ kích hoạt nút kiểm tra khi đến khung giờ cho phép.'
                                    : 'Hệ thống đang chờ đến mốc thời gian đệm trả vé. Nút "Tiến hành kiểm tra" tạm khóa và sẽ được mở khi đến giờ chuẩn bị / kiểm tra vé trả.'}
                            </Typography>
                        </Box>
                    </Stack>

                    <Box sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, flexShrink: 0 }}>
                        <Chip
                            size="small"
                            icon={<LockOutlinedIcon sx={{ fontSize: '0.85rem !important', color: '#64748b' }} />}
                            label="Tạm khóa kiểm tra"
                            sx={{
                                bgcolor: '#ffffff',
                                color: '#475569',
                                fontWeight: 700,
                                fontSize: '0.725rem',
                                border: '1px solid #cbd5e1',
                                height: 26,
                            }}
                        />
                    </Box>
                </Paper>
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

            {batch.status === 'PENDING_HANDOVER' && remainingInspectable > 0 && (
                <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '12px' }}>
                    Còn {new Intl.NumberFormat('vi-VN').format(remainingInspectable)} vé ế chưa kiểm tra.
                    Bấm <strong>Tiến hành kiểm tra</strong> để tiếp tục trước khi bàn giao nhà cung cấp.
                </Alert>
            )}

            {batch.status === 'PENDING_HANDOVER' && remainingInspectable === 0 && (
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
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    sm: 'repeat(2, 1fr)',
                                    md: 'repeat(3, 1fr)',
                                    lg: 'repeat(6, 1fr)',
                                },
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

                            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                <Typography variant="caption" color="#1d4ed8" fontWeight={700} display="block">
                                    Đã kiểm tra
                                </Typography>
                                <Typography variant="body1" fontWeight={800} color="#1e40af" sx={{ mt: 0.5 }}>
                                    {new Intl.NumberFormat('vi-VN').format(inspectedQuantity)} vé
                                </Typography>
                            </Box>

                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: '12px',
                                    bgcolor: remainingInspectable > 0 ? '#fff7ed' : '#f8fafc',
                                    border: remainingInspectable > 0 ? '1px solid #fdba74' : '1px solid #f1f5f9',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    color={remainingInspectable > 0 ? '#c2410c' : 'text.secondary'}
                                    fontWeight={700}
                                    display="block"
                                >
                                    Vé ế còn lại
                                </Typography>
                                <Typography
                                    variant="body1"
                                    fontWeight={800}
                                    color={remainingInspectable > 0 ? '#c2410c' : '#0f172a'}
                                    sx={{ mt: 0.5 }}
                                >
                                    {new Intl.NumberFormat('vi-VN').format(remainingInspectable)} vé
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

                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
                                gap: 2,
                                mb: 2.5,
                            }}
                        >
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    Loại phiếu
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {getReturnBatchTypeLabel(batch.returnBatchType)}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    Hình thức giao trả
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {getDeliveryModeLabel(batch.deliveryMode, batch.deliveryModeLabel)}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    Hạn trả NCC
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {returnCutOffLabel || '—'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    Mở cửa sổ kiểm tra
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {inspectionWindowStartLabel || '—'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    Thời gian đệm
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {batch.returnBufferMinutes != null
                                        ? `${batch.returnBufferMinutes} phút`
                                        : '—'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    Nhắc trước hạn
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {batch.returnReminderMinutes != null
                                        ? `${batch.returnReminderMinutes} phút`
                                        : '—'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    Phiếu phân bổ nguồn
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {batch.sourceAllocationBatchId != null
                                        ? `#${batch.sourceAllocationBatchId}`
                                        : '—'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    Ghi chú
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {batch.note || '—'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    Biên nhận trả
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.25 }}>
                                    {batch.returnReceiptUrl ? (
                                        <a
                                            href={batch.returnReceiptUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ color: '#2563eb', fontWeight: 600 }}
                                        >
                                            Xem biên nhận
                                        </a>
                                    ) : (
                                        '—'
                                    )}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    Bằng chứng bàn giao
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.25 }}>
                                    {batch.returnEvidenceUrl ? (
                                        <a
                                            href={batch.returnEvidenceUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ color: '#2563eb', fontWeight: 600 }}
                                        >
                                            Xem ảnh bằng chứng
                                        </a>
                                    ) : (
                                        '—'
                                    )}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    Giao trả lúc
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {batch.returnedAt
                                        ? dayjs(batch.returnedAt).format('DD/MM/YYYY HH:mm')
                                        : '—'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    Xác nhận lúc
                                </Typography>
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
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1d4ed8' }}>
                                        Đã kiểm tra
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#c2410c' }}>
                                        Vé ế còn lại
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#334155' }}>
                                        Sê-ri gắn
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
                                {(batch.lines || []).map((line, index) => {
                                    const lineRemaining = line.remainingInspectableQuantity ?? 0;
                                    const lineInspected = Math.max(0, (line.totalQuantity ?? 0) - lineRemaining);
                                    return (
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
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#1e40af' }}>
                                            {new Intl.NumberFormat('vi-VN').format(lineInspected)} vé
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{
                                                fontWeight: 800,
                                                color: lineRemaining > 0 ? '#c2410c' : '#64748b',
                                            }}
                                        >
                                            {new Intl.NumberFormat('vi-VN').format(lineRemaining)} vé
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>
                                            {new Intl.NumberFormat('vi-VN').format(line.attachedSerialCount ?? 0)}
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
                                    );
                                })}
                                {(batch.lines || []).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">
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
                                value={returnEvidenceFile}
                                onChange={(file) => {
                                    setReturnEvidenceFile(file instanceof File ? file : null);
                                    setEvidenceUploadError(null);
                                }}
                                label="Tải lên ảnh bằng chứng trả vé"
                                required
                                useRawFile
                                onUploadingChange={setIsEvidenceUploading}
                                error={evidenceUploadError || undefined}
                            />
                            {!returnEvidenceFile && !isEvidenceUploading && !evidenceUploadError && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                                    Bắt buộc chọn ảnh bằng chứng trước khi xác nhận bàn giao.
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
