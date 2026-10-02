'use client';

import {
    Box,
    Button,
    CardActionArea,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Paper,
    Stack,
    Typography,
    Tooltip,
} from '@mui/material';
import dayjs from 'dayjs';
import { Icon } from '@/admin/components/ui/AdminIcon';
import type { ImportBatch, ImportBatchLine } from '../../types/importBatch.type';
import {
    getImportBatchStatusBadgeClass,
    getImportBatchStatusLabel,
} from '../../utils/batchTypeLabels';
import {
    formatImportBatchHeaderCode,
    importBatchCodeMonospaceSx,
} from '../../utils/importBatchCode';
import { useHasPendingOcrImportDraft } from '../../../ocr-import/utils/ocrImportDraftStorage';

const PENDING_OCR_FILE_IMPORT_TOOLTIP =
    'Đang có bản quét OCR chưa nhập kho. Vui lòng tiếp tục hoặc hủy bản quét trước khi nhập vé bằng tệp.';

export interface ImportBatchMethodSelectionDialogProps {
    open: boolean;
    batch: ImportBatch | null;
    targetLine?: ImportBatchLine | null;
    onClose: () => void;
    onSelectOcr: (batch: ImportBatch, line?: ImportBatchLine | null) => void;
    onSelectFile: (batch: ImportBatch, line?: ImportBatchLine | null) => void;
    onSelectManual: (batch: ImportBatch, line?: ImportBatchLine | null) => void;
}

export const ImportBatchMethodSelectionDialog = ({
    open,
    batch,
    targetLine,
    onClose,
    onSelectOcr,
    onSelectFile,
    onSelectManual,
}: ImportBatchMethodSelectionDialogProps) => {
    const hasPendingOcrDraft = useHasPendingOcrImportDraft();
    if (!batch) return null;

    // "Nhập vé bằng tệp" chỉ hiển thị khi import-batch vẫn còn ở trạng thái DRAFT
    const canImportFromFile = batch.status === 'DRAFT';

    const handleOcr = () => {
        onClose();
        onSelectOcr(batch, targetLine);
    };

    const handleFile = () => {
        onClose();
        onSelectFile(batch, targetLine);
    };

    const handleManual = () => {
        onClose();
        onSelectManual(batch, targetLine);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                className: 'admin-theme',
                sx: {
                    borderRadius: '16px',
                    overflow: 'hidden',
                },
            }}
        >
            <DialogTitle component="div" sx={{ p: 2.5, pb: 2 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                            sx={{
                                width: 42,
                                height: 42,
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'var(--palette-primary-lighter, #e0f2fe)',
                                color: 'var(--palette-primary-dark, #0369a1)',
                            }}
                        >
                            <Icon icon="solar:ticket-bold-duotone" width={24} />
                        </Box>
                        <Box>
                            <Typography component="div" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                                Chọn phương thức nhập vé
                            </Typography>
                            <Typography
                                component="div"
                                variant="body2"
                                sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.8125rem' }}
                            >
                                Chọn hình thức phù hợp để tiến hành nhập vé vào phiếu
                            </Typography>
                        </Box>
                    </Stack>
                    <IconButton onClick={onClose} size="small" aria-label="Đóng">
                        <Icon icon="solar:close-circle-bold" />
                    </IconButton>
                </Stack>
            </DialogTitle>
            <Divider />

            <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'var(--palette-background-neutral, #f8fafc)' }}>
                <Stack spacing={2}>
                    {/* Batch Information Card */}
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: '12px',
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                            justifyContent="space-between"
                            gap={1}
                        >
                            <Box>
                                <Typography
                                    variant="subtitle2"
                                    sx={{ fontWeight: 700, ...importBatchCodeMonospaceSx }}
                                >
                                    {formatImportBatchHeaderCode(batch.batchCode, batch.id)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    NCC: <strong>{batch.supplierName || '—'}</strong> · Ngày quay:{' '}
                                    <strong>
                                        {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                                    </strong>
                                </Typography>
                            </Box>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <span className={`admin-status-badge ${getImportBatchStatusBadgeClass(batch.status)}`}>
                                    {getImportBatchStatusLabel(batch.status)}
                                </span>
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`${(batch.lines ?? []).length} nhà đài`}
                                    sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }}
                                />
                            </Stack>
                        </Stack>
                    </Box>

                    {/* Method Option 1: Nhập vé bằng OCR */}
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: '14px',
                            border: '1.5px solid var(--palette-divider)',
                            bgcolor: 'background.paper',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                                borderColor: 'var(--palette-primary-main, #0284c7)',
                                bgcolor: 'var(--palette-primary-lighter, #f0f9ff)',
                                boxShadow: '0 6px 20px rgba(2, 132, 199, 0.12)',
                                transform: 'translateY(-2px)',
                            },
                        }}
                    >
                        <CardActionArea onClick={handleOcr} sx={{ p: 2.25 }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: '#eff6ff',
                                        color: '#2563eb',
                                        flexShrink: 0,
                                    }}
                                >
                                    <Icon icon="solar:scanner-bold-duotone" width={28} />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.975rem' }}>
                                            Nhập vé bằng OCR
                                        </Typography>
                                        <Chip
                                            label="Khuyên dùng"
                                            size="small"
                                            color="primary"
                                            sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                                        />
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', lineHeight: 1.4 }}>
                                        Quét ảnh chụp vé số tự động nhận diện đài xổ, sê-ri và dãy số nhanh chóng.
                                    </Typography>
                                </Box>
                                <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                                    <Icon icon="solar:alt-arrow-right-linear" width={22} />
                                </Box>
                            </Stack>
                        </CardActionArea>
                        {hasPendingOcrDraft && (
                            <Box
                                aria-label="Có bản quét OCR chưa nhập kho"
                                sx={{
                                    position: 'absolute', top: 10, right: 10, width: 10, height: 10,
                                    borderRadius: '50%', bgcolor: '#f97316', border: '2px solid #fff',
                                }}
                            />
                        )}
                    </Paper>

                    {/* Method Option 2: Nhập vé bằng tệp (Chỉ hiển thị khi DRAFT) */}
                    {canImportFromFile && (
                        <Tooltip title={hasPendingOcrDraft ? PENDING_OCR_FILE_IMPORT_TOOLTIP : ''} placement="top">
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: '14px',
                                border: '1.5px solid var(--palette-divider)',
                                bgcolor: 'background.paper',
                                overflow: 'hidden',
                                transition: 'all 0.2s ease-in-out',
                                opacity: hasPendingOcrDraft ? 0.5 : 1,
                                '&:hover': {
                                    ...(!hasPendingOcrDraft && {
                                        borderColor: 'var(--palette-success-main, #10b981)',
                                        bgcolor: '#ecfdf5',
                                        boxShadow: '0 6px 20px rgba(16, 185, 129, 0.12)',
                                        transform: 'translateY(-2px)',
                                    }),
                                },
                            }}
                        >
                            <CardActionArea disabled={hasPendingOcrDraft} onClick={handleFile} sx={{ p: 2.25 }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: '#ecfdf5',
                                            color: '#059669',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Icon icon="solar:file-text-bold-duotone" width={28} />
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.975rem' }}>
                                                Nhập vé bằng tệp
                                            </Typography>
                                            <Chip
                                                label="Excel / CSV"
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                                sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                                            />
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', lineHeight: 1.4 }}>
                                            Tải lên tệp danh sách vé Excel/CSV để hệ thống phân bổ vé vào phiếu tự động.
                                        </Typography>
                                    </Box>
                                    <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                                        <Icon icon="solar:alt-arrow-right-linear" width={22} />
                                    </Box>
                                </Stack>
                            </CardActionArea>
                        </Paper>
                        </Tooltip>
                    )}

                    {/* Method Option 3: Nhập vé thủ công */}
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: '14px',
                            border: '1.5px solid var(--palette-divider)',
                            bgcolor: 'background.paper',
                            overflow: 'hidden',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                                borderColor: 'var(--palette-warning-main, #f59e0b)',
                                bgcolor: '#fffbeb',
                                boxShadow: '0 6px 20px rgba(245, 158, 11, 0.12)',
                                transform: 'translateY(-2px)',
                            },
                        }}
                    >
                        <CardActionArea onClick={handleManual} sx={{ p: 2.25 }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: '#fff7ed',
                                        color: '#ea580c',
                                        flexShrink: 0,
                                    }}
                                >
                                    <Icon icon="solar:pen-new-square-bold-duotone" width={28} />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.975rem' }}>
                                            Nhập vé thủ công
                                        </Typography>
                                        <Chip
                                            label="Nhập tay"
                                            size="small"
                                            color="warning"
                                            variant="outlined"
                                            sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                                        />
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', lineHeight: 1.4 }}>
                                        Nhập từng đoạn vé, số lượng và sê-ri trực tiếp theo nhà đài đã khai báo.
                                    </Typography>
                                </Box>
                                <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                                    <Icon icon="solar:alt-arrow-right-linear" width={22} />
                                </Box>
                            </Stack>
                        </CardActionArea>
                    </Paper>
                </Stack>
            </DialogContent>
            <Divider />

            <DialogActions sx={{ p: 2, px: 2.5 }}>
                <Button
                    variant="outlined"
                    onClick={onClose}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: '8px',
                        color: 'text.secondary',
                        borderColor: 'divider',
                    }}
                >
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
};
