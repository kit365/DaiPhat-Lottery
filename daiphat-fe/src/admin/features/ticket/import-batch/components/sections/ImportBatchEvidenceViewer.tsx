"use client";

import { useState } from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Paper,
    Stack,
    SxProps,
    Theme,
    Tooltip,
    Typography,
} from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import PhotoSizeSelectActualOutlinedIcon from '@mui/icons-material/PhotoSizeSelectActualOutlined';
import { toast } from 'react-toastify';
import { ImagePreview, type ImagePreviewInfoItem } from '../../../../../components/ui/ImagePreview';
import { getUploadFileCategory } from '../../../../../components/upload/UploadSingleFile';

export type ImportBatchEvidenceViewerProps = {
    url?: string | null;
    alt?: string;
    dialogTitle?: string;
    defaultFileName?: string;
    infoItems?: ImagePreviewInfoItem[];
    thumbnailSx?: SxProps<Theme>;
    compact?: boolean;
    aspectRatio?: 'wide' | 'square';
    /** Custom title / label above the card */
    label?: string;
};

const getFileNameFromUrl = (url?: string | null, fallback = 'Tài liệu đính kèm'): string => {
    if (!url) return fallback;
    try {
        if (url.startsWith('blob:') || url.startsWith('data:')) {
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

const getFileExtension = (url?: string | null): string => {
    if (!url) return '';
    try {
        const clean = url.split('?')[0].split('#')[0];
        const lastDot = clean.lastIndexOf('.');
        if (lastDot !== -1 && lastDot < clean.length - 1) {
            return clean.substring(lastDot + 1).toUpperCase();
        }
    } catch {
        // Ignore
    }
    return '';
};

/**
 * Downloads a file automatically to the client's device
 */
export const downloadEvidenceFile = async (url: string, suggestedFilename?: string) => {
    const filename = suggestedFilename || getFileNameFromUrl(url, 'tai-lieu');
    const toastId = toast.info(`Đang tải tệp "${filename}" xuống máy…`, { autoClose: 2500 });

    try {
        // Try fetching as blob to trigger true download across browser/cross-origin
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
        toast.dismiss(toastId);
        toast.success(`Đã tải "${filename}" về máy thành công!`);
    } catch {
        // Fallback: direct anchor trigger
        try {
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.dismiss(toastId);
            toast.success(`Đã mở / tải "${filename}"!`);
        } catch {
            toast.dismiss(toastId);
            toast.error('Không thể tự động tải tệp. Vui lòng thử mở trong tab mới.');
        }
    }
};

export const ImportBatchEvidenceViewer = ({
    url,
    alt = 'Tài liệu phiếu nhập',
    dialogTitle = 'Chi tiết tài liệu',
    defaultFileName,
    infoItems,
    thumbnailSx,
    compact = false,
    aspectRatio = 'wide',
    label,
}: ImportBatchEvidenceViewerProps) => {
    const [imageLoadError, setImageLoadError] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    if (!url || !url.trim()) {
        return (
            <Paper
                variant="outlined"
                sx={{
                    p: 2.5,
                    borderRadius: '12px',
                    borderColor: '#e2e8f0',
                    bgcolor: '#f8fafc',
                    textAlign: 'center',
                    borderStyle: 'dashed',
                }}
            >
                <InsertDriveFileOutlinedIcon sx={{ color: '#94a3b8', fontSize: 32, mb: 0.5 }} />
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Chưa có tệp hoặc ảnh đính kèm
                </Typography>
            </Paper>
        );
    }

    const rawCategory = getUploadFileCategory(url);
    // If browser couldn't load image, treat as a generic/document file
    const isImage = rawCategory === 'image' && !imageLoadError;
    const fileName = getFileNameFromUrl(url, defaultFileName || alt);
    const ext = getFileExtension(url);

    const handleDownload = async (e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            await downloadEvidenceFile(url, fileName);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleOpenInNewTab = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    // Style configs for file formats
    const getFormatConfig = () => {
        if (isImage) {
            return {
                label: ext || 'ẢNH',
                fullType: 'Hình ảnh',
                icon: <PhotoSizeSelectActualOutlinedIcon sx={{ fontSize: 24, color: '#2563eb' }} />,
                bg: '#eff6ff',
                color: '#1d4ed8',
                borderColor: '#bfdbfe',
            };
        }
        if (rawCategory === 'pdf') {
            return {
                label: 'PDF',
                fullType: 'Tài liệu PDF',
                icon: <PictureAsPdfIcon sx={{ fontSize: 28, color: '#dc2626' }} />,
                bg: '#fef2f2',
                color: '#b91c1c',
                borderColor: '#fecaca',
            };
        }
        if (rawCategory === 'excel') {
            return {
                label: ext || 'XLSX',
                fullType: 'Bảng tính Excel',
                icon: <TableChartOutlinedIcon sx={{ fontSize: 28, color: '#16a34a' }} />,
                bg: '#f0fdf4',
                color: '#15803d',
                borderColor: '#bbf7d0',
            };
        }
        if (rawCategory === 'csv') {
            return {
                label: 'CSV',
                fullType: 'Tệp dữ liệu CSV',
                icon: <TableChartOutlinedIcon sx={{ fontSize: 28, color: '#0d9488' }} />,
                bg: '#f0fdfa',
                color: '#0f766e',
                borderColor: '#99f6e4',
            };
        }
        if (rawCategory === 'docx') {
            return {
                label: ext || 'WORD',
                fullType: 'Tài liệu Word',
                icon: <DescriptionOutlinedIcon sx={{ fontSize: 28, color: '#2563eb' }} />,
                bg: '#eff6ff',
                color: '#1d4ed8',
                borderColor: '#bfdbfe',
            };
        }
        if (rawCategory === 'document') {
            return {
                label: ext || 'TXT',
                fullType: 'Văn bản',
                icon: <ArticleOutlinedIcon sx={{ fontSize: 28, color: '#475569' }} />,
                bg: '#f8fafc',
                color: '#334155',
                borderColor: '#cbd5e1',
            };
        }
        return {
            label: ext || 'TỆP',
            fullType: 'Tệp đính kèm',
            icon: <InsertDriveFileOutlinedIcon sx={{ fontSize: 28, color: '#475569' }} />,
            bg: '#f8fafc',
            color: '#334155',
            borderColor: '#e2e8f0',
        };
    };

    const formatConfig = getFormatConfig();

    // 1. Render for Images: High quality preview with web zoom viewer & download options
    if (isImage) {
        return (
            <Box sx={{ width: '100%', maxWidth: compact ? 220 : 340 }}>
                {label && (
                    <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 0.75, display: 'block' }}>
                        {label}
                    </Typography>
                )}
                <Paper
                    variant="outlined"
                    sx={{
                        p: 1.5,
                        borderRadius: '12px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            borderColor: '#cbd5e1',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        },
                    }}
                >
                    <Box sx={{ position: 'relative', mb: 1.25 }}>
                        <ImagePreview
                            src={url}
                            alt={alt}
                            dialogTitle={dialogTitle}
                            infoItems={infoItems}
                            thumbnailSx={{
                                width: '100%',
                                height: aspectRatio === 'square' ? (compact ? 140 : 180) : (compact ? 130 : 170),
                                maxWidth: '100%',
                                maxHeight: 220,
                                borderRadius: '9px',
                                border: '1px solid #e2e8f0',
                                objectFit: 'contain',
                                bgcolor: '#f8fafc',
                                ...thumbnailSx,
                            }}
                        />
                    </Box>

                    {/* Metadata & Actions */}
                    <Stack spacing={1}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                                <Chip
                                    size="small"
                                    label={formatConfig.label}
                                    sx={{
                                        height: 20,
                                        fontSize: '0.675rem',
                                        fontWeight: 800,
                                        bgcolor: formatConfig.bg,
                                        color: formatConfig.color,
                                        border: `1px solid ${formatConfig.borderColor}`,
                                    }}
                                />
                                <Tooltip title={fileName} placement="top">
                                    <Typography
                                        variant="caption"
                                        fontWeight={700}
                                        color="#0f172a"
                                        noWrap
                                        sx={{ maxWidth: 160, fontSize: '0.75rem' }}
                                    >
                                        {fileName}
                                    </Typography>
                                </Tooltip>
                            </Stack>

                            <Tooltip title="Tải ảnh về máy">
                                <IconButton
                                    size="small"
                                    onClick={handleDownload}
                                    disabled={isDownloading}
                                    sx={{
                                        p: 0.6,
                                        borderRadius: '7px',
                                        border: '1px solid #e2e8f0',
                                        bgcolor: '#f8fafc',
                                        color: '#334155',
                                        '&:hover': { bgcolor: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' },
                                    }}
                                >
                                    {isDownloading ? <CircularProgress size={14} /> : <FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />}
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    </Stack>
                </Paper>
            </Box>
        );
    }

    // 2. Render for Non-Image Files (PDF, Excel, Word, CSV, etc.)
    return (
        <Box sx={{ width: '100%', maxWidth: compact ? 260 : 360 }}>
            {label && (
                <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 0.75, display: 'block' }}>
                    {label}
                </Typography>
            )}
            <Paper
                variant="outlined"
                onClick={handleDownload}
                sx={{
                    p: 2,
                    borderRadius: '14px',
                    borderColor: '#e2e8f0',
                    bgcolor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    border: '1.5px solid #e2e8f0',
                    '&:hover': {
                        borderColor: formatConfig.color,
                        bgcolor: formatConfig.bg,
                        transform: 'translateY(-1px)',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                        '& .download-btn': {
                            bgcolor: formatConfig.color,
                            color: '#ffffff',
                        },
                    },
                }}
            >
                <Stack direction="row" spacing={1.75} alignItems="center">
                    {/* File icon box */}
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: '11px',
                            bgcolor: formatConfig.bg,
                            border: `1.5px solid ${formatConfig.borderColor}`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            gap: 0.25,
                        }}
                    >
                        {formatConfig.icon}
                        <Typography
                            variant="caption"
                            sx={{
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                color: formatConfig.color,
                                lineHeight: 1,
                                letterSpacing: '0.02em',
                            }}
                        >
                            {formatConfig.label}
                        </Typography>
                    </Box>

                    {/* File details */}
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.25 }}>
                            <Chip
                                size="small"
                                label={formatConfig.fullType}
                                sx={{
                                    height: 18,
                                    fontSize: '0.625rem',
                                    fontWeight: 700,
                                    bgcolor: formatConfig.bg,
                                    color: formatConfig.color,
                                    border: `1px solid ${formatConfig.borderColor}`,
                                }}
                            />
                        </Stack>

                        <Tooltip title={fileName} placement="top-start">
                            <Typography
                                variant="body2"
                                fontWeight={700}
                                color="#0f172a"
                                noWrap
                                sx={{ fontSize: '0.85rem', lineHeight: 1.35 }}
                            >
                                {fileName}
                            </Typography>
                        </Tooltip>

                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.725rem', display: 'block', mt: 0.25 }}>
                            Nhấn để tự động tải về máy
                        </Typography>
                    </Box>
                </Stack>

                {/* Bottom Action Strip */}
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mt: 1.75, pt: 1.25, borderTop: '1px solid #f1f5f9' }}>
                    <Button
                        size="small"
                        className="download-btn"
                        variant="outlined"
                        startIcon={isDownloading ? <CircularProgress size={14} color="inherit" /> : <FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />}
                        disabled={isDownloading}
                        onClick={handleDownload}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            py: 0.4,
                            px: 1.5,
                            borderColor: formatConfig.borderColor,
                            color: formatConfig.color,
                            bgcolor: '#ffffff',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {isDownloading ? 'Đang tải…' : 'Tải về máy'}
                    </Button>

                    <Tooltip title="Mở trong tab mới">
                        <IconButton
                            size="small"
                            onClick={handleOpenInNewTab}
                            sx={{
                                p: 0.5,
                                color: '#64748b',
                                borderRadius: '7px',
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.04)', color: '#0f172a' },
                            }}
                        >
                            <OpenInNewIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Paper>
        </Box>
    );
};

export default ImportBatchEvidenceViewer;
