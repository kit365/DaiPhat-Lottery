"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
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
import { uploadAdminImage } from '../../../../../api/upload.api';
import { AppToast } from '../../../../../../utils/toast.util';
import { updateSupplierSettlementReceiptUrl } from '../../services/supplierSettlementService';
import type { SettlementOverviewImportBatch } from '../../types/supplierSettlement.type';

const DEFAULT_IMPORT_RECEIPT = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" fill="none">
  <rect width="600" height="800" fill="#F8FAFC"/>
  <rect x="30" y="30" width="540" height="740" rx="20" fill="white" stroke="#E2E8F0" stroke-width="2"/>
  <text x="300" y="380" font-family="sans-serif" font-size="20" font-weight="bold" fill="#64748B" text-anchor="middle">Chưa có biên lai nhập</text>
</svg>
`)}`;

const getImportReceiptUrl = (batch?: SettlementOverviewImportBatch | null) =>
    batch?.invoiceEvidenceUrl || batch?.receiptImageUrl || batch?.evidenceUrl || DEFAULT_IMPORT_RECEIPT;

interface Props {
    settlementId: number;
    supplierSettlementCode?: string | null;
    supplierSettlementReceiptUrl?: string | null;
    importBatches: SettlementOverviewImportBatch[];
    onRefresh?: () => void;
    onZoomImage?: (payload: { url: string; title: string }) => void;
}

export const SettlementDayBatchesPanel = ({
    settlementId,
    supplierSettlementCode,
    supplierSettlementReceiptUrl,
    importBatches,
    onRefresh,
    onZoomImage,
}: Props) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [selectedImportId, setSelectedImportId] = useState<number | null>(importBatches[0]?.id ?? null);
    const [isSaving, setIsSaving] = useState(false);
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

    const importReceiptUrl = getImportReceiptUrl(selectedImport);
    const settlementReceiptUrl = localSettlementReceiptUrl;

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
            <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                Đối chiếu ảnh biên lai nhập — biên lai đối soát
            </Typography>

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
                                <Typography variant="caption" color="text.secondary">
                                    {selectedImport
                                        ? `Mã lô: ${selectedImport.batchCode || `#${selectedImport.id}`}`
                                        : 'Chưa có phiếu nhập'}
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
                                sx={{ mb: 1.5, flexWrap: 'wrap' }}
                            >
                                {importBatches.map((batch) => (
                                    <ToggleButton key={batch.id} value={batch.id} sx={{ textTransform: 'none', px: 1.25 }}>
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
                            <Box
                                component="img"
                                src={importReceiptUrl}
                                alt="Biên lai phiếu nhập"
                                sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                            {importReceiptUrl !== DEFAULT_IMPORT_RECEIPT && (
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
                                <Typography variant="caption" color="text.secondary">
                                    {supplierSettlementCode
                                        ? `Mã đối soát: ${supplierSettlementCode}`
                                        : `Kỳ đối soát #${settlementId}`}
                                </Typography>
                            </Box>
                            <Chip label="Biên lai đối soát" size="small" color="success" sx={{ fontWeight: 700 }} />
                        </Stack>

                        <Box
                            onClick={() => !settlementReceiptUrl && fileInputRef.current?.click()}
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
                                cursor: settlementReceiptUrl ? 'default' : 'pointer',
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
                                    <IconButton
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onZoomImage?.({
                                                url: settlementReceiptUrl,
                                                title: `Biên lai đối soát · #${settlementId}`,
                                            });
                                        }}
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
                                <Stack spacing={1} alignItems="center" sx={{ p: 2, textAlign: 'center' }}>
                                    <CloudUploadIcon sx={{ fontSize: '2.5rem', color: '#94a3b8' }} />
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                        Chưa có ảnh biên lai đối soát
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => fileInputRef.current?.click()}
                                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                                    >
                                        Tải ảnh biên lai đối soát
                                    </Button>
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
                        <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 1.5 }}>
                            <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                disabled={isSaving || !settlementReceiptUrl}
                                onClick={() => void handleDeleteReceipt()}
                                startIcon={<DeleteOutlineIcon />}
                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                            >
                                Xóa ảnh
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                disabled={isSaving}
                                onClick={() => fileInputRef.current?.click()}
                                startIcon={<CloudUploadIcon />}
                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                            >
                                Tải ảnh
                            </Button>
                            <Button
                                variant="contained"
                                size="small"
                                disabled={isSaving || !settlementReceiptUrl}
                                onClick={() => void handleSaveReceipt()}
                                sx={{
                                    borderRadius: '8px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    bgcolor: '#2563eb',
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                            >
                                {isSaving ? <CircularProgress size={18} color="inherit" /> : 'Lưu ảnh'}
                            </Button>
                        </Stack>
                    </Card>
                </Grid>
            </Grid>
        </Stack>
    );
};
