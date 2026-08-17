"use client";

import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useState } from 'react';
import { AppToast } from '../../../../../../utils/toast.util';
import { uploadAdminImage } from '@/admin/shared/services/upload.service';

interface Props {
    urls?: string[] | null;
    readOnly?: boolean;
    saving?: boolean;
    onChange: (urls: string[]) => Promise<void> | void;
    onZoomImage?: (payload: { url: string; title: string }) => void;
}

const MAX_PAYMENT_EVIDENCE = 10;

export const SettlementPaymentEvidencePanel = ({
    urls,
    readOnly,
    saving,
    onChange,
    onZoomImage,
}: Props) => {
    const images = (urls || []).filter(Boolean);
    const [uploading, setUploading] = useState(false);
    const busy = uploading || Boolean(saving);
    const canAdd = !readOnly && images.length < MAX_PAYMENT_EVIDENCE;

    const persist = async (next: string[]) => {
        await onChange(next);
    };

    const handleUpload = async (files: File[]) => {
        if (!canAdd || files.length === 0) return;
        const remaining = MAX_PAYMENT_EVIDENCE - images.length;
        const selected = files.slice(0, remaining);
        try {
            setUploading(true);
            const uploaded = await Promise.all(selected.map((file) => uploadAdminImage(file)));
            await persist([...images, ...uploaded]);
            AppToast.success(`Đã thêm ${uploaded.length} ảnh thanh toán nhà cung cấp.`);
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || err?.message || 'Tải ảnh thanh toán thất bại.');
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = async (index: number) => {
        if (readOnly || busy) return;
        try {
            setUploading(true);
            await persist(images.filter((_, i) => i !== index));
            AppToast.success('Đã gỡ ảnh thanh toán.');
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || err?.message || 'Gỡ ảnh thanh toán thất bại.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <PaymentsOutlinedIcon sx={{ color: '#2563eb' }} />
                <Typography variant="subtitle1" fontWeight={800}>
                    Ảnh đã thanh toán thành công cho nhà cung cấp
                </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Chụp / tải ảnh xác nhận đã thanh toán cho NCC. Cần ít nhất 1 ảnh để xác nhận đã thanh toán.
            </Typography>

            {images.length === 0 && !readOnly && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: '12px' }}>
                    Chưa có ảnh thanh toán. Không thể xác nhận đã thanh toán khi thiếu minh chứng này.
                </Alert>
            )}

            {images.length > 0 ? (
                <Stack spacing={1.5}>
                    <Grid container spacing={1.25}>
                        {images.map((url, idx) => (
                            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={`${url}-${idx}`}>
                                <Box
                                    sx={{
                                        position: 'relative',
                                        borderRadius: '10px',
                                        overflow: 'hidden',
                                        border: '1px solid #cbd5e1',
                                        height: 128,
                                        bgcolor: '#f8fafc',
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={url}
                                        alt={`Ảnh thanh toán ${idx + 1}`}
                                        sx={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                                        onClick={() =>
                                            onZoomImage?.({
                                                url,
                                                title: `Ảnh thanh toán NCC (${idx + 1})`,
                                            })
                                        }
                                    />
                                    {!readOnly && (
                                        <IconButton
                                            size="small"
                                            disabled={busy}
                                            onClick={() => handleRemove(idx)}
                                            sx={{
                                                position: 'absolute',
                                                top: 4,
                                                right: 4,
                                                bgcolor: 'rgba(220,38,38,0.85)',
                                                color: '#fff',
                                                p: 0.3,
                                                '&:hover': { bgcolor: 'rgba(220,38,38,1)' },
                                            }}
                                        >
                                            <CloseIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                    )}
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                    {canAdd && (
                        <Button
                            component="label"
                            size="small"
                            variant="outlined"
                            disabled={busy}
                            startIcon={busy ? <CircularProgress size={14} /> : <AddOutlinedIcon />}
                            sx={{ alignSelf: 'flex-start', borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                        >
                            {busy ? 'Đang tải...' : 'Thêm ảnh thanh toán'}
                            <input
                                type="file"
                                hidden
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length > 0) void handleUpload(files);
                                    e.target.value = '';
                                }}
                            />
                        </Button>
                    )}
                </Stack>
            ) : readOnly ? (
                <Typography variant="body2" color="text.secondary">
                    Không có ảnh thanh toán được lưu.
                </Typography>
            ) : (
                <Box
                    sx={{
                        minHeight: 160,
                        borderRadius: '12px',
                        border: '2px dashed #cbd5e1',
                        bgcolor: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: busy ? 'wait' : 'pointer',
                        p: 2,
                        textAlign: 'center',
                        '&:hover': { borderColor: '#2563eb', bgcolor: '#eff6ff33' },
                    }}
                    onClick={() => {
                        if (busy) return;
                        document.getElementById('settlement-payment-evidence-input')?.click();
                    }}
                >
                    <input
                        id="settlement-payment-evidence-input"
                        type="file"
                        hidden
                        accept="image/*"
                        multiple
                        disabled={busy}
                        onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) void handleUpload(files);
                            e.target.value = '';
                        }}
                    />
                    {busy ? (
                        <CircularProgress size={28} sx={{ color: '#2563eb', mb: 1 }} />
                    ) : (
                        <CloudUploadIcon sx={{ fontSize: 32, color: '#94a3b8', mb: 1 }} />
                    )}
                    <Typography variant="caption" fontWeight={700} color="#475569">
                        {busy ? 'Đang tải ảnh lên...' : 'Tải lên ảnh đã thanh toán cho NCC'}
                    </Typography>
                    <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.7rem', mt: 0.25 }}>
                        JPG, PNG · tối đa {MAX_PAYMENT_EVIDENCE} ảnh
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};
