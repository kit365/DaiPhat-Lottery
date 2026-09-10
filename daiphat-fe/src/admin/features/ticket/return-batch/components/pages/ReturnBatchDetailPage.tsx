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
    Tooltip,
    Typography,
} from '@mui/material';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
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
import { axiosRequestErrorMessage } from '@/api/requestError';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { AdminKpiCard, AdminKpiCardsGrid } from '@/admin/components/ui/AdminKpiCard';
import { formatKpiAmount } from '@/admin/utils/currency';
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
    getReturnBatchLineStatusColorTheme,
    getReturnBatchLineStatusLabel,
    getReturnBatchStatusBadgeClass,
    getReturnBatchStatusChipColor,
    getReturnBatchStatusColorTheme,
    getReturnBatchStatusLabel,
} from '../../utils/returnBatchLabels';
import { RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE } from '../../types/returnBatch.type';
import { ReturnBatchTicketsModal } from '../sections/ReturnBatchTicketsModal';

const InfoItem = ({
    label,
    value,
    highlight,
}: {
    label: string;
    value: React.ReactNode;
    highlight?: string;
}) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.75rem' }}>
            {label}
        </Typography>
        <Typography
            component="div"
            variant="body2"
            sx={{
                fontWeight: 700,
                color: highlight || '#0f172a',
                fontSize: '0.85rem',
                lineHeight: 1.4,
                wordBreak: 'break-word',
            }}
        >
            {value}
        </Typography>
    </Box>
);

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
        } catch (err: unknown) {
            const message = axiosRequestErrorMessage(
                err,
                'Không thể xác nhận bàn giao hoặc lỗi tải ảnh.',
                'Bàn giao phiếu trả đang xử lý lâu hơn dự kiến. Kiểm tra trạng thái phiếu trước khi bấm lại, tránh bàn giao trùng.'
            );
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
                    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                        <span className={`admin-status-badge ${getReturnBatchStatusBadgeClass(batch.status)}`}>
                            {getReturnBatchStatusLabel(batch.status, batch.statusLabel)}
                        </span>
                    </Box>
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

            {/* KPI Cards Overview - Consistent with ReturnBatchListPage */}
            <AdminKpiCardsGrid columns={{ xs: 1, sm: 2, md: 3, lg: 6, xl: 6 }}>
                <AdminKpiCard
                    label="Nhà cung cấp"
                    value={batch.supplierName || '—'}
                    valueTitle={batch.supplierCode ? `Mã NCC: ${batch.supplierCode}` : undefined}
                    icon={<StorefrontOutlinedIcon fontSize="small" />}
                    tone="blue"
                    valueSize="compact"
                />
                <AdminKpiCard
                    label="Ngày quay"
                    value={batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                    icon={<CalendarTodayOutlinedIcon fontSize="small" />}
                    tone="cyan"
                />
                <AdminKpiCard
                    label="Tổng số lượng vé"
                    value={`${new Intl.NumberFormat('vi-VN').format(batch.totalQuantity ?? 0)} vé`}
                    icon={<ConfirmationNumberOutlinedIcon fontSize="small" />}
                    tone="blue"
                />
                <AdminKpiCard
                    label="Đã kiểm tra"
                    value={`${new Intl.NumberFormat('vi-VN').format(inspectedQuantity)} vé`}
                    icon={<CheckCircleOutlinedIcon fontSize="small" />}
                    tone="green"
                />
                <AdminKpiCard
                    label="Vé ế còn lại"
                    value={`${new Intl.NumberFormat('vi-VN').format(remainingInspectable)} vé`}
                    icon={<HourglassEmptyOutlinedIcon fontSize="small" />}
                    tone={remainingInspectable > 0 ? 'amber' : 'slate'}
                />
                <AdminKpiCard
                    label="Trị giá trả vé"
                    value={formatKpiAmount(batch.totalReturnValue || 0)}
                    valueTitle={`${formatImportCost(batch.totalReturnValue)} VNĐ`}
                    icon={<PaymentsOutlinedIcon fontSize="small" />}
                    tone="green"
                    accent
                    valueSize="compact"
                />
            </AdminKpiCardsGrid>

            {/* Main Content Layout */}
            <Stack spacing={3}>
                {/* Thông tin phiếu Card */}
                <CollapsibleCard title="Thông tin phiếu" expanded onToggle={() => undefined}>
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                                gap: 2.5,
                            }}
                        >
                            {/* Panel 1: Thiết lập & Khung giờ kiểm tra */}
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2.5,
                                    borderRadius: '12px',
                                    bgcolor: '#ffffff',
                                    borderColor: '#e2e8f0',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        mb: 2.5,
                                        pb: 1.5,
                                        borderBottom: '1px solid #f1f5f9',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '8px',
                                            bgcolor: 'rgba(59, 130, 246, 0.1)',
                                            color: '#2563eb',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <ScheduleOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                                    </Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>
                                        Thiết lập & Khung giờ kiểm tra
                                    </Typography>
                                </Box>

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                                        gap: 2.25,
                                    }}
                                >
                                    <InfoItem
                                        label="Loại phiếu"
                                        value={getReturnBatchTypeLabel(batch.returnBatchType)}
                                    />
                                    <InfoItem
                                        label="Hình thức giao trả"
                                        value={getDeliveryModeLabel(batch.deliveryMode, batch.deliveryModeLabel)}
                                    />
                                    <InfoItem
                                        label="Hạn trả NCC (Cut-off)"
                                        value={
                                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                                <span>{returnCutOffLabel || '—'}</span>
                                                {batch.returnCutOffTime && (
                                                    <Chip
                                                        size="small"
                                                        label={batch.returnCutOffTime}
                                                        sx={{
                                                            height: 20,
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            bgcolor: '#f1f5f9',
                                                            color: '#475569',
                                                        }}
                                                    />
                                                )}
                                            </Stack>
                                        }
                                        highlight={batch.inspectionExpired ? '#dc2626' : undefined}
                                    />
                                    <InfoItem
                                        label="Mở cửa sổ kiểm tra"
                                        value={inspectionWindowStartLabel || '—'}
                                        highlight={batch.inInspectionWindow ? '#2563eb' : undefined}
                                    />
                                    <InfoItem
                                        label="Thời gian đệm trả vé"
                                        value={
                                            batch.returnBufferMinutes != null
                                                ? `${batch.returnBufferMinutes} phút`
                                                : '—'
                                        }
                                    />
                                    <InfoItem
                                        label="Nhắc trước hạn"
                                        value={
                                            batch.returnReminderMinutes != null
                                                ? `${batch.returnReminderMinutes} phút`
                                                : '—'
                                        }
                                    />
                                    <InfoItem
                                        label="Phiếu phân bổ nguồn"
                                        value={
                                            batch.sourceAllocationBatchId != null
                                                ? `#${batch.sourceAllocationBatchId}`
                                                : '—'
                                        }
                                    />
                                    <InfoItem
                                        label="Nhà cung cấp"
                                        value={
                                            <Box>
                                                <span>{batch.supplierName || '—'}</span>
                                                {batch.supplierCode && (
                                                    <Typography
                                                        component="span"
                                                        variant="caption"
                                                        sx={{
                                                            ml: 0.75,
                                                            px: 0.75,
                                                            py: 0.25,
                                                            borderRadius: '4px',
                                                            bgcolor: '#f1f5f9',
                                                            color: '#64748b',
                                                            fontFamily: 'monospace',
                                                            fontWeight: 600,
                                                            fontSize: '0.7rem',
                                                        }}
                                                    >
                                                        {batch.supplierCode}
                                                    </Typography>
                                                )}
                                            </Box>
                                        }
                                    />
                                </Box>
                            </Paper>

                            {/* Panel 2: Vận hành & Bằng chứng giao nhận */}
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2.5,
                                    borderRadius: '12px',
                                    bgcolor: '#ffffff',
                                    borderColor: '#e2e8f0',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        mb: 2.5,
                                        pb: 1.5,
                                        borderBottom: '1px solid #f1f5f9',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '8px',
                                            bgcolor: 'rgba(34, 197, 94, 0.1)',
                                            color: '#16a34a',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <DescriptionOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                                    </Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>
                                        Vận hành & Bằng chứng giao nhận
                                    </Typography>
                                </Box>

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                                        gap: 2.25,
                                    }}
                                >
                                    <InfoItem
                                        label="Thời điểm giao trả"
                                        value={
                                            batch.returnedAt
                                                ? dayjs(batch.returnedAt).format('DD/MM/YYYY HH:mm')
                                                : 'Chưa giao trả'
                                        }
                                    />
                                    <InfoItem
                                        label="Thời điểm xác nhận"
                                        value={
                                            batch.confirmedAt
                                                ? dayjs(batch.confirmedAt).format('DD/MM/YYYY HH:mm')
                                                : 'Chưa xác nhận'
                                        }
                                    />
                                    <InfoItem
                                        label="Biên nhận trả vé"
                                        value={
                                            batch.returnReceiptUrl ? (
                                                <Box
                                                    component="a"
                                                    href={batch.returnReceiptUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    sx={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                        color: '#2563eb',
                                                        textDecoration: 'none',
                                                        fontWeight: 700,
                                                        '&:hover': { textDecoration: 'underline' },
                                                    }}
                                                >
                                                    <OpenInNewOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                                                    <span>Xem biên nhận</span>
                                                </Box>
                                            ) : (
                                                'Chưa có biên nhận'
                                            )
                                        }
                                    />
                                    <InfoItem
                                        label="Bằng chứng bàn giao"
                                        value={
                                            batch.returnEvidenceUrl ? (
                                                <Box
                                                    component="a"
                                                    href={batch.returnEvidenceUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    sx={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                        color: '#2563eb',
                                                        textDecoration: 'none',
                                                        fontWeight: 700,
                                                        '&:hover': { textDecoration: 'underline' },
                                                    }}
                                                >
                                                    <OpenInNewOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                                                    <span>Xem ảnh bằng chứng</span>
                                                </Box>
                                            ) : (
                                                'Chưa có bằng chứng'
                                            )
                                        }
                                    />
                                    <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                                        <InfoItem
                                            label="Ghi chú phiếu"
                                            value={
                                                batch.note ? (
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            p: 1.25,
                                                            borderRadius: '8px',
                                                            bgcolor: '#f8fafc',
                                                            border: '1px solid #f1f5f9',
                                                            color: '#334155',
                                                            fontSize: '0.825rem',
                                                            fontStyle: 'italic',
                                                        }}
                                                    >
                                                        {batch.note}
                                                    </Typography>
                                                ) : (
                                                    'Không có ghi chú'
                                                )
                                            }
                                        />
                                    </Box>
                                </Box>
                            </Paper>
                        </Box>
                    </Box>
                </CollapsibleCard>

                {/* Chi tiết vé trả theo nhà đài Table */}
                <CollapsibleCard
                    title={
                        <Stack direction="row" spacing={1} alignItems="center">
                            <span>Chi tiết vé trả theo nhà đài</span>
                            {(batch.lines || []).length > 0 && (
                                <Chip
                                    size="small"
                                    label={`${(batch.lines || []).length} đài`}
                                    sx={{
                                        height: 22,
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        bgcolor: '#f1f5f9',
                                        color: '#475569',
                                    }}
                                />
                            )}
                        </Stack>
                    }
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
                                    <TableCell align="center" width={64} sx={{ fontWeight: 700, color: '#334155', fontSize: '0.825rem' }}>
                                        STT
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#334155', fontSize: '0.825rem' }}>
                                        Tên nhà đài
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#0284c7', fontSize: '0.825rem' }}>
                                        Số lượng
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#16a34a', fontSize: '0.825rem' }}>
                                        Đã kiểm tra
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#ea580c', fontSize: '0.825rem' }}>
                                        Vé ế còn lại
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.825rem' }}>
                                        Sê-ri gắn
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#15803d', fontSize: '0.825rem' }}>
                                        Giá trị trả
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.825rem' }}>
                                        Trạng thái
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(batch.lines || []).map((line, index) => {
                                    const lineRemaining = line.remainingInspectableQuantity ?? 0;
                                    const lineInspected = Math.max(0, (line.totalQuantity ?? 0) - lineRemaining);
                                    const lineTheme = getReturnBatchLineStatusColorTheme(line.status);
                                    return (
                                        <TableRow
                                            key={line.id}
                                            hover
                                            sx={{
                                                borderLeft: `4px solid ${lineTheme.main}`,
                                                transition: 'background-color 0.15s ease',
                                                '&:hover': {
                                                    bgcolor: '#f8fafc',
                                                },
                                            }}
                                        >
                                            <TableCell align="center">
                                                <Tooltip
                                                    title={`Trạng thái: ${getReturnBatchLineStatusLabel(line.status, line.statusLabel)}`}
                                                    arrow
                                                >
                                                    <Box
                                                        sx={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            minWidth: 28,
                                                            height: 24,
                                                            px: 0.75,
                                                            borderRadius: '6px',
                                                            bgcolor: lineTheme.bg,
                                                            color: lineTheme.text,
                                                            fontWeight: 800,
                                                            fontSize: '0.75rem',
                                                            border: `1px solid ${lineTheme.border}`,
                                                        }}
                                                    >
                                                        {index + 1}
                                                    </Box>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                                    {line.lotteryStationName || `#${line.lotteryStationId}`}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: '#0284c7' }}>
                                                {new Intl.NumberFormat('vi-VN').format(line.totalQuantity ?? 0)} vé
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: '#16a34a' }}>
                                                {new Intl.NumberFormat('vi-VN').format(lineInspected)} vé
                                            </TableCell>
                                            <TableCell
                                                align="right"
                                                sx={{
                                                    fontWeight: 800,
                                                    color: lineRemaining > 0 ? '#ea580c' : '#64748b',
                                                }}
                                            >
                                                {new Intl.NumberFormat('vi-VN').format(lineRemaining)} vé
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: '#475569' }}>
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
                                                Chưa có dữ liệu vé trả theo nhà đài.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {(batch.lines || []).length > 0 && (() => {
                                    const totalLineQuantity = (batch.lines || []).reduce(
                                        (sum, l) => sum + (l.totalQuantity ?? 0),
                                        0
                                    );
                                    const totalLineInspected = (batch.lines || []).reduce((sum, l) => {
                                        const rem = l.remainingInspectableQuantity ?? 0;
                                        return sum + Math.max(0, (l.totalQuantity ?? 0) - rem);
                                    }, 0);
                                    const totalLineRemaining = (batch.lines || []).reduce(
                                        (sum, l) => sum + (l.remainingInspectableQuantity ?? 0),
                                        0
                                    );
                                    const totalLineSerials = (batch.lines || []).reduce(
                                        (sum, l) => sum + (l.attachedSerialCount ?? 0),
                                        0
                                    );
                                    const totalLineValue = (batch.lines || []).reduce(
                                        (sum, l) => sum + (l.totalReturnValue ?? 0),
                                        0
                                    );

                                    return (
                                        <TableRow
                                            sx={{
                                                bgcolor: '#f8fafc',
                                                borderTop: '2px solid #cbd5e1',
                                                '& td': { py: 1.75 },
                                            }}
                                        >
                                            <TableCell
                                                align="center"
                                                sx={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}
                                            >
                                                Tổng
                                            </TableCell>
                                            <TableCell
                                                sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}
                                            >
                                                {(batch.lines || []).length} nhà đài
                                            </TableCell>
                                            <TableCell
                                                align="right"
                                                sx={{ fontWeight: 800, color: '#0284c7', fontSize: '0.85rem' }}
                                            >
                                                {new Intl.NumberFormat('vi-VN').format(totalLineQuantity)} vé
                                            </TableCell>
                                            <TableCell
                                                align="right"
                                                sx={{ fontWeight: 800, color: '#16a34a', fontSize: '0.85rem' }}
                                            >
                                                {new Intl.NumberFormat('vi-VN').format(totalLineInspected)} vé
                                            </TableCell>
                                            <TableCell
                                                align="right"
                                                sx={{
                                                    fontWeight: 800,
                                                    color: totalLineRemaining > 0 ? '#ea580c' : '#64748b',
                                                    fontSize: '0.85rem',
                                                }}
                                            >
                                                {new Intl.NumberFormat('vi-VN').format(totalLineRemaining)} vé
                                            </TableCell>
                                            <TableCell
                                                align="right"
                                                sx={{ fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}
                                            >
                                                {new Intl.NumberFormat('vi-VN').format(totalLineSerials)}
                                            </TableCell>
                                            <TableCell
                                                align="right"
                                                sx={{ fontWeight: 800, color: '#15803d', fontSize: '0.85rem' }}
                                            >
                                                {formatImportCost(totalLineValue)} VNĐ
                                            </TableCell>
                                            <TableCell
                                                align="center"
                                                sx={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}
                                            >
                                                —
                                            </TableCell>
                                        </TableRow>
                                    );
                                })()}
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
                                    {evidenceUploadError}
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
