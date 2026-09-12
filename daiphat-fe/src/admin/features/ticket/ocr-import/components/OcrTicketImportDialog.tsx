'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DocumentScannerOutlinedIcon from '@mui/icons-material/DocumentScannerOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import AutoModeOutlinedIcon from '@mui/icons-material/AutoModeOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormHelperText,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Radio,
    RadioGroup,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import dayjs from 'dayjs';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { ROUTES } from '../../../../../constants/routes';
import { useActiveSuppliers } from '../../../supplier';
import { useStations } from '../../../station/hooks/useStation';
import type { ImportBatch, ImportBatchLine } from '../../import-batch/types/importBatch.type';
import { formatImportBatchHeaderCode } from '../../import-batch/utils/importBatchCode';
import {
    uploadImportBatchInvoiceEvidence,
    uploadImportBatchTicketListImage,
} from '../../import-batch/services/importBatchService';
import { UploadSingleFile } from '../../../../components/upload/UploadSingleFile';
import type { Accept } from 'react-dropzone';
import { useOcrImportWizard } from '../hooks/useOcrImportWizard';
import { OCR_IMPORT_DRAFT_KEY } from '../types/ticketOcr.type';
import {
    buildReviewImageGroups,
    getImportOutcomeLabel,
    getScanLogEventLabel,
    getScanLogMethodLabel,
} from '../utils/ocrImportHelpers';
import {
    normalizeOcrScanErrorMessage,
    OCR_SERVICE_UNAVAILABLE_MESSAGE,
} from '../utils/ocrScanErrorMessage';
import OcrReviewImagePane, { type OcrFieldSelection } from './OcrReviewImagePane';
import OcrReviewResultCards from './OcrReviewResultCards';
import { getOcrTemplateDefaultReady } from '../../../station/services/ocrTemplateService';
import { getOcrServiceReady } from '../services/ticketOcrService';

const IMPORT_EVIDENCE_ACCEPT: Accept = {
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
    { key: 'importMode', label: 'Chọn cách nhập' },
    { key: 'result', label: 'Hoàn tất' },
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
    importMode: 'Chọn chế độ nhập kho',
    result: 'Kết quả nhập kho',
};

const createBatchHref = `${ROUTES.ADMIN.IMPORT_BATCH.CREATE}?returnTo=ocr-import&draftKey=${OCR_IMPORT_DRAFT_KEY}`;

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
    const [invoiceUploading, setInvoiceUploading] = useState(false);
    const [ticketListUploading, setTicketListUploading] = useState(false);
    const [ocrReady, setOcrReady] = useState<boolean | null>(null);
    const [ocrReadyLoading, setOcrReadyLoading] = useState(false);
    const [ocrServiceReady, setOcrServiceReady] = useState<boolean | null>(null);
    const [ocrServiceMessage, setOcrServiceMessage] = useState<string | null>(null);
    const [ocrServiceLoading, setOcrServiceLoading] = useState(false);
    const { data: activeSuppliers = [] } = useActiveSuppliers(open);
    const { data: stationsRes } = useStations({ limit: 1000 });
    const stations = useMemo(() => {
        const list = stationsRes?.data?.recordList ?? [];
        return list.map((station) => ({
            id: Number(station.id),
            name: station.name,
            code: station.code,
        }));
    }, [stationsRes]);

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

    const selectedSupplier = useMemo(
        () => activeSuppliers.find((s) => s.id === wizard.supplierId),
        [activeSuppliers, wizard.supplierId]
    );

    const formatReviewFileName = (fileName: string, index: number) => {
        if (!fileName) return `Ảnh #${index + 1}`;
        if (fileName.length > 32) {
            const ext = fileName.includes('.') ? fileName.split('.').pop() : '';
            const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
            return `${nameWithoutExt.slice(0, 20)}...${ext ? `.${ext}` : ''}`;
        }
        return fileName;
    };

    const handleClose = () => {
        wizard.persistUnimportedDraft();
        wizard.reset();
        onClose();
    };

    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (ocrReady !== false && ocrServiceReady !== false && wizard.supplierId) {
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
            onClose={handleClose}
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
                    onClick={handleClose}
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
                        const currentStepIdx = STEPS.findIndex((st) => st.key === wizard.step);
                        const isCurrent = wizard.step === s.key;
                        const isCompleted = currentStepIdx > index;

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
                                            Hệ thống cần ít nhất một mẫu vé (template) mặc định được thiết lập cho nhà đài trước khi thực hiện quét. Vui lòng kiểm tra và gán mẫu vé phù hợp.
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Box sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, flexShrink: 0 }}>
                                    <Button
                                        component={Link}
                                        href={ROUTES.ADMIN.DASHBOARD.SETTINGS.ROOT}
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
                                            Hệ thống lưu giữ kết quả {wizard.previousScanRowsCount} vé đã nhận diện. Bạn có thể tiếp tục xem lại và nhập kho mà không cần tải lại ảnh.
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
                                        onClick={wizard.discardPreviousScan}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            borderRadius: '999px',
                                            px: 1.5,
                                            color: '#64748b',
                                            borderColor: '#cbd5e1',
                                            bgcolor: '#ffffff',
                                            whiteSpace: 'nowrap',
                                            '&:hover': {
                                                bgcolor: '#f1f5f9',
                                                borderColor: '#94a3b8',
                                            },
                                        }}
                                    >
                                        Xóa bản quét cũ
                                    </Button>
                                </Stack>
                            </Paper>
                        )}

                        <FormControl fullWidth size="small" required error={!wizard.supplierId && wizard.images.length > 0}>
                            <InputLabel id="ocr-upload-supplier-select-label">Nhà cung cấp</InputLabel>
                            <Select
                                labelId="ocr-upload-supplier-select-label"
                                label="Nhà cung cấp"
                                value={wizard.supplierId ?? ''}
                                onChange={(event) => {
                                    const raw = String(event.target.value ?? '');
                                    wizard.setSupplierId(raw === '' ? null : Number(raw));
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
                                    Vui lòng chọn nhà cung cấp trước khi tải ảnh vé lên để quét
                                </FormHelperText>
                            )}
                        </FormControl>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            disabled={ocrReady === false || ocrServiceReady === false || !wizard.supplierId}
                            onChange={(event) => {
                                if (!wizard.supplierId) {
                                    toast.warning('Vui lòng chọn Nhà cung cấp trước khi tải ảnh vé.');
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
                                    fileInputRef.current?.click();
                                }}
                                sx={{
                                    border: isDragOver ? '2px dashed #2563eb' : '1.5px dashed #cbd5e1',
                                    borderRadius: 3,
                                    p: { xs: 3, sm: 5 },
                                    textAlign: 'center',
                                    cursor:
                                        ocrReady === false || ocrServiceReady === false || !wizard.supplierId
                                            ? 'not-allowed'
                                            : 'pointer',
                                    bgcolor: isDragOver ? 'rgba(37,99,235,0.04)' : '#f8fafc',
                                    opacity: ocrReady === false || ocrServiceReady === false || !wizard.supplierId ? 0.6 : 1,
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                        borderColor:
                                            ocrReady === false || ocrServiceReady === false || !wizard.supplierId
                                                ? '#cbd5e1'
                                                : '#2563eb',
                                        bgcolor:
                                            ocrReady === false || ocrServiceReady === false || !wizard.supplierId
                                                ? '#f8fafc'
                                                : 'rgba(37,99,235,0.02)',
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 60,
                                        height: 60,
                                        borderRadius: '50%',
                                        bgcolor: isDragOver
                                            ? 'rgba(37,99,235,0.15)'
                                            : 'rgba(37,99,235,0.08)',
                                        color: 'primary.main',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mx: 'auto',
                                        mb: 2,
                                    }}
                                >
                                    <CloudUploadOutlinedIcon sx={{ fontSize: 32 }} />
                                </Box>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                                    Kéo thả ảnh vé vào đây hoặc bấm để chọn tệp
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Hỗ trợ định dạng JPG, PNG, WEBP (tối đa 15MB/ảnh) · Chọn được nhiều ảnh cùng lúc
                                </Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    disabled={ocrReady === false || ocrServiceReady === false || !wizard.supplierId}
                                    sx={{
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        pointerEvents: 'none',
                                    }}
                                >
                                    Duyệt ảnh từ thiết bị
                                </Button>
                                {wizard.hasPreviousScan && (
                                    <Box
                                        sx={{ mt: 2 }}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                        }}
                                    >
                                        <Button
                                            variant="text"
                                            color="warning"
                                            size="small"
                                            startIcon={<HistoryOutlinedIcon />}
                                            onClick={wizard.resumePreviousScan}
                                            sx={{ textTransform: 'none', fontWeight: 700 }}
                                        >
                                            Xem lại {wizard.previousScanRowsCount} vé đã quét chưa nhập kho
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        ) : (
                            <Stack spacing={2}>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                    justifyContent="space-between"
                                    spacing={1.5}
                                    sx={{
                                        p: 1.5,
                                        bgcolor: 'var(--palette-background-neutral, rgba(145, 158, 171, 0.08))',
                                        borderRadius: 2,
                                        border: '1px solid var(--palette-divider, #e2e8f0)',
                                    }}
                                >
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <DocumentScannerOutlinedIcon fontSize="small" color="primary" />
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            Đã chọn {wizard.images.length} ảnh vé
                                        </Typography>
                                        <Chip
                                            size="small"
                                            label="Sẵn sàng quét"
                                            color="primary"
                                            variant="outlined"
                                            sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                                        />
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
                                                fileInputRef.current?.click();
                                            }}
                                            disabled={
                                                wizard.scanning ||
                                                ocrReady === false ||
                                                ocrServiceReady === false ||
                                                !wizard.supplierId
                                            }
                                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                                        >
                                            Thêm ảnh
                                        </Button>
                                        <Button
                                            size="small"
                                            color="error"
                                            startIcon={<DeleteOutlineIcon />}
                                            onClick={wizard.clearImages}
                                            disabled={wizard.scanning}
                                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                                        >
                                            Xóa tất cả
                                        </Button>
                                    </Stack>
                                </Stack>

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
                                        gap: 2,
                                        maxHeight: 360,
                                        overflowY: 'auto',
                                        p: 0.5,
                                    }}
                                >
                                    {wizard.images.map((image) => (
                                        <Box
                                            key={image.id}
                                            sx={{
                                                border: '1px solid #e2e8f0',
                                                borderRadius: 2,
                                                overflow: 'hidden',
                                                position: 'relative',
                                                bgcolor: '#fff',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
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
                                                    height: 120,
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
                                                    }}
                                                />
                                                <IconButton
                                                    size="small"
                                                    onClick={() => wizard.removeImage(image.id)}
                                                    disabled={wizard.scanning}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 4,
                                                        right: 4,
                                                        bgcolor: 'rgba(255,255,255,0.9)',
                                                        backdropFilter: 'blur(4px)',
                                                        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                                                        '&:hover': {
                                                            bgcolor: '#fff',
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
                                                            bottom: 4,
                                                            left: 4,
                                                            bgcolor: 'rgba(15, 23, 42, 0.75)',
                                                            color: '#fff',
                                                            borderRadius: 1,
                                                            px: 0.75,
                                                            py: 0.2,
                                                            fontSize: '0.6875rem',
                                                            fontWeight: 600,
                                                            backdropFilter: 'blur(2px)',
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
                                                            bgcolor: 'rgba(255,255,255,0.75)',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: 0.5,
                                                        }}
                                                    >
                                                        <CircularProgress size={24} />
                                                        <Typography
                                                            variant="caption"
                                                            fontWeight={700}
                                                            color="primary"
                                                        >
                                                            Đang quét…
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                            <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                <Typography
                                                    variant="caption"
                                                    fontWeight={600}
                                                    noWrap
                                                    title={image.file.name}
                                                >
                                                    {image.file.name}
                                                </Typography>
                                                <Box>
                                                    {image.status === 'pending' && (
                                                        <Chip
                                                            size="small"
                                                            label="Chờ quét"
                                                            color="default"
                                                            variant="outlined"
                                                            sx={{ height: 20, fontSize: '0.6875rem' }}
                                                        />
                                                    )}
                                                    {image.status === 'done' && (
                                                        <Chip
                                                            size="small"
                                                            label="Đã nhận diện"
                                                            color="success"
                                                            sx={{ height: 20, fontSize: '0.6875rem' }}
                                                        />
                                                    )}
                                                    {image.status === 'error' && (
                                                        <Tooltip title={image.error || 'Lỗi quét'}>
                                                            <Chip
                                                                size="small"
                                                                label={image.error || 'Lỗi quét'}
                                                                color="error"
                                                                sx={{
                                                                    height: 20,
                                                                    fontSize: '0.6875rem',
                                                                    maxWidth: '100%',
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </Stack>
                        )}
                    </Stack>
                )}

                {wizard.step === 'review' && (
                    <Stack spacing={2}>
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
                            <Stack direction="row" spacing={1} alignItems="center">
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
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() =>
                                        wizard.toggleAllConfirmable(
                                            wizard.confirmableCount <
                                                wizard.rows.filter(wizard.isRowConfirmable).length
                                        )
                                    }
                                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                                >
                                    Chọn tất cả hợp lệ ({wizard.rows.filter(wizard.isRowConfirmable).length})
                                </Button>
                            </Stack>
                        </Stack>

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
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Typography
                                                        variant="subtitle1"
                                                        fontWeight={800}
                                                        title={group.fileName}
                                                    >
                                                        Ảnh #{index + 1}: {formatReviewFileName(group.fileName, index)}
                                                    </Typography>
                                                    <Chip
                                                        size="small"
                                                        label={`${group.rows.length} vé nhận diện`}
                                                        color={group.rows.length > 0 ? 'primary' : 'default'}
                                                        variant="outlined"
                                                        sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }}
                                                    />
                                                </Stack>
                                            </Stack>
                                            <Box
                                                sx={{
                                                    display: 'grid',
                                                    gridTemplateColumns: {
                                                        xs: '1fr',
                                                        lg: '250px 1fr',
                                                        xl: '280px 1fr',
                                                    },
                                                    gap: 2,
                                                    alignItems: 'stretch',
                                                }}
                                            >
                                                {group.previewUrl ? (
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 340 }}>
                                                        <OcrReviewImagePane
                                                            previewUrl={group.previewUrl}
                                                            fileName={group.fileName}
                                                            ticketCount={group.rows.length}
                                                            rows={group.rows}
                                                            selection={fieldSelection}
                                                            onSelect={setFieldSelection}
                                                            previewHeight={Math.max(340, group.rows.length * 80)}
                                                        />
                                                    </Box>
                                                ) : (
                                                    <Paper
                                                        elevation={0}
                                                        sx={{
                                                            p: 2,
                                                            borderRadius: '12px',
                                                            bgcolor: '#f8fafc',
                                                            border: '1px solid #e2e8f0',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            minHeight: 200,
                                                        }}
                                                    >
                                                        <Typography variant="body2" color="text.secondary">
                                                            Không có bản xem trước cho ảnh này ({group.fileName})
                                                        </Typography>
                                                    </Paper>
                                                )}
                                                <Box sx={{ minWidth: 0 }}>
                                                    <OcrReviewResultCards
                                                        rows={group.rows}
                                                        selection={fieldSelection}
                                                        stations={stations}
                                                        stationsForRow={(row) => {
                                                            const scheduled =
                                                                wizard.getStationsForDrawDate(row.drawDate);
                                                            return scheduled.length > 0
                                                                ? scheduled
                                                                : stations;
                                                        }}
                                                        validationContextForRow={
                                                            wizard.getRowValidationContext
                                                        }
                                                        onSelect={setFieldSelection}
                                                        onToggle={wizard.toggleRow}
                                                        onUpdate={wizard.updateRow}
                                                        embedded
                                                    />
                                                </Box>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </>
                        )}

                        <Accordion
                            disableGutters
                            sx={{
                                border: '1px solid var(--palette-divider, #e2e8f0)',
                                borderRadius: 2,
                                '&:before': { display: 'none' },
                                overflow: 'hidden',
                            }}
                            onChange={(_, expanded) => {
                                if (expanded) {
                                    void wizard.loadScanLogs();
                                }
                            }}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <HistoryOutlinedIcon fontSize="small" color="action" />
                                    <Typography fontWeight={700} variant="subtitle2">
                                        Nhật ký xử lý ảnh quét
                                    </Typography>
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0 }}>
                                {wizard.loadingLogs ? (
                                    <Stack alignItems="center" py={2}>
                                        <CircularProgress size={24} />
                                    </Stack>
                                ) : wizard.scanLogs.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                                        Chưa có nhật ký ghi nhận cho các kết quả nhận diện hiện tại.
                                    </Typography>
                                ) : (
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'var(--palette-background-neutral, #f8fafc)' }}>
                                                <TableCell sx={{ fontWeight: 700 }}>Thời gian</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Kết quả</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Kiểm tra</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Mã OCR</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Ghi chú</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {wizard.scanLogs.map((log) => {
                                                const eventInfo = getScanLogEventLabel(log.eventType);
                                                return (
                                                    <TableRow key={log.id} hover>
                                                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                                                            {log.scannedAt
                                                                ? dayjs(log.scannedAt).format(
                                                                      'DD/MM/YYYY HH:mm:ss'
                                                                  )
                                                                : '—'}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: '0.8125rem' }}>
                                                            {getScanLogMethodLabel(log.scanMethod)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                size="small"
                                                                label={eventInfo.label}
                                                                color={eventInfo.color}
                                                                variant="filled"
                                                                sx={{ height: 22, fontSize: '0.6875rem', fontWeight: 600 }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            {log.isValid == null ? (
                                                                <Typography variant="body2" color="text.disabled">—</Typography>
                                                            ) : log.isValid ? (
                                                                <Chip
                                                                    size="small"
                                                                    label="Đạt chuẩn"
                                                                    color="success"
                                                                    variant="outlined"
                                                                    sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600 }}
                                                                />
                                                            ) : (
                                                                <Chip
                                                                    size="small"
                                                                    label="Không đạt"
                                                                    color="error"
                                                                    variant="outlined"
                                                                    sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600 }}
                                                                />
                                                            )}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                                                            {log.ocrScanResultId ? `#${log.ocrScanResultId}` : '—'}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                                                            {log.note || '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </AccordionDetails>
                        </Accordion>
                    </Stack>
                )}

                {wizard.step === 'importMode' && (
                    <Stack spacing={2.5}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 1.5, sm: 1.75 },
                                borderRadius: '14px',
                                border: '1px solid #bfdbfe',
                                bgcolor: '#f0f7ff',
                                background: 'linear-gradient(135deg, #f0f7ff 0%, #f8fafc 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                            }}
                        >
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
                                <InfoOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                    Đã chọn {wizard.confirmableCount} vé hợp lệ sẵn sàng nhập kho
                                </Typography>
                                <Typography variant="body2" color="#475569" sx={{ fontSize: '0.825rem' }}>
                                    Vui lòng chọn hình thức gắn vé vào phiếu nhập kho bên dưới để hoàn tất.
                                </Typography>
                            </Box>
                        </Paper>

                        <Box
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                p: 2,
                            }}
                        >
                            <Typography fontWeight={800} sx={{ mb: 1 }}>
                                Phiếu nhập nháp
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                Dùng phiếu nháp đang mở để gắn tiếp vé đã quét, hoặc tạo phiếu nhập mới.
                            </Typography>
                            <RadioGroup
                                value={wizard.draftIntent}
                                onChange={(event) => {
                                    const next = event.target.value as 'USE_EXISTING' | 'CREATE_NEW';
                                    if (next === 'USE_EXISTING') {
                                        wizard.setDraftIntent('USE_EXISTING');
                                        wizard.setImportMode('MANUAL');
                                        wizard.setForceCreate(false);
                                    } else {
                                        wizard.chooseCreateNewBatch();
                                    }
                                }}
                            >
                                <FormControlLabel
                                    value="USE_EXISTING"
                                    control={<Radio />}
                                    label="Dùng phiếu nháp có sẵn"
                                />
                                <FormControlLabel
                                    value="CREATE_NEW"
                                    control={<Radio />}
                                    label="Tạo phiếu nhập mới"
                                />
                            </RadioGroup>

                            {wizard.draftIntent === 'USE_EXISTING' && (
                                <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                                    {wizard.loadingBatches ? (
                                        <Stack alignItems="center" py={2}>
                                            <CircularProgress size={28} />
                                        </Stack>
                                    ) : wizard.batchOptions.length === 0 ? (
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                borderRadius: '14px',
                                                bgcolor: '#fffbeb',
                                                border: '1px solid #fef08a',
                                                display: 'flex',
                                                alignItems: { xs: 'flex-start', sm: 'center' },
                                                justifyContent: 'space-between',
                                                flexWrap: 'wrap',
                                                gap: 1.5,
                                            }}
                                        >
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <WarningAmberOutlinedIcon sx={{ color: '#d97706' }} />
                                                <Typography variant="body2" color="#92400e" fontWeight={600}>
                                                    Không có phiếu nhập nháp nào đang mở cho Nhà cung cấp này.
                                                </Typography>
                                            </Stack>
                                            <Button
                                                component={Link}
                                                href={createBatchHref}
                                                size="small"
                                                variant="contained"
                                                color="warning"
                                                onClick={handleCreateBatchNavigate}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 700,
                                                    borderRadius: '8px',
                                                }}
                                            >
                                                Tạo phiếu nhập
                                            </Button>
                                        </Paper>
                                    ) : (
                                        <Stack spacing={1}>
                                            {wizard.batchOptions.map((option) => {
                                                const selected =
                                                    wizard.selectedImportBatchId === option.id;
                                                return (
                                                    <Box
                                                        key={option.id}
                                                        onClick={() =>
                                                            wizard.selectDraftBatch(option.id)
                                                        }
                                                        sx={{
                                                            border: '1px solid',
                                                            borderColor: selected
                                                                ? 'primary.main'
                                                                : 'divider',
                                                            borderRadius: 1.5,
                                                            p: 1.25,
                                                            cursor: 'pointer',
                                                            bgcolor: selected
                                                                ? 'rgba(37,99,235,0.04)'
                                                                : 'background.paper',
                                                        }}
                                                    >
                                                        <Stack
                                                            direction="row"
                                                            alignItems="center"
                                                            justifyContent="space-between"
                                                            spacing={1}
                                                        >
                                                            <Stack spacing={0.25}>
                                                                <Typography fontWeight={700}>
                                                                    {formatImportBatchHeaderCode(
                                                                        option.batchCode,
                                                                        option.id
                                                                    )}
                                                                </Typography>
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                >
                                                                    {option.supplierName || '—'} ·{' '}
                                                                    {dayjs(option.drawDate).format(
                                                                        'DD/MM/YYYY'
                                                                    )}
                                                                    {option.status
                                                                        ? ` · ${option.status}`
                                                                        : ''}
                                                                </Typography>
                                                            </Stack>
                                                            <Stack direction="row" spacing={0.5}>
                                                                <Button
                                                                    size="small"
                                                                    variant={
                                                                        selected
                                                                            ? 'contained'
                                                                            : 'outlined'
                                                                    }
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        wizard.selectDraftBatch(
                                                                            option.id
                                                                        );
                                                                    }}
                                                                    sx={{ textTransform: 'none' }}
                                                                >
                                                                    {selected
                                                                        ? 'Đang chọn'
                                                                        : 'Chọn'}
                                                                </Button>
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    disabled={
                                                                        wizard.discardingBatchId ===
                                                                        option.id
                                                                    }
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        if (
                                                                            window.confirm(
                                                                                `Huỷ phiếu nháp ${formatImportBatchHeaderCode(option.batchCode, option.id)}? Thao tác không hoàn tác.`
                                                                            )
                                                                        ) {
                                                                            void wizard.discardDraftBatch(
                                                                                option.id
                                                                            );
                                                                        }
                                                                    }}
                                                                >
                                                                    {wizard.discardingBatchId ===
                                                                    option.id ? (
                                                                        <CircularProgress size={16} />
                                                                    ) : (
                                                                        <DeleteOutlineIcon fontSize="small" />
                                                                    )}
                                                                </IconButton>
                                                            </Stack>
                                                        </Stack>
                                                    </Box>
                                                );
                                            })}
                                        </Stack>
                                    )}
                                    <Button
                                        component={Link}
                                        href={createBatchHref}
                                        variant="outlined"
                                        onClick={handleCreateBatchNavigate}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            alignSelf: 'flex-start',
                                        }}
                                    >
                                        Tạo phiếu nhập mới rồi quay lại
                                    </Button>
                                </Stack>
                            )}
                        </Box>

                        {wizard.draftIntent === 'CREATE_NEW' && (
                            <>
                                <RadioGroup
                                    value={wizard.importMode}
                                    onChange={(event) =>
                                        wizard.setImportMode(
                                            event.target.value as 'AUTO' | 'MANUAL'
                                        )
                                    }
                                >
                                    <Box
                                        onClick={() => wizard.setImportMode('AUTO')}
                                        sx={{
                                            border: '1px solid',
                                            borderColor:
                                                wizard.importMode === 'AUTO'
                                                    ? 'primary.main'
                                                    : 'divider',
                                            borderRadius: 2,
                                            p: 2,
                                            mb: 1.5,
                                            cursor: 'pointer',
                                            bgcolor:
                                                wizard.importMode === 'AUTO'
                                                    ? 'rgba(37,99,235,0.04)'
                                                    : 'background.paper',
                                        }}
                                    >
                                        <FormControlLabel
                                            value="AUTO"
                                            control={<Radio />}
                                            label={
                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    alignItems="center"
                                                >
                                                    <AutoModeOutlinedIcon
                                                        color="primary"
                                                        fontSize="small"
                                                    />
                                                    <Typography fontWeight={800}>
                                                        Tự động tạo phiếu nhập
                                                    </Typography>
                                                </Stack>
                                            }
                                        />
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ pl: 4 }}
                                        >
                                            Hệ thống tạo phiếu nhập theo nhà cung cấp đã chọn, nhóm
                                            theo ngày xổ / nhà đài từ kết quả OCR đã xác nhận.
                                        </Typography>
                                    </Box>

                                    <Box
                                        onClick={() => wizard.setImportMode('MANUAL')}
                                        sx={{
                                            border: '1px solid',
                                            borderColor:
                                                wizard.importMode === 'MANUAL'
                                                    ? 'primary.main'
                                                    : 'divider',
                                            borderRadius: 2,
                                            p: 2,
                                            cursor: 'pointer',
                                            bgcolor:
                                                wizard.importMode === 'MANUAL'
                                                    ? 'rgba(37,99,235,0.04)'
                                                    : 'background.paper',
                                        }}
                                    >
                                        <FormControlLabel
                                            value="MANUAL"
                                            control={<Radio />}
                                            label={
                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    alignItems="center"
                                                >
                                                    <EditNoteOutlinedIcon
                                                        color="primary"
                                                        fontSize="small"
                                                    />
                                                    <Typography fontWeight={800}>
                                                        Tạo phiếu nhập thủ công
                                                    </Typography>
                                                </Stack>
                                            }
                                        />
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ pl: 4 }}
                                        >
                                            Mở form tạo phiếu nhập mới, rồi quay lại bước này để gắn
                                            vé OCR vào phiếu vừa tạo.
                                        </Typography>
                                    </Box>
                                </RadioGroup>

                                {wizard.importMode === 'AUTO' && (
                                    <Stack spacing={1.5}>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 1.5,
                                                borderRadius: '12px',
                                                bgcolor: '#f0fdf4',
                                                border: '1px solid #bbf7d0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '8px',
                                                    bgcolor: '#dcfce7',
                                                    color: '#16a34a',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <CheckCircleOutlineOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                                            </Box>
                                            <Typography variant="body2" color="#166534">
                                                Nhà cung cấp đã chọn:{' '}
                                                <strong>
                                                    {activeSuppliers.find(
                                                        (s) => s.id === wizard.supplierId
                                                    )?.name ||
                                                        (wizard.supplierId != null
                                                            ? `#${wizard.supplierId}`
                                                            : 'Chưa chọn — quay lại bước tải ảnh')}
                                                </strong>
                                            </Typography>
                                        </Paper>

                                        <Box>
                                            <Typography
                                                variant="body2"
                                                fontWeight={700}
                                                sx={{ mb: 1 }}
                                            >
                                                Biên lai nhập vé (tuỳ chọn)
                                            </Typography>
                                            <UploadSingleFile
                                                label="Tải tệp / ảnh biên lai"
                                                value={wizard.invoiceEvidenceUrl}
                                                onChange={(url) =>
                                                    wizard.setInvoiceEvidenceUrl(
                                                        typeof url === 'string' ? url : ''
                                                    )
                                                }
                                                autoUpload
                                                accept={IMPORT_EVIDENCE_ACCEPT}
                                                customUpload={uploadImportBatchInvoiceEvidence}
                                                onUploadingChange={setInvoiceUploading}
                                                disabled={wizard.confirming}
                                                maxFileSizeMb={15}
                                            />
                                        </Box>

                                        <Box>
                                            <Typography
                                                variant="body2"
                                                fontWeight={700}
                                                sx={{ mb: 1 }}
                                            >
                                                Danh sách vé nhập (tuỳ chọn)
                                            </Typography>
                                            <UploadSingleFile
                                                label="Tải tệp / ảnh danh sách vé"
                                                value={wizard.ticketListImageUrl}
                                                onChange={(url) =>
                                                    wizard.setTicketListImageUrl(
                                                        typeof url === 'string' ? url : ''
                                                    )
                                                }
                                                autoUpload
                                                accept={IMPORT_EVIDENCE_ACCEPT}
                                                customUpload={uploadImportBatchTicketListImage}
                                                onUploadingChange={setTicketListUploading}
                                                disabled={wizard.confirming}
                                                maxFileSizeMb={15}
                                            />
                                        </Box>

                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={wizard.forceCreate}
                                                    onChange={(_, checked) =>
                                                        wizard.setForceCreate(checked)
                                                    }
                                                />
                                            }
                                            label="Buộc tạo phiếu mới nếu đã có phiếu chưa hoàn tất cùng NCC/ngày xổ"
                                        />
                                    </Stack>
                                )}

                                {wizard.importMode === 'MANUAL' && (
                                    <Stack spacing={1.5}>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 1.5,
                                                borderRadius: '12px',
                                                bgcolor: '#f0f7ff',
                                                border: '1px solid #bfdbfe',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                            }}
                                        >
                                            <InfoOutlinedIcon sx={{ color: '#2563eb', fontSize: '1.25rem' }} />
                                            <Typography variant="body2" color="#1e40af">
                                                Tạo phiếu nhập mới trên form riêng, sau đó hệ thống sẽ tự động gắn các vé OCR vào phiếu vừa tạo.
                                            </Typography>
                                        </Paper>
                                        <Button
                                            component={Link}
                                            href={createBatchHref}
                                            variant="contained"
                                            onClick={handleCreateBatchNavigate}
                                            sx={{
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                alignSelf: 'flex-start',
                                            }}
                                        >
                                            Mở form tạo phiếu nhập
                                        </Button>
                                    </Stack>
                                )}
                            </>
                        )}
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
                        <Box flex={1} />
                        <Button
                            onClick={handleClose}
                            disabled={wizard.scanning}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            Hủy
                        </Button>
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
                                || !wizard.supplierId
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
                            onClick={() => {
                                wizard.persistUnimportedDraft();
                                wizard.setStep('upload');
                            }}
                            sx={{ textTransform: 'none' }}
                        >
                            Quay lại
                        </Button>
                        <Box flex={1} />
                        <Button onClick={handleClose} sx={{ textTransform: 'none' }}>
                            Hủy
                        </Button>
                        <Button
                            variant="contained"
                            disabled={wizard.confirmableCount === 0}
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
                            onClick={() => wizard.setStep('review')}
                            disabled={wizard.confirming}
                            sx={{ textTransform: 'none' }}
                        >
                            Quay lại
                        </Button>
                        <Box flex={1} />
                        <Button
                            onClick={handleClose}
                            disabled={wizard.confirming}
                            sx={{ textTransform: 'none' }}
                        >
                            Hủy
                        </Button>
                        <Button
                            variant="contained"
                            disabled={
                                wizard.confirming ||
                                !wizard.canConfirmImport ||
                                invoiceUploading ||
                                ticketListUploading
                            }
                            onClick={() => void wizard.confirmImport()}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            {wizard.confirming
                                ? 'Đang nhập…'
                                : invoiceUploading || ticketListUploading
                                  ? 'Đang tải tệp…'
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
        </Dialog>
    );
};
