"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    Grid,
    IconButton,
    LinearProgress,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import CollectionsOutlinedIcon from '@mui/icons-material/CollectionsOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';

import { PageHeader } from '../../../../../components/ui/PageHeader';
import { SpinnerLoading } from '../../../../../components/ui/SpinnerLoading';
import { AdminStatusBadge } from '../../../../../components/ui/AdminStatusBadge';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import { useImportBatchDetail } from '../../hooks/useImportBatch';
import { useImportBatchIntakeGate } from '../../hooks/useImportBatchIntakeGate';
import { useActiveSuppliers } from '../../../../supplier';
import { exportImportBatchFile } from '../../services/importBatchService';
import { toast } from 'react-toastify';
import { useStations } from '../../../../station/hooks/useStation';
import { ImportBatchLineImportHost } from '../../../inventory/components/sections/ImportBatchLineImportHost';
import { usePermissions } from '../../../../../hooks/usePermission';
import { formatVnd } from '../../utils/importCostCalculator';
import {
    getBatchTypeBadgeClass,
    getBatchTypeLabel,
    getImportBatchCancelledAlertMessage,
    getImportBatchLineStatusBadgeClass,
    getImportBatchLineStatusLabel,
    getImportBatchStatusBadgeClass,
    getImportBatchStatusLabel,
    getImportModeLabel,
    formatImportBatchCancelReason,
    formatImportBatchLineCancelReason,
} from '../../utils/batchTypeLabels';
import {
    displayImportBatchLineCodeRaw,
    formatImportBatchHeaderCode,
    formatImportBatchLineCode,
    importBatchCodeMonospaceSx,
} from '../../utils/importBatchCode';
import {
    findFirstIncompleteLine,
    hasTicketImportEligibleLines,
    isImportBatchEditable,
    getImportBatchProgress,
    buildImportBatchProgressSegments,
} from '../../utils/importBatchProgress';
import { hasUnsavedImportBatchEditDraft } from '../../utils/importBatchEditDraft';
import { ImportBatchProgressBar } from '../sections/ImportBatchProgressBar';
import { ImagePreview } from '../../../../../components/ui/ImagePreview';
import { ImportBatchEditPage } from './ImportBatchEditPage';
import { useMemo, useState } from 'react';
import dayjs from 'dayjs';

export const ImportBatchDetailPage = () => {
    const { id } = useRouteParams();
    const router = useAdminRouter();
    const { can } = usePermissions();
    const { data: batch, isLoading, refetch } = useImportBatchDetail(id);
    const { data: providersRes } = useStations({ limit: 1000 });
    const { data: activeSuppliers = [] } = useActiveSuppliers();
    const { evaluate: evaluateIntake } = useImportBatchIntakeGate();
    const providers = (providersRes as any)?.data?.recordList || [];
    const [importLineId, setImportLineId] = useState<string | null>(null);

    const resolveStationName = (stationId: number) =>
        providers.find((p: any) => String(p.id || p._id) === String(stationId))?.name ||
        `Đài #${stationId}`;

    const batchLines = batch?.lines ?? [];

    // Hooks must run before any conditional return (editable batches swap in EditPage below).
    const segments = useMemo(() => {
        if (!batch) return [];
        return buildImportBatchProgressSegments(batch, resolveStationName);
    }, [batch, providers]);

    // Editable batches: same detail URL hosts the edit form (CREATE required).
    if (!isLoading && batch && isImportBatchEditable(batch) && can(PERMISSIONS.IMPORT_BATCH.CREATE)) {
        return <ImportBatchEditPage />;
    }

    const handleExport = async () => {
        if (!batch) return;
        try {
            await exportImportBatchFile(batch.id);
            toast.success('Xuất tệp thành công.');
        } catch {
            toast.error('Không xuất được tệp cho phiếu nhập này.');
        }
    };

    const totalDeclareQuantity = batch?.totalDeclareQuantity ?? 0;
    const totalDeclaredCostValue = batch?.totalDeclaredCostValue ?? 0;
    const totalImportedQuantity = batch?.totalImportedQuantity ?? 0;
    const totalImportedCostValue = batch?.totalImportedCostValue ?? 0;
    const canEditBatch = batch ? isImportBatchEditable(batch) : false;
    const intakeGate = useMemo(() => {
        if (!batch?.supplierId || !batch.drawDate) {
            return null;
        }
        const supplier = activeSuppliers.find((entry) => entry.id === batch.supplierId);
        return evaluateIntake(supplier, batch.drawDate);
    }, [activeSuppliers, batch, evaluateIntake]);
    const showImportTicketsButton = batch ? hasTicketImportEligibleLines(batch) : false;
    const importTicketsBlocked = !!intakeGate?.blocked || !!intakeGate?.notYetAllowed;
    const hasUnsavedDraft = id ? hasUnsavedImportBatchEditDraft(id) : false;

    const progress = batch ? getImportBatchProgress(batch) : { percent: 0, imported: 0, declared: 0 };
    const isCompleted = progress.declared > 0 && progress.imported >= progress.declared;

    const cancelledReasonText =
        batch?.status === 'CANCELLED' ? formatImportBatchCancelReason(batch.cancelReason) : undefined;

    return (
        <Box className="admin-page" sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 3 } }}>
            {/* Page Header */}
            <PageHeader
                title={`Phiếu nhập lô ${batch ? formatImportBatchHeaderCode(batch.batchCode, batch.id) : `#${id}`}`}
                breadcrumbItems={[
                    { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                    { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                    { label: batch ? formatImportBatchHeaderCode(batch.batchCode, batch.id) : `#${id}` },
                ]}
                titleExtra={
                    batch ? (
                        <AdminStatusBadge
                            label={getImportBatchStatusLabel(batch.status)}
                            modifier={getImportBatchStatusBadgeClass(batch.status)}
                        />
                    ) : undefined
                }
                description={
                    cancelledReasonText ? (
                        <Typography variant="body2" color="error.main" sx={{ maxWidth: 720, mt: 0.5, fontWeight: 500 }}>
                            {cancelledReasonText}
                        </Typography>
                    ) : undefined
                }
                action={
                    batch ? (
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Button
                                variant="outlined"
                                startIcon={<FileDownloadOutlinedIcon />}
                                onClick={handleExport}
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
                                Xuất tệp
                            </Button>

                            {canEditBatch && can(PERMISSIONS.IMPORT_BATCH.CREATE) && (
                                <Button
                                    variant="outlined"
                                    startIcon={<EditOutlinedIcon />}
                                    onClick={() => router.push(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id))}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        borderRadius: '10px',
                                        borderColor: '#cbd5e1',
                                        color: '#0f172a',
                                        bgcolor: '#ffffff',
                                        '&:hover': { bgcolor: '#f8fafc' },
                                    }}
                                >
                                    Chỉnh sửa phiếu
                                </Button>
                            )}

                            {showImportTicketsButton && (
                                <CanAccess permission={PERMISSIONS.TICKET.CREATE}>
                                    <Tooltip
                                        title={
                                            importTicketsBlocked
                                                ? intakeGate?.tooltipTitle ?? 'Không thể nhập vé lúc này.'
                                                : ''
                                        }
                                    >
                                        <span>
                                            <Button
                                                variant="contained"
                                                disabled={importTicketsBlocked}
                                                startIcon={<ConfirmationNumberOutlinedIcon />}
                                                onClick={() => {
                                                    const firstLine = findFirstIncompleteLine(batch);
                                                    if (firstLine?.id != null) {
                                                        setImportLineId(String(firstLine.id));
                                                    }
                                                }}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 800,
                                                    borderRadius: '10px',
                                                    bgcolor: '#0f172a',
                                                    color: '#ffffff',
                                                    px: 2.5,
                                                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                                                    '&:hover': { bgcolor: '#1e293b' },
                                                    '&.Mui-disabled': {
                                                        bgcolor: '#e2e8f0',
                                                        color: '#94a3b8',
                                                    },
                                                }}
                                            >
                                                Nhập vé vào phiếu
                                            </Button>
                                        </span>
                                    </Tooltip>
                                </CanAccess>
                            )}
                        </Stack>
                    ) : undefined
                }
            />

            {isLoading ? (
                <SpinnerLoading />
            ) : !batch ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <Typography color="#64748b">Không tìm thấy thông tin phiếu nhập lô.</Typography>
                </Paper>
            ) : (
                <Stack spacing={3} sx={{ mt: 2.5 }}>
                    {/* Status Alert Notification (Top Position) */}
                    {batch.status === 'IMPORTED' && (
                        <Alert severity="success" sx={{ borderRadius: '12px', fontWeight: 600 }}>
                            ✓ Phiếu đã nhập kho hoàn tất. Toàn bộ vé đã được cập nhật vào hệ thống kho vé số.
                        </Alert>
                    )}

                    {batch.status === 'CANCELLED' && (
                        <Alert severity="error" sx={{ borderRadius: '12px', fontWeight: 600 }}>
                            {getImportBatchCancelledAlertMessage(batch.cancelReason)}
                        </Alert>
                    )}

                    {canEditBatch && intakeGate?.blocked && (
                        <Alert severity="error" sx={{ borderRadius: '12px', fontWeight: 600 }}>
                            {intakeGate.message}
                        </Alert>
                    )}

                    {canEditBatch && intakeGate?.notYetAllowed && (
                        <Alert severity="warning" sx={{ borderRadius: '12px', fontWeight: 600 }}>
                            {intakeGate.message}
                        </Alert>
                    )}

                    {canEditBatch && (
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                bgcolor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                            }}
                        >
                            <InfoOutlinedIcon sx={{ color: '#64748b', fontSize: '1.2rem' }} />
                            <Typography variant="body2" color="#475569" fontWeight={500}>
                                Phiếu đang trong quá trình nhập. Bạn có thể chỉnh sửa thông tin khai báo hoặc tiếp tục nhập vé trực tiếp vào kho.
                            </Typography>
                        </Box>
                    )}

                    {/* Unsaved draft warning */}
                    {hasUnsavedDraft && (
                        <Alert
                            icon={<InfoOutlinedIcon sx={{ color: '#0284c7' }} />}
                            severity="info"
                            sx={{
                                borderRadius: '12px',
                                bgcolor: '#f0f9ff',
                                border: '1px solid #bae6fd',
                                color: '#0369a1',
                                fontWeight: 500,
                            }}
                        >
                            Phiếu nhập lô đang có bản nháp chỉnh sửa chưa lưu trên thiết bị này. Nội dung nháp cục bộ sẽ được khôi phục khi bạn mở màn hình chỉnh sửa.
                        </Alert>
                    )}

                    {/* Section 1: Top Metadata Info Strip */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 2, md: 2.5 },
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            bgcolor: '#ffffff',
                            boxShadow: '0 2px 12px -2px rgba(0, 0, 0, 0.04)',
                        }}
                    >
                        <Grid container spacing={2.5} alignItems="center">
                            {/* Ngày quay */}
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box
                                        sx={{
                                            width: 42,
                                            height: 42,
                                            borderRadius: '10px',
                                            bgcolor: '#f1f5f9',
                                            color: '#0f172a',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <CalendarTodayOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Ngày quay thưởng
                                        </Typography>
                                        <Typography variant="body1" fontWeight={800} color="#0f172a">
                                            {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Grid>

                            {/* Nhà cung cấp */}
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box
                                        sx={{
                                            width: 42,
                                            height: 42,
                                            borderRadius: '10px',
                                            bgcolor: '#eff6ff',
                                            color: '#2563eb',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <StorefrontOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Nhà cung cấp
                                        </Typography>
                                        <Typography variant="body1" fontWeight={800} color="#0f172a">
                                            {batch.supplierName || '—'}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Grid>

                            {/* Loại nhập */}
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box
                                        sx={{
                                            width: 42,
                                            height: 42,
                                            borderRadius: '10px',
                                            bgcolor: '#f0fdf4',
                                            color: '#16a34a',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <CategoryOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Hình thức nhập
                                        </Typography>
                                        <Typography variant="body1" fontWeight={800} color="#0f172a">
                                            {getImportModeLabel(batch.importMode)}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Grid>

                            {/* Số nhà đài */}
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box
                                        sx={{
                                            width: 42,
                                            height: 42,
                                            borderRadius: '10px',
                                            bgcolor: '#fff7ed',
                                            color: '#ea580c',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <LocationOnOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Quy mô lô nhập
                                        </Typography>
                                        <Typography variant="body1" fontWeight={800} color="#0f172a">
                                            {batch.lineCount ?? batchLines.length} <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>nhà đài</span>
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Section 2: KPI Metrics Comparison (Khai báo vs Thực tế đã nhập) */}
                    <Grid container spacing={2}>
                        {/* KPI 1: Tổng SL khai báo */}
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: '14px',
                                    border: '1px solid #e2e8f0',
                                    bgcolor: '#ffffff',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Box>
                                        <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ textTransform: 'uppercase' }}>
                                            Tổng SL Khai Báo
                                        </Typography>
                                        <Typography variant="h5" fontWeight={900} color="#0f172a" sx={{ mt: 0.5 }}>
                                            {totalDeclareQuantity.toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>vé</span>
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            p: 1,
                                            borderRadius: '10px',
                                            bgcolor: '#eff6ff',
                                            color: '#2563eb',
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <ConfirmationNumberOutlinedIcon fontSize="small" />
                                    </Box>
                                </Stack>
                                <Typography variant="caption" color="#64748b" sx={{ mt: 1.5, display: 'block' }}>
                                    Số lượng theo kế hoạch phiếu
                                </Typography>
                            </Paper>
                        </Grid>

                        {/* KPI 2: Tổng giá trị khai báo */}
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: '14px',
                                    border: '1px solid #e2e8f0',
                                    bgcolor: '#ffffff',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Box>
                                        <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ textTransform: 'uppercase' }}>
                                            Tổng Giá Trị Khai Báo
                                        </Typography>
                                        <Typography variant="h5" fontWeight={900} color="#0f172a" sx={{ mt: 0.5 }}>
                                            {formatVnd(Number(totalDeclaredCostValue))}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            p: 1,
                                            borderRadius: '10px',
                                            bgcolor: '#eff6ff',
                                            color: '#2563eb',
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <PaymentsOutlinedIcon fontSize="small" />
                                    </Box>
                                </Stack>
                                <Typography variant="caption" color="#64748b" sx={{ mt: 1.5, display: 'block' }}>
                                    Tổng chi phí vốn dự kiến
                                </Typography>
                            </Paper>
                        </Grid>

                        {/* KPI 3: Tổng SL đã nhập */}
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: '14px',
                                    border: `1px solid ${isCompleted ? '#bbf7d0' : '#fed7aa'}`,
                                    bgcolor: isCompleted ? '#f0fdf4' : '#fff7ed',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Box>
                                        <Typography variant="caption" fontWeight={700} color={isCompleted ? '#166534' : '#9a3412'} sx={{ textTransform: 'uppercase' }}>
                                            Tổng SL Đã Nhập
                                        </Typography>
                                        <Typography variant="h5" fontWeight={900} color={isCompleted ? '#15803d' : '#ea580c'} sx={{ mt: 0.5 }}>
                                            {totalImportedQuantity.toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isCompleted ? '#166534' : '#9a3412' }}>vé</span>
                                        </Typography>
                                    </Box>
                                    <Chip
                                        size="small"
                                        label={`${progress.percent.toFixed(0)}%`}
                                        sx={{
                                            fontWeight: 800,
                                            height: 24,
                                            bgcolor: isCompleted ? '#dcfce7' : '#ffedd5',
                                            color: isCompleted ? '#15803d' : '#c2410c',
                                        }}
                                    />
                                </Stack>
                                <Typography variant="caption" color={isCompleted ? '#166534' : '#9a3412'} sx={{ mt: 1.5, display: 'block' }}>
                                    {isCompleted ? '✓ Đã nhập đủ 100% số vé' : `Còn thiếu ${(totalDeclareQuantity - totalImportedQuantity).toLocaleString('vi-VN')} vé`}
                                </Typography>
                            </Paper>
                        </Grid>

                        {/* KPI 4: Tổng giá trị đã nhập */}
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: '14px',
                                    border: `1px solid ${isCompleted ? '#bbf7d0' : '#fed7aa'}`,
                                    bgcolor: isCompleted ? '#f0fdf4' : '#fff7ed',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Box>
                                        <Typography variant="caption" fontWeight={700} color={isCompleted ? '#166534' : '#9a3412'} sx={{ textTransform: 'uppercase' }}>
                                            Tổng Giá Trị Đã Nhập
                                        </Typography>
                                        <Typography variant="h5" fontWeight={900} color={isCompleted ? '#15803d' : '#ea580c'} sx={{ mt: 0.5 }}>
                                            {formatVnd(Number(totalImportedCostValue))}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            p: 1,
                                            borderRadius: '10px',
                                            bgcolor: isCompleted ? '#dcfce7' : '#ffedd5',
                                            color: isCompleted ? '#15803d' : '#ea580c',
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <MonetizationOnOutlinedIcon fontSize="small" />
                                    </Box>
                                </Stack>
                                <Typography variant="caption" color={isCompleted ? '#166534' : '#9a3412'} sx={{ mt: 1.5, display: 'block' }}>
                                    Tổng chi phí thực nhập vào kho
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Section 3: Tiến độ nhập vé tổng thể Card */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 2, md: 2.5 },
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            bgcolor: '#ffffff',
                            boxShadow: '0 2px 12px -2px rgba(0, 0, 0, 0.04)',
                        }}
                    >
                        <ImportBatchProgressBar
                            batch={batch}
                            resolveStationName={resolveStationName}
                            showStationLegend={true}
                        />
                    </Paper>

                    {/* Section 4: Bảng danh sách lô nhập theo nhà đài (Màu sắc đồng bộ với tiến độ) */}
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            bgcolor: '#ffffff',
                            overflow: 'hidden',
                            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
                        }}
                    >
                        {/* Table Card Header */}
                        <Box sx={{ p: 2.5, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Box
                                    sx={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: '10px',
                                        bgcolor: '#eff6ff',
                                        color: '#2563eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Inventory2OutlinedIcon sx={{ fontSize: '1.25rem' }} />
                                </Box>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                        Chi tiết các lô vé theo nhà đài
                                    </Typography>
                                    <Typography variant="caption" color="#64748b">
                                        Danh sách các đài phát hành và tiến độ thực nhập tương ứng
                                    </Typography>
                                </Box>
                            </Stack>

                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                    size="small"
                                    label={`${batchLines.length} đài phát hành`}
                                    sx={{ fontWeight: 700, bgcolor: '#f1f5f9', color: '#475569' }}
                                />
                                <Chip
                                    size="small"
                                    label={`${totalImportedQuantity.toLocaleString('vi-VN')} / ${totalDeclareQuantity.toLocaleString('vi-VN')} vé`}
                                    sx={{
                                        fontWeight: 800,
                                        bgcolor: isCompleted ? '#dcfce7' : '#ffedd5',
                                        color: isCompleted ? '#15803d' : '#c2410c',
                                        border: `1px solid ${isCompleted ? '#bbf7d0' : '#fed7aa'}`,
                                    }}
                                />
                            </Stack>
                        </Box>

                        {/* Table */}
                        <TableContainer sx={{ maxHeight: 500, overflow: 'auto' }}>
                            <Table size="small" stickyHeader sx={{ minWidth: 850 }}>
                                <TableHead>
                                    <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.8rem', py: 1.5 } }}>
                                        <TableCell>NHÀ ĐÀI</TableCell>
                                        <TableCell align="center">LOẠI LÔ</TableCell>
                                        <TableCell>MÃ LÔ NHẬP</TableCell>
                                        <TableCell align="center">TRẠNG THÁI</TableCell>
                                        <TableCell align="right">ĐƠN GIÁ VỐN</TableCell>
                                        <TableCell align="right">GT ĐÃ NHẬP</TableCell>
                                        <TableCell align="center">THAO TÁC</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {batchLines.map((line) => {
                                        const stationName = resolveStationName(line.lotteryStationId);
                                        const lineComplete = line.totalQuantity >= line.declareQuantity;
                                        const seg = segments.find((s) => s.lineId === line.id) || {
                                            color: '#2563eb',
                                            trackColor: '#eff6ff',
                                        };

                                        return (
                                            <TableRow
                                                key={line.id}
                                                hover
                                                sx={{
                                                    borderLeft: `5px solid ${seg.color}`,
                                                    '&:hover': { bgcolor: '#f8fafc' },
                                                    transition: 'background-color 0.15s ease',
                                                }}
                                            >
                                                {/* Station with matching segment color dot */}
                                                <TableCell>
                                                    <Stack direction="row" spacing={1.25} alignItems="center">
                                                        <Box
                                                            sx={{
                                                                width: 10,
                                                                height: 10,
                                                                borderRadius: '50%',
                                                                bgcolor: seg.color,
                                                                flexShrink: 0,
                                                                boxShadow: `0 0 0 2px ${seg.trackColor}`,
                                                            }}
                                                        />
                                                        <Typography variant="body2" fontWeight={800} color="#0f172a">
                                                            {stationName}
                                                        </Typography>
                                                    </Stack>
                                                </TableCell>

                                                {/* Batch Type */}
                                                <TableCell align="center">
                                                    <AdminStatusBadge
                                                        label={getBatchTypeLabel(line.batchType)}
                                                        modifier={getBatchTypeBadgeClass(line.batchType)}
                                                    />
                                                </TableCell>

                                                {/* Batch Code */}
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            ...importBatchCodeMonospaceSx,
                                                            fontWeight: 700,
                                                            color: '#334155',
                                                            bgcolor: '#f1f5f9',
                                                            px: 1,
                                                            py: 0.25,
                                                            borderRadius: '6px',
                                                            display: 'inline-block',
                                                        }}
                                                        title={formatImportBatchLineCode(line.batchCode)}
                                                    >
                                                        {displayImportBatchLineCodeRaw(line.batchCode)}
                                                    </Typography>
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell align="center">
                                                    <AdminStatusBadge
                                                        label={getImportBatchLineStatusLabel(line.status)}
                                                        modifier={getImportBatchLineStatusBadgeClass(line.status)}
                                                    />
                                                    {line.status === 'CANCELLED' && line.cancelReason && (
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{ display: 'block', mt: 0.5, maxWidth: 220 }}
                                                        >
                                                            {formatImportBatchLineCancelReason(line.cancelReason)}
                                                        </Typography>
                                                    )}
                                                </TableCell>

                                                {/* Unit Cost */}
                                                <TableCell align="right">
                                                    <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                        {formatVnd(line.importCost)}
                                                    </Typography>
                                                </TableCell>

                                                {/* Total Value */}
                                                <TableCell align="right">
                                                    <Typography variant="body2" fontWeight={800} color="#166534">
                                                        {formatVnd(line.totalCostValue)}
                                                    </Typography>
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                                                        {showImportTicketsButton && !lineComplete && line.status !== 'CANCELLED' && (
                                                            <Tooltip
                                                                title={
                                                                    importTicketsBlocked
                                                                        ? intakeGate?.tooltipTitle ?? 'Không thể nhập vé lúc này.'
                                                                        : 'Nhập vé cho đài này'
                                                                }
                                                            >
                                                                <span>
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        disabled={importTicketsBlocked}
                                                                        onClick={() => setImportLineId(String(line.id))}
                                                                        sx={{
                                                                            minWidth: 0,
                                                                            px: 1.25,
                                                                            py: 0.25,
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 700,
                                                                            textTransform: 'none',
                                                                            borderRadius: '8px',
                                                                            color: '#0f172a',
                                                                            borderColor: '#cbd5e1',
                                                                            '&:hover': { bgcolor: '#f1f5f9' },
                                                                            '&.Mui-disabled': {
                                                                                color: '#94a3b8',
                                                                                borderColor: '#e2e8f0',
                                                                            },
                                                                        }}
                                                                    >
                                                                        Nhập vé
                                                                    </Button>
                                                                </span>
                                                            </Tooltip>
                                                        )}

                                                        <Tooltip title="Xem chi tiết lô vé">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() =>
                                                                    router.push(
                                                                        ROUTES.ADMIN.IMPORT_BATCH.LINE_DETAIL(
                                                                            batch.id,
                                                                            line.id
                                                                        )
                                                                    )
                                                                }
                                                                sx={{
                                                                    color: '#64748b',
                                                                    borderRadius: '8px',
                                                                    '&:hover': { color: '#0f172a', bgcolor: '#f1f5f9' },
                                                                }}
                                                            >
                                                                <VisibilityOutlinedIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}

                                    {batchLines.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} sx={{ py: 4, textAlign: 'center' }}>
                                                <Typography variant="body2" color="#64748b">
                                                    Chưa có lô vé nào trong phiếu này.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    {/* Section 5: Ghi chú phiếu nhập & Ảnh biên lai (Đặt ở DƯỚI bảng chi tiết theo đài) */}
                    {(batch.invoiceEvidenceUrl || batch.note || (batch.ticketListImageUrls?.length ?? 0) > 0) && (
                        <Stack spacing={2.5}>
                        {(batch.invoiceEvidenceUrl || batch.note) && (
                        <Grid container spacing={2.5}>
                            {/* Ghi chú phiếu nhập */}
                            {batch.note && (
                                <Grid size={{ xs: 12, md: batch.invoiceEvidenceUrl ? 6 : 12 }}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2.5,
                                            borderRadius: '16px',
                                            border: '1px solid #e2e8f0',
                                            bgcolor: '#ffffff',
                                            height: '100%',
                                        }}
                                    >
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                                            <StickyNote2OutlinedIcon sx={{ color: '#64748b', fontSize: '1.3rem' }} />
                                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                                Ghi chú phiếu nhập
                                            </Typography>
                                        </Stack>
                                        <Box
                                            sx={{
                                                p: 2,
                                                borderRadius: '12px',
                                                bgcolor: '#f8fafc',
                                                border: '1px solid #f1f5f9',
                                                color: '#334155',
                                                fontSize: '0.875rem',
                                                lineHeight: 1.6,
                                                whiteSpace: 'pre-wrap',
                                            }}
                                        >
                                            {batch.note}
                                        </Box>
                                    </Paper>
                                </Grid>
                            )}

                            {/* Ảnh biên lai */}
                            {batch.invoiceEvidenceUrl && (
                                <Grid size={{ xs: 12, md: batch.note ? 6 : 12 }}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2.5,
                                            borderRadius: '16px',
                                            border: '1px solid #e2e8f0',
                                            bgcolor: '#ffffff',
                                            height: '100%',
                                        }}
                                    >
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                            <ReceiptLongOutlinedIcon sx={{ color: '#ea580c', fontSize: '1.3rem' }} />
                                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                                Ảnh biên lai phiếu nhập
                                            </Typography>
                                        </Stack>
                                        <ImagePreview
                                            src={batch.invoiceEvidenceUrl}
                                            alt="Ảnh biên lai"
                                            dialogTitle="Ảnh biên lai phiếu nhập"
                                            infoItems={[
                                                {
                                                    label: 'Mã phiếu',
                                                    value: formatImportBatchHeaderCode(batch.batchCode, batch.id),
                                                },
                                                {
                                                    label: 'Ngày quay',
                                                    value: batch.drawDate
                                                        ? dayjs(batch.drawDate).format('DD/MM/YYYY')
                                                        : '—',
                                                },
                                                {
                                                    label: 'Nhà cung cấp',
                                                    value: batch.supplierName || '—',
                                                },
                                                {
                                                    label: 'Loại nhập',
                                                    value: getImportModeLabel(batch.importMode),
                                                },
                                            ]}
                                            thumbnailSx={{
                                                maxWidth: 280,
                                                maxHeight: 180,
                                                borderRadius: '12px',
                                                border: '1px solid #e2e8f0',
                                                objectFit: 'contain',
                                                bgcolor: '#f8fafc',
                                            }}
                                        />
                                    </Paper>
                                </Grid>
                            )}
                        </Grid>
                        )}

                        {(batch.ticketListImageUrls?.length ?? 0) > 0 && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: '16px',
                                    border: '1px solid #e2e8f0',
                                    bgcolor: '#ffffff',
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                    <CollectionsOutlinedIcon sx={{ color: '#0369a1', fontSize: '1.3rem' }} />
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                        Ảnh danh sách vé nhập
                                    </Typography>
                                </Stack>
                                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                    {batch.ticketListImageUrls!.map((url) => (
                                        <ImagePreview
                                            key={url}
                                            src={url}
                                            alt="Ảnh danh sách vé nhập"
                                            dialogTitle="Ảnh danh sách vé nhập"
                                            infoItems={[
                                                {
                                                    label: 'Mã phiếu',
                                                    value: formatImportBatchHeaderCode(batch.batchCode, batch.id),
                                                },
                                                {
                                                    label: 'Ngày quay',
                                                    value: batch.drawDate
                                                        ? dayjs(batch.drawDate).format('DD/MM/YYYY')
                                                        : '—',
                                                },
                                                {
                                                    label: 'Nhà cung cấp',
                                                    value: batch.supplierName || '—',
                                                },
                                            ]}
                                            thumbnailSx={{
                                                width: 140,
                                                height: 140,
                                                maxWidth: 140,
                                                maxHeight: 140,
                                                borderRadius: '12px',
                                                border: '1px solid #e2e8f0',
                                                objectFit: 'cover',
                                                bgcolor: '#f8fafc',
                                            }}
                                        />
                                    ))}
                                </Box>
                            </Paper>
                        )}
                        </Stack>
                    )}
                </Stack>
            )}

            {/* Inline ticket importer modal host */}
            <ImportBatchLineImportHost
                batchId={batch?.id ?? null}
                lineId={importLineId}
                onClose={() => setImportLineId(null)}
                onSuccess={() => {
                    setImportLineId(null);
                    refetch();
                }}
            />
        </Box>
    );
};
