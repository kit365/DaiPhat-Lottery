"use client";

import {
    Alert,
    Box,
    Button,
    ButtonBase,
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
    TableFooter,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getBatchTypeLabel, getImportModeLabel } from '../../utils/batchTypeLabels';
import type { ImportBatchImportMode } from '../../utils/batchTypeLabels';
import type { InvoiceEvidenceValue } from '../../utils/invoiceEvidence';
import { formatVnd } from '../../utils/importCostCalculator';
import { getUploadFileCategory } from '../../../../../components/upload/UploadSingleFile';

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
    ticketListImageUrls?: string[];
    lines: ConfirmLineSummary[];
    totalDeclareQuantity: number;
    totalCostValue: number;
    isPending: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const getFileNameFromUrl = (url?: string | null, fallback = 'Tệp đính kèm'): string => {
    if (!url) return fallback;
    try {
        if (url.startsWith('blob:')) {
            return fallback;
        }
        const clean = url.split('?')[0].split('#')[0];
        const seg = clean.substring(clean.lastIndexOf('/') + 1);
        if (seg && seg.length > 0 && !seg.includes(':')) {
            return decodeURIComponent(seg);
        }
        return fallback;
    } catch {
        return fallback;
    }
};

const AttachmentPreviewItem = ({
    url,
    defaultLabel,
    onPreviewImage,
}: {
    url: string;
    defaultLabel?: string;
    onPreviewImage?: (url: string) => void;
}) => {
    const category = getUploadFileCategory(url);
    const fileName = getFileNameFromUrl(url, defaultLabel);
    const isImage = category === 'image';

    const handleOpen = () => {
        if (isImage) {
            if (onPreviewImage) {
                onPreviewImage(url);
            } else {
                window.open(url, '_blank');
            }
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    const getFormatTag = () => {
        if (isImage) return { label: 'Ảnh', bg: '#eff6ff', color: '#1d4ed8' };
        if (category === 'pdf') return { label: 'PDF', bg: '#fef2f2', color: '#b91c1c' };
        if (category === 'excel') return { label: 'Excel', bg: '#ecfdf5', color: '#047857' };
        if (category === 'csv') return { label: 'CSV', bg: '#f0fdfa', color: '#0f766e' };
        if (category === 'docx') return { label: 'Word', bg: '#eff6ff', color: '#1d4ed8' };
        return { label: 'Tệp', bg: '#f1f5f9', color: '#475569' };
    };

    const formatInfo = getFormatTag();

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 1.25,
                borderRadius: '10px',
                borderColor: '#e2e8f0',
                bgcolor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                transition: 'all 0.15s ease',
                '&:hover': {
                    bgcolor: '#f1f5f9',
                    borderColor: '#cbd5e1',
                },
            }}
        >
            <Box
                onClick={handleOpen}
                sx={{
                    width: 54,
                    height: 54,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor:
                        category === 'pdf'
                            ? '#fecaca'
                            : category === 'excel'
                              ? '#a7f3d0'
                              : category === 'csv'
                                ? '#99f6e4'
                                : category === 'docx'
                                  ? '#bfdbfe'
                                  : '#e2e8f0',
                    bgcolor:
                        category === 'pdf'
                            ? '#fef2f2'
                            : category === 'excel'
                              ? '#ecfdf5'
                              : category === 'csv'
                                ? '#f0fdfa'
                                : category === 'docx'
                                  ? '#eff6ff'
                                  : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    position: 'relative',
                    '&:hover .zoom-overlay': { opacity: 1 },
                }}
            >
                {isImage ? (
                    <>
                        <Box
                            component="img"
                            src={url}
                            alt={fileName}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <Box
                            className="zoom-overlay"
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                bgcolor: 'rgba(15, 23, 42, 0.45)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0,
                                transition: 'opacity 0.2s ease',
                            }}
                        >
                            <ZoomInIcon sx={{ fontSize: 18 }} />
                        </Box>
                    </>
                ) : category === 'pdf' ? (
                    <>
                        <PictureAsPdfIcon sx={{ color: '#ef4444', fontSize: '1.35rem' }} />
                        <Typography variant="caption" sx={{ fontSize: '0.58rem', fontWeight: 800, color: '#b91c1c', lineHeight: 1 }}>
                            PDF
                        </Typography>
                    </>
                ) : category === 'excel' ? (
                    <>
                        <TableChartOutlinedIcon sx={{ color: '#10b981', fontSize: '1.35rem' }} />
                        <Typography variant="caption" sx={{ fontSize: '0.58rem', fontWeight: 800, color: '#047857', lineHeight: 1 }}>
                            XLSX
                        </Typography>
                    </>
                ) : category === 'csv' ? (
                    <>
                        <TableChartOutlinedIcon sx={{ color: '#0d9488', fontSize: '1.35rem' }} />
                        <Typography variant="caption" sx={{ fontSize: '0.58rem', fontWeight: 800, color: '#0f766e', lineHeight: 1 }}>
                            CSV
                        </Typography>
                    </>
                ) : category === 'docx' ? (
                    <>
                        <DescriptionOutlinedIcon sx={{ color: '#2563eb', fontSize: '1.35rem' }} />
                        <Typography variant="caption" sx={{ fontSize: '0.58rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1 }}>
                            DOCX
                        </Typography>
                    </>
                ) : (
                    <>
                        <InsertDriveFileOutlinedIcon sx={{ color: '#64748b', fontSize: '1.35rem' }} />
                        <Typography variant="caption" sx={{ fontSize: '0.58rem', fontWeight: 800, color: '#334155', lineHeight: 1 }}>
                            TỆP
                        </Typography>
                    </>
                )}
            </Box>

            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Tooltip title={fileName} placement="top-start">
                    <Typography
                        variant="body2"
                        fontWeight={700}
                        color="#0f172a"
                        noWrap
                        sx={{ fontSize: '0.825rem', mb: 0.25 }}
                    >
                        {fileName}
                    </Typography>
                </Tooltip>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                        size="small"
                        label={formatInfo.label}
                        sx={{
                            height: 18,
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            bgcolor: formatInfo.bg,
                            color: formatInfo.color,
                        }}
                    />
                </Stack>
            </Box>

            <Button
                size="small"
                variant="outlined"
                onClick={handleOpen}
                startIcon={isImage ? <ZoomInIcon sx={{ fontSize: '0.95rem !important' }} /> : <OpenInNewIcon sx={{ fontSize: '0.85rem !important' }} />}
                sx={{
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    color: '#334155',
                    borderColor: '#cbd5e1',
                    py: 0.35,
                    px: 1,
                    flexShrink: 0,
                    bgcolor: '#ffffff',
                    '&:hover': {
                        borderColor: '#94a3b8',
                        bgcolor: '#f8fafc',
                    },
                }}
            >
                {isImage ? 'Xem' : 'Mở'}
            </Button>
        </Paper>
    );
};

const AttachmentGridItem = ({
    url,
    label,
    onPreviewImage,
}: {
    url: string;
    label?: string;
    onPreviewImage?: (url: string) => void;
}) => {
    const category = getUploadFileCategory(url);
    const fileName = getFileNameFromUrl(url, label);
    const isImage = category === 'image';

    const handleOpen = () => {
        if (isImage) {
            if (onPreviewImage) {
                onPreviewImage(url);
            } else {
                window.open(url, '_blank');
            }
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    if (isImage) {
        return (
            <Tooltip title={`Xem ảnh: ${fileName}`} placement="top">
                <Box
                    onClick={handleOpen}
                    sx={{
                        position: 'relative',
                        width: 72,
                        height: 72,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#f8fafc',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                        },
                        '&:hover .zoom-overlay': { opacity: 1 },
                    }}
                >
                    <Box
                        component="img"
                        src={url}
                        alt={fileName}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <Box
                        className="zoom-overlay"
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            bgcolor: 'rgba(15, 23, 42, 0.45)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0,
                            transition: 'opacity 0.2s ease',
                        }}
                    >
                        <ZoomInIcon sx={{ fontSize: 20 }} />
                    </Box>
                </Box>
            </Tooltip>
        );
    }

    return (
        <Tooltip title={`Mở tệp: ${fileName}`} placement="top">
            <ButtonBase
                onClick={handleOpen}
                sx={{
                    width: 72,
                    height: 72,
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor:
                        category === 'pdf'
                            ? '#fecaca'
                            : category === 'excel'
                              ? '#a7f3d0'
                              : category === 'csv'
                                ? '#99f6e4'
                                : category === 'docx'
                                  ? '#bfdbfe'
                                  : '#e2e8f0',
                    bgcolor:
                        category === 'pdf'
                            ? '#fef2f2'
                            : category === 'excel'
                              ? '#ecfdf5'
                              : category === 'csv'
                                ? '#f0fdfa'
                                : category === 'docx'
                                  ? '#eff6ff'
                                  : '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.25,
                    px: 0.5,
                    textAlign: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                    },
                }}
            >
                {category === 'pdf' ? (
                    <PictureAsPdfIcon sx={{ color: '#ef4444', fontSize: '1.4rem' }} />
                ) : category === 'excel' ? (
                    <TableChartOutlinedIcon sx={{ color: '#10b981', fontSize: '1.4rem' }} />
                ) : category === 'csv' ? (
                    <TableChartOutlinedIcon sx={{ color: '#0d9488', fontSize: '1.4rem' }} />
                ) : category === 'docx' ? (
                    <DescriptionOutlinedIcon sx={{ color: '#2563eb', fontSize: '1.4rem' }} />
                ) : (
                    <InsertDriveFileOutlinedIcon sx={{ color: '#64748b', fontSize: '1.4rem' }} />
                )}
                <Typography
                    variant="caption"
                    sx={{
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        color:
                            category === 'pdf'
                                ? '#b91c1c'
                                : category === 'excel'
                                  ? '#047857'
                                  : category === 'csv'
                                    ? '#0f766e'
                                    : category === 'docx'
                                      ? '#1d4ed8'
                                      : '#334155',
                        letterSpacing: '0.02em',
                    }}
                >
                    {category === 'pdf'
                        ? 'PDF'
                        : category === 'excel'
                          ? 'EXCEL'
                          : category === 'csv'
                            ? 'CSV'
                            : category === 'docx'
                              ? 'DOCX'
                              : 'TỆP'}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        fontSize: '0.55rem',
                        fontWeight: 600,
                        color: '#64748b',
                        wordBreak: 'break-all',
                        lineHeight: 1,
                        maxHeight: 18,
                        overflow: 'hidden',
                    }}
                >
                    {fileName}
                </Typography>
            </ButtonBase>
        </Tooltip>
    );
};

const renderBatchTypeChip = (batchType: string) => {
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
                height: 22,
                fontSize: '0.7rem',
                fontWeight: 700,
                bgcolor,
                color,
                border,
            }}
        />
    );
};

export const ImportBatchConfirmDialog = ({
    open,
    drawDate,
    supplierName,
    importMode,
    invoiceEvidenceUrl,
    ticketListImageUrls = [],
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
    const hasAttachments = Boolean(receiptUrl || ticketListImageUrls.length > 0);

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
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                    },
                }}
            >
                {/* Header */}
                <DialogTitle
                    sx={{
                        py: 2,
                        px: 3,
                        bgcolor: '#ffffff',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
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
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                                Xác nhận tạo phiếu nhập lô vé
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                                Vui lòng kiểm tra kỹ thông tin đợt nhập vé trước khi hoàn tất tạo phiếu
                            </Typography>
                        </Box>
                    </Stack>
                    <IconButton
                        aria-label="Đóng"
                        onClick={handleClose}
                        disabled={isPending}
                        sx={{ color: '#94a3b8', '&:hover': { color: '#475569' } }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                {/* Content */}
                <DialogContent
                    sx={{
                        p: 3,
                        bgcolor: '#ffffff',
                    }}
                >
                    <Stack spacing={2.5}>
                        {/* Section 1: KPI & Summary Info */}
                        <Grid container spacing={2}>
                            {/* Box Thông tin cơ bản */}
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        borderRadius: '12px',
                                        borderColor: '#e2e8f0',
                                        bgcolor: '#f8fafc',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: 1.25,
                                    }}
                                >
                                    <Stack direction="row" spacing={1.25} alignItems="center">
                                        <StorefrontOutlinedIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                                Nhà cung cấp
                                            </Typography>
                                            <Typography variant="body2" fontWeight={700} color="#0f172a" noWrap>
                                                {supplierName || '—'}
                                            </Typography>
                                        </Box>
                                    </Stack>

                                    <Divider sx={{ borderColor: '#e2e8f0' }} />

                                    <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
                                        <Stack direction="row" spacing={1.25} alignItems="center">
                                            <CalendarTodayOutlinedIcon sx={{ color: '#2563eb', fontSize: 18 }} />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                                    Ngày quay
                                                </Typography>
                                                <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                    {formattedDrawDate}
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ display: 'block', mb: 0.25 }}>
                                                Hình thức nhập
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={getImportModeLabel(importMode)}
                                                sx={{
                                                    height: 22,
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    bgcolor: importMode === 'IN_DAY' ? '#e0f2fe' : '#fef3c7',
                                                    color: importMode === 'IN_DAY' ? '#0369a1' : '#b45309',
                                                }}
                                            />
                                        </Box>
                                    </Stack>
                                </Paper>
                            </Grid>

                            {/* Box KPI Metrics */}
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Grid container spacing={1.5} sx={{ height: '100%' }}>
                                    <Grid size={{ xs: 6 }}>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                borderRadius: '12px',
                                                borderColor: '#e2e8f0',
                                                bgcolor: '#f8fafc',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                                <ConfirmationNumberOutlinedIcon sx={{ color: '#6366f1', fontSize: 18 }} />
                                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                    Tổng số lượng
                                                </Typography>
                                            </Stack>
                                            <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ fontSize: '1.25rem' }}>
                                                {totalDeclareQuantity.toLocaleString('vi-VN')}{' '}
                                                <Box component="span" sx={{ fontSize: '0.825rem', fontWeight: 600, color: 'text.secondary' }}>
                                                    vé
                                                </Box>
                                            </Typography>
                                        </Paper>
                                    </Grid>

                                    <Grid size={{ xs: 6 }}>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                borderRadius: '12px',
                                                borderColor: '#bbf7d0',
                                                bgcolor: '#f0fdf4',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                                <PaymentsOutlinedIcon sx={{ color: '#16a34a', fontSize: 18 }} />
                                                <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600 }}>
                                                    Tổng tiền vốn
                                                </Typography>
                                            </Stack>
                                            <Typography variant="h6" fontWeight={800} sx={{ color: '#15803d', fontSize: '1.25rem' }}>
                                                {formatVnd(totalCostValue)}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>

                        {/* Section 2: Bảng phân bổ chi tiết các dòng nhà đài */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
                                Danh sách nhà đài &amp; phân bổ ({lines.length} dòng)
                            </Typography>
                            <TableContainer
                                component={Paper}
                                variant="outlined"
                                sx={{
                                    borderRadius: '12px',
                                    borderColor: '#e2e8f0',
                                    overflow: 'hidden',
                                    boxShadow: 'none',
                                }}
                            >
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem', py: 1.25, width: 44, textAlign: 'center' }}>
                                                #
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem', py: 1.25 }}>
                                                Nhà đài
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem', py: 1.25, textAlign: 'center' }}>
                                                Loại lô
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem', py: 1.25, textAlign: 'right' }}>
                                                Số lượng
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem', py: 1.25, textAlign: 'right' }}>
                                                Giá vốn / vé
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem', py: 1.25, textAlign: 'right' }}>
                                                Thành tiền
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {lines.map((line, idx) => {
                                            const lineTotal = line.declareQuantity * line.importCost;
                                            return (
                                                <TableRow
                                                    key={`${line.stationName}-${idx}`}
                                                    sx={{
                                                        '&:hover': { bgcolor: '#f8fafc' },
                                                        '&:last-child td': { borderBottom: 0 },
                                                    }}
                                                >
                                                    <TableCell sx={{ textAlign: 'center', color: '#64748b', fontSize: '0.825rem', py: 1.25 }}>
                                                        {idx + 1}
                                                    </TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', py: 1.25 }}>
                                                        {line.stationName || '—'}
                                                    </TableCell>
                                                    <TableCell sx={{ textAlign: 'center', py: 1.25 }}>
                                                        {renderBatchTypeChip(line.batchType)}
                                                    </TableCell>
                                                    <TableCell sx={{ textAlign: 'right', fontWeight: 600, color: '#0f172a', fontSize: '0.875rem', py: 1.25 }}>
                                                        {line.declareQuantity.toLocaleString('vi-VN')} vé
                                                    </TableCell>
                                                    <TableCell sx={{ textAlign: 'right', color: '#475569', fontSize: '0.875rem', py: 1.25 }}>
                                                        {formatVnd(line.importCost)}
                                                    </TableCell>
                                                    <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', py: 1.25 }}>
                                                        {formatVnd(lineTotal)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                    <TableFooter sx={{ bgcolor: '#f8fafc' }}>
                                        <TableRow sx={{ '& td': { borderTop: '2px solid #e2e8f0', borderBottom: 0 } }}>
                                            <TableCell colSpan={3} sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.875rem', py: 1.25 }}>
                                                Tổng cộng ({lines.length} nhà đài)
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', py: 1.25 }}>
                                                {totalDeclareQuantity.toLocaleString('vi-VN')} vé
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'right', color: '#64748b', fontSize: '0.8rem', py: 1.25 }}>
                                                —
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: '#16a34a', fontSize: '1rem', py: 1.25 }}>
                                                {formatVnd(totalCostValue)}
                                            </TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </TableContainer>
                        </Box>

                        {/* Section 3: Chứng từ đính kèm */}
                        {hasAttachments && (
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    borderRadius: '12px',
                                    borderColor: '#e2e8f0',
                                    bgcolor: '#f8fafc',
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <DescriptionOutlinedIcon sx={{ color: '#475569', fontSize: 20 }} />
                                        <Typography variant="subtitle2" fontWeight={700} color="#0f172a" sx={{ fontSize: '0.875rem' }}>
                                            Chứng từ &amp; tệp đính kèm
                                        </Typography>
                                    </Stack>
                                    <Chip
                                        size="small"
                                        label={`${(receiptUrl ? 1 : 0) + ticketListImageUrls.length} tệp đính kèm`}
                                        sx={{
                                            height: 22,
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            bgcolor: '#eff6ff',
                                            color: '#1d4ed8',
                                            border: '1px solid #bfdbfe',
                                        }}
                                    />
                                </Stack>

                                <Grid container spacing={2}>
                                    {/* Cột 1: Biên lai NCC */}
                                    {showSharedReceipt && (
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Paper
                                                variant="outlined"
                                                sx={{
                                                    p: 1.75,
                                                    borderRadius: '10px',
                                                    borderColor: '#e2e8f0',
                                                    bgcolor: '#ffffff',
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                }}
                                            >
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                                                    <Typography variant="caption" fontWeight={700} color="#334155" sx={{ textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                        Biên lai phiếu nhập NCC
                                                    </Typography>
                                                    <Chip
                                                        size="small"
                                                        label={receiptUrl ? 'Đã đính kèm' : 'Chưa có'}
                                                        sx={{
                                                            height: 20,
                                                            fontSize: '0.65rem',
                                                            fontWeight: 700,
                                                            bgcolor: receiptUrl ? '#dcfce7' : '#f1f5f9',
                                                            color: receiptUrl ? '#15803d' : '#64748b',
                                                        }}
                                                    />
                                                </Stack>

                                                {receiptUrl ? (
                                                    <AttachmentPreviewItem
                                                        url={receiptUrl}
                                                        defaultLabel="Biên lai NCC"
                                                        onPreviewImage={(src) => setPreviewUrl(src)}
                                                    />
                                                ) : (
                                                    <Box sx={{ p: 2, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: '8px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Phiếu nhập chưa có biên lai
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Paper>
                                        </Grid>
                                    )}

                                    {/* Cột 2: Tệp danh sách vé */}
                                    <Grid size={{ xs: 12, md: showSharedReceipt ? 6 : 12 }}>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 1.75,
                                                borderRadius: '10px',
                                                borderColor: '#e2e8f0',
                                                bgcolor: '#ffffff',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                                                <Typography variant="caption" fontWeight={700} color="#334155" sx={{ textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                    Ảnh / Tệp danh sách vé nhập
                                                </Typography>
                                                <Chip
                                                    size="small"
                                                    label={`${ticketListImageUrls.length} tệp`}
                                                    sx={{
                                                        height: 20,
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        bgcolor: ticketListImageUrls.length > 0 ? '#e0f2fe' : '#f1f5f9',
                                                        color: ticketListImageUrls.length > 0 ? '#0284c7' : '#64748b',
                                                    }}
                                                />
                                            </Stack>

                                            {ticketListImageUrls.length === 1 ? (
                                                <AttachmentPreviewItem
                                                    url={ticketListImageUrls[0]}
                                                    defaultLabel="Tệp danh sách vé 1"
                                                    onPreviewImage={(src) => setPreviewUrl(src)}
                                                />
                                            ) : ticketListImageUrls.length > 1 ? (
                                                <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
                                                    {ticketListImageUrls.map((url, idx) => (
                                                        <AttachmentGridItem
                                                            key={`${url}-${idx}`}
                                                            url={url}
                                                            label={`Tệp ${idx + 1}`}
                                                            onPreviewImage={(src) => setPreviewUrl(src)}
                                                        />
                                                    ))}
                                                </Box>
                                            ) : (
                                                <Box sx={{ p: 2, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: '8px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Chưa có tệp đính kèm
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </Paper>
                        )}

                        {/* Cảnh báo & Lưu ý */}
                        <Alert
                            severity="info"
                            sx={{
                                borderRadius: '12px',
                                alignItems: 'center',
                                border: '1px solid rgba(2, 132, 199, 0.2)',
                                bgcolor: '#f0f9ff',
                                '& .MuiAlert-icon': { color: '#0284c7' },
                            }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#0369a1' }}>
                                Sau khi xác nhận, phiếu nhập lô sẽ được tạo và chuyển tiếp sang bước kiểm đếm / quét vé số.
                            </Typography>
                        </Alert>
                    </Stack>
                </DialogContent>

                {/* Actions */}
                <DialogActions
                    sx={{
                        px: 3,
                        pb: 2.5,
                        pt: 2,
                        gap: 1.5,
                        borderTop: '1px solid #f1f5f9',
                        bgcolor: '#ffffff',
                    }}
                >
                    <Button
                        onClick={handleClose}
                        disabled={isPending}
                        variant="outlined"
                        sx={{
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontWeight: 700,
                            px: 2.5,
                            py: 1,
                            color: '#475569',
                            borderColor: '#cbd5e1',
                            '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
                        }}
                    >
                        Hủy / Xem lại
                    </Button>
                    <Button
                        onClick={onConfirm}
                        variant="contained"
                        disabled={isPending}
                        sx={{
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontWeight: 800,
                            px: 3,
                            py: 1,
                            bgcolor: '#FF3030',
                            color: '#ffffff',
                            boxShadow: '0 4px 14px rgba(255, 48, 48, 0.3)',
                            '&:hover': { bgcolor: '#e02828' },
                        }}
                    >
                        {isPending ? 'Đang lưu phiếu...' : 'Xác nhận & Lưu'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Lightbox Preview Dialog for Images */}
            <Dialog
                open={!!previewUrl}
                onClose={() => setPreviewUrl(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '14px',
                        overflow: 'hidden',
                        bgcolor: 'rgba(15, 23, 42, 0.95)',
                        boxShadow: 'none',
                    },
                }}
            >
                <IconButton
                    aria-label="Đóng xem ảnh"
                    onClick={() => setPreviewUrl(null)}
                    sx={{ position: 'absolute', right: 12, top: 12, color: '#fff', zIndex: 1 }}
                >
                    <CloseIcon />
                </IconButton>
                <DialogContent
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 3,
                        minHeight: 360,
                    }}
                >
                    {previewUrl && (
                        <Box
                            component="img"
                            src={previewUrl}
                            alt="Ảnh đính kèm"
                            sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

