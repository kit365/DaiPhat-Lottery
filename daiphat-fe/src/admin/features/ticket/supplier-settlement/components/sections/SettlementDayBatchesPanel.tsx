"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';
import {
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Grid,
    IconButton,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { uploadAdminImage } from '@/admin/shared/services/upload.service';
import { AppToast } from '../../../../../../utils/toast.util';
import { attachImportBatchInvoiceEvidence } from '../../../import-batch/services/importBatchService';
import { updateSupplierSettlementReceiptUrl } from '../../services/supplierSettlementService';
import type { SettlementOverviewImportBatch } from '../../types/supplierSettlement.type';

const getImportReceiptUrl = (batch?: SettlementOverviewImportBatch | null, localOverride?: string) =>
    localOverride
    || batch?.invoiceEvidenceUrl
    || batch?.receiptImageUrl
    || batch?.evidenceUrl
    || '';

interface Props {
    settlementId: number;
    supplierSettlementCode?: string | null;
    supplierSettlementReceiptUrl?: string | null;
    importBatches: SettlementOverviewImportBatch[];
    onRefresh?: () => void;
    onZoomImage?: (payload: { url: string; title: string }) => void;
    showReceipts?: boolean;
    onToggleShowReceipts?: () => void;
}

export const SettlementDayBatchesPanel = ({
    settlementId,
    supplierSettlementCode,
    supplierSettlementReceiptUrl,
    importBatches,
    onRefresh,
    onZoomImage,
    showReceipts = true,
    onToggleShowReceipts,
}: Props) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const importReceiptInputRef = useRef<HTMLInputElement | null>(null);

    const [selectedImportId, setSelectedImportId] = useState<number | null>(importBatches[0]?.id ?? null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingImportReceipt, setIsUploadingImportReceipt] = useState(false);
    const [localImportReceiptById, setLocalImportReceiptById] = useState<Record<number, string>>({});
    const [localSettlementReceiptUrl, setLocalSettlementReceiptUrl] = useState<string>(
        supplierSettlementReceiptUrl || ''
    );

    useEffect(() => {
        if (!importBatches.some((b) => b.id === selectedImportId)) {
            setSelectedImportId(importBatches[0]?.id ?? null);
        }
    }, [importBatches, selectedImportId]);

    useEffect(() => {
        setLocalSettlementReceiptUrl(supplierSettlementReceiptUrl || '');
    }, [settlementId, supplierSettlementReceiptUrl]);

    const selectedImport = useMemo(
        () => importBatches.find((b) => b.id === selectedImportId) ?? importBatches[0] ?? null,
        [importBatches, selectedImportId]
    );

    const importReceiptUrl = getImportReceiptUrl(
        selectedImport,
        selectedImport?.id != null ? localImportReceiptById[selectedImport.id] : undefined
    );
    const hasImportReceipt = Boolean(importReceiptUrl.trim());
    const settlementReceiptUrl = localSettlementReceiptUrl;

    const handleUploadImportReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        if (!selectedImport?.id) {
            AppToast.error('Không tìm thấy phiếu nhập để đính kèm biên lai.');
            return;
        }
        try {
            setIsUploadingImportReceipt(true);
            const uploadedUrl = await uploadAdminImage(file);
            const res = await attachImportBatchInvoiceEvidence(selectedImport.id, uploadedUrl);
            if (res.success) {
                setLocalImportReceiptById((prev) => ({ ...prev, [selectedImport.id]: uploadedUrl }));
                AppToast.success(`Đã lưu biên lai phiếu nhập ${selectedImport.batchCode || `#${selectedImport.id}`}.`);
                onRefresh?.();
            } else {
                AppToast.error(res.message || 'Lưu ảnh biên lai phiếu nhập thất bại.');
            }
        } catch (err: any) {
            AppToast.error(
                err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tải biên lai phiếu nhập.'
            );
        } finally {
            setIsUploadingImportReceipt(false);
        }
    };

    const handleUploadSettlementReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        if (!settlementId) {
            AppToast.error('Không tìm thấy kỳ đối soát để lưu biên lai.');
            return;
        }

        try {
            setIsSaving(true);
            const uploadedUrl = await uploadAdminImage(file);
            setLocalSettlementReceiptUrl(uploadedUrl);
            const res = await updateSupplierSettlementReceiptUrl(settlementId, uploadedUrl);
            if (res.success) {
                AppToast.success(`Đã lưu biên lai đối soát #${settlementId}.`);
                onRefresh?.();
            } else {
                AppToast.error(res.message || 'Lưu ảnh biên lai thất bại.');
            }
        } catch (err: any) {
            AppToast.error(
                err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tải/lưu biên lai.'
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveReceipt = async () => {
        if (!settlementId) {
            AppToast.error('Không tìm thấy kỳ đối soát để lưu biên lai.');
            return;
        }
        if (!settlementReceiptUrl.trim()) {
            AppToast.warning('Vui lòng chọn ảnh biên lai trước khi lưu.');
            return;
        }
        try {
            setIsSaving(true);
            const res = await updateSupplierSettlementReceiptUrl(settlementId, settlementReceiptUrl.trim());
            if (res.success) {
                AppToast.success(`Đã lưu biên lai đối soát #${settlementId}.`);
                onRefresh?.();
            } else {
                AppToast.error(res.message || 'Lưu ảnh biên lai thất bại.');
            }
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu biên lai.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteReceipt = async () => {
        if (!settlementId) {
            AppToast.error('Không tìm thấy kỳ đối soát để xóa biên lai.');
            return;
        }
        if (!settlementReceiptUrl.trim()) {
            AppToast.warning('Chưa có ảnh biên lai để xóa.');
            return;
        }
        try {
            setIsSaving(true);
            // Empty string is persisted as null by the BE receipt endpoint.
            const res = await updateSupplierSettlementReceiptUrl(settlementId, '');
            if (res.success) {
                setLocalSettlementReceiptUrl('');
                AppToast.success(`Đã xóa biên lai đối soát #${settlementId}.`);
                onRefresh?.();
            } else {
                AppToast.error(res.message || 'Xóa ảnh biên lai thất bại.');
            }
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi xóa biên lai.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Stack spacing={2.5} sx={{ mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                    Đối chiếu ảnh biên lai nhập — biên lai đối soát
                </Typography>
                {onToggleShowReceipts && (
                    <Button
                        variant="outlined"
                        onClick={onToggleShowReceipts}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', color: '#475569', borderColor: '#cbd5e1' }}
                    >
                        {showReceipts ? 'Ẩn biên lai' : 'Xem biên lai'}
                    </Button>
                )}
            </Stack>

            {showReceipts && (
                <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={800}>
                                        1. Biên lai phiếu nhập (Sáng)
                                    </Typography>
                                </Box>
                                <Chip label="Biên lai nhập" size="small" color="info" sx={{ fontWeight: 700 }} />
                            </Stack>

                            {importBatches.length > 1 && (
                                <ToggleButtonGroup
                                    exclusive
                                    size="small"
                                    value={selectedImportId}
                                    onChange={(_, value) => value != null && setSelectedImportId(value)}
                                    sx={{ 
                                        mb: 1.5, 
                                        display: 'flex', 
                                        overflowX: 'auto',
                                        whiteSpace: 'nowrap',
                                        gap: 1, 
                                        pb: 0.5,
                                        '&::-webkit-scrollbar': {
                                            height: '4px',
                                        },
                                        '&::-webkit-scrollbar-track': {
                                            background: 'transparent',
                                        },
                                        '&::-webkit-scrollbar-thumb': {
                                            background: '#cbd5e1',
                                            borderRadius: '4px',
                                        },
                                        '&::-webkit-scrollbar-thumb:hover': {
                                            background: '#94a3b8',
                                        },
                                        '& .MuiToggleButtonGroup-grouped': {
                                            flexShrink: 0,
                                            border: '1px solid #e2e8f0 !important',
                                            borderRadius: '8px !important',
                                            px: 2,
                                            py: 0.5,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            color: 'text.secondary',
                                            '&.Mui-selected': {
                                                bgcolor: 'primary.50',
                                                color: 'primary.700',
                                                borderColor: 'primary.200 !important',
                                            },
                                            '&:hover': {
                                                bgcolor: 'grey.50',
                                            }
                                        }
                                    }}
                                >
                                    {importBatches.map((batch) => (
                                        <ToggleButton key={batch.id} value={batch.id}>
                                            {batch.batchCode || `#${batch.id}`}
                                        </ToggleButton>
                                    ))}
                                </ToggleButtonGroup>
                            )}

                            <Box
                                sx={{
                                    position: 'relative',
                                    width: '100%',
                                    height: 240,
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    border: '1px solid #cbd5e1',
                                    bgcolor: '#f1f5f9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <input
                                    ref={importReceiptInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                    style={{ display: 'none' }}
                                    onChange={handleUploadImportReceipt}
                                />
                                {hasImportReceipt ? (
                                    <>
                                        <Box
                                            component="img"
                                            src={importReceiptUrl}
                                            alt="Biên lai phiếu nhập"
                                            sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                        />
                                        <IconButton
                                            onClick={() =>
                                                onZoomImage?.({
                                                    url: importReceiptUrl,
                                                    title: `Biên lai nhập · ${selectedImport?.batchCode || selectedImport?.id || ''}`,
                                                })
                                            }
                                            sx={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                bgcolor: 'rgba(15, 23, 42, 0.75)',
                                                color: '#fff',
                                                '&:hover': { bgcolor: '#0f172a' },
                                            }}
                                        >
                                            <ZoomInIcon fontSize="small" />
                                        </IconButton>
                                    </>
                                ) : (
                                    <Stack spacing={1.25} alignItems="center" sx={{ p: 2, textAlign: 'center' }}>
                                        {isUploadingImportReceipt ? (
                                            <CircularProgress size={28} />
                                        ) : (
                                            <CloudUploadIcon sx={{ fontSize: '2rem', color: '#94a3b8' }} />
                                        )}
                                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                            {isUploadingImportReceipt
                                                ? 'Đang tải ảnh biên lai...'
                                                : 'Chưa có ảnh biên lai cho phiếu nhập này'}
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            disabled={!selectedImport?.id || isUploadingImportReceipt}
                                            startIcon={<CloudUploadIcon />}
                                            onClick={() => importReceiptInputRef.current?.click()}
                                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                                        >
                                            Tải ảnh biên lai
                                        </Button>
                                    </Stack>
                                )}
                            </Box>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={800}>
                                        2. Biên lai đối soát
                                    </Typography>
                                </Box>
                                <Chip label="Biên lai đối soát" size="small" color="success" sx={{ fontWeight: 700 }} />
                            </Stack>

                            <ToggleButtonGroup
                                exclusive
                                size="small"
                                value="selected"
                                sx={{ 
                                    mb: 1.5, 
                                    display: 'flex', 
                                    overflowX: 'auto',
                                    whiteSpace: 'nowrap',
                                    gap: 1, 
                                    pb: 0.5,
                                    '&::-webkit-scrollbar': {
                                        height: '4px',
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        background: 'transparent',
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        background: '#cbd5e1',
                                        borderRadius: '4px',
                                    },
                                    '&::-webkit-scrollbar-thumb:hover': {
                                        background: '#94a3b8',
                                    },
                                    '& .MuiToggleButtonGroup-grouped': {
                                        flexShrink: 0,
                                        border: '1px solid #e2e8f0 !important',
                                        borderRadius: '8px !important',
                                        px: 2,
                                        py: 0.5,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        color: 'text.secondary',
                                        '&.Mui-selected': {
                                            bgcolor: 'success.50',
                                            color: 'success.700',
                                            borderColor: 'success.200 !important',
                                        },
                                        '&:hover': {
                                            bgcolor: 'grey.50',
                                            cursor: 'default',
                                        }
                                    }
                                }}
                            >
                                <ToggleButton value="selected" disableRipple sx={{ cursor: 'default' }}>
                                    {supplierSettlementCode || `Kỳ đối soát #${settlementId}`}
                                </ToggleButton>
                            </ToggleButtonGroup>

                            <Box
                                onClick={() => !settlementReceiptUrl && fileInputRef.current?.click()}
                                sx={{
                                    position: 'relative',
                                    width: '100%',
                                    height: 240,
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    border: settlementReceiptUrl ? '1px solid #cbd5e1' : '1px dashed #919eab52',
                                    bgcolor: settlementReceiptUrl ? '#f1f5f9' : '#919eab14',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: settlementReceiptUrl ? 'default' : 'pointer',
                                    transition: 'opacity 300ms ease-linear',
                                    '&:hover': {
                                        opacity: settlementReceiptUrl ? 1 : 0.72,
                                    },
                                }}
                            >
                                {settlementReceiptUrl ? (
                                    <>
                                        <Box
                                            component="img"
                                            src={settlementReceiptUrl}
                                            alt="Biên lai đối soát"
                                            sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                        />
                                        <Stack direction="row" spacing={1} sx={{ position: 'absolute', top: 8, right: 8 }}>
                                            <IconButton
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onZoomImage?.({
                                                        url: settlementReceiptUrl,
                                                        title: `Biên lai đối soát · #${settlementId}`,
                                                    });
                                                }}
                                                sx={{
                                                    bgcolor: 'rgba(15, 23, 42, 0.75)',
                                                    color: '#fff',
                                                    '&:hover': { bgcolor: '#0f172a' },
                                                }}
                                            >
                                                <ZoomInIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                disabled={isSaving}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    void handleDeleteReceipt();
                                                }}
                                                sx={{
                                                    bgcolor: 'error.main',
                                                    color: '#fff',
                                                    '&:hover': { bgcolor: 'error.dark' },
                                                }}
                                            >
                                                {isSaving ? <CircularProgress size={20} color="inherit" /> : <CloseIcon fontSize="small" />}
                                            </IconButton>
                                        </Stack>
                                    </>
                                ) : (
                                    <Stack alignItems="center" spacing={1} sx={{ p: 2, textAlign: 'center' }}>
                                        <CloudUploadIcon sx={{ fontSize: 50, color: '#637381', mb: 0.5 }} />
                                        <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: 'text.primary' }}>
                                            {isSaving ? "Đang tải ảnh lên..." : "Kéo thả hoặc chọn tệp"}
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.875rem', color: '#637381' }}>
                                            Kéo tệp vào đây, hoặc <Box component="span" sx={{ color: '#FF3030', textDecoration: 'underline' }}>chọn tệp</Box>
                                        </Typography>
                                    </Stack>
                                )}
                            </Box>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleUploadSettlementReceipt}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                        </Card>
                    </Grid>
                </Grid>
            )}
        </Stack>
    );
};
