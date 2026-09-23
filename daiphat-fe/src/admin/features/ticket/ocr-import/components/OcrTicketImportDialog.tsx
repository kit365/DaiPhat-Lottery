'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DocumentScannerOutlinedIcon from '@mui/icons-material/DocumentScannerOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormHelperText,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Radio,
    RadioGroup,
    Select,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableFooter,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import dayjs from 'dayjs';
import Link from 'next/link';
import type { Accept } from 'react-dropzone';
import { toast } from 'react-toastify';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { ROUTES } from '../../../../../constants/routes';
import { UploadSingleFile } from '@/admin/components/upload/UploadSingleFile';
import { useActiveSuppliers } from '../../../supplier';
import { useStations } from '../../../station/hooks/useStation';
import type { ImportBatch, ImportBatchLine } from '../../import-batch/types/importBatch.type';
import {
    uploadImportBatchInvoiceEvidence,
    uploadImportBatchTicketListImage,
} from '../../import-batch/services/importBatchService';
import { useImportBatchTimePolicy } from '../../import-batch/hooks/useImportBatch';
import {
    buildImportIntakeClosedMessage,
    DEFAULT_RETURN_BUFFER_MINUTES,
} from '../../import-batch/utils/importBatchDrawDate';
import { formatImportBatchHeaderCode } from '../../import-batch/utils/importBatchCode';
import { formatVnd } from '../../import-batch/utils/importCostCalculator';
import {
    getBatchTypeLabel,
    getImportModeLabel,
    getImportBatchStatusLabel,
} from '../../import-batch/utils/batchTypeLabels';
import { useOcrImportWizard } from '../hooks/useOcrImportWizard';
import { OCR_IMPORT_DRAFT_KEY } from '../types/ticketOcr.type';
import {
    buildReviewImageGroups,
    countOcrBatchesBlockedByIntake,
    filterEligibleOcrBatches,
    formatDenomination,
    getImportOutcomeLabel,
    getScanLogEventLabel,
    getScanLogMethodLabel,
    parseTicketPriceNumber,
    type OcrBatchOption,
    type OcrReviewImageGroup,
} from '../utils/ocrImportHelpers';
import {
    normalizeOcrScanErrorMessage,
    OCR_SERVICE_UNAVAILABLE_MESSAGE,
} from '../utils/ocrScanErrorMessage';
import OcrReviewImagePane, { type OcrFieldSelection } from './OcrReviewImagePane';
import OcrReviewResultCards from './OcrReviewResultCards';
import { getOcrTemplateDefaultReady } from '../../../station/services/ocrTemplateService';
import { getOcrServiceReady } from '../services/ticketOcrService';

const OCR_EVIDENCE_ACCEPT: Accept = {
    'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    'application/pdf': ['.pdf'],
    'text/csv': ['.csv'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
};

type OcrTicketImportDialogProps = {
    open: boolean;
    onClose: () => void;
    onImported?: () => void;
    prefillBatch?: ImportBatch | null;
    prefillLine?: ImportBatchLine | null;
    resolveStationName?: (stationId?: number | string) => string;
    restoreFromDraft?: boolean;
    restoreSelectedImportBatchId?: number | null;
    onDraftRestored?: () => void;
};

const STEPS = [
    { key: 'upload', label: 'Tải ảnh vé' },
    { key: 'review', label: 'Xem lại kết quả' },
    { key: 'importMode', label: 'Xác nhận nhập' },
] as const;

const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const stepTitle: Record<string, string> = {
    upload: 'Tải ảnh vé & quét OCR',
    review: 'Xem lại kết quả OCR',
    importMode: 'Xác nhận nhập kho',
    result: 'Kết quả nhập kho',
};

const createBatchHref = `${ROUTES.ADMIN.IMPORT_BATCH.CREATE}?returnTo=ocr-import&draftKey=${OCR_IMPORT_DRAFT_KEY}`;

const renderBatchTypeChip = (batchType?: string) => {
    const label = getBatchTypeLabel(batchType);
    let bgcolor = '#f1f5f9';
    let color = '#475569';
    let border = '1px solid #e2e8f0';

    if (batchType === 'NEW') {
        bgcolor = '#eff6ff';
        color = '#1d4ed8';
        border = '1px solid #bfdbfe';
    } else if (batchType === 'SUPPLEMENTARY') {
        bgcolor = '#fef3c7';
        color = '#b45309';
        border = '1px solid #fde68a';
    } else if (batchType === 'ADJUSTMENT' || batchType === 'ADDITIONAL') {
        bgcolor = '#f0fdfa';
        color = '#0f766e';
        border = '1px solid #99f6e4';
    }

    return (
        <Chip
            size="small"
            label={label}
            sx={{
                height: 20,
                fontSize: '0.675rem',
                fontWeight: 700,
                bgcolor,
                color,
                border,
            }}
        />
    );
};

const ImportBatchReviewSummaryCard = ({
    batch,
    selectedSupplier,
    wizard,
    stationLabel,
    onOpenScanHistory,
    imageCount,
    selectedStationId,
}: {
    batch: ImportBatch | null;
    selectedSupplier?: { name: string; code: string } | null;
    wizard: ReturnType<typeof useOcrImportWizard>;
    stationLabel: (stationId?: number) => string;
    onOpenScanHistory?: (tab?: 'logs' | 'images') => void;
    imageCount?: number;
    selectedStationId?: number | null;
}) => {
    const batchCode = batch?.batchCode || wizard.selectedBatch?.batchCode || '—';
    const batchId = batch?.id || wizard.selectedBatch?.id;
    const drawDate = batch?.drawDate || wizard.selectedBatch?.drawDate;
    const formattedDrawDate = drawDate ? dayjs(drawDate).format('DD/MM/YYYY') : '—';
    const supplierDisplayName =
        selectedSupplier ? `${selectedSupplier.name} (${selectedSupplier.code})` : batch?.supplierName || wizard.selectedBatch?.supplierName || '—';
    const importMode = batch?.importMode ?? 'IN_DAY';
    const status = batch?.status || wizard.selectedBatch?.status || 'DRAFT';
    const lines = batch?.lines ?? [];

    const linesTotalDeclare = lines.reduce((sum, l) => sum + (l.declareQuantity || 0), 0);
    const totalDeclareQuantity = batch?.totalDeclareQuantity ?? (linesTotalDeclare > 0 ? linesTotalDeclare : 0);

    const confirmableCount = wizard.rows.filter(wizard.isRowConfirmable).length;
    const totalRowsCount = wizard.rows.length;

    const activeSelectedLine = lines.find((l) => l.lotteryStationId === selectedStationId);

    return (
        <Paper
            variant="outlined"
            sx={{
                borderRadius: '12px',
                borderColor: '#e2e8f0',
                bgcolor: '#ffffff',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
        >
            {/* Header info & Actions (Compact single row) */}
            <Box sx={{ px: 2, py: 1.25, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={1.25}>
                    <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
                        <Box
                            sx={{
                                width: 34,
                                height: 34,
                                borderRadius: '8px',
                                bgcolor: '#eff6ff',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} />
                        </Box>
                        <Box>
                            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.875rem' }}>
                                    Phiếu: {formatImportBatchHeaderCode(batchCode, batchId)}
                                </Typography>
                                <Chip
                                    size="small"
                                    label={getImportBatchStatusLabel(status)}
                                    sx={{
                                        height: 19,
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        bgcolor: status === 'DRAFT' ? '#fef3c7' : '#e0f2fe',
                                        color: status === 'DRAFT' ? '#b45309' : '#0369a1',
                                    }}
                                />
                                <Chip
                                    size="small"
                                    label={getImportModeLabel(importMode)}
                                    sx={{
                                        height: 19,
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        bgcolor: importMode === 'IN_DAY' ? '#e0f2fe' : '#fef3c7',
                                        color: importMode === 'IN_DAY' ? '#0369a1' : '#b45309',
                                    }}
                                />
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.15, fontSize: '0.75rem' }}>
                                Nhà cung cấp: <Box component="span" sx={{ color: '#0f172a', fontWeight: 600 }}>{supplierDisplayName}</Box> · Ngày quay: <Box component="span" sx={{ color: '#0f172a', fontWeight: 600 }}>{formattedDrawDate}</Box>
                            </Typography>
                        </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                                wizard.toggleAllConfirmable(
                                    wizard.confirmableCount < confirmableCount
                                )
                            }
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.775rem',
                                borderRadius: '7px',
                                px: 1.25,
                                py: 0.35,
                                borderColor: '#cbd5e1',
                                color: '#334155',
                                '&:hover': {
                                    borderColor: '#94a3b8',
                                    bgcolor: '#f1f5f9',
                                },
                            }}
                        >
                            Chọn tất cả hợp lệ ({confirmableCount})
                        </Button>
                        {onOpenScanHistory && (
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={
                                    wizard.scanning ? (
                                        <CircularProgress size={13} color="inherit" />
                                    ) : (
                                        <PhotoLibraryOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                                    )
                                }
                                disabled={wizard.scanning}
                                onClick={() => onOpenScanHistory('images')}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.775rem',
                                    borderRadius: '7px',
                                    px: 1.25,
                                    py: 0.35,
                                    bgcolor: '#2563eb',
                                    color: '#ffffff',
                                    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                            >
                                {wizard.scanning ? 'Đang quét…' : `Ảnh đã quét (${imageCount ?? 0})`}
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </Box>

            {/* Quick Metrics Bar */}
            <Box sx={{ px: 2, py: 1, bgcolor: '#ffffff', borderBottom: lines.length > 0 ? '1px solid #f1f5f9' : 'none' }}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    justifyContent="space-between"
                    spacing={1.5}
                >
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                Khai báo:
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a' }}>
                                {totalDeclareQuantity.toLocaleString('vi-VN')} vé
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                Đã quét OCR:
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a' }}>
                                {totalRowsCount} vé <Box component="span" sx={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748b' }}>({wizard.images.length} ảnh)</Box>
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                Hợp lệ sẵn sàng:
                            </Typography>
                            <Chip
                                size="small"
                                label={`${confirmableCount} / ${totalRowsCount} vé`}
                                sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    bgcolor: confirmableCount > 0 ? '#dcfce7' : '#f1f5f9',
                                    color: confirmableCount > 0 ? '#15803d' : '#64748b',
                                    border: '1px solid',
                                    borderColor: confirmableCount > 0 ? '#bbf7d0' : '#e2e8f0',
                                }}
                            />
                        </Box>
                    </Stack>
                </Stack>
            </Box>

            {/* Lines breakdown: Phân bổ theo từng nhà đài - Gọn gàng & có thanh tiến độ */}
            {lines.length > 0 && (
                <Box sx={{ px: 2, py: 1.25, bgcolor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                    <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                            <ConfirmationNumberOutlinedIcon sx={{ color: '#2563eb', fontSize: 15 }} />
                            <Typography variant="caption" fontWeight={800} color="#334155" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                Tiến độ phân bổ theo nhà đài ({lines.length} đài)
                            </Typography>
                        </Stack>
                        {activeSelectedLine && (
                            <Typography variant="caption" color="#2563eb" sx={{ fontSize: '0.725rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                🎯 Đài vé đang chọn: <strong>{stationLabel(activeSelectedLine.lotteryStationId)}</strong>
                            </Typography>
                        )}
                    </Stack>

                    <Grid container spacing={1}>
                        {lines.map((line, idx) => {
                            const stationName = stationLabel(line.lotteryStationId);
                            const declared = line.declareQuantity || 0;
                            const scannedValid = wizard.rows.filter(
                                (r) => r.stationId === line.lotteryStationId && wizard.isRowConfirmable(r)
                            ).length;
                            const isSelected = selectedStationId === line.lotteryStationId;
                            const percent = declared > 0 ? Math.round((scannedValid / declared) * 100) : 0;
                            const isComplete = scannedValid === declared && declared > 0;
                            const isOver = scannedValid > declared;

                            return (
                                <Grid
                                    key={`${line.id}-${idx}`}
                                    size={{
                                        xs: 12,
                                        sm: lines.length === 1 ? 12 : 6,
                                        md: lines.length <= 2 ? 6 : lines.length === 3 ? 4 : 3,
                                    }}
                                >
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 1.25,
                                            borderRadius: '9px',
                                            border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                                            bgcolor: isSelected ? '#eff6ff' : '#ffffff',
                                            boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.12)' : 'none',
                                            transition: 'all 0.15s ease-in-out',
                                        }}
                                    >
                                        <Stack spacing={0.75}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                                <Stack direction="row" spacing={0.6} alignItems="center" sx={{ minWidth: 0 }}>
                                                    <Typography
                                                        variant="subtitle2"
                                                        fontWeight={800}
                                                        color={isSelected ? '#1d4ed8' : '#0f172a'}
                                                        noWrap
                                                        sx={{ fontSize: '0.8125rem' }}
                                                    >
                                                        {stationName}
                                                    </Typography>
                                                    {renderBatchTypeChip(line.batchType)}
                                                </Stack>

                                                {isSelected ? (
                                                    <Chip
                                                        size="small"
                                                        label="Vé đang chọn"
                                                        sx={{
                                                            height: 18,
                                                            fontSize: '0.625rem',
                                                            fontWeight: 800,
                                                            bgcolor: '#2563eb',
                                                            color: '#ffffff',
                                                        }}
                                                    />
                                                ) : (
                                                    <Chip
                                                        size="small"
                                                        label={isComplete ? 'Đã đủ' : isOver ? `Vượt +${scannedValid - declared}` : `Thiếu ${declared - scannedValid}`}
                                                        sx={{
                                                            height: 18,
                                                            fontSize: '0.625rem',
                                                            fontWeight: 700,
                                                            bgcolor: isComplete ? '#dcfce7' : isOver ? '#fef3c7' : '#f1f5f9',
                                                            color: isComplete ? '#15803d' : isOver ? '#b45309' : '#64748b',
                                                        }}
                                                    />
                                                )}
                                            </Stack>

                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.725rem' }}>
                                                    Khai báo: <strong>{declared} vé</strong>
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        fontSize: '0.725rem',
                                                        fontWeight: 800,
                                                        color: isComplete ? '#15803d' : isOver ? '#b45309' : isSelected ? '#1d4ed8' : '#475569',
                                                    }}
                                                >
                                                    Đã quét: {scannedValid} / {declared} ({percent}%)
                                                </Typography>
                                            </Stack>

                                            {/* Thanh tiến độ */}
                                            <Box
                                                sx={{
                                                    width: '100%',
                                                    height: 5,
                                                    bgcolor: isSelected ? '#dbeafe' : '#e2e8f0',
                                                    borderRadius: 3,
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        height: '100%',
                                                        width: `${Math.min(100, percent)}%`,
                                                        bgcolor: isComplete ? '#16a34a' : isOver ? '#d97706' : '#2563eb',
                                                        borderRadius: 3,
                                                        transition: 'width 0.3s ease',
                                                    }}
                                                />
                                            </Box>
                                        </Stack>
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Box>
            )}
        </Paper>
    );
};

export const OcrTicketImportDialog = ({
    open,
    onClose,
    onImported,
    prefillBatch,
    prefillLine,
    resolveStationName,
    restoreFromDraft = false,
    restoreSelectedImportBatchId = null,
    onDraftRestored,
}: OcrTicketImportDialogProps) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const wizard = useOcrImportWizard({
        open,
        prefillBatch,
        prefillLine,
        restoreFromDraft,
        restoreSelectedImportBatchId,
        onDraftRestored,
    });
    const [fieldSelection, setFieldSelection] = useState<OcrFieldSelection | null>(null);
    const [activeSourceImageGroup, setActiveSourceImageGroup] = useState<OcrReviewImageGroup | null>(null);
    const [ocrReady, setOcrReady] = useState<boolean | null>(null);
    const [ocrReadyLoading, setOcrReadyLoading] = useState(false);
    const [ocrServiceReady, setOcrServiceReady] = useState<boolean | null>(null);
    const [ocrServiceMessage, setOcrServiceMessage] = useState<string | null>(null);
    const [ocrServiceLoading, setOcrServiceLoading] = useState(false);
    const [isInvoiceUploading, setIsInvoiceUploading] = useState(false);
    const [isTicketListUploading, setIsTicketListUploading] = useState(false);
    const { data: activeSuppliers = [] } = useActiveSuppliers(open);
    const { data: timePolicy } = useImportBatchTimePolicy();
    const returnBufferMinutes =
        timePolicy?.returnBufferMinutes ?? DEFAULT_RETURN_BUFFER_MINUTES;
    const { data: stationsRes } = useStations({ limit: 1000 });
    const stations = useMemo(() => {
        const list = stationsRes?.data?.recordList ?? [];
        return list.map((station) => ({
            id: Number(station.id),
            name: station.name,
            code: station.code,
        }));
    }, [stationsRes]);

    const selectedSupplier = useMemo(
        () => activeSuppliers.find((s) => s.id === wizard.supplierId),
        [activeSuppliers, wizard.supplierId]
    );

    const eligibleBatchOptions = useMemo(
        () =>
            filterEligibleOcrBatches(wizard.batchOptions, {
                supplierId: wizard.supplierId,
                returnCutOffTime: selectedSupplier?.returnCutOffTime,
                returnBufferMinutes,
            }),
        [
            wizard.batchOptions,
            wizard.supplierId,
            selectedSupplier?.returnCutOffTime,
            returnBufferMinutes,
        ]
    );

    const blockedByIntakeCount = useMemo(
        () =>
            countOcrBatchesBlockedByIntake(wizard.batchOptions, {
                supplierId: wizard.supplierId,
                returnCutOffTime: selectedSupplier?.returnCutOffTime,
                returnBufferMinutes,
            }),
        [
            wizard.batchOptions,
            wizard.supplierId,
            selectedSupplier?.returnCutOffTime,
            returnBufferMinutes,
        ]
    );

    const intakeClosedHint = useMemo(() => {
        if (blockedByIntakeCount <= 0 || !selectedSupplier) {
            return null;
        }
        return buildImportIntakeClosedMessage({
            supplierName: selectedSupplier.name,
            returnCutOffTime: selectedSupplier.returnCutOffTime,
            returnBufferMinutes,
            drawDate: dayjs().format('YYYY-MM-DD'),
        });
    }, [blockedByIntakeCount, selectedSupplier, returnBufferMinutes]);

    const batchReadyForScan = wizard.selectedImportBatchId != null;

    const canUploadImages =
        ocrReady !== false &&
        ocrServiceReady !== false &&
        wizard.supplierId != null &&
        batchReadyForScan &&
        !wizard.hasPreviousScan;

    const requireBatchOrEvidenceMessage =
        'Vui lòng chọn phiếu nhập lô trước khi tải ảnh vé.';

    const requireFinishPreviousScanMessage =
        'Vui lòng xem lại và hoàn tất kết quả OCR cũ (hoặc xóa bản quét cũ) trước khi tải ảnh vé mới.';

    useEffect(() => {
        if (wizard.loadingBatches) {
            return;
        }
        if (wizard.selectedImportBatchId == null || wizard.supplierId == null) {
            return;
        }
        if (eligibleBatchOptions.some((option) => option.id === wizard.selectedImportBatchId)) {
            return;
        }
        // Prefill / restore batch may be past giờ hạn — clear so user must create a new slip.
        wizard.selectDraftBatch(null);
    }, [eligibleBatchOptions, wizard.selectedImportBatchId, wizard.supplierId, wizard.loadingBatches]);

    useEffect(() => {
        if (!open) {
            setOcrReady(null);
            setOcrServiceReady(null);
            setOcrServiceMessage(null);
            return;
        }
        let cancelled = false;
        setOcrReadyLoading(true);
        setOcrServiceLoading(true);
        getOcrTemplateDefaultReady()
            .then((ready) => {
                if (!cancelled) {
                    setOcrReady(Boolean(ready?.ready));
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setOcrReady(false);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setOcrReadyLoading(false);
                }
            });
        getOcrServiceReady()
            .then((status) => {
                if (!cancelled) {
                    setOcrServiceReady(Boolean(status?.ready));
                    setOcrServiceMessage(
                        status?.ready
                            ? null
                            : normalizeOcrScanErrorMessage(status?.message) || OCR_SERVICE_UNAVAILABLE_MESSAGE
                    );
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setOcrServiceReady(false);
                    setOcrServiceMessage(OCR_SERVICE_UNAVAILABLE_MESSAGE);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setOcrServiceLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [open]);

    const stationLabel = (stationId?: number) => {
        if (resolveStationName) {
            return resolveStationName(stationId) || (stationId != null ? `Đài #${stationId}` : '—');
        }
        const matched = stations.find((s) => s.id === stationId);
        return matched?.name || (stationId != null ? `Đài #${stationId}` : '—');
    };

    useEffect(() => {
        if (wizard.step !== 'review') {
            setFieldSelection(null);
            return;
        }
        if (wizard.rows.length === 0) {
            setFieldSelection(null);
            return;
        }
        if (!fieldSelection || !wizard.rows.some((row) => row.key === fieldSelection.rowKey)) {
            setFieldSelection({ rowKey: wizard.rows[0].key, fieldName: null });
        }
    }, [wizard.step, wizard.rows, fieldSelection]);

    const reviewImageGroups = useMemo(
        () => buildReviewImageGroups(wizard.images, wizard.rows),
        [wizard.images, wizard.rows]
    );

    const activeSelectedStationId = useMemo(() => {
        if (!fieldSelection?.rowKey) {
            return wizard.rows[0]?.stationId ?? null;
        }
        const matched = wizard.rows.find((r) => r.key === fieldSelection.rowKey);
        return matched?.stationId ?? wizard.rows[0]?.stationId ?? null;
    }, [fieldSelection, wizard.rows]);

    const [openScanHistoryModal, setOpenScanHistoryModal] = useState(false);
    const [scanHistoryTab, setScanHistoryTab] = useState<'logs' | 'images'>('logs');
    const [selectedHistoryImageId, setSelectedHistoryImageId] = useState<string | null>(null);
    const [logFilterStatus, setLogFilterStatus] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
    const [logSearchQuery, setLogSearchQuery] = useState('');

    const filteredScanLogs = useMemo(() => {
        return wizard.scanLogs.filter((log) => {
            if (logFilterStatus === 'VALID' && log.isValid !== true) return false;
            if (logFilterStatus === 'INVALID' && log.isValid === true) return false;
            if (logSearchQuery.trim()) {
                const q = logSearchQuery.toLowerCase().trim();
                const matchId = log.ocrScanResultId?.toString().includes(q) || log.id?.toString().includes(q);
                const matchNote = log.note?.toLowerCase().includes(q);
                const matchMethod = getScanLogMethodLabel(log.scanMethod).toLowerCase().includes(q);
                const matchEvent = getScanLogEventLabel(log.eventType).label.toLowerCase().includes(q);
                return Boolean(matchId || matchNote || matchMethod || matchEvent);
            }
            return true;
        });
    }, [wizard.scanLogs, logFilterStatus, logSearchQuery]);

    const validLogsCount = useMemo(
        () => wizard.scanLogs.filter((l) => l.isValid === true).length,
        [wizard.scanLogs]
    );
    const invalidLogsCount = useMemo(
        () =>
            wizard.scanLogs.filter(
                (l) => l.isValid === false || l.eventType === 'INVALID_TICKET' || l.eventType === 'VERIFY_FAILED'
            ).length,
        [wizard.scanLogs]
    );

    const handleOpenScanHistory = (tab: 'logs' | 'images' = 'logs') => {
        setScanHistoryTab(tab);
        if (reviewImageGroups.length > 0 && !selectedHistoryImageId) {
            setSelectedHistoryImageId(reviewImageGroups[0].imageId);
        }
        setOpenScanHistoryModal(true);
        void wizard.loadScanLogs();
    };

    const selectedHistoryGroup = useMemo(() => {
        if (!selectedHistoryImageId) return reviewImageGroups[0] ?? null;
        return (
            reviewImageGroups.find((g) => g.imageId === selectedHistoryImageId) ??
            reviewImageGroups[0] ??
            null
        );
    }, [selectedHistoryImageId, reviewImageGroups]);

    const currentActiveGroup = useMemo(() => {
        if (!activeSourceImageGroup) return null;
        return reviewImageGroups.find((g) => g.imageId === activeSourceImageGroup.imageId) ?? activeSourceImageGroup;
    }, [activeSourceImageGroup, reviewImageGroups]);

    const resultRows = useMemo(() => {
        if (!wizard.importResult) {
            return [];
        }
        return (wizard.importResult.batches ?? []).flatMap((batch) =>
            (batch.ticketResults ?? []).map((item, index) => ({
                ...item,
                batchCode: batch.batchCode,
                key: `${batch.importBatchId ?? 'b'}-${item.serialNumber ?? index}-${index}`,
            }))
        );
    }, [wizard.importResult]);

    const confirmableRows = useMemo(
        () => wizard.rows.filter(wizard.isRowConfirmable),
        [wizard.rows, wizard.isRowConfirmable]
    );

    const confirmAllocationSummary = useMemo(() => {
        const map = new Map<
            string,
            {
                key: string;
                stationId?: number | null;
                stationName: string;
                denomination: number;
                count: number;
                totalValue: number;
            }
        >();

        for (const row of confirmableRows) {
            const stationName = stationLabel(row.stationId ?? undefined);
            const denomination = parseTicketPriceNumber(row.ticketType) ?? 10000;
            const key = `${row.stationId ?? 'unknown'}_${denomination}`;
            const existing = map.get(key);
            if (existing) {
                existing.count += 1;
                existing.totalValue += denomination;
            } else {
                map.set(key, {
                    key,
                    stationId: row.stationId,
                    stationName,
                    denomination,
                    count: 1,
                    totalValue: denomination,
                });
            }
        }
        return Array.from(map.values()).sort((a, b) => b.count - a.count);
    }, [confirmableRows, stationLabel]);

    const confirmTotalValue = useMemo(() => {
        return confirmAllocationSummary.reduce((sum, item) => sum + item.totalValue, 0);
    }, [confirmAllocationSummary]);

    const formatReviewFileName = (fileName: string, index: number) => {
        if (!fileName) return `Ảnh #${index + 1}`;
        if (fileName.length > 32) {
            const ext = fileName.includes('.') ? fileName.split('.').pop() : '';
            const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
            return `${nameWithoutExt.slice(0, 20)}...${ext ? `.${ext}` : ''}`;
        }
        return fileName;
    };

    const router = useAdminRouter();
    const scanMoreFileInputRef = useRef<HTMLInputElement>(null);
    const [batchToDiscard, setBatchToDiscard] = useState<OcrBatchOption | null>(null);
    const [openConfirmDiscardScanModal, setOpenConfirmDiscardScanModal] = useState(false);
    const [openFinalConfirmModal, setOpenFinalConfirmModal] = useState(false);

    const handleClose = () => {
        wizard.persistUnimportedDraft();
        wizard.reset();
        onClose();
    };

    const handleEditBatchNavigate = (batchId: number) => {
        wizard.saveDraftForCreateBatch();
        router.push(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batchId));
        onClose();
    };

    const handleNavigateToCreateBatch = () => {
        wizard.saveDraftForCreateBatch();
        const createUrl = wizard.supplierId
            ? `${ROUTES.ADMIN.IMPORT_BATCH.CREATE}?supplierId=${wizard.supplierId}&returnTo=ocr-import&draftKey=${OCR_IMPORT_DRAFT_KEY}`
            : `${ROUTES.ADMIN.IMPORT_BATCH.CREATE}?returnTo=ocr-import&draftKey=${OCR_IMPORT_DRAFT_KEY}`;
        router.push(createUrl);
        onClose();
    };

    const handleScanMoreClick = () => {
        scanMoreFileInputRef.current?.click();
    };

    const [confirmAction, setConfirmAction] = useState<'BACK_TO_UPLOAD' | 'CANCEL_DIALOG' | null>(null);

    const handleRequestClose = () => {
        if (wizard.rows.length > 0 || wizard.images.length > 0) {
            setConfirmAction('CANCEL_DIALOG');
        } else {
            handleClose();
        }
    };

    const handleRequestBack = () => {
        if (wizard.step === 'review' && wizard.rows.length > 0) {
            setConfirmAction('BACK_TO_UPLOAD');
        } else {
            wizard.persistUnimportedDraft();
            wizard.setStep('upload');
        }
    };

    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (canUploadImages) {
            setIsDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (ocrReady === false || ocrServiceReady === false) return;
        if (!wizard.supplierId) {
            toast.warning('Vui lòng chọn Nhà cung cấp trước khi tải ảnh vé.');
            return;
        }
        if (!batchReadyForScan) {
            toast.warning(requireBatchOrEvidenceMessage);
            return;
        }
        if (wizard.hasPreviousScan) {
            toast.warning(requireFinishPreviousScanMessage);
            return;
        }
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            wizard.addImages(e.dataTransfer.files);
        }
    };

    const dialogMaxWidth = wizard.step === 'upload' ? 'md' : 'xl';

    const handleFinish = () => {
        wizard.clearDraft();
        onImported?.();
        handleClose();
    };

    const handleCreateBatchNavigate = () => {
        wizard.saveDraftForCreateBatch();
    };

    return (
        <Dialog
            open={open}
            onClose={handleRequestClose}
            fullWidth
            maxWidth={dialogMaxWidth}
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: 'var(--customShadows-dialog, 0 20px 40px rgba(0,0,0,0.2))',
                },
            }}
        >
            <DialogTitle sx={{ pr: 6, pb: 1.5, pt: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '10px',
                            bgcolor: 'rgba(37,99,235,0.08)',
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <DocumentScannerOutlinedIcon />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
                            Nhập vé bằng OCR
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {stepTitle[wizard.step]}
                        </Typography>
                    </Box>
                </Stack>
                <IconButton
                    onClick={handleRequestClose}
                    sx={{ position: 'absolute', right: 14, top: 14 }}
                    aria-label="Đóng"
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Box
                sx={{
                    px: 3,
                    py: 1.5,
                    bgcolor: 'var(--palette-background-neutral, #f8fafc)',
                    borderTop: '1px solid var(--palette-divider, #f1f5f9)',
                    borderBottom: '1px solid var(--palette-divider, #e2e8f0)',
                }}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    spacing={{ xs: 1, sm: 2.5 }}
                >
                    {STEPS.map((s, index) => {
                        const isResultStep = wizard.step === 'result';
                        const currentStepIdx = isResultStep ? STEPS.length : STEPS.findIndex((st) => st.key === wizard.step);
                        const isCurrent = wizard.step === s.key;
                        const isCompleted = isResultStep || currentStepIdx > index;

                        return (
                            <Stack key={s.key} direction="row" alignItems="center" spacing={1}>
                                <Box
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        bgcolor: isCurrent
                                            ? 'primary.main'
                                            : isCompleted
                                              ? '#10b981'
                                              : 'var(--palette-text-disabled, #94a3b8)',
                                        color: '#fff',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {isCompleted ? '✓' : index + 1}
                                </Box>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontWeight: isCurrent ? 700 : isCompleted ? 600 : 500,
                                        color: isCurrent
                                            ? 'text.primary'
                                            : isCompleted
                                              ? '#059669'
                                              : 'text.secondary',
                                        display: { xs: isCurrent ? 'inline' : 'none', sm: 'inline' },
                                    }}
                                >
                                    {s.label}
                                </Typography>
                                {index < STEPS.length - 1 && (
                                    <Box
                                        sx={{
                                            width: { xs: 12, sm: 24 },
                                            height: 2,
                                            bgcolor: isCompleted
                                                ? '#10b981'
                                                : 'var(--palette-divider, #e2e8f0)',
                                        }}
                                    />
                                )}
                            </Stack>
                        );
                    })}
                </Stack>
            </Box>

            <DialogContent dividers sx={{ minHeight: 380, p: 3 }}>
                {wizard.step === 'upload' && (
                    <Stack spacing={2.5}>
                        {(ocrServiceLoading || ocrReadyLoading) && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 1.75,
                                    borderRadius: '14px',
                                    border: '1px solid #e2e8f0',
                                    bgcolor: '#f8fafc',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                }}
                            >
                                <CircularProgress size={20} sx={{ color: '#64748b' }} />
                                <Typography variant="body2" color="#475569" fontWeight={600}>
                                    {ocrServiceLoading
                                        ? 'Đang kiểm tra kết nối dịch vụ nhận diện vé…'
                                        : 'Đang kiểm tra cấu hình mẫu vé OCR…'}
                                </Typography>
                            </Paper>
                        )}

                        {ocrServiceReady === false && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: { xs: 1.75, sm: 2 },
                                    borderRadius: '14px',
                                    border: '1px solid #fecaca',
                                    bgcolor: '#fff1f2',
                                    background: 'linear-gradient(135deg, #fff1f2 0%, #fff7ed 100%)',
                                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.05)',
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
                                            boxShadow: '0 1px 3px rgba(220, 38, 38, 0.12)',
                                        }}
                                    >
                                        <ReportProblemOutlinedIcon sx={{ fontSize: '1.35rem' }} />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.925rem' }}>
                                                Dịch vụ nhận diện vé (OCR) chưa sẵn sàng
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label="Tạm gián đoạn"
                                                sx={{
                                                    bgcolor: '#fee2e2',
                                                    color: '#b91c1c',
                                                    fontWeight: 700,
                                                    fontSize: '0.725rem',
                                                    border: '1px solid #fecaca',
                                                    height: 24,
                                                }}
                                            />
                                        </Stack>
                                        <Typography variant="body2" color="#475569" sx={{ fontSize: '0.825rem', lineHeight: 1.5 }}>
                                            {ocrServiceMessage || OCR_SERVICE_UNAVAILABLE_MESSAGE}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        )}

                        {ocrReady === false && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: { xs: 1.75, sm: 2 },
                                    borderRadius: '14px',
                                    border: '1px solid #fef08a',
                                    bgcolor: '#fffbeb',
                                    background: 'linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)',
                                    boxShadow: '0 2px 8px rgba(217, 119, 6, 0.05)',
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
                                            bgcolor: '#fef3c7',
                                            color: '#d97706',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            boxShadow: '0 1px 3px rgba(217, 119, 6, 0.12)',
                                        }}
                                    >
                                        <WarningAmberOutlinedIcon sx={{ fontSize: '1.35rem' }} />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.925rem' }}>
                                                Chưa thiết lập mẫu vé mặc định
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label="Cần cấu hình"
                                                sx={{
                                                    bgcolor: '#fef3c7',
                                                    color: '#92400e',
                                                    fontWeight: 700,
                                                    fontSize: '0.725rem',
                                                    border: '1px solid #fde68a',
                                                    height: 24,
                                                }}
                                            />
                                        </Stack>
                                        <Typography variant="body2" color="#475569" sx={{ fontSize: '0.825rem', lineHeight: 1.5 }}>
                                            Hệ thống cần ít nhất một mẫu vé (template) mặc định được thiết lập cho nhà đài để phục vụ tính năng nhận diện vé. Vui lòng kiểm tra và gán mẫu vé mặc định tại danh sách nhà đài trước khi quét.
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Box sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, flexShrink: 0 }}>
                                    <Button
                                        component={Link}
                                        href={ROUTES.ADMIN.TICKETS.PROVIDER}
                                        size="small"
                                        variant="outlined"
                                        color="warning"
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            borderRadius: '999px',
                                            px: 2,
                                            bgcolor: '#ffffff',
                                            borderColor: '#fde68a',
                                            color: '#b45309',
                                            '&:hover': {
                                                borderColor: '#f59e0b',
                                                bgcolor: '#fef3c7',
                                            },
                                        }}
                                    >
                                        Cài đặt mẫu vé
                                    </Button>
                                </Box>
                            </Paper>
                        )}

                        {wizard.prefillLineOption && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: { xs: 1.5, sm: 1.75 },
                                    borderRadius: '14px',
                                    border: '1px solid #bfdbfe',
                                    bgcolor: '#f0f7ff',
                                    background: 'linear-gradient(135deg, #f0f7ff 0%, #f8fafc 100%)',
                                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.04)',
                                }}
                            >
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: '10px',
                                            bgcolor: '#dbeafe',
                                            color: '#2563eb',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.12)',
                                        }}
                                    >
                                        <InfoOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                            <Typography variant="body2" color="#1e293b" fontWeight={600}>
                                                Ngữ cảnh lô đang chọn:
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={`Lô ${formatImportBatchHeaderCode(
                                                    wizard.prefillLineOption.batchCode,
                                                    wizard.prefillLineOption.batchId
                                                )}`}
                                                sx={{
                                                    bgcolor: '#dbeafe',
                                                    color: '#1d4ed8',
                                                    fontWeight: 700,
                                                    fontSize: '0.725rem',
                                                    height: 22,
                                                }}
                                            />
                                            <Typography variant="caption" color="#64748b" fontWeight={600}>
                                                {stationLabel(wizard.prefillLineOption.stationId)} ·{' '}
                                                {dayjs(wizard.prefillLineOption.drawDate).format('DD/MM/YYYY')}
                                            </Typography>
                                        </Stack>
                                        <Typography variant="caption" color="#64748b" sx={{ mt: 0.25, display: 'block' }}>
                                            Quét OCR không bắt buộc gắn dòng lô; bạn có thể tùy chọn chế độ nhập ở bước tiếp theo.
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        )}

                        {wizard.hasPreviousScan && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: { xs: 1.75, sm: 2 },
                                    borderRadius: '14px',
                                    border: '1.5px solid #fed7aa',
                                    bgcolor: '#fffbeb',
                                    background: 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)',
                                    boxShadow: '0 2px 8px rgba(217, 119, 6, 0.06)',
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
                                            bgcolor: '#fef3c7',
                                            color: '#d97706',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            boxShadow: '0 1px 3px rgba(217, 119, 6, 0.12)',
                                        }}
                                    >
                                        <HistoryOutlinedIcon sx={{ fontSize: '1.35rem' }} />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.925rem' }}>
                                                Có bản quét trước đó chưa nhập kho
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={`${wizard.previousScanRowsCount} vé`}
                                                sx={{
                                                    bgcolor: '#ffedd5',
                                                    color: '#c2410c',
                                                    fontWeight: 700,
                                                    fontSize: '0.725rem',
                                                    border: '1px solid #fed7aa',
                                                    height: 24,
                                                }}
                                            />
                                        </Stack>
                                        <Typography variant="body2" color="#475569" sx={{ fontSize: '0.825rem', lineHeight: 1.5 }}>
                                            Có {wizard.previousScanRowsCount} vé đã nhận diện chưa nhập kho.
                                            Bạn cần xem lại và hoàn tất (hoặc xóa bản quét cũ) trước khi tải ảnh vé mới.
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, flexShrink: 0 }}>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<HistoryOutlinedIcon sx={{ fontSize: '1rem !important' }} />}
                                        onClick={wizard.resumePreviousScan}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            borderRadius: '999px',
                                            px: 2,
                                            bgcolor: '#d97706',
                                            color: '#ffffff',
                                            whiteSpace: 'nowrap',
                                            boxShadow: '0 2px 6px rgba(217, 119, 6, 0.2)',
                                            '&:hover': {
                                                bgcolor: '#b45309',
                                            },
                                        }}
                                    >
                                        Xem lại kết quả ({wizard.previousScanRowsCount} vé)
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        startIcon={<DeleteOutlineIcon sx={{ fontSize: '1rem !important' }} />}
                                        onClick={() => setOpenConfirmDiscardScanModal(true)}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            borderRadius: '999px',
                                            px: 1.75,
                                            py: 0.5,
                                            color: '#dc2626',
                                            borderColor: '#fca5a5',
                                            bgcolor: '#ffffff',
                                            whiteSpace: 'nowrap',
                                            boxShadow: '0 1px 2px rgba(220, 38, 38, 0.05)',
                                            '&:hover': {
                                                bgcolor: '#fee2e2',
                                                borderColor: '#f87171',
                                                color: '#b91c1c',
                                            },
                                        }}
                                    >
                                        Xóa bản quét cũ
                                    </Button>
                                </Stack>
                            </Paper>
                        )}

                        {/* Section 1: Thông tin phiếu nhập kho */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 2, sm: 2.5 },
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#f8fafc',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                            }}
                        >
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Box
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: '8px',
                                        bgcolor: 'rgba(37, 99, 235, 0.1)',
                                        color: 'primary.main',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <ReceiptLongOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem' }}>
                                        1. Thông tin tiếp nhận kho
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                        Chọn nhà cung cấp và phiếu nhập lô để tiếp nhận vé (hỗ trợ phiếu nháp, đang nhập hoặc đã nhập một phần)
                                    </Typography>
                                </Box>
                            </Stack>

                            <FormControl fullWidth size="small" required error={!wizard.supplierId && wizard.images.length > 0}>
                                <InputLabel id="ocr-upload-supplier-select-label">Nhà cung cấp phát hành vé</InputLabel>
                                <Select
                                    labelId="ocr-upload-supplier-select-label"
                                    label="Nhà cung cấp phát hành vé"
                                    value={wizard.supplierId ?? ''}
                                    onChange={(event) => {
                                        const raw = String(event.target.value ?? '');
                                        wizard.setSupplierId(raw === '' ? null : Number(raw));
                                    }}
                                    sx={{
                                        bgcolor: '#ffffff',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                    }}
                                >
                                    <MenuItem value="">
                                        <em>-- Chọn nhà cung cấp phát hành vé --</em>
                                    </MenuItem>
                                    {activeSuppliers.map((supplier) => (
                                        <MenuItem key={supplier.id} value={supplier.id}>
                                            {supplier.name} ({supplier.code})
                                        </MenuItem>
                                    ))}
                                </Select>
                                {!wizard.supplierId && (
                                    <FormHelperText sx={{ color: 'text.secondary' }}>
                                        Vui lòng chọn nhà cung cấp để tiếp tục chọn phiếu nhập lô
                                    </FormHelperText>
                                )}
                            </FormControl>

                            {wizard.supplierId != null && (
                                <Stack spacing={1.25}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="body2" fontWeight={700} color="#334155">
                                                Phiếu nhập lô tiếp nhận
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label="Bắt buộc"
                                                sx={{
                                                    height: 20,
                                                    fontSize: '0.675rem',
                                                    fontWeight: 700,
                                                    bgcolor: '#fee2e2',
                                                    color: '#b91c1c',
                                                }}
                                            />
                                        </Stack>
                                    </Stack>

                                    {wizard.loadingBatches ? (
                                        <Stack alignItems="center" py={2}>
                                            <CircularProgress size={24} />
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                                Đang tải danh sách phiếu nhập…
                                            </Typography>
                                        </Stack>
                                    ) : eligibleBatchOptions.length === 0 ? (
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2.25,
                                                borderRadius: '12px',
                                                bgcolor: '#fffbeb',
                                                border: '1px solid #fef08a',
                                                display: 'flex',
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                alignItems: { xs: 'flex-start', sm: 'center' },
                                                justifyContent: 'space-between',
                                                gap: 2,
                                            }}
                                        >
                                            <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flex: 1 }}>
                                                <WarningAmberOutlinedIcon sx={{ color: '#d97706', fontSize: '1.4rem', flexShrink: 0, mt: 0.25 }} />
                                                <Box>
                                                    <Typography variant="body2" color="#92400e" fontWeight={700} sx={{ lineHeight: 1.4 }}>
                                                        {blockedByIntakeCount > 0
                                                            ? 'Phiếu nhập lô hiện có đã quá thời hạn cho phép tiếp nhận vé.'
                                                            : 'Nhà cung cấp này chưa có phiếu nhập lô nào đang mở để tiếp nhận vé.'}
                                                    </Typography>
                                                    <Typography variant="caption" color="#a16207" sx={{ display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                                                        {intakeClosedHint
                                                            ? intakeClosedHint
                                                            : 'Vui lòng khai báo phiếu nhập lô mới cho nhà cung cấp trước khi thực hiện quét và nhập vé vào kho.'}
                                                    </Typography>
                                                </Box>
                                            </Stack>

                                            <Button
                                                variant="contained"
                                                size="small"
                                                startIcon={<AddCircleOutlineIcon />}
                                                onClick={handleNavigateToCreateBatch}
                                                sx={{
                                                    whiteSpace: 'nowrap',
                                                    fontWeight: 700,
                                                    fontSize: '0.8rem',
                                                    textTransform: 'none',
                                                    borderRadius: '8px',
                                                    bgcolor: '#d97706',
                                                    color: '#ffffff',
                                                    px: 2,
                                                    py: 0.75,
                                                    boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
                                                    '&:hover': {
                                                        bgcolor: '#b45309',
                                                    },
                                                    alignSelf: { xs: 'stretch', sm: 'center' },
                                                }}
                                            >
                                                Khai báo phiếu nhập
                                            </Button>
                                        </Paper>
                                    ) : (
                                        <Stack spacing={1}>
                                            {eligibleBatchOptions.map((option) => {
                                                const selected = wizard.selectedImportBatchId === option.id;
                                                const isReceiving = option.status === 'RECEIVING';
                                                const isPartial = option.status === 'PARTIALLY_IMPORTED';
                                                return (
                                                    <Paper
                                                        key={option.id}
                                                        elevation={0}
                                                        onClick={() => wizard.selectDraftBatch(option.id)}
                                                        sx={{
                                                            border: selected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                                            borderRadius: '12px',
                                                            p: 1.5,
                                                            cursor: 'pointer',
                                                            bgcolor: selected ? '#eff6ff' : '#ffffff',
                                                            boxShadow: selected ? '0 2px 8px rgba(37, 99, 235, 0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                                                            transition: 'all 0.15s ease-in-out',
                                                            '&:hover': {
                                                                borderColor: selected ? '#2563eb' : '#94a3b8',
                                                                bgcolor: selected ? '#eff6ff' : '#f8fafc',
                                                            },
                                                        }}
                                                    >
                                                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
                                                            <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" sx={{ flex: 1 }}>
                                                                <Chip
                                                                    size="small"
                                                                    label={formatImportBatchHeaderCode(option.batchCode, option.id)}
                                                                    sx={{
                                                                        fontWeight: 800,
                                                                        fontSize: '0.8rem',
                                                                        bgcolor: selected ? '#2563eb' : '#f1f5f9',
                                                                        color: selected ? '#ffffff' : '#1e293b',
                                                                        borderRadius: '6px',
                                                                    }}
                                                                />
                                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                                    <CalendarTodayOutlinedIcon sx={{ fontSize: '0.875rem', color: '#64748b' }} />
                                                                    <Typography variant="body2" color="#475569" fontWeight={600}>
                                                                        Ngày quay: {dayjs(option.drawDate).format('DD/MM/YYYY')}
                                                                    </Typography>
                                                                </Stack>
                                                                {isReceiving ? (
                                                                    <Chip
                                                                        size="small"
                                                                        label="Đang nhập"
                                                                        variant="outlined"
                                                                        sx={{
                                                                            height: 22,
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: 700,
                                                                            borderColor: '#93c5fd',
                                                                            color: '#1d4ed8',
                                                                            bgcolor: '#eff6ff',
                                                                        }}
                                                                    />
                                                                ) : isPartial ? (
                                                                    <Chip
                                                                        size="small"
                                                                        label="Đã nhập 1 nửa"
                                                                        variant="outlined"
                                                                        sx={{
                                                                            height: 22,
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: 700,
                                                                            borderColor: '#fde68a',
                                                                            color: '#b45309',
                                                                            bgcolor: '#fefce8',
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <Chip
                                                                        size="small"
                                                                        label="Bản nháp"
                                                                        variant="outlined"
                                                                        sx={{
                                                                            height: 22,
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: 600,
                                                                            borderColor: '#cbd5e1',
                                                                            color: '#64748b',
                                                                            bgcolor: '#f8fafc',
                                                                        }}
                                                                    />
                                                                )}
                                                            </Stack>

                                                            <Stack direction="row" spacing={1} alignItems="center">
                                                                {selected ? (
                                                                    <Chip
                                                                        size="small"
                                                                        icon={<CheckCircleIcon sx={{ fontSize: '1rem !important', color: '#2563eb !important' }} />}
                                                                        label="Đang chọn"
                                                                        sx={{
                                                                            bgcolor: '#dbeafe',
                                                                            color: '#1d4ed8',
                                                                            fontWeight: 700,
                                                                            fontSize: '0.75rem',
                                                                            height: 28,
                                                                            px: 0.5,
                                                                            border: '1px solid #bfdbfe',
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            wizard.selectDraftBatch(option.id);
                                                                        }}
                                                                        sx={{
                                                                            textTransform: 'none',
                                                                            fontWeight: 600,
                                                                            borderRadius: '8px',
                                                                            fontSize: '0.775rem',
                                                                            py: 0.25,
                                                                        }}
                                                                    >
                                                                        Chọn
                                                                    </Button>
                                                                )}
                                                                <Tooltip title="Chỉnh sửa phiếu nhập này">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            handleEditBatchNavigate(option.id);
                                                                        }}
                                                                        sx={{
                                                                            p: 0.75,
                                                                            borderRadius: '8px',
                                                                            color: '#475569',
                                                                            bgcolor: '#f1f5f9',
                                                                            '&:hover': { bgcolor: '#e2e8f0', color: '#0f172a' },
                                                                        }}
                                                                    >
                                                                        <EditOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Hủy bỏ phiếu nhập này">
                                                                    <IconButton
                                                                        size="small"
                                                                        color="error"
                                                                        disabled={wizard.discardingBatchId === option.id}
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            setBatchToDiscard(option);
                                                                        }}
                                                                        sx={{
                                                                            p: 0.75,
                                                                            borderRadius: '8px',
                                                                            '&:hover': { bgcolor: '#fee2e2' },
                                                                        }}
                                                                    >
                                                                        {wizard.discardingBatchId === option.id ? (
                                                                            <CircularProgress size={16} />
                                                                        ) : (
                                                                            <DeleteOutlineIcon sx={{ fontSize: '1.15rem' }} />
                                                                        )}
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Stack>
                                                        </Stack>
                                                    </Paper>
                                                );
                                            })}
                                        </Stack>
                                    )}

                                    {!wizard.selectedImportBatchId && eligibleBatchOptions.length > 0 && (
                                        <FormHelperText sx={{ color: '#d97706', fontWeight: 600, mx: 0 }}>
                                            ⚠️ Vui lòng nhấp chọn một phiếu nhập lô ở trên để tiếp tục
                                        </FormHelperText>
                                    )}
                                </Stack>
                            )}
                        </Paper>

                        {/* Section 2: Tải ảnh vé số */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 2, sm: 2.5 },
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                            }}
                        >
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Box
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: '8px',
                                        bgcolor: 'rgba(37, 99, 235, 0.1)',
                                        color: 'primary.main',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <AddPhotoAlternateOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem' }}>
                                        2. Tải ảnh vé số
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                        Tải lên một hoặc nhiều hình ảnh chứa vé số để hệ thống tự động nhận diện
                                    </Typography>
                                </Box>
                            </Stack>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                hidden
                                disabled={!canUploadImages}
                                onChange={(event) => {
                                    if (!wizard.supplierId) {
                                        toast.warning('Vui lòng chọn Nhà cung cấp trước khi tải ảnh vé.');
                                        event.target.value = '';
                                        return;
                                    }
                                    if (!batchReadyForScan) {
                                        toast.warning(requireBatchOrEvidenceMessage);
                                        event.target.value = '';
                                        return;
                                    }
                                    if (wizard.hasPreviousScan) {
                                        toast.warning(requireFinishPreviousScanMessage);
                                        event.target.value = '';
                                        return;
                                    }
                                    if (event.target.files) {
                                        wizard.addImages(event.target.files);
                                        event.target.value = '';
                                    }
                                }}
                            />

                            {wizard.images.length === 0 ? (
                                <Stack spacing={2}>
                                    <Box
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => {
                                            if (ocrReady === false || ocrServiceReady === false) return;
                                            if (!wizard.supplierId) {
                                                toast.warning('Vui lòng chọn Nhà cung cấp trước khi tải ảnh vé.');
                                                return;
                                            }
                                            if (!batchReadyForScan) {
                                                toast.warning(requireBatchOrEvidenceMessage);
                                                return;
                                            }
                                            if (wizard.hasPreviousScan) {
                                                toast.warning(requireFinishPreviousScanMessage);
                                                return;
                                            }
                                            fileInputRef.current?.click();
                                        }}
                                        sx={{
                                            border: isDragOver ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                                            borderRadius: '14px',
                                            p: { xs: 3, sm: 4.5 },
                                            textAlign: 'center',
                                            cursor: !canUploadImages ? 'not-allowed' : 'pointer',
                                            bgcolor: isDragOver ? '#eff6ff' : '#f8fafc',
                                            opacity: !canUploadImages ? 0.65 : 1,
                                            transition: 'all 0.2s ease-in-out',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            '&:hover': {
                                                borderColor: !canUploadImages ? '#cbd5e1' : '#2563eb',
                                                bgcolor: !canUploadImages ? '#f8fafc' : '#f0f7ff',
                                                transform: canUploadImages ? 'translateY(-1px)' : 'none',
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: '50%',
                                                bgcolor: isDragOver ? '#dbeafe' : 'rgba(37, 99, 235, 0.08)',
                                                color: 'primary.main',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                mb: 1.75,
                                                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.12)',
                                            }}
                                        >
                                            <CloudUploadOutlinedIcon sx={{ fontSize: 34 }} />
                                        </Box>
                                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ mb: 0.75 }}>
                                            Kéo và thả ảnh vé vào đây, hoặc nhấn để chọn tệp
                                        </Typography>

                                        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" sx={{ mb: 2, gap: 0.75 }}>
                                            <Chip
                                                size="small"
                                                label="JPG, PNG, WEBP"
                                                sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, fontSize: '0.725rem' }}
                                            />
                                            <Chip
                                                size="small"
                                                label="Tối đa 15MB / ảnh"
                                                sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, fontSize: '0.725rem' }}
                                            />
                                            <Chip
                                                size="small"
                                                label="Quét được nhiều vé / ảnh"
                                                sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, fontSize: '0.725rem' }}
                                            />
                                        </Stack>

                                        <Button
                                            variant="contained"
                                            size="medium"
                                            disabled={!canUploadImages}
                                            startIcon={<AddPhotoAlternateOutlinedIcon />}
                                            sx={{
                                                borderRadius: '10px',
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                px: 3,
                                                py: 1,
                                                pointerEvents: 'none',
                                                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                                            }}
                                        >
                                            Chọn ảnh từ thiết bị
                                        </Button>
                                    </Box>

                                    {/* OCR Quality Tips */}
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 1.75,
                                            borderRadius: '12px',
                                            border: '1px solid #e0e7ff',
                                            bgcolor: '#f5f7ff',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 1.5,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '8px',
                                                bgcolor: '#e0e7ff',
                                                color: '#4338ca',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                mt: 0.25,
                                            }}
                                        >
                                            <TipsAndUpdatesOutlinedIcon sx={{ fontSize: '1.2rem' }} />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="subtitle2" fontWeight={800} color="#1e1b4b" sx={{ fontSize: '0.85rem', mb: 0.5 }}>
                                                Mẹo chụp ảnh giúp OCR nhận diện chính xác nhất:
                                            </Typography>
                                            <Stack spacing={0.35}>
                                                <Typography variant="caption" color="#3730a3" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.785rem' }}>
                                                    • <strong>Góc chụp thẳng & phẳng:</strong> Đặt vé trên mặt phẳng, hướng camera vuông góc trực diện.
                                                </Typography>
                                                <Typography variant="caption" color="#3730a3" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.785rem' }}>
                                                    • <strong>Rõ nét & đủ sáng:</strong> Đảm bảo nhìn rõ dãy số dự thưởng, số sê-ri và ngày mở thưởng, tránh rung mờ.
                                                </Typography>
                                                <Typography variant="caption" color="#3730a3" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.785rem' }}>
                                                    • <strong>Tránh lóa sáng & bóng mờ:</strong> Hạn chế đèn flash chói trực tiếp hoặc bóng bàn tay che khuất thông tin vé.
                                                </Typography>
                                            </Stack>
                                        </Box>
                                    </Paper>
                                </Stack>
                            ) : (
                                <Stack spacing={2}>
                                    {/* Selected Images Action Bar */}
                                    <Stack
                                        direction={{ xs: 'column', sm: 'row' }}
                                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                                        justifyContent="space-between"
                                        spacing={1.5}
                                        sx={{
                                            p: 1.5,
                                            bgcolor: '#f8fafc',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={1.25}>
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '8px',
                                                    bgcolor: '#dbeafe',
                                                    color: '#2563eb',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <DocumentScannerOutlinedIcon sx={{ fontSize: '1.2rem' }} />
                                            </Box>
                                            <Box>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                                        Đã chọn {wizard.images.length} ảnh vé
                                                    </Typography>
                                                    <Chip
                                                        size="small"
                                                        label="Sẵn sàng quét"
                                                        sx={{
                                                            bgcolor: '#dcfce7',
                                                            color: '#15803d',
                                                            fontWeight: 700,
                                                            fontSize: '0.7rem',
                                                            height: 22,
                                                            border: '1px solid #bbf7d0',
                                                        }}
                                                    />
                                                </Stack>
                                                <Typography variant="caption" color="text.secondary">
                                                    Bạn có thể thêm ảnh hoặc nhấn &quot;Bắt đầu quét OCR&quot; bên dưới
                                                </Typography>
                                            </Box>
                                        </Stack>
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<AddPhotoAlternateOutlinedIcon />}
                                                onClick={() => {
                                                    if (!wizard.supplierId) {
                                                        toast.warning('Vui lòng chọn Nhà cung cấp trước khi tải ảnh vé.');
                                                        return;
                                                    }
                                                    if (!batchReadyForScan) {
                                                        toast.warning(requireBatchOrEvidenceMessage);
                                                        return;
                                                    }
                                                    if (wizard.hasPreviousScan) {
                                                        toast.warning(requireFinishPreviousScanMessage);
                                                        return;
                                                    }
                                                    fileInputRef.current?.click();
                                                }}
                                                disabled={wizard.scanning || !canUploadImages}
                                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                                            >
                                                Thêm ảnh
                                            </Button>
                                            <Button
                                                size="small"
                                                color="error"
                                                variant="text"
                                                startIcon={<DeleteOutlineIcon />}
                                                onClick={wizard.clearImages}
                                                disabled={wizard.scanning}
                                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                                            >
                                                Xóa tất cả
                                            </Button>
                                        </Stack>
                                    </Stack>

                                    {/* Selected Images Grid */}
                                    <Box
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: {
                                                xs: 'repeat(2, 1fr)',
                                                sm: 'repeat(3, 1fr)',
                                                md: 'repeat(4, 1fr)',
                                            },
                                            gap: 1.75,
                                            maxHeight: 380,
                                            overflowY: 'auto',
                                            p: 0.5,
                                        }}
                                    >
                                        {wizard.images.map((image) => (
                                            <Box
                                                key={image.id}
                                                sx={{
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '12px',
                                                    overflow: 'hidden',
                                                    position: 'relative',
                                                    bgcolor: '#ffffff',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                                        borderColor: '#cbd5e1',
                                                    },
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        position: 'relative',
                                                        width: '100%',
                                                        height: 130,
                                                        bgcolor: '#f8fafc',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <Box
                                                        component="img"
                                                        src={image.previewUrl}
                                                        alt={image.file.name}
                                                        sx={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            transition: 'transform 0.2s',
                                                            '&:hover': {
                                                                transform: 'scale(1.03)',
                                                            },
                                                        }}
                                                    />
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => wizard.removeImage(image.id)}
                                                        disabled={wizard.scanning}
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 6,
                                                            right: 6,
                                                            bgcolor: 'rgba(255,255,255,0.85)',
                                                            backdropFilter: 'blur(4px)',
                                                            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                                                            p: 0.5,
                                                            '&:hover': {
                                                                bgcolor: '#ffffff',
                                                                color: 'error.main',
                                                            },
                                                        }}
                                                    >
                                                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                    {image.file.size > 0 && (
                                                        <Box
                                                            sx={{
                                                                position: 'absolute',
                                                                bottom: 6,
                                                                left: 6,
                                                                bgcolor: 'rgba(15, 23, 42, 0.75)',
                                                                color: '#ffffff',
                                                                borderRadius: '6px',
                                                                px: 0.75,
                                                                py: 0.2,
                                                                fontSize: '0.6875rem',
                                                                fontWeight: 600,
                                                                backdropFilter: 'blur(3px)',
                                                            }}
                                                        >
                                                            {formatFileSize(image.file.size)}
                                                        </Box>
                                                    )}
                                                    {image.status === 'scanning' && (
                                                        <Box
                                                            sx={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                bgcolor: 'rgba(255,255,255,0.85)',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: 0.75,
                                                                backdropFilter: 'blur(2px)',
                                                            }}
                                                        >
                                                            <CircularProgress size={24} />
                                                            <Typography
                                                                variant="caption"
                                                                fontWeight={700}
                                                                color="primary"
                                                            >
                                                                Đang quét OCR…
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                                <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    <Typography
                                                        variant="caption"
                                                        fontWeight={700}
                                                        color="#1e293b"
                                                        noWrap
                                                        title={image.file.name}
                                                    >
                                                        {image.file.name}
                                                    </Typography>
                                                    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" sx={{ gap: 0.5 }}>
                                                        {image.status === 'pending' && (
                                                            <Chip
                                                                size="small"
                                                                label="Chờ quét"
                                                                sx={{
                                                                    height: 20,
                                                                    fontSize: '0.675rem',
                                                                    fontWeight: 600,
                                                                    bgcolor: '#f1f5f9',
                                                                    color: '#64748b',
                                                                }}
                                                            />
                                                        )}
                                                        {image.status === 'done' && (
                                                            <Chip
                                                                size="small"
                                                                label="Đã nhận diện"
                                                                sx={{
                                                                    height: 20,
                                                                    fontSize: '0.675rem',
                                                                    fontWeight: 700,
                                                                    bgcolor: '#dcfce7',
                                                                    color: '#15803d',
                                                                    border: '1px solid #bbf7d0',
                                                                }}
                                                            />
                                                        )}
                                                        {image.status === 'error' && (
                                                            <Tooltip title={image.error || 'Lỗi quét'}>
                                                                <Chip
                                                                    size="small"
                                                                    label={image.error || 'Lỗi quét'}
                                                                    sx={{
                                                                        height: 20,
                                                                        fontSize: '0.675rem',
                                                                        fontWeight: 700,
                                                                        bgcolor: '#fee2e2',
                                                                        color: '#b91c1c',
                                                                        maxWidth: '100%',
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                        )}
                                                        {image.durationMs != null && (
                                                            <Chip
                                                                size="small"
                                                                icon={<TimerOutlinedIcon sx={{ fontSize: '12px !important', color: '#0284c7 !important' }} />}
                                                                label={`${(image.durationMs / 1000).toFixed(1)}s`}
                                                                sx={{
                                                                    height: 20,
                                                                    fontSize: '0.675rem',
                                                                    fontWeight: 700,
                                                                    bgcolor: '#f0f9ff',
                                                                    color: '#0284c7',
                                                                    border: '1px solid #bae6fd',
                                                                }}
                                                            />
                                                        )}
                                                    </Stack>
                                                    {image.scannedAt && (
                                                        <Stack
                                                            direction="row"
                                                            spacing={0.5}
                                                            alignItems="center"
                                                            title="Thời gian quét hoàn tất"
                                                            sx={{ color: '#64748b', mt: 0.25 }}
                                                        >
                                                            <AccessTimeOutlinedIcon sx={{ fontSize: 13, color: '#94a3b8', flexShrink: 0 }} />
                                                            <Typography
                                                                variant="caption"
                                                                sx={{ fontSize: '0.6875rem', fontWeight: 500, lineHeight: 1.2, color: '#64748b' }}
                                                                noWrap
                                                            >
                                                                {dayjs(image.scannedAt).isValid()
                                                                    ? dayjs(image.scannedAt).format('HH:mm:ss DD/MM/YYYY')
                                                                    : image.scannedAt}
                                                            </Typography>
                                                        </Stack>
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}

                                        {/* Mini Dropzone to add more */}
                                        <Box
                                            onClick={() => {
                                                if (canUploadImages) {
                                                    fileInputRef.current?.click();
                                                }
                                            }}
                                            sx={{
                                                border: '2px dashed #cbd5e1',
                                                borderRadius: '12px',
                                                minHeight: 180,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 1,
                                                cursor: canUploadImages ? 'pointer' : 'not-allowed',
                                                bgcolor: '#f8fafc',
                                                transition: 'all 0.15s',
                                                '&:hover': {
                                                    borderColor: '#2563eb',
                                                    bgcolor: '#f0f7ff',
                                                },
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '50%',
                                                    bgcolor: '#e2e8f0',
                                                    color: '#64748b',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 20 }} />
                                            </Box>
                                            <Typography variant="caption" fontWeight={700} color="#475569">
                                                + Thêm ảnh khác
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Stack>
                            )}
                        </Paper>
                    </Stack>
                )}

                {wizard.step === 'review' && (
                    <Stack spacing={2.5}>
                        <input
                            ref={scanMoreFileInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    void wizard.addImages(e.target.files);
                                    e.target.value = '';
                                }
                            }}
                        />

                        {wizard.pendingImagesCount > 0 && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: 2.5,
                                    bgcolor: '#eff6ff',
                                    border: '1.5px solid #93c5fd',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 1.5,
                                }}
                            >
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '10px',
                                            bgcolor: '#dbeafe',
                                            color: '#2563eb',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <DocumentScannerOutlinedIcon />
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={800} color="#1e40af">
                                            Đã thêm {wizard.pendingImagesCount} ảnh mới chưa quét
                                        </Typography>
                                        <Typography variant="body2" color="#3b82f6" sx={{ fontSize: '0.8125rem' }}>
                                            Nhấn &quot;Tiến hành quét&quot; để AI nhận diện và trích xuất dữ liệu vé từ các ảnh vừa thêm
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        color="inherit"
                                        disabled={wizard.scanning}
                                        onClick={() => {
                                            wizard.images
                                                .filter((img) => img.status === 'pending')
                                                .forEach((img) => wizard.removeImage(img.id));
                                        }}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            borderRadius: 1.5,
                                            borderColor: '#cbd5e1',
                                            color: '#475569',
                                            bgcolor: '#ffffff',
                                            '&:hover': { bgcolor: '#f8fafc' },
                                        }}
                                    >
                                        Hủy ảnh chờ
                                    </Button>
                                    <Button
                                        variant="contained"
                                        size="medium"
                                        startIcon={
                                            wizard.scanning ? (
                                                <CircularProgress size={16} color="inherit" />
                                            ) : (
                                                <DocumentScannerOutlinedIcon />
                                            )
                                        }
                                        disabled={wizard.scanning}
                                        onClick={() => void wizard.scanPendingImages()}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 800,
                                            borderRadius: 2,
                                            px: 2.5,
                                            bgcolor: '#2563eb',
                                            '&:hover': { bgcolor: '#1d4ed8' },
                                        }}
                                    >
                                        {wizard.scanning ? 'Đang quét…' : `Tiến hành quét (${wizard.pendingImagesCount} ảnh)`}
                                    </Button>
                                </Stack>
                            </Paper>
                        )}

                        {wizard.selectedImportBatch ? (
                            <ImportBatchReviewSummaryCard
                                batch={wizard.selectedImportBatch}
                                selectedSupplier={selectedSupplier}
                                wizard={wizard}
                                stationLabel={stationLabel}
                                onOpenScanHistory={handleOpenScanHistory}
                                imageCount={reviewImageGroups.length}
                                selectedStationId={activeSelectedStationId}
                            />
                        ) : (
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                justifyContent="space-between"
                                alignItems={{ xs: 'flex-start', sm: 'center' }}
                                spacing={1.5}
                                sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    bgcolor: 'var(--palette-background-neutral, rgba(145, 158, 171, 0.06))',
                                    border: '1px solid var(--palette-divider, #e2e8f0)',
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                    <Typography variant="body2" fontWeight={600} color="text.secondary">
                                        Nhà cung cấp:
                                    </Typography>
                                    <Chip
                                        size="small"
                                        color="primary"
                                        variant="filled"
                                        label={
                                            selectedSupplier
                                                ? `${selectedSupplier.name} (${selectedSupplier.code})`
                                                : 'Chưa chọn nhà cung cấp'
                                        }
                                        sx={{ fontWeight: 700 }}
                                    />
                                    <Typography variant="body2" fontWeight={600} color="text.secondary">
                                        Phiếu nhập lô:
                                    </Typography>
                                    {wizard.selectedBatch ? (
                                        <Chip
                                            size="small"
                                            color="secondary"
                                            variant="outlined"
                                            label={`${formatImportBatchHeaderCode(
                                                wizard.selectedBatch.batchCode,
                                                wizard.selectedBatch.id
                                            )} · ${dayjs(wizard.selectedBatch.drawDate).format('DD/MM/YYYY')}`}
                                            sx={{ fontWeight: 700 }}
                                        />
                                    ) : (
                                        <Chip
                                            size="small"
                                            color="warning"
                                            variant="outlined"
                                            label="Chưa chọn phiếu nhập lô"
                                            sx={{ fontWeight: 700 }}
                                        />
                                    )}
                                </Stack>
                                <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() =>
                                            wizard.toggleAllConfirmable(
                                                wizard.confirmableCount <
                                                    wizard.rows.filter(wizard.isRowConfirmable).length
                                            )
                                        }
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            borderRadius: '8px',
                                            px: 1.75,
                                            py: 0.75,
                                            borderColor: '#cbd5e1',
                                            color: '#334155',
                                            '&:hover': {
                                                borderColor: '#94a3b8',
                                                bgcolor: '#f1f5f9',
                                            },
                                        }}
                                    >
                                        Chọn tất cả hợp lệ ({wizard.rows.filter(wizard.isRowConfirmable).length})
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={
                                            wizard.scanning ? (
                                                <CircularProgress size={16} color="inherit" />
                                            ) : (
                                                <PhotoLibraryOutlinedIcon sx={{ fontSize: '1.1rem' }} />
                                            )
                                        }
                                        disabled={wizard.scanning}
                                        onClick={() => handleOpenScanHistory('images')}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            borderRadius: '8px',
                                            px: 1.75,
                                            py: 0.75,
                                            bgcolor: '#2563eb',
                                            color: '#ffffff',
                                            boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                                            '&:hover': { bgcolor: '#1d4ed8' },
                                        }}
                                    >
                                        {wizard.scanning ? 'Đang quét…' : `Ảnh đã quét (${reviewImageGroups.length})`}
                                    </Button>
                                </Stack>
                            </Stack>
                        )}

                        {reviewImageGroups.length === 0 ? (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    bgcolor: '#fffbeb',
                                    border: '1px solid #fed7aa',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                }}
                            >
                                <WarningAmberOutlinedIcon sx={{ color: '#d97706', fontSize: '1.35rem' }} />
                                <Typography variant="body2" color="#92400e" fontWeight={600}>
                                    Chưa có ảnh nào để xem lại. Vui lòng quay lại bước tải ảnh để tải ảnh vé lên.
                                </Typography>
                            </Paper>
                        ) : (
                            <>
                                {wizard.rows.every(
                                    (row) => row.status === 'FAILED' || row.status === 'INCOMPLETE'
                                ) &&
                                    wizard.confirmableCount === 0 && (
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                borderRadius: '14px',
                                                bgcolor: '#fff1f2',
                                                border: '1px solid #fecaca',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                mb: 1,
                                            }}
                                        >
                                            <ReportProblemOutlinedIcon sx={{ color: '#dc2626', fontSize: '1.35rem' }} />
                                            <Box>
                                                <Typography variant="subtitle2" color="#991b1b" fontWeight={700}>
                                                    Không nhận diện đủ thông tin hợp lệ
                                                </Typography>
                                                <Typography variant="body2" color="#b91c1c" sx={{ fontSize: '0.825rem' }}>
                                                    Không đọc được đầy đủ thông tin từ ảnh đã quét. Kiểm tra từng ảnh bên dưới hoặc quay lại để chụp lại / nhập vé thủ công.
                                                </Typography>
                                            </Box>
                                        </Paper>
                                    )}
                                <Typography variant="body2" color="text.secondary">
                                    Kiểm tra thông tin từng vé bên dưới. Bấm vào trường thông tin để chỉnh sửa nếu OCR nhận diện chưa chuẩn.
                                </Typography>

                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2,
                                    }}
                                >
                                    {reviewImageGroups.map((group, index) => (
                                        <Box
                                            key={group.imageId}
                                            sx={{
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                borderRadius: 2,
                                                p: 1.5,
                                                bgcolor: 'background.paper',
                                            }}
                                        >
                                            <Stack
                                                direction="row"
                                                alignItems="center"
                                                justifyContent="space-between"
                                                sx={{ mb: 1.5 }}
                                            >
                                                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                                    <Typography
                                                        variant="subtitle1"
                                                        fontWeight={800}
                                                        title={group.fileName}
                                                    >
                                                        Ảnh #{index + 1}: {formatReviewFileName(group.fileName, index)}
                                                    </Typography>
                                                    {group.imageStatus === 'pending' ? (
                                                        <Chip
                                                            size="small"
                                                            label="Chờ quét"
                                                            sx={{
                                                                height: 22,
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                bgcolor: '#fef3c7',
                                                                color: '#b45309',
                                                                border: '1px solid #fde68a',
                                                            }}
                                                        />
                                                    ) : group.imageStatus === 'scanning' ? (
                                                        <Chip
                                                            size="small"
                                                            icon={<CircularProgress size={12} color="inherit" />}
                                                            label="Đang quét…"
                                                            sx={{
                                                                height: 22,
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                bgcolor: '#eff6ff',
                                                                color: '#2563eb',
                                                                border: '1px solid #bfdbfe',
                                                            }}
                                                        />
                                                    ) : (
                                                        <Chip
                                                            size="small"
                                                            label={`${group.rows.length} vé nhận diện`}
                                                            color={group.rows.length > 0 ? 'primary' : 'default'}
                                                            variant="outlined"
                                                            sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }}
                                                        />
                                                    )}
                                                    {group.scannedAt && (
                                                        <Chip
                                                            size="small"
                                                            icon={<AccessTimeOutlinedIcon sx={{ fontSize: '13px !important' }} />}
                                                            label={dayjs(group.scannedAt).isValid() ? dayjs(group.scannedAt).format('HH:mm:ss DD/MM/YYYY') : group.scannedAt}
                                                            variant="outlined"
                                                            sx={{ height: 22, fontSize: '0.7rem', color: 'text.secondary', borderColor: '#e2e8f0' }}
                                                        />
                                                    )}
                                                    {group.durationMs != null && (
                                                        <Chip
                                                            size="small"
                                                            icon={<TimerOutlinedIcon sx={{ fontSize: '13px !important', color: '#0284c7 !important' }} />}
                                                            label={`${(group.durationMs / 1000).toFixed(1)}s`}
                                                            variant="outlined"
                                                            sx={{ height: 22, fontSize: '0.7rem', color: '#0284c7', borderColor: '#bae6fd', bgcolor: '#f0f9ff' }}
                                                        />
                                                    )}
                                                </Stack>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    {group.imageStatus === 'pending' && (
                                                        <>
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                startIcon={
                                                                    wizard.scanning ? (
                                                                        <CircularProgress size={13} color="inherit" />
                                                                    ) : (
                                                                        <DocumentScannerOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                                                                    )
                                                                }
                                                                disabled={wizard.scanning}
                                                                onClick={() => void wizard.scanPendingImages()}
                                                                sx={{
                                                                    textTransform: 'none',
                                                                    fontWeight: 700,
                                                                    borderRadius: 1.5,
                                                                    fontSize: '0.8125rem',
                                                                    bgcolor: '#2563eb',
                                                                    '&:hover': { bgcolor: '#1d4ed8' },
                                                                }}
                                                            >
                                                                {wizard.scanning ? 'Đang quét…' : 'Tiến hành quét'}
                                                            </Button>
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                disabled={wizard.scanning}
                                                                onClick={() => wizard.removeImage(group.imageId)}
                                                                title="Xóa ảnh chờ"
                                                                sx={{ p: 0.5 }}
                                                            >
                                                                <DeleteOutlineIcon fontSize="small" />
                                                            </IconButton>
                                                        </>
                                                    )}
                                                    {group.previewUrl && (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={<VisibilityOutlinedIcon />}
                                                            onClick={() => setActiveSourceImageGroup(group)}
                                                            sx={{
                                                                textTransform: 'none',
                                                                fontWeight: 600,
                                                                borderRadius: 1.5,
                                                                fontSize: '0.8125rem',
                                                            }}
                                                        >
                                                            Xem ảnh gốc chứa vé
                                                        </Button>
                                                    )}
                                                </Stack>
                                            </Stack>
                                            {/* Danh sách thông tin vé hiển thị toàn chiều rộng (full width) */}
                                            <Box sx={{ width: '100%', minWidth: 0 }}>
                                                {group.imageStatus === 'pending' ? (
                                                    <Paper
                                                        elevation={0}
                                                        sx={{
                                                            p: 2.5,
                                                            textAlign: 'center',
                                                            bgcolor: '#f8fafc',
                                                            border: '1px dashed #cbd5e1',
                                                            borderRadius: 2,
                                                        }}
                                                    >
                                                        <Typography variant="body2" color="text.secondary">
                                                            Ảnh đang ở trạng thái chờ. Nhấn nút <strong>&quot;Tiến hành quét&quot;</strong> để AI trích xuất thông tin vé.
                                                        </Typography>
                                                    </Paper>
                                                ) : (
                                                    <OcrReviewResultCards
                                                        rows={group.rows}
                                                        selection={fieldSelection}
                                                        stations={stations}
                                                        stationsForRow={(row) => {
                                                            const targetDate =
                                                                wizard.selectedImportBatch?.drawDate ||
                                                                wizard.selectedBatch?.drawDate ||
                                                                row.drawDate ||
                                                                dayjs().format('YYYY-MM-DD');
                                                            const scheduled =
                                                                wizard.getStationsForDrawDate(targetDate);
                                                            return scheduled.length > 0
                                                                ? scheduled
                                                                : stations;
                                                        }}
                                                        validationContextForRow={
                                                            wizard.getRowValidationContext
                                                        }
                                                        batchDrawDate={
                                                            wizard.selectedImportBatch?.drawDate ||
                                                            wizard.selectedBatch?.drawDate ||
                                                            null
                                                        }
                                                        onSelect={setFieldSelection}
                                                        onToggle={wizard.toggleRow}
                                                        onUpdate={wizard.updateRow}
                                                        embedded
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </>
                        )}
                    </Stack>
                )}

                {wizard.step === 'importMode' && (
                    <Stack spacing={2.5}>
                        {/* 1. Header Confirmation Banner */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: '16px',
                                border: '1px solid #bfdbfe',
                                bgcolor: '#eff6ff',
                                background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                                display: 'flex',
                                flexDirection: { xs: 'column', md: 'row' },
                                alignItems: { xs: 'flex-start', md: 'center' },
                                justifyContent: 'space-between',
                                gap: 2,
                                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.04)',
                            }}
                        >
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '12px',
                                        bgcolor: '#dbeafe',
                                        color: '#2563eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.12)',
                                    }}
                                >
                                    <ReceiptLongOutlinedIcon sx={{ fontSize: 26 }} />
                                </Box>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                        Xác nhận nhập {confirmableRows.length} vé vào kho
                                    </Typography>
                                    <Typography variant="body2" color="#475569" sx={{ fontSize: '0.85rem', mt: 0.25 }}>
                                        Kiểm tra đối chiếu thông tin phiếu nhập lô tiếp nhận và danh sách phân bổ các vé trước khi lưu vào kho.
                                    </Typography>
                                </Box>
                            </Stack>

                            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                                <Paper
                                    elevation={0}
                                    sx={{
                                        px: 2,
                                        py: 0.75,
                                        borderRadius: '10px',
                                        bgcolor: '#ffffff',
                                        border: '1px solid #cbd5e1',
                                        textAlign: 'right',
                                    }}
                                >
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                        Tổng số lượng nhập
                                    </Typography>
                                    <Typography variant="subtitle2" fontWeight={800} color="#2563eb">
                                        {confirmableRows.length} vé
                                    </Typography>
                                </Paper>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        px: 2,
                                        py: 0.75,
                                        borderRadius: '10px',
                                        bgcolor: '#ffffff',
                                        border: '1px solid #cbd5e1',
                                        textAlign: 'right',
                                    }}
                                >
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                        Tổng mệnh giá
                                    </Typography>
                                    <Typography variant="subtitle2" fontWeight={800} color="#15803d">
                                        {formatVnd(confirmTotalValue)}
                                    </Typography>
                                </Paper>
                            </Stack>
                        </Paper>

                        {/* 2. Target Batch Info & Progress Cards */}
                        {wizard.selectedBatch ? (
                            <Grid container spacing={2}>
                                {/* Phiếu nhập lô đích */}
                                <Grid size={{ xs: 12, md: 7 }}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            borderRadius: 2.5,
                                            border: '1px solid #e2e8f0',
                                            bgcolor: '#ffffff',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <Box>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                                    Thông tin phiếu nhập tiếp nhận
                                                </Typography>
                                                {wizard.selectedBatch.status && (
                                                    <Chip
                                                        size="small"
                                                        label={getImportBatchStatusLabel(wizard.selectedBatch.status)}
                                                        color="default"
                                                        sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }}
                                                    />
                                                )}
                                            </Stack>

                                            <Grid container spacing={1.5}>
                                                <Grid size={{ xs: 6, sm: 3 }}>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Mã phiếu nhập
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={700} color="#1e293b">
                                                        {formatImportBatchHeaderCode(wizard.selectedBatch.batchCode, wizard.selectedBatch.id)}
                                                    </Typography>
                                                </Grid>

                                                <Grid size={{ xs: 6, sm: 3 }}>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Ngày mở thưởng
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={700} color="#1e293b">
                                                        {wizard.selectedBatch.drawDate
                                                            ? dayjs(wizard.selectedBatch.drawDate).format('DD/MM/YYYY')
                                                            : '—'}
                                                    </Typography>
                                                </Grid>

                                                <Grid size={{ xs: 6, sm: 3 }}>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Nhà cung cấp
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={700} color="#1e293b" noWrap title={wizard.selectedBatch.supplierName || selectedSupplier?.name || ''}>
                                                        {wizard.selectedBatch.supplierName || selectedSupplier?.name || '—'}
                                                    </Typography>
                                                </Grid>

                                                <Grid size={{ xs: 6, sm: 3 }}>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Hình thức nhập
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={700} color="#1e293b">
                                                        {wizard.selectedImportBatch?.importMode ? getImportModeLabel(wizard.selectedImportBatch.importMode) : 'Trong ngày'}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    </Paper>
                                </Grid>

                                {/* Tiến độ hoàn thành */}
                                <Grid size={{ xs: 12, md: 5 }}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            borderRadius: 2.5,
                                            border: '1px solid #e2e8f0',
                                            bgcolor: '#f8fafc',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 1 }}>
                                            Tiến độ hoàn thành phiếu nhập
                                        </Typography>

                                        <Stack spacing={1}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={0.5}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Khai báo: <strong>{wizard.selectedImportBatch?.totalDeclareQuantity ?? 0} vé</strong>
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Đã có: <strong>{wizard.selectedImportBatch?.totalImportedQuantity ?? 0} vé</strong>
                                                </Typography>
                                                <Typography variant="caption" color="#16a34a" fontWeight={700}>
                                                    Thêm lần này: +{confirmableRows.length} vé
                                                </Typography>
                                            </Stack>

                                            <Box sx={{ width: '100%', height: 8, bgcolor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                                                <Box
                                                    sx={{
                                                        height: '100%',
                                                        width: `${Math.min(
                                                            100,
                                                            wizard.selectedImportBatch?.totalDeclareQuantity
                                                                ? (((wizard.selectedImportBatch.totalImportedQuantity || 0) + confirmableRows.length) /
                                                                      wizard.selectedImportBatch.totalDeclareQuantity) *
                                                                      100
                                                                : 100
                                                        )}%`,
                                                        bgcolor: '#2563eb',
                                                        borderRadius: 4,
                                                        transition: 'width 0.3s ease',
                                                    }}
                                                />
                                            </Box>
                                        </Stack>
                                    </Paper>
                                </Grid>
                            </Grid>
                        ) : (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    bgcolor: '#fffbeb',
                                    border: '1px solid #fef08a',
                                }}
                            >
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <WarningAmberOutlinedIcon sx={{ color: '#d97706' }} />
                                    <Typography variant="body2" color="#92400e" fontWeight={600} sx={{ flex: 1 }}>
                                        Chưa chọn phiếu nhập lô. Quay lại bước tải ảnh để chọn phiếu nhập.
                                    </Typography>
                                </Stack>
                            </Paper>
                        )}

                        {/* 3. Phân bổ theo Nhà đài & Mệnh giá */}
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 2.5,
                                border: '1px solid #e2e8f0',
                                overflow: 'hidden',
                            }}
                        >
                            <Box sx={{ px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                    Phân bổ số lượng theo Nhà đài & Mệnh giá ({confirmAllocationSummary.length} nhóm đài)
                                </Typography>
                                <Chip
                                    size="small"
                                    label={`Tổng: ${confirmableRows.length} vé`}
                                    color="primary"
                                    variant="outlined"
                                    sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }}
                                />
                            </Box>

                            <TableContainer sx={{ maxHeight: 220 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow sx={{ '& th': { bgcolor: '#f1f5f9', fontWeight: 800, fontSize: '0.8rem', color: '#334155' } }}>
                                            <TableCell>Nhà đài</TableCell>
                                            <TableCell align="right">Mệnh giá</TableCell>
                                            <TableCell align="right">Số lượng nhập</TableCell>
                                            <TableCell align="right">Tỷ lệ phân bổ</TableCell>
                                            <TableCell align="right">Tổng giá trị</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {confirmAllocationSummary.map((item) => (
                                             <TableRow key={item.key} hover>
                                                <TableCell sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                                                    {item.stationName}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                                                    {formatDenomination(item.denomination)} đ
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#2563eb' }}>
                                                    {item.count} vé
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                                    {confirmableRows.length > 0 ? `${((item.count / confirmableRows.length) * 100).toFixed(1)}%` : '0%'}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#15803d' }}>
                                                    {formatVnd(item.totalValue)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>

                        {/* 4. Danh sách chi tiết các vé hợp lệ */}
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 2.5,
                                border: '1px solid #e2e8f0',
                                overflow: 'hidden',
                            }}
                        >
                            <Box sx={{ px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                    Danh sách chi tiết {confirmableRows.length} vé hợp lệ
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Tất cả các vé đã được kiểm tra tính toàn vẹn và hợp lệ
                                </Typography>
                            </Box>

                            <TableContainer sx={{ maxHeight: 260 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow sx={{ '& th': { bgcolor: '#f1f5f9', fontWeight: 800, fontSize: '0.8rem', color: '#334155' } }}>
                                            <TableCell sx={{ width: 50 }} align="center">STT</TableCell>
                                            <TableCell sx={{ width: 60 }} align="center">Ảnh</TableCell>
                                            <TableCell>Nhà đài</TableCell>
                                            <TableCell>Ngày xổ</TableCell>
                                            <TableCell>Số sê-ri</TableCell>
                                            <TableCell>Dãy số vé</TableCell>
                                            <TableCell align="right">Mệnh giá</TableCell>
                                            <TableCell align="center">Trạng thái</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {confirmableRows.map((row, idx) => (
                                            <TableRow key={row.key} hover>
                                                <TableCell align="center" sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 700 }}>
                                                    {idx + 1}
                                                </TableCell>
                                                <TableCell align="center" sx={{ py: 0.5 }}>
                                                    {row.croppedImageUrl || row.sourcePreviewUrl ? (
                                                        <Box
                                                            component="img"
                                                            src={row.croppedImageUrl || row.sourcePreviewUrl || undefined}
                                                            alt={`Vé #${idx + 1}`}
                                                            sx={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 1, border: '1px solid #cbd5e1' }}
                                                        />
                                                    ) : (
                                                        <ConfirmationNumberOutlinedIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                                                    )}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                                                    {stationLabel(row.stationId ?? undefined)}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.8125rem' }}>
                                                    {row.drawDate ? dayjs(row.drawDate).format('DD/MM/YYYY') : '—'}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'monospace', color: '#2563eb' }}>
                                                    {row.serialNumber || '—'}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.875rem', fontWeight: 800, letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                                                    {row.numbers || '—'}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                                                    {formatDenomination(row.ticketType)} đ
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        size="small"
                                                        icon={<CheckCircleIcon sx={{ fontSize: '13px !important' }} />}
                                                        label="Hợp lệ"
                                                        color="success"
                                                        variant="filled"
                                                        sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#16a34a' }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>

                        {/* 5. Business Notice Callout */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 1.75,
                                borderRadius: 2,
                                bgcolor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.25,
                            }}
                        >
                            <TipsAndUpdatesOutlinedIcon sx={{ fontSize: 20, color: '#2563eb' }} />
                            <Typography variant="body2" color="#475569" sx={{ fontSize: '0.8125rem' }}>
                                Khi bạn bấm <strong>Xác nhận nhập</strong>, toàn bộ {confirmableRows.length} vé hợp lệ trên sẽ được lưu trực tiếp vào phiếu nhập lô <strong>{wizard.selectedBatch ? formatImportBatchHeaderCode(wizard.selectedBatch.batchCode, wizard.selectedBatch.id) : ''}</strong> và đồng bộ với kho hàng.
                            </Typography>
                        </Paper>
                    </Stack>
                )}

                {wizard.step === 'result' && wizard.importResult && (
                    <Stack spacing={2}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: '14px',
                                bgcolor: '#f0fdf4',
                                background: 'linear-gradient(135deg, #f0fdf4 0%, #f0fdfa 100%)',
                                border: '1px solid #bbf7d0',
                                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '12px',
                                    bgcolor: '#dcfce7',
                                    color: '#16a34a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    boxShadow: '0 1px 3px rgba(22, 163, 74, 0.12)',
                                }}
                            >
                                <CheckCircleOutlineOutlinedIcon sx={{ fontSize: '1.5rem' }} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle1" fontWeight={800} color="#14532d">
                                    Hoàn tất nhập vé vào kho thành công!
                                </Typography>
                                <Typography variant="body2" color="#166534" sx={{ fontSize: '0.85rem', mt: 0.25 }}>
                                    Đã xử lý <strong>{wizard.importResult.totalRequested}</strong> vé — Thành công:{' '}
                                    <strong style={{ color: '#15803d' }}>{wizard.importResult.successCount}</strong>, Trùng lặp:{' '}
                                    <strong>{wizard.importResult.duplicateCount}</strong>, Lỗi:{' '}
                                    <strong>{wizard.importResult.failedCount}</strong>.
                                </Typography>
                            </Box>
                        </Paper>
                        {(wizard.importResult.batches?.length ?? 0) > 0 && (
                            <Stack spacing={0.5}>
                                {wizard.importResult.batches.map((batch) => (
                                    <Typography key={`${batch.importBatchId}-${batch.batchCode}`} variant="body2">
                                        Phiếu{' '}
                                        <strong>
                                            {formatImportBatchHeaderCode(
                                                batch.batchCode ?? '',
                                                batch.importBatchId ?? undefined
                                            )}
                                        </strong>
                                        {batch.drawDate
                                            ? ` · ${dayjs(batch.drawDate).format('DD/MM/YYYY')}`
                                            : ''}
                                        {' — '}
                                        OK {batch.ticketSuccessCount}, trùng {batch.ticketDuplicateCount}, lỗi{' '}
                                        {batch.ticketFailedCount}
                                    </Typography>
                                ))}
                            </Stack>
                        )}
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Phiếu</TableCell>
                                    <TableCell>Dãy số</TableCell>
                                    <TableCell>Sê-ri</TableCell>
                                    <TableCell>Kết quả</TableCell>
                                    <TableCell>Chi tiết</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {resultRows.map((item) => (
                                    <TableRow key={item.key}>
                                        <TableCell>{item.batchCode || '—'}</TableCell>
                                        <TableCell>{item.numbers || '—'}</TableCell>
                                        <TableCell>{item.serialNumber || '—'}</TableCell>
                                        <TableCell>{getImportOutcomeLabel(item.outcome)}</TableCell>
                                        <TableCell>{item.message || '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                {wizard.step === 'upload' && (
                    <>
                        <Button
                            onClick={handleRequestClose}
                            disabled={wizard.scanning}
                            sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
                        >
                            Hủy
                        </Button>
                        <Box flex={1} />
                        {wizard.hasPreviousScan && (
                            <Button
                                variant="outlined"
                                color="warning"
                                startIcon={<HistoryOutlinedIcon />}
                                onClick={wizard.resumePreviousScan}
                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                            >
                                Xem lại kết quả cũ ({wizard.previousScanRowsCount} vé)
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            startIcon={
                                wizard.scanning ? (
                                    <CircularProgress size={16} color="inherit" />
                                ) : (
                                    <DocumentScannerOutlinedIcon />
                                )
                            }
                            disabled={
                                wizard.scanning
                                || wizard.images.length === 0
                                || wizard.hasPreviousScan
                                || !wizard.supplierId
                                || !batchReadyForScan
                                || isInvoiceUploading
                                || isTicketListUploading
                                || ocrReady === false
                                || ocrReadyLoading
                                || ocrServiceReady === false
                                || ocrServiceLoading
                            }
                            onClick={() => void wizard.runScan()}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: 1.5,
                                px: 2.5,
                            }}
                        >
                            {wizard.scanning
                                ? 'Đang quét…'
                                : wizard.images.length > 0
                                  ? `Bắt đầu quét OCR (${wizard.images.length} ảnh)`
                                  : 'Bắt đầu quét OCR'}
                        </Button>
                    </>
                )}
                {wizard.step === 'review' && (
                    <>
                        <Button
                            onClick={handleRequestClose}
                            sx={{ textTransform: 'none', color: 'text.secondary' }}
                        >
                            Hủy
                        </Button>
                        <Box flex={1} />
                        {wizard.pendingImagesCount > 0 && (
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={
                                    wizard.scanning ? (
                                        <CircularProgress size={16} color="inherit" />
                                    ) : (
                                        <DocumentScannerOutlinedIcon />
                                    )
                                }
                                disabled={wizard.scanning}
                                onClick={() => void wizard.scanPendingImages()}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderRadius: 1.5,
                                    bgcolor: '#2563eb',
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                            >
                                {wizard.scanning
                                    ? 'Đang quét…'
                                    : `Tiến hành quét (${wizard.pendingImagesCount} ảnh)`}
                            </Button>
                        )}
                        <Button
                            onClick={handleRequestBack}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            Quay lại
                        </Button>
                        <Button
                            variant="contained"
                            disabled={wizard.confirmableCount === 0 || wizard.pendingImagesCount > 0}
                            onClick={wizard.goToImportMode}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            Tiếp tục ({wizard.confirmableCount})
                        </Button>
                    </>
                )}
                {wizard.step === 'importMode' && (
                    <>
                        <Button
                            onClick={handleRequestClose}
                            disabled={wizard.confirming}
                            sx={{ textTransform: 'none', color: 'text.secondary' }}
                        >
                            Hủy
                        </Button>
                        <Box flex={1} />
                        <Button
                            onClick={() => wizard.setStep('review')}
                            disabled={wizard.confirming}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            Quay lại
                        </Button>
                        <Button
                            variant="contained"
                            disabled={wizard.confirming || !wizard.canConfirmImport}
                            onClick={() => setOpenFinalConfirmModal(true)}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            {wizard.confirming
                                ? 'Đang nhập…'
                                : `Xác nhận nhập (${wizard.confirmableCount})`}
                        </Button>
                    </>
                )}
                {wizard.step === 'result' && (
                    <Button
                        variant="contained"
                        onClick={handleFinish}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                        Đóng
                    </Button>
                )}
            </DialogActions>

            {/* Modal xem ảnh gốc chứa vé */}
            <Dialog
                open={Boolean(currentActiveGroup)}
                onClose={() => setActiveSourceImageGroup(null)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: 'hidden',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography variant="h6" fontWeight={700}>
                            Ảnh gốc chứa vé: {currentActiveGroup?.fileName}
                        </Typography>
                        <Chip
                            size="small"
                            label={`${currentActiveGroup?.rows.length ?? 0} vé nhận diện`}
                            color="primary"
                            variant="outlined"
                            sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }}
                        />
                    </Stack>
                    <IconButton
                        aria-label="close"
                        onClick={() => setActiveSourceImageGroup(null)}
                        sx={{
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 2, bgcolor: '#f8fafc' }}>
                    {currentActiveGroup?.previewUrl ? (
                        <OcrReviewImagePane
                            previewUrl={currentActiveGroup.previewUrl}
                            fileName={currentActiveGroup.fileName}
                            ticketCount={currentActiveGroup.rows.length}
                            rows={currentActiveGroup.rows}
                            selection={fieldSelection}
                            onSelect={setFieldSelection}
                            hideHeader
                            previewHeight={580}
                        />
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Không có ảnh tổng để hiển thị.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button onClick={() => setActiveSourceImageGroup(null)} variant="outlined">
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal xác nhận Hủy / Quay lại để tránh bấm nhầm */}
            <Dialog
                open={confirmAction !== null}
                onClose={() => setConfirmAction(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        p: 1,
                    },
                }}
            >
                <DialogTitle sx={{ pb: 1, pt: 2, px: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            bgcolor: confirmAction === 'CANCEL_DIALOG' ? '#fee2e2' : '#fef3c7',
                            color: confirmAction === 'CANCEL_DIALOG' ? '#dc2626' : '#d97706',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <WarningAmberOutlinedIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem' }}>
                        {confirmAction === 'BACK_TO_UPLOAD'
                            ? 'Xác nhận quay lại bước tải ảnh'
                            : 'Xác nhận hủy và đóng cửa sổ'}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ px: 2.5, py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        {confirmAction === 'BACK_TO_UPLOAD' ? (
                            <>
                                Bạn đang ở màn hình xem lại kết quả quét OCR với{' '}
                                <Box component="span" fontWeight={700} color="text.primary">
                                    {wizard.rows.length} vé ({wizard.confirmableCount} vé hợp lệ)
                                </Box>
                                . Nếu quay lại bước tải ảnh, tiến trình xem lại hiện tại sẽ được lưu tạm thành bản nháp. Bạn có chắc chắn muốn quay lại không?
                            </>
                        ) : (
                            <>
                                Bạn có dữ liệu quét chưa hoàn tất nhập vào hệ thống (
                                <Box component="span" fontWeight={700} color="text.primary">
                                    {wizard.rows.length} vé quét, {wizard.images.length} ảnh tải lên
                                </Box>
                                ). Dữ liệu này sẽ được lưu tạm để bạn có thể tiếp tục sau. Bạn có chắc chắn muốn hủy và đóng không?
                            </>
                        )}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2, pt: 1, gap: 1 }}>
                    <Button
                        variant="outlined"
                        onClick={() => setConfirmAction(null)}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                    >
                        {confirmAction === 'BACK_TO_UPLOAD' ? 'Ở lại xem tiếp' : 'Tiếp tục thao tác'}
                    </Button>
                    <Button
                        variant="contained"
                        color={confirmAction === 'CANCEL_DIALOG' ? 'error' : 'warning'}
                        onClick={() => {
                            if (confirmAction === 'BACK_TO_UPLOAD') {
                                wizard.persistUnimportedDraft();
                                wizard.setStep('upload');
                                setConfirmAction(null);
                            } else {
                                setConfirmAction(null);
                                handleClose();
                            }
                        }}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                    >
                        {confirmAction === 'BACK_TO_UPLOAD' ? 'Xác nhận quay lại' : 'Hủy & Đóng'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal xác nhận hủy / xóa phiếu nhập nháp */}
            <Dialog
                open={Boolean(batchToDiscard)}
                onClose={() => !wizard.discardingBatchId && setBatchToDiscard(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        p: 1,
                    },
                }}
            >
                <DialogTitle sx={{ pb: 1, pt: 2, px: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            bgcolor: '#fee2e2',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <DeleteOutlineIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem' }}>
                        Hủy phiếu nhập nháp
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ px: 2.5, py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        Bạn có chắc chắn muốn hủy phiếu nhập nháp{' '}
                        <Box component="span" fontWeight={700} color="text.primary">
                            {batchToDiscard ? formatImportBatchHeaderCode(batchToDiscard.batchCode, batchToDiscard.id) : ''}
                            {batchToDiscard?.drawDate ? ` - ${dayjs(batchToDiscard.drawDate).format('DD/MM/YYYY')}` : ''}
                        </Box>{' '}
                        không? Thao tác này không thể hoàn tác.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2, pt: 1, gap: 1 }}>
                    <Button
                        variant="outlined"
                        disabled={Boolean(wizard.discardingBatchId)}
                        onClick={() => setBatchToDiscard(null)}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        disabled={Boolean(wizard.discardingBatchId)}
                        startIcon={
                            wizard.discardingBatchId ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <DeleteOutlineIcon />
                            )
                        }
                        onClick={async () => {
                            if (batchToDiscard) {
                                await wizard.discardDraftBatch(batchToDiscard.id);
                                setBatchToDiscard(null);
                            }
                        }}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                    >
                        {wizard.discardingBatchId ? 'Đang hủy…' : 'Xác nhận hủy'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Xác nhận xóa bản quét cũ */}
            <Dialog
                open={openConfirmDiscardScanModal}
                onClose={() => setOpenConfirmDiscardScanModal(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        p: 1,
                    },
                }}
            >
                <DialogTitle sx={{ pb: 1, pt: 2, px: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: '10px',
                            bgcolor: '#fee2e2',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <DeleteOutlineIcon sx={{ fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                            Xóa bản quét OCR cũ?
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Thao tác này không thể hoàn tác
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ px: 2.5, py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        Bản quét chưa nhập gồm{' '}
                        <Box component="span" fontWeight={700} color="#dc2626">
                            {wizard.previousScanRowsCount} vé
                        </Box>{' '}
                        sẽ bị xóa vĩnh viễn khỏi bộ nhớ tạm. Bạn có chắc chắn muốn xóa bản quét này để bắt đầu tải ảnh vé mới không?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2, pt: 1, gap: 1 }}>
                    <Button
                        variant="outlined"
                        onClick={() => setOpenConfirmDiscardScanModal(false)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 1.5,
                            color: '#64748b',
                            borderColor: '#cbd5e1',
                            '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                        }}
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<DeleteOutlineIcon />}
                        onClick={() => {
                            wizard.discardPreviousScan();
                            setOpenConfirmDiscardScanModal(false);
                        }}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: 1.5,
                            bgcolor: '#dc2626',
                            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                            '&:hover': { bgcolor: '#b91c1c' },
                        }}
                    >
                        Xác nhận xóa
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal xác nhận thông tin nhập kho lần cuối */}
            <Dialog
                open={openFinalConfirmModal}
                onClose={() => !wizard.confirming && setOpenFinalConfirmModal(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        p: 1,
                    },
                }}
            >
                <DialogTitle sx={{ pb: 1, pt: 2, px: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '10px',
                            bgcolor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <ReceiptLongOutlinedIcon sx={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                            Xác nhận thông tin nhập kho
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Vui lòng kiểm tra lại thông tin tổng quan trước khi hoàn tất lưu vào hệ thống
                        </Typography>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ px: 2.5, py: 1.5 }}>
                    <Stack spacing={2}>
                        {/* KPI Cards Summary */}
                        <Grid container spacing={1.5}>
                            <Grid size={{ xs: 6 }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        bgcolor: '#eff6ff',
                                        border: '1px solid #bfdbfe',
                                        textAlign: 'center',
                                    }}
                                >
                                    <Typography variant="caption" color="#1d4ed8" fontWeight={700}>
                                        Tổng số lượng vé
                                    </Typography>
                                    <Typography variant="h6" fontWeight={800} color="#1e40af" sx={{ mt: 0.25 }}>
                                        {confirmableRows.length.toLocaleString('vi-VN')} vé
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        bgcolor: '#f0fdf4',
                                        border: '1px solid #bbf7d0',
                                        textAlign: 'center',
                                    }}
                                >
                                    <Typography variant="caption" color="#15803d" fontWeight={700}>
                                        Tổng giá trị nhập
                                    </Typography>
                                    <Typography variant="h6" fontWeight={800} color="#166534" sx={{ mt: 0.25 }}>
                                        {formatVnd(confirmTotalValue)}
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grid>

                        {/* Target Batch Information */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                            }}
                        >
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                                Thông tin phiếu nhập nhận vé
                            </Typography>
                            <Grid container spacing={1}>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Mã phiếu nhập:</Typography>
                                    <Typography variant="body2" fontWeight={700} color="#0f172a">
                                        {wizard.selectedBatch ? formatImportBatchHeaderCode(wizard.selectedBatch.batchCode, wizard.selectedBatch.id) : '—'}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Ngày mở thưởng:</Typography>
                                    <Typography variant="body2" fontWeight={700} color="#0f172a">
                                        {wizard.selectedBatch?.drawDate ? dayjs(wizard.selectedBatch.drawDate).format('DD/MM/YYYY') : '—'}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Nhà cung cấp:</Typography>
                                    <Typography variant="body2" fontWeight={700} color="#0f172a" noWrap title={selectedSupplier?.name || wizard.selectedBatch?.supplierName || '—'}>
                                        {selectedSupplier?.name || wizard.selectedBatch?.supplierName || '—'}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Hình thức nhập:</Typography>
                                    <Typography variant="body2" fontWeight={700} color="#0f172a">
                                        {wizard.selectedImportBatch?.importMode ? getImportModeLabel(wizard.selectedImportBatch.importMode) : 'Trong ngày'}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Phân bổ theo nhà đài & Mệnh giá */}
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 2,
                                border: '1px solid #e2e8f0',
                                overflow: 'hidden',
                            }}
                        >
                            <Box sx={{ px: 1.5, py: 1, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" fontWeight={800} color="#334155" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Phân bổ theo đài ({confirmAllocationSummary.length} nhóm)
                                </Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    {confirmableRows.length} vé hợp lệ
                                </Typography>
                            </Box>
                            <TableContainer sx={{ maxHeight: 180 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ '& th': { bgcolor: '#f1f5f9', fontWeight: 700, fontSize: '0.75rem', color: '#475569', py: 0.75 } }}>
                                            <TableCell>Nhà đài</TableCell>
                                            <TableCell align="right">Mệnh giá</TableCell>
                                            <TableCell align="right">Số lượng</TableCell>
                                            <TableCell align="right">Thành tiền</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {confirmAllocationSummary.map((item) => (
                                            <TableRow key={item.key} hover>
                                                <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', py: 0.75 }}>
                                                    {item.stationName}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.8rem', fontFamily: 'monospace', py: 0.75 }}>
                                                    {formatDenomination(item.denomination)} đ
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#2563eb', py: 0.75 }}>
                                                    {item.count} vé
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#15803d', py: 0.75 }}>
                                                    {formatVnd(item.totalValue)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>

                        {/* Callout Notice */}
                        <Box
                            sx={{
                                p: 1.25,
                                borderRadius: 1.5,
                                bgcolor: '#fffbeb',
                                border: '1px solid #fef08a',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            <InfoOutlinedIcon sx={{ fontSize: 18, color: '#b45309', flexShrink: 0 }} />
                            <Typography variant="caption" color="#92400e" sx={{ lineHeight: 1.45 }}>
                                Toàn bộ <strong>{confirmableRows.length} vé hợp lệ</strong> sẽ được lưu trực tiếp vào phiếu nhập lô và cập nhật vào kho hàng.
                            </Typography>
                        </Box>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 2.5, pb: 2, pt: 1, gap: 1 }}>
                    <Button
                        variant="outlined"
                        disabled={wizard.confirming}
                        onClick={() => setOpenFinalConfirmModal(false)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 1.5,
                            color: '#64748b',
                            borderColor: '#cbd5e1',
                            '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                        }}
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        variant="contained"
                        disabled={wizard.confirming}
                        startIcon={
                            wizard.confirming ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <CheckCircleOutlineOutlinedIcon />
                            )
                        }
                        onClick={async () => {
                            await wizard.confirmImport();
                            setOpenFinalConfirmModal(false);
                        }}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: 1.5,
                            bgcolor: '#2563eb',
                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                            '&:hover': { bgcolor: '#1d4ed8' },
                        }}
                    >
                        {wizard.confirming ? 'Đang thực hiện nhập…' : 'Xác nhận nhập kho'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Nhật ký & Lịch sử ảnh quét OCR */}
            <Dialog
                open={openScanHistoryModal}
                onClose={() => setOpenScanHistoryModal(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        px: 3,
                        py: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
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
                                flexShrink: 0,
                            }}
                        >
                            <PhotoLibraryOutlinedIcon fontSize="small" />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={800}>
                                Danh sách ảnh quét & Nhật ký OCR
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Quản lý danh sách ảnh vé đã quét, thêm ảnh mới và theo dõi nhật ký nhận diện
                            </Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <IconButton
                            aria-label="close"
                            onClick={() => setOpenScanHistoryModal(false)}
                            size="small"
                            sx={{ color: 'text.secondary' }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </DialogTitle>

                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, bgcolor: '#f8fafc' }}>
                    <Tabs
                        value={scanHistoryTab}
                        onChange={(_, val) => setScanHistoryTab(val)}
                        textColor="primary"
                        indicatorColor="primary"
                        sx={{
                            minHeight: 48,
                            '& .MuiTab-root': {
                                minHeight: 48,
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                gap: 1,
                            },
                        }}
                    >
                        <Tab
                            value="images"
                            icon={<PhotoLibraryOutlinedIcon sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            label={
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <span>Danh sách & Ảnh quét</span>
                                    <Chip
                                        size="small"
                                        label={reviewImageGroups.length}
                                        color={scanHistoryTab === 'images' ? 'primary' : 'default'}
                                        sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }}
                                    />
                                </Stack>
                            }
                        />
                        <Tab
                            value="logs"
                            icon={<HistoryOutlinedIcon sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            label={
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <span>Nhật ký xử lý OCR</span>
                                    {wizard.scanLogs.length > 0 && (
                                        <Chip
                                            size="small"
                                            label={wizard.scanLogs.length}
                                            color={scanHistoryTab === 'logs' ? 'primary' : 'default'}
                                            sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }}
                                        />
                                    )}
                                </Stack>
                            }
                        />
                    </Tabs>
                </Box>

                <DialogContent sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                    {scanHistoryTab === 'logs' ? (
                        <Stack spacing={2}>
                            {/* KPI Strip & Description */}
                            <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                justifyContent="space-between"
                                alignItems={{ xs: 'flex-start', md: 'center' }}
                                gap={1.5}
                                sx={{
                                    p: 1.75,
                                    bgcolor: '#f8fafc',
                                    borderRadius: 2.5,
                                    border: '1px solid #e2e8f0',
                                }}
                            >
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                        Nhật ký xử lý & kiểm tra vé OCR ({wizard.scanLogs.length} sự kiện)
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Lịch sử nhận diện OCR và chi tiết đối soát tính hợp lệ của từng vé theo thời gian thực
                                    </Typography>
                                </Box>

                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            px: 1.25,
                                            py: 0.5,
                                            borderRadius: '8px',
                                            bgcolor: '#ffffff',
                                            border: '1px solid #e2e8f0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.75,
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            Đạt chuẩn:
                                        </Typography>
                                        <Chip
                                            size="small"
                                            label={validLogsCount}
                                            sx={{
                                                height: 20,
                                                fontWeight: 800,
                                                fontSize: '0.75rem',
                                                bgcolor: '#f0fdf4',
                                                color: '#15803d',
                                                border: '1px solid #bbf7d0',
                                            }}
                                        />
                                    </Paper>

                                    <Paper
                                        elevation={0}
                                        sx={{
                                            px: 1.25,
                                            py: 0.5,
                                            borderRadius: '8px',
                                            bgcolor: '#ffffff',
                                            border: '1px solid #e2e8f0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.75,
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            Không đạt:
                                        </Typography>
                                        <Chip
                                            size="small"
                                            label={invalidLogsCount}
                                            sx={{
                                                height: 20,
                                                fontWeight: 800,
                                                fontSize: '0.75rem',
                                                bgcolor: '#fef2f2',
                                                color: '#b91c1c',
                                                border: '1px solid #fecaca',
                                            }}
                                        />
                                    </Paper>

                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={
                                            wizard.loadingLogs ? (
                                                <CircularProgress size={14} color="inherit" />
                                            ) : (
                                                <RefreshOutlinedIcon fontSize="small" />
                                            )
                                        }
                                        disabled={wizard.loadingLogs}
                                        onClick={() => void wizard.loadScanLogs()}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            borderRadius: '8px',
                                            bgcolor: '#ffffff',
                                            borderColor: '#cbd5e1',
                                            color: '#475569',
                                            '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' },
                                        }}
                                    >
                                        {wizard.loadingLogs ? 'Đang tải…' : 'Làm mới'}
                                    </Button>
                                </Stack>
                            </Stack>

                            {/* Search & Filter Toolbar */}
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" justifyContent="space-between">
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                                    <Button
                                        size="small"
                                        variant={logFilterStatus === 'ALL' ? 'contained' : 'outlined'}
                                        onClick={() => setLogFilterStatus('ALL')}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            fontSize: '0.8rem',
                                            borderRadius: '20px',
                                            px: 1.75,
                                            py: 0.35,
                                            ...(logFilterStatus === 'ALL'
                                                ? { bgcolor: '#0f172a', color: '#ffffff', '&:hover': { bgcolor: '#1e293b' } }
                                                : { borderColor: '#e2e8f0', color: '#64748b', '&:hover': { bgcolor: '#f8fafc' } }),
                                        }}
                                    >
                                        Tất cả ({wizard.scanLogs.length})
                                    </Button>
                                    <Button
                                        size="small"
                                        variant={logFilterStatus === 'VALID' ? 'contained' : 'outlined'}
                                        onClick={() => setLogFilterStatus('VALID')}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            fontSize: '0.8rem',
                                            borderRadius: '20px',
                                            px: 1.75,
                                            py: 0.35,
                                            ...(logFilterStatus === 'VALID'
                                                ? { bgcolor: '#15803d', color: '#ffffff', '&:hover': { bgcolor: '#166534' } }
                                                : { borderColor: '#bbf7d0', color: '#15803d', bgcolor: '#f0fdf4', '&:hover': { bgcolor: '#dcfce7' } }),
                                        }}
                                    >
                                        Đạt chuẩn ({validLogsCount})
                                    </Button>
                                    <Button
                                        size="small"
                                        variant={logFilterStatus === 'INVALID' ? 'contained' : 'outlined'}
                                        onClick={() => setLogFilterStatus('INVALID')}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            fontSize: '0.8rem',
                                            borderRadius: '20px',
                                            px: 1.75,
                                            py: 0.35,
                                            ...(logFilterStatus === 'INVALID'
                                                ? { bgcolor: '#b91c1c', color: '#ffffff', '&:hover': { bgcolor: '#991b1b' } }
                                                : { borderColor: '#fecaca', color: '#b91c1c', bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } }),
                                        }}
                                    >
                                        Không đạt ({invalidLogsCount})
                                    </Button>
                                </Stack>

                                <Box sx={{ width: { xs: '100%', sm: 280 } }}>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        placeholder="Tìm theo ghi chú, mã OCR #..."
                                        value={logSearchQuery}
                                        onChange={(e) => setLogSearchQuery(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                                                </InputAdornment>
                                            ),
                                            sx: {
                                                borderRadius: '8px',
                                                fontSize: '0.8125rem',
                                                bgcolor: '#ffffff',
                                                '& fieldset': { borderColor: '#e2e8f0' },
                                                '&:hover fieldset': { borderColor: '#cbd5e1' },
                                            },
                                        }}
                                    />
                                </Box>
                            </Stack>

                            {/* Log Table View */}
                            {wizard.loadingLogs ? (
                                <Stack alignItems="center" justifyContent="center" py={6} spacing={1.5}>
                                    <CircularProgress size={32} />
                                    <Typography variant="body2" color="text.secondary">
                                        Đang tải dữ liệu nhật ký quét OCR…
                                    </Typography>
                                </Stack>
                            ) : wizard.scanLogs.length === 0 ? (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 5,
                                        textAlign: 'center',
                                        bgcolor: '#f8fafc',
                                        borderRadius: 2.5,
                                        border: '1px dashed #cbd5e1',
                                    }}
                                >
                                    <HistoryOutlinedIcon sx={{ fontSize: 44, color: '#94a3b8', mb: 1 }} />
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                        Chưa có nhật ký ghi nhận
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 460, mx: 'auto' }}>
                                        Hệ thống sẽ tự động ghi lại lịch sử các lần gọi AI OCR, kết quả nhận diện và kiểm tra tính hợp lệ khi bạn quét ảnh vé.
                                    </Typography>
                                </Paper>
                            ) : filteredScanLogs.length === 0 ? (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        textAlign: 'center',
                                        bgcolor: '#f8fafc',
                                        borderRadius: 2.5,
                                        border: '1px dashed #cbd5e1',
                                    }}
                                >
                                    <Typography variant="subtitle2" fontWeight={700} color="#475569">
                                        Không tìm thấy kết quả phù hợp
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                        Vui lòng thử đổi bộ lọc hoặc từ khóa tìm kiếm.
                                    </Typography>
                                </Paper>
                            ) : (
                                <TableContainer
                                    component={Paper}
                                    elevation={0}
                                    sx={{
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 2.5,
                                        overflowY: 'auto',
                                        maxHeight: 520,
                                    }}
                                >
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow sx={{ '& th': { bgcolor: '#f1f5f9', fontWeight: 800, fontSize: '0.8rem', color: '#334155' } }}>
                                                <TableCell sx={{ width: 140 }}>Thời gian</TableCell>
                                                <TableCell sx={{ width: 135 }}>Phương thức</TableCell>
                                                <TableCell sx={{ width: 155 }}>Sự kiện</TableCell>
                                                <TableCell sx={{ width: 125 }}>Đánh giá</TableCell>
                                                <TableCell sx={{ width: 95 }}>Mã OCR</TableCell>
                                                <TableCell>Nội dung chi tiết / Ghi chú</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredScanLogs.map((log) => {
                                                const eventInfo = getScanLogEventLabel(log.eventType);
                                                const isError = log.isValid === false || eventInfo.color === 'error' || log.eventType === 'INVALID_TICKET';

                                                return (
                                                    <TableRow
                                                        key={log.id}
                                                        hover
                                                        sx={{
                                                            bgcolor: isError ? 'rgba(254, 242, 242, 0.35)' : 'inherit',
                                                            '&:last-child td, &:last-child th': { border: 0 },
                                                        }}
                                                    >
                                                        <TableCell sx={{ whiteSpace: 'nowrap', py: 1.25 }}>
                                                            {log.scannedAt ? (
                                                                <Box>
                                                                    <Typography variant="body2" fontWeight={700} color="#1e293b" sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                                                        {dayjs(log.scannedAt).format('HH:mm:ss')}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.725rem' }}>
                                                                        {dayjs(log.scannedAt).format('DD/MM/YYYY')}
                                                                    </Typography>
                                                                </Box>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1.25 }}>
                                                            <Box
                                                                sx={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 0.5,
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 600,
                                                                    color: '#334155',
                                                                    bgcolor: '#f8fafc',
                                                                    border: '1px solid #e2e8f0',
                                                                    borderRadius: '6px',
                                                                    px: 1,
                                                                    py: 0.25,
                                                                }}
                                                            >
                                                                <DocumentScannerOutlinedIcon sx={{ fontSize: 13, color: '#64748b' }} />
                                                                {getScanLogMethodLabel(log.scanMethod)}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1.25 }}>
                                                            <Chip
                                                                size="small"
                                                                label={eventInfo.label}
                                                                color={eventInfo.color}
                                                                variant="filled"
                                                                sx={{
                                                                    height: 24,
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 700,
                                                                    borderRadius: '6px',
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1.25 }}>
                                                            {log.isValid == null ? (
                                                                <Typography variant="caption" color="text.disabled">—</Typography>
                                                            ) : log.isValid ? (
                                                                <Chip
                                                                    size="small"
                                                                    icon={<CheckCircleOutlineOutlinedIcon sx={{ fontSize: '13px !important' }} />}
                                                                    label="Đạt chuẩn"
                                                                    color="success"
                                                                    variant="outlined"
                                                                    sx={{
                                                                        height: 24,
                                                                        fontSize: '0.725rem',
                                                                        fontWeight: 700,
                                                                        bgcolor: '#f0fdf4',
                                                                        borderColor: '#bbf7d0',
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Chip
                                                                    size="small"
                                                                    icon={<ErrorOutlineIcon sx={{ fontSize: '13px !important' }} />}
                                                                    label="Không đạt"
                                                                    color="error"
                                                                    variant="outlined"
                                                                    sx={{
                                                                        height: 24,
                                                                        fontSize: '0.725rem',
                                                                        fontWeight: 700,
                                                                        bgcolor: '#fef2f2',
                                                                        borderColor: '#fecaca',
                                                                    }}
                                                                />
                                                            )}
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1.25 }}>
                                                            {log.ocrScanResultId ? (
                                                                <Box
                                                                    component="span"
                                                                    sx={{
                                                                        fontFamily: 'monospace',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 700,
                                                                        bgcolor: '#f1f5f9',
                                                                        color: '#475569',
                                                                        border: '1px solid #e2e8f0',
                                                                        borderRadius: '4px',
                                                                        px: 0.75,
                                                                        py: 0.25,
                                                                    }}
                                                                >
                                                                    #{log.ocrScanResultId}
                                                                </Box>
                                                            ) : (
                                                                <Typography variant="caption" color="text.disabled">—</Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1.25 }}>
                                                            {log.note ? (
                                                                <Box
                                                                    sx={{
                                                                        fontSize: '0.775rem',
                                                                        color: isError ? '#991b1b' : '#334155',
                                                                        bgcolor: isError ? '#fff1f2' : '#f8fafc',
                                                                        border: '1px solid',
                                                                        borderColor: isError ? '#ffe4e6' : '#e2e8f0',
                                                                        borderRadius: '6px',
                                                                        p: 0.75,
                                                                        lineHeight: 1.45,
                                                                    }}
                                                                >
                                                                    {log.note}
                                                                </Box>
                                                            ) : (
                                                                <Typography variant="caption" color="text.disabled">—</Typography>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Stack>
                    ) : (
                        /* Tab 2: Danh sách ảnh quét */
                        reviewImageGroups.length === 0 ? (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 5,
                                    textAlign: 'center',
                                    bgcolor: '#f8fafc',
                                    borderRadius: 3,
                                    border: '1px dashed #cbd5e1',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1.5,
                                }}
                            >
                                <PhotoLibraryOutlinedIcon sx={{ fontSize: 48, color: '#94a3b8' }} />
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                        Chưa có ảnh nào được tải lên
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        Vui lòng tải ảnh vé lên để hệ thống tự động nhận diện OCR.
                                    </Typography>
                                </Box>
                                <Button
                                    variant="contained"
                                    startIcon={
                                        wizard.scanning ? (
                                            <CircularProgress size={16} color="inherit" />
                                        ) : (
                                            <AddPhotoAlternateOutlinedIcon />
                                        )
                                    }
                                    disabled={wizard.scanning}
                                    onClick={handleScanMoreClick}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        borderRadius: '8px',
                                        px: 2.5,
                                        py: 1,
                                        bgcolor: '#2563eb',
                                        '&:hover': { bgcolor: '#1d4ed8' },
                                        mt: 1,
                                    }}
                                >
                                    {wizard.scanning ? 'Đang quét…' : 'Tải ảnh vé lên'}
                                </Button>
                            </Paper>
                        ) : (
                            <Grid container spacing={2.5}>
                                {/* Cột trái: Danh sách ảnh */}
                                <Grid size={{ xs: 12, md: 4.5 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                            Danh sách ảnh ({reviewImageGroups.length})
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<AddPhotoAlternateOutlinedIcon sx={{ fontSize: '1rem' }} />}
                                            disabled={wizard.scanning}
                                            onClick={handleScanMoreClick}
                                            sx={{
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                py: 0.35,
                                                px: 1.25,
                                                borderColor: '#cbd5e1',
                                                color: '#334155',
                                                '&:hover': {
                                                    borderColor: '#94a3b8',
                                                    bgcolor: '#f1f5f9',
                                                },
                                            }}
                                        >
                                            + Thêm ảnh
                                        </Button>
                                    </Stack>

                                    {wizard.pendingImagesCount > 0 && (
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 1.5,
                                                mb: 1.5,
                                                borderRadius: 2.5,
                                                bgcolor: '#f0f7ff',
                                                border: '1.5px solid #bfdbfe',
                                                boxShadow: '0 1px 4px rgba(37, 99, 235, 0.08)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 1.5,
                                            }}
                                        >
                                            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                                                <Box
                                                    sx={{
                                                        width: 38,
                                                        height: 38,
                                                        borderRadius: '10px',
                                                        bgcolor: '#dbeafe',
                                                        color: '#2563eb',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <DocumentScannerOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                                                </Box>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography variant="body2" fontWeight={800} color="#1e40af" noWrap>
                                                        Có {wizard.pendingImagesCount} ảnh chờ quét
                                                    </Typography>
                                                    <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.725rem', display: 'block' }} noWrap>
                                                        Nhấn &quot;Tiến hành quét&quot; để AI nhận diện
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                startIcon={
                                                    wizard.scanning ? (
                                                        <CircularProgress size={14} color="inherit" />
                                                    ) : (
                                                        <DocumentScannerOutlinedIcon sx={{ fontSize: '1rem' }} />
                                                    )
                                                }
                                                disabled={wizard.scanning}
                                                onClick={() => void wizard.scanPendingImages()}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 800,
                                                    fontSize: '0.8125rem',
                                                    borderRadius: '8px',
                                                    px: 2,
                                                    py: 0.65,
                                                    bgcolor: '#2563eb',
                                                    color: '#ffffff',
                                                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                                                    whiteSpace: 'nowrap',
                                                    flexShrink: 0,
                                                    transition: 'all 0.15s ease-in-out',
                                                    '&:hover': {
                                                        bgcolor: '#1d4ed8',
                                                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                                                        transform: 'translateY(-1px)',
                                                    },
                                                    '&:active': {
                                                        transform: 'translateY(0)',
                                                    },
                                                }}
                                            >
                                                {wizard.scanning ? 'Đang quét…' : `Tiến hành quét (${wizard.pendingImagesCount})`}
                                            </Button>
                                        </Paper>
                                    )}

                                    {wizard.scanning && (
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 1.5,
                                                mb: 1.5,
                                                borderRadius: 2,
                                                bgcolor: '#eff6ff',
                                                border: '1px solid #bae6fd',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.25,
                                            }}
                                        >
                                            <CircularProgress size={18} color="primary" />
                                            <Typography variant="caption" color="#0369a1" fontWeight={700}>
                                                Đang tải và nhận diện OCR ảnh mới…
                                            </Typography>
                                        </Paper>
                                    )}

                                    <Stack spacing={1.5} sx={{ maxHeight: 520, overflowY: 'auto', pr: 0.5 }}>
                                        {reviewImageGroups.map((group, index) => {
                                            const isSelected = selectedHistoryGroup?.imageId === group.imageId;
                                            const validCount = group.rows.filter(wizard.isRowConfirmable).length;

                                            return (
                                                <Paper
                                                    key={group.imageId}
                                                    elevation={0}
                                                    onClick={() => setSelectedHistoryImageId(group.imageId)}
                                                    sx={{
                                                        p: 1.5,
                                                        borderRadius: 2,
                                                        border: '1.5px solid',
                                                        borderColor: isSelected ? 'primary.main' : 'divider',
                                                        bgcolor: isSelected ? '#eff6ff' : '#ffffff',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease-in-out',
                                                        '&:hover': {
                                                            borderColor: isSelected ? 'primary.main' : 'primary.light',
                                                            bgcolor: isSelected ? '#eff6ff' : '#f8fafc',
                                                        },
                                                    }}
                                                >
                                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                                        {group.previewUrl ? (
                                                            <Box
                                                                component="img"
                                                                src={group.previewUrl}
                                                                alt={group.fileName}
                                                                sx={{
                                                                    width: 48,
                                                                    height: 48,
                                                                    borderRadius: 1.5,
                                                                    objectFit: 'cover',
                                                                    border: '1px solid #e2e8f0',
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                        ) : (
                                                            <Box
                                                                sx={{
                                                                    width: 48,
                                                                    height: 48,
                                                                    borderRadius: 1.5,
                                                                    bgcolor: '#f1f5f9',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    flexShrink: 0,
                                                                    color: 'text.disabled',
                                                                }}
                                                            >
                                                                <PhotoLibraryOutlinedIcon fontSize="small" />
                                                            </Box>
                                                        )}
                                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                                                <Typography
                                                                    variant="body2"
                                                                    fontWeight={700}
                                                                    noWrap
                                                                    title={group.fileName}
                                                                >
                                                                    Ảnh #{index + 1}: {formatReviewFileName(group.fileName, index)}
                                                                </Typography>
                                                                {group.imageStatus === 'pending' && (
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            wizard.removeImage(group.imageId);
                                                                        }}
                                                                        disabled={wizard.scanning}
                                                                        sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                                                                        title="Xóa ảnh chờ"
                                                                    >
                                                                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                                                    </IconButton>
                                                                )}
                                                            </Stack>
                                                            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                                                                {group.imageStatus === 'pending' ? (
                                                                    <Chip
                                                                        size="small"
                                                                        label="Chờ quét"
                                                                        sx={{
                                                                            height: 18,
                                                                            fontSize: '0.6875rem',
                                                                            fontWeight: 700,
                                                                            bgcolor: '#fef3c7',
                                                                            color: '#b45309',
                                                                            border: '1px solid #fde68a',
                                                                        }}
                                                                    />
                                                                ) : group.imageStatus === 'scanning' ? (
                                                                    <Chip
                                                                        size="small"
                                                                        icon={<CircularProgress size={10} color="inherit" />}
                                                                        label="Đang quét…"
                                                                        sx={{
                                                                            height: 18,
                                                                            fontSize: '0.6875rem',
                                                                            fontWeight: 700,
                                                                            bgcolor: '#eff6ff',
                                                                            color: '#2563eb',
                                                                            border: '1px solid #bfdbfe',
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <>
                                                                        <Chip
                                                                            size="small"
                                                                            label={`${group.rows.length} vé`}
                                                                            color={group.rows.length > 0 ? 'primary' : 'default'}
                                                                            variant="outlined"
                                                                            sx={{ height: 18, fontSize: '0.6875rem', fontWeight: 600 }}
                                                                        />
                                                                        {group.rows.length > 0 && (
                                                                            <Chip
                                                                                size="small"
                                                                                label={`${validCount}/${group.rows.length} hợp lệ`}
                                                                                color={validCount === group.rows.length ? 'success' : 'warning'}
                                                                                variant="outlined"
                                                                                sx={{ height: 18, fontSize: '0.6875rem', fontWeight: 600 }}
                                                                            />
                                                                        )}
                                                                    </>
                                                                )}
                                                            </Stack>
                                                            {(group.scannedAt || group.durationMs != null) && (
                                                                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                                                                    {group.scannedAt && (
                                                                        <Stack direction="row" spacing={0.35} alignItems="center" title="Giờ quét thành công">
                                                                            <AccessTimeOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                                                                                {dayjs(group.scannedAt).isValid()
                                                                                    ? dayjs(group.scannedAt).format('HH:mm:ss DD/MM/YYYY')
                                                                                    : group.scannedAt}
                                                                            </Typography>
                                                                        </Stack>
                                                                    )}
                                                                    {group.durationMs != null && (
                                                                        <Stack direction="row" spacing={0.35} alignItems="center" title="Thời gian quét (thời lượng xử lý)">
                                                                            <TimerOutlinedIcon sx={{ fontSize: 13, color: '#0284c7' }} />
                                                                            <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#0284c7' }}>
                                                                                {(group.durationMs / 1000).toFixed(1)}s
                                                                            </Typography>
                                                                        </Stack>
                                                                    )}
                                                                </Stack>
                                                            )}
                                                        </Box>
                                                    </Stack>
                                                </Paper>
                                            );
                                        })}
                                    </Stack>
                                </Grid>

                                {/* Cột phải: Xem ảnh chi tiết và bounding box */}
                                <Grid size={{ xs: 12, md: 7.5 }}>
                                    {selectedHistoryGroup ? (
                                        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', bgcolor: '#f8fafc' }}>
                                            <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                                <Box sx={{ minWidth: 0, maxWidth: { xs: '100%', sm: '70%' } }}>
                                                    <Typography variant="subtitle2" fontWeight={700} noWrap title={selectedHistoryGroup.fileName}>
                                                        Ảnh: {selectedHistoryGroup.fileName}
                                                    </Typography>
                                                    {(selectedHistoryGroup.scannedAt || selectedHistoryGroup.durationMs != null) && (
                                                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.35 }} flexWrap="wrap">
                                                            {selectedHistoryGroup.scannedAt && (
                                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                                    <AccessTimeOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {dayjs(selectedHistoryGroup.scannedAt).isValid()
                                                                            ? dayjs(selectedHistoryGroup.scannedAt).format('HH:mm:ss DD/MM/YYYY')
                                                                            : selectedHistoryGroup.scannedAt}
                                                                    </Typography>
                                                                </Stack>
                                                            )}
                                                            {selectedHistoryGroup.durationMs != null && (
                                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                                    <TimerOutlinedIcon sx={{ fontSize: 14, color: '#0284c7' }} />
                                                                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#0284c7' }}>
                                                                        Thời gian quét: {(selectedHistoryGroup.durationMs / 1000).toFixed(1)}s
                                                                    </Typography>
                                                                </Stack>
                                                            )}
                                                        </Stack>
                                                    )}
                                                </Box>
                                                {selectedHistoryGroup.imageStatus === 'pending' ? (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        startIcon={
                                                            wizard.scanning ? (
                                                                <CircularProgress size={13} color="inherit" />
                                                            ) : (
                                                                <DocumentScannerOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                                                            )
                                                        }
                                                        disabled={wizard.scanning}
                                                        onClick={() => void wizard.scanPendingImages()}
                                                        sx={{
                                                            textTransform: 'none',
                                                            fontWeight: 700,
                                                            borderRadius: 1.5,
                                                            bgcolor: '#2563eb',
                                                            '&:hover': { bgcolor: '#1d4ed8' },
                                                        }}
                                                    >
                                                        {wizard.scanning ? 'Đang quét…' : 'Tiến hành quét'}
                                                    </Button>
                                                ) : selectedHistoryGroup.imageStatus === 'scanning' ? (
                                                    <Chip
                                                        size="small"
                                                        icon={<CircularProgress size={12} color="inherit" />}
                                                        label="Đang quét…"
                                                        color="primary"
                                                        sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }}
                                                    />
                                                ) : (
                                                    <Chip
                                                        size="small"
                                                        label={`${selectedHistoryGroup.rows.length} vé nhận diện`}
                                                        color="primary"
                                                        sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }}
                                                    />
                                                )}
                                            </Box>
                                            <Box sx={{ p: 1.5 }}>
                                                {selectedHistoryGroup.previewUrl ? (
                                                    <OcrReviewImagePane
                                                        previewUrl={selectedHistoryGroup.previewUrl}
                                                        fileName={selectedHistoryGroup.fileName}
                                                        ticketCount={selectedHistoryGroup.rows.length}
                                                        rows={selectedHistoryGroup.rows}
                                                        selection={fieldSelection}
                                                        onSelect={setFieldSelection}
                                                        hideHeader
                                                        previewHeight={460}
                                                    />
                                                ) : (
                                                    <Box sx={{ py: 8, textAlign: 'center' }}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Không có ảnh xem trước để hiển thị.
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Box sx={{ py: 8, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Chọn một ảnh ở danh sách bên trái để xem chi tiết.
                                            </Typography>
                                        </Box>
                                    )}
                                </Grid>
                            </Grid>
                        )
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Button
                        variant="outlined"
                        onClick={() => setOpenScanHistoryModal(false)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: '8px',
                            px: 2.5,
                            borderColor: '#cbd5e1',
                            color: '#334155',
                            '&:hover': {
                                borderColor: '#94a3b8',
                                bgcolor: '#f1f5f9',
                            },
                        }}
                    >
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};
