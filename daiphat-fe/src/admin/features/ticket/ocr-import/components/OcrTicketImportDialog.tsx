'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DocumentScannerOutlinedIcon from '@mui/icons-material/DocumentScannerOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import AutoModeOutlinedIcon from '@mui/icons-material/AutoModeOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import dayjs from 'dayjs';
import Link from 'next/link';
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
} from '../utils/ocrImportHelpers';
import OcrReviewImagePane, { type OcrFieldSelection } from './OcrReviewImagePane';
import OcrReviewResultCards from './OcrReviewResultCards';
import { getOcrTemplateDefaultReady } from '../../../station/services/ocrTemplateService';

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
            return;
        }
        let cancelled = false;
        setOcrReadyLoading(true);
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

    const handleClose = () => {
        wizard.reset();
        onClose();
    };

    const handleFinish = () => {
        wizard.clearDraft();
        onImported?.();
        handleClose();
    };

    const handleCreateBatchNavigate = () => {
        wizard.saveDraftForCreateBatch();
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xl">
            <DialogTitle sx={{ pr: 6 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <DocumentScannerOutlinedIcon color="primary" />
                    <Box>
                        <Typography variant="h6" fontWeight={800}>
                            Nhập vé bằng OCR
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {stepTitle[wizard.step]}
                        </Typography>
                    </Box>
                </Stack>
                <IconButton
                    onClick={handleClose}
                    sx={{ position: 'absolute', right: 12, top: 12 }}
                    aria-label="Đóng"
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ minHeight: 420 }}>
                {wizard.step === 'upload' && (
                    <Stack spacing={2}>
                        {ocrReady === false && (
                            <Alert severity="error">
                                Chưa cấu hình mẫu vé OCR mặc định. Vui lòng tạo/gán template mặc định
                                cho ít nhất một nhà đài trước khi quét.
                            </Alert>
                        )}
                        {ocrReadyLoading && (
                            <Alert severity="info">Đang kiểm tra cấu hình mẫu vé OCR…</Alert>
                        )}
                        {wizard.prefillLineOption && (
                            <Alert severity="info">
                                Gợi ý ngữ cảnh từ dòng lô{' '}
                                <strong>
                                    {formatImportBatchHeaderCode(
                                        wizard.prefillLineOption.batchCode,
                                        wizard.prefillLineOption.batchId
                                    )}
                                </strong>
                                {' · '}
                                {stationLabel(wizard.prefillLineOption.stationId)}
                                {' · '}
                                {dayjs(wizard.prefillLineOption.drawDate).format('DD/MM/YYYY')}
                                . Quét OCR không bắt buộc gắn dòng lô; chọn chế độ nhập ở bước sau.
                            </Alert>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={(event) => {
                                if (event.target.files) {
                                    wizard.addImages(event.target.files);
                                    event.target.value = '';
                                }
                            }}
                        />

                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Button
                                variant="outlined"
                                startIcon={<CloudUploadOutlinedIcon />}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={wizard.scanning || ocrReady === false || ocrReadyLoading}
                                sx={{ textTransform: 'none', fontWeight: 700 }}
                            >
                                Chọn ảnh vé
                            </Button>
                            {wizard.images.length > 0 && (
                                <Button
                                    color="inherit"
                                    onClick={wizard.clearImages}
                                    disabled={wizard.scanning}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Xóa tất cả
                                </Button>
                            )}
                        </Stack>

                        {wizard.images.length === 0 ? (
                            <Box
                                onClick={() => fileInputRef.current?.click()}
                                sx={{
                                    border: '1px dashed #cbd5e1',
                                    borderRadius: 2,
                                    p: 4,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    bgcolor: '#f8fafc',
                                    '&:hover': { bgcolor: '#f1f5f9' },
                                }}
                            >
                                <CloudUploadOutlinedIcon sx={{ fontSize: 40, color: '#94a3b8' }} />
                                <Typography mt={1} fontWeight={700}>
                                    Kéo thả hoặc chọn ảnh vé từ máy tính
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Hỗ trợ nhiều ảnh — mỗi ảnh gọi API OCR riêng
                                </Typography>
                            </Box>
                        ) : (
                            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                                {wizard.images.map((image) => (
                                    <Box
                                        key={image.id}
                                        sx={{
                                            width: 140,
                                            border: '1px solid #e2e8f0',
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                            position: 'relative',
                                            bgcolor: '#fff',
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={image.previewUrl}
                                            alt={image.file.name}
                                            sx={{ width: '100%', height: 100, objectFit: 'cover' }}
                                        />
                                        <Box sx={{ p: 1 }}>
                                            <Typography
                                                variant="caption"
                                                noWrap
                                                title={image.file.name}
                                                display="block"
                                            >
                                                {image.file.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {image.status === 'pending' && 'Chờ quét'}
                                                {image.status === 'scanning' && 'Đang quét…'}
                                                {image.status === 'done' && 'Xong'}
                                                {image.status === 'error' && 'Lỗi'}
                                            </Typography>
                                            {image.error && (
                                                <Typography variant="caption" color="error" display="block">
                                                    {image.error}
                                                </Typography>
                                            )}
                                        </Box>
                                        <IconButton
                                            size="small"
                                            onClick={() => wizard.removeImage(image.id)}
                                            disabled={wizard.scanning}
                                            sx={{ position: 'absolute', top: 2, right: 2, bgcolor: '#fff' }}
                                        >
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                        {image.status === 'scanning' && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    bgcolor: 'rgba(255,255,255,0.55)',
                                                    display: 'grid',
                                                    placeItems: 'center',
                                                }}
                                            >
                                                <CircularProgress size={28} />
                                            </Box>
                                        )}
                                    </Box>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                )}

                {wizard.step === 'review' && (
                    <Stack spacing={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel id="ocr-supplier-select-label">Nhà cung cấp (cho chế độ tự động)</InputLabel>
                            <Select
                                labelId="ocr-supplier-select-label"
                                label="Nhà cung cấp (cho chế độ tự động)"
                                value={wizard.supplierId ?? ''}
                                onChange={(event) => {
                                    const raw = String(event.target.value ?? '');
                                    wizard.setSupplierId(raw === '' ? null : Number(raw));
                                }}
                            >
                                <MenuItem value="">
                                    <em>Chọn nhà cung cấp</em>
                                </MenuItem>
                                {activeSuppliers.map((supplier) => (
                                    <MenuItem key={supplier.id} value={supplier.id}>
                                        {supplier.name} ({supplier.code})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {wizard.images.length === 0 ? (
                            <Alert severity="warning">
                                Không có ảnh để xem. Quay lại để tải ảnh vé.
                            </Alert>
                        ) : (
                            <>
                                {wizard.rows.every(
                                    (row) => row.status === 'FAILED' || row.status === 'INCOMPLETE'
                                ) &&
                                    wizard.confirmableCount === 0 && (
                                        <Alert severity="warning" sx={{ mb: 1 }}>
                                            Không đọc được đủ thông tin từ ảnh đã quét. Kiểm tra từng ảnh bên dưới
                                            hoặc quay lại để chụp lại / nhập thủ công.
                                        </Alert>
                                    )}
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" color="text.secondary">
                                        Chọn vé trên ảnh hoặc thẻ kết quả. Vé thiếu nhà đài / ngày xổ cần bổ sung trước
                                        khi tiếp tục. Ảnh không đọc được vẫn hiển thị để bạn kiểm tra.
                                    </Typography>
                                    <Button
                                        size="small"
                                        onClick={() =>
                                            wizard.toggleAllConfirmable(
                                                wizard.confirmableCount <
                                                    wizard.rows.filter(wizard.isRowConfirmable)
                                                        .length
                                            )
                                        }
                                        sx={{ textTransform: 'none' }}
                                    >
                                        Chọn tất cả hợp lệ
                                    </Button>
                                </Stack>

                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2,
                                    }}
                                >
                                    {reviewImageGroups.map((group) => (
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
                                            <Typography
                                                variant="subtitle1"
                                                fontWeight={800}
                                                sx={{ mb: 1.5 }}
                                            >
                                                {group.fileName} — {group.rows.length} vé nhận diện
                                            </Typography>
                                            <Box
                                                sx={{
                                                    display: 'grid',
                                                    gridTemplateColumns: {
                                                        xs: '1fr',
                                                        md: 'minmax(280px, 1fr) minmax(280px, 1fr)',
                                                    },
                                                    gap: 2,
                                                    alignItems: 'start',
                                                }}
                                            >
                                                {group.previewUrl ? (
                                                    <OcrReviewImagePane
                                                        previewUrl={group.previewUrl}
                                                        fileName={group.fileName}
                                                        ticketCount={group.rows.length}
                                                        rows={group.rows}
                                                        selection={fieldSelection}
                                                        onSelect={setFieldSelection}
                                                        previewHeight={360}
                                                    />
                                                ) : (
                                                    <Alert severity="info">
                                                        Không có preview cho {group.fileName}
                                                    </Alert>
                                                )}
                                                <OcrReviewResultCards
                                                    rows={group.rows}
                                                    selection={fieldSelection}
                                                    stationLabel={stationLabel}
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
                                    ))}
                                </Box>
                            </>
                        )}

                        <Accordion
                            disableGutters
                            onChange={(_, expanded) => {
                                if (expanded) {
                                    void wizard.loadScanLogs();
                                }
                            }}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <HistoryOutlinedIcon fontSize="small" />
                                    <Typography fontWeight={700}>Lịch sử quét (lottery_scan_log)</Typography>
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                                {wizard.loadingLogs ? (
                                    <CircularProgress size={24} />
                                ) : wizard.scanLogs.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">
                                        Chưa có log cho các kết quả OCR hiện tại.
                                    </Typography>
                                ) : (
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Thời gian</TableCell>
                                                <TableCell>Sự kiện</TableCell>
                                                <TableCell>Phương thức</TableCell>
                                                <TableCell>Hợp lệ</TableCell>
                                                <TableCell>OCR ID</TableCell>
                                                <TableCell>Ghi chú</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {wizard.scanLogs.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell>
                                                        {log.scannedAt
                                                            ? dayjs(log.scannedAt).format(
                                                                  'DD/MM/YYYY HH:mm:ss'
                                                              )
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell>{log.eventType}</TableCell>
                                                    <TableCell>{log.scanMethod || '—'}</TableCell>
                                                    <TableCell>
                                                        {log.isValid == null
                                                            ? '—'
                                                            : log.isValid
                                                              ? 'Có'
                                                              : 'Không'}
                                                    </TableCell>
                                                    <TableCell>{log.ocrScanResultId ?? '—'}</TableCell>
                                                    <TableCell>{log.note || '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </AccordionDetails>
                        </Accordion>
                    </Stack>
                )}

                {wizard.step === 'importMode' && (
                    <Stack spacing={2.5}>
                        <Alert severity="info">
                            Đã chọn {wizard.confirmableCount} vé hợp lệ. Chọn cách đưa vé vào kho.
                        </Alert>

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
                                        <Alert
                                            severity="warning"
                                            action={
                                                <Button
                                                    component={Link}
                                                    href={createBatchHref}
                                                    size="small"
                                                    color="inherit"
                                                    onClick={handleCreateBatchNavigate}
                                                >
                                                    Tạo phiếu nhập
                                                </Button>
                                            }
                                        >
                                            Không có phiếu nhập đang mở. Tạo phiếu mới rồi quay lại để chọn.
                                        </Alert>
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
                                        <Alert severity="success" variant="outlined">
                                            NCC đã chọn:{' '}
                                            <strong>
                                                {activeSuppliers.find(
                                                    (s) => s.id === wizard.supplierId
                                                )?.name ||
                                                    (wizard.supplierId != null
                                                        ? `#${wizard.supplierId}`
                                                        : 'Chưa chọn — quay lại bước xem lại')}
                                            </strong>
                                        </Alert>

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
                                        <Alert severity="info">
                                            Tạo phiếu nhập mới trên form riêng, sau đó hệ thống sẽ
                                            mở lại bước này để bạn gắn vé OCR vào phiếu vừa tạo.
                                        </Alert>
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
                        <Alert severity="success">
                            Chế độ {wizard.importResult.mode} — đã xử lý {wizard.importResult.totalRequested} vé —
                            thành công {wizard.importResult.successCount}, trùng{' '}
                            {wizard.importResult.duplicateCount}, lỗi {wizard.importResult.failedCount}.
                        </Alert>
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
                        <Box flex={1} />
                        <Button onClick={handleClose} disabled={wizard.scanning} sx={{ textTransform: 'none' }}>
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
                                || ocrReady === false
                                || ocrReadyLoading
                            }
                            onClick={() => void wizard.runScan()}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            {wizard.scanning ? 'Đang quét…' : 'Bắt đầu quét OCR'}
                        </Button>
                    </>
                )}
                {wizard.step === 'review' && (
                    <>
                        <Button
                            onClick={() => wizard.setStep('upload')}
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
