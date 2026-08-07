"use client";

import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CategoryIcon from '@mui/icons-material/Category';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getBatchTypeLabel, getImportModeLabel } from '../../utils/batchTypeLabels';
import type { ImportBatchImportMode } from '../../utils/batchTypeLabels';
import type { InvoiceEvidenceValue } from '../../utils/invoiceEvidence';
import { formatImportCost } from '../../utils/importCostCalculator';

export interface ConfirmLineSummary {
    stationName: string;
    batchType: string;
    declareQuantity: number;
    importCost: number;
}

interface ImportBatchConfirmDialogProps {
    open: boolean;
    drawDate: string;
    supplierName?: string;
    importMode?: ImportBatchImportMode;
    invoiceEvidenceUrl?: InvoiceEvidenceValue;
    lines: ConfirmLineSummary[];
    totalDeclareQuantity: number;
    totalCostValue: number;
    isPending: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const formatVnd = (value: number) => `${formatImportCost(value)} VNĐ`;

export const ImportBatchConfirmDialog = ({
    open,
    drawDate,
    supplierName,
    importMode,
    invoiceEvidenceUrl,
    lines,
    totalDeclareQuantity,
    totalCostValue,
    isPending,
    onClose,
    onConfirm,
}: ImportBatchConfirmDialogProps) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const formattedDrawDate = drawDate ? dayjs(drawDate).format('DD/MM/YYYY') : '—';
    const receiptUrl = useMemo(() => {
        if (invoiceEvidenceUrl instanceof File) {
            return URL.createObjectURL(invoiceEvidenceUrl);
        }
        return typeof invoiceEvidenceUrl === 'string' ? invoiceEvidenceUrl.trim() : '';
    }, [invoiceEvidenceUrl]);

    useEffect(() => {
        if (!(invoiceEvidenceUrl instanceof File) || !receiptUrl) {
            return;
        }
        return () => URL.revokeObjectURL(receiptUrl);
    }, [invoiceEvidenceUrl, receiptUrl]);

    const showSharedReceipt = importMode === 'IN_DAY';

    const handleClose = () => {
        if (!isPending) {
            setPreviewUrl(null);
            onClose();
        }
    };

    return (
        <>
            <Dialog 
                open={open} 
                onClose={handleClose} 
                maxWidth="md" 
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                    }
                }}
            >
                <DialogTitle sx={{ py: 2.5, px: 3, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Box 
                                sx={{ 
                                    width: 40, 
                                    height: 40, 
                                    borderRadius: 2, 
                                    bgcolor: 'primary.50', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center' 
                                }}
                            >
                                <ConfirmationNumberIcon color="primary" />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight="bold" color="text.primary">
                                    Xác nhận tạo phiếu nhập lô vé
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Kiểm tra kỹ chi tiết số lượng và các dòng nhà đài trước khi khởi tạo
                                </Typography>
                            </Box>
                        </Stack>
                        <IconButton
                            aria-label="Đóng"
                            onClick={handleClose}
                            disabled={isPending}
                            sx={{ color: 'text.secondary' }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>

                <DialogContent sx={{ p: 3 }}>
                    <Stack spacing={3}>
                        {/* ── Thông tin chung Card Grid ── */}
                        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#f8fafc', borderColor: '#e2e8f0' }}>
                            <Typography variant="subtitle2" fontWeight="bold" color="text.primary" sx={{ mb: 2 }}>
                                📋 THÔNG TIN CHUNG PHIẾU NHẬP
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Stack spacing={0.5}>
                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="caption" color="text.secondary">Ngày quay</Typography>
                                        </Stack>
                                        <Typography variant="body2" fontWeight="bold">{formattedDrawDate}</Typography>
                                    </Stack>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Stack spacing={0.5}>
                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <StorefrontIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="caption" color="text.secondary">Nhà cung cấp</Typography>
                                        </Stack>
                                        <Typography variant="body2" fontWeight="bold">{supplierName || '—'}</Typography>
                                    </Stack>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Stack spacing={0.5}>
                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <CategoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="caption" color="text.secondary">Hình thức nhập</Typography>
                                        </Stack>
                                        <Chip 
                                            label={getImportModeLabel(importMode)} 
                                            size="small" 
                                            color="primary" 
                                            variant="outlined" 
                                            sx={{ fontWeight: 'bold', width: 'fit-content' }}
                                        />
                                    </Stack>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Stack spacing={0.5}>
                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <PaymentsIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="caption" color="text.secondary">Tổng giá trị</Typography>
                                        </Stack>
                                        <Typography variant="body2" fontWeight="bold" color="primary.main">
                                            {formatVnd(totalCostValue)}
                                        </Typography>
                                    </Stack>
                                </Grid>
                            </Grid>

                            {/* Biên lai dùng chung */}
                            {showSharedReceipt && (
                                <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed #cbd5e1' }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                        📷 BIÊN LAI XÁC NHẬN (DÙNG CHUNG)
                                    </Typography>
                                    {receiptUrl ? (
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Box
                                                onClick={() => setPreviewUrl(receiptUrl)}
                                                sx={{
                                                    borderRadius: 2,
                                                    border: '1px solid #cbd5e1',
                                                    overflow: 'hidden',
                                                    cursor: 'pointer',
                                                    width: 80,
                                                    height: 60,
                                                    bgcolor: '#fff',
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                                    '&:hover': { opacity: 0.85 }
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    src={receiptUrl}
                                                    alt="Biên lai"
                                                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            </Box>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<VisibilityIcon />}
                                                onClick={() => setPreviewUrl(receiptUrl)}
                                                sx={{ textTransform: 'none', borderRadius: 2 }}
                                            >
                                                Xem ảnh phóng to
                                            </Button>
                                        </Stack>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary" italic>
                                            Không có ảnh biên lai đính kèm
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        </Paper>

                        {/* ── Bảng danh sách các Dòng theo Nhà đài ── */}
                        <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                <Typography variant="subtitle2" fontWeight="bold">
                                    🏛️ DANH SÁCH ĐÀI VÉ KHAI BÁO ({lines.length} dòng)
                                </Typography>
                                <Chip 
                                    label={`Tổng khai báo: ${totalDeclareQuantity.toLocaleString('vi-VN')} vé`} 
                                    color="secondary" 
                                    size="small" 
                                    sx={{ fontWeight: 'bold' }}
                                />
                            </Stack>

                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>STT</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Nhà đài</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Loại lô</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Số lượng vé</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Giá vốn/vé</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Thành tiền</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {lines.map((line, index) => {
                                            const lineTotal = line.declareQuantity * line.importCost;
                                            return (
                                                <TableRow key={`${line.stationName}-${index}`} hover>
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>{line.stationName || '—'}</TableCell>
                                                    <TableCell>
                                                        <Chip 
                                                            label={getBatchTypeLabel(line.batchType)} 
                                                            size="small" 
                                                            variant="outlined"
                                                            sx={{ fontSize: 11 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                        {line.declareQuantity.toLocaleString('vi-VN')} vé
                                                    </TableCell>
                                                    <TableCell align="right">{formatVnd(line.importCost)}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                        {formatVnd(lineTotal)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>

                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            Sau khi khởi tạo phiếu, hệ thống sẽ mở giao diện bóc tách số và sê-ri vé (qua Real-time OCR Mobile hoặc tải file).
                        </Alert>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
                    <Button
                        onClick={handleClose}
                        disabled={isPending}
                        color="inherit"
                        variant="outlined"
                        sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
                    >
                        Quay lại chỉnh sửa
                    </Button>
                    <Button
                        onClick={onConfirm}
                        variant="contained"
                        color="primary"
                        disabled={isPending}
                        sx={{ borderRadius: 2, textTransform: 'none', px: 4, fontWeight: 'bold', minHeight: 40 }}
                    >
                        {isPending ? 'Đang khởi tạo phiếu...' : 'Xác nhận khởi tạo phiếu'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={!!previewUrl}
                onClose={() => setPreviewUrl(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.92)', boxShadow: 'none' } }}
            >
                <IconButton
                    aria-label="Đóng xem ảnh"
                    onClick={() => setPreviewUrl(null)}
                    sx={{ position: 'absolute', right: 8, top: 8, color: '#fff', zIndex: 1 }}
                >
                    <CloseIcon />
                </IconButton>
                <DialogContent
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 3,
                        minHeight: 320,
                    }}
                >
                    {previewUrl && (
                        <Box
                            component="img"
                            src={previewUrl}
                            alt="Ảnh biên lai"
                            sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};
