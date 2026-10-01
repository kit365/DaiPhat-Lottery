'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Dialog,
    IconButton,
    Stack,
    Typography,
    Tooltip,
    Chip,
    Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

export interface LightboxImageItem {
    id: string;
    previewUrl: string;
    file: File;
    status?: string;
}

interface OcrImagePreviewLightboxProps {
    open: boolean;
    images: LightboxImageItem[];
    initialIndex?: number;
    onClose: () => void;
    onDeleteImage?: (id: string) => void;
}

const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const OcrImagePreviewLightbox: React.FC<OcrImagePreviewLightboxProps> = ({
    open,
    images,
    initialIndex = 0,
    onClose,
    onDeleteImage,
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        if (open) {
            setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1)));
            setZoom(1);
            setRotation(0);
            setConfirmDelete(false);
        }
    }, [open, initialIndex, images.length]);

    const currentImage = images[currentIndex];

    const handlePrev = useCallback(() => {
        if (images.length === 0) return;
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
        setZoom(1);
        setRotation(0);
        setConfirmDelete(false);
    }, [images.length]);

    const handleNext = useCallback(() => {
        if (images.length === 0) return;
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
        setZoom(1);
        setRotation(0);
        setConfirmDelete(false);
    }, [images.length]);

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.3, 3));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.3, 0.5));
    const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
    const handleReset = () => {
        setZoom(1);
        setRotation(0);
    };

    const handleDelete = () => {
        if (!currentImage || !onDeleteImage) return;
        const deletedId = currentImage.id;
        onDeleteImage(deletedId);
        setConfirmDelete(false);
        if (images.length <= 1) {
            onClose();
        } else if (currentIndex >= images.length - 1) {
            setCurrentIndex(images.length - 2);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'Escape') onClose();
            if (e.key === '+' || e.key === '=') handleZoomIn();
            if (e.key === '-') handleZoomOut();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, handlePrev, handleNext, onClose]);

    if (!open || !currentImage) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            fullScreen
            PaperProps={{
                sx: {
                    bgcolor: 'rgba(10, 15, 29, 0.96)',
                    backdropFilter: 'blur(16px)',
                    color: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                },
            }}
        >
            {/* Top Toolbar */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: { xs: 2, sm: 3 },
                    py: 1.5,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    bgcolor: 'rgba(15, 23, 42, 0.6)',
                    zIndex: 10,
                }}
            >
                {/* File info */}
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ maxWidth: '40%' }}>
                    <Chip
                        label={`Ảnh ${currentIndex + 1} / ${images.length}`}
                        size="small"
                        sx={{
                            bgcolor: 'rgba(59, 130, 246, 0.25)',
                            color: '#60a5fa',
                            fontWeight: 700,
                            border: '1px solid rgba(96, 165, 250, 0.4)',
                        }}
                    />
                    <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ color: '#f8fafc' }}>
                            {currentImage.file.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            {formatFileSize(currentImage.file.size)}
                        </Typography>
                    </Box>
                </Stack>

                {/* Center zoom & rotate controls */}
                <Stack direction="row" spacing={0.5} alignItems="center">
                    <Tooltip title="Thu nhỏ (-)">
                        <span>
                            <IconButton
                                size="small"
                                onClick={handleZoomOut}
                                disabled={zoom <= 0.5}
                                sx={{ color: '#cbd5e1', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                            >
                                <ZoomOutIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Typography
                        variant="caption"
                        sx={{
                            color: '#94a3b8',
                            minWidth: 42,
                            textAlign: 'center',
                            fontWeight: 600,
                        }}
                    >
                        {Math.round(zoom * 100)}%
                    </Typography>
                    <Tooltip title="Phóng to (+)">
                        <span>
                            <IconButton
                                size="small"
                                onClick={handleZoomIn}
                                disabled={zoom >= 3}
                                sx={{ color: '#cbd5e1', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                            >
                                <ZoomInIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Xoay 90°">
                        <IconButton
                            size="small"
                            onClick={handleRotate}
                            sx={{ color: '#cbd5e1', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                        >
                            <RotateRightIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    {(zoom !== 1 || rotation !== 0) && (
                        <Tooltip title="Đặt lại kích thước">
                            <IconButton
                                size="small"
                                onClick={handleReset}
                                sx={{ color: '#38bdf8', '&:hover': { bgcolor: 'rgba(56, 189, 248, 0.15)' } }}
                            >
                                <RestartAltIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>

                {/* Right actions: Delete & Close */}
                <Stack direction="row" spacing={1} alignItems="center">
                    {onDeleteImage && (
                        confirmDelete ? (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                                <Typography variant="caption" sx={{ color: '#fca5a5', fontWeight: 600 }}>
                                    Xác nhận xóa?
                                </Typography>
                                <Button
                                    size="small"
                                    color="error"
                                    variant="contained"
                                    onClick={handleDelete}
                                    sx={{ py: 0.25, px: 1, minWidth: 'auto', fontSize: '0.75rem', fontWeight: 700 }}
                                >
                                    Xóa
                                </Button>
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => setConfirmDelete(false)}
                                    sx={{ py: 0.25, px: 1, minWidth: 'auto', fontSize: '0.75rem', color: '#cbd5e1' }}
                                >
                                    Hủy
                                </Button>
                            </Stack>
                        ) : (
                            <Tooltip title="Xóa ảnh vé này">
                                <IconButton
                                    size="small"
                                    onClick={() => setConfirmDelete(true)}
                                    sx={{
                                        color: '#f87171',
                                        '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' },
                                    }}
                                >
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )
                    )}
                    <Tooltip title="Đóng (Esc)">
                        <IconButton
                            size="small"
                            onClick={onClose}
                            sx={{
                                color: '#ffffff',
                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' },
                            }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            {/* Main Stage with Navigation Arrows */}
            <Box
                sx={{
                    flex: 1,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    p: 2,
                    userSelect: 'none',
                }}
            >
                {/* Prev Button */}
                {images.length > 1 && (
                    <IconButton
                        onClick={handlePrev}
                        sx={{
                            position: 'absolute',
                            left: { xs: 8, sm: 24 },
                            zIndex: 5,
                            color: '#ffffff',
                            bgcolor: 'rgba(15, 23, 42, 0.7)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            p: 1.5,
                            '&:hover': {
                                bgcolor: 'rgba(37, 99, 235, 0.8)',
                                transform: 'scale(1.1)',
                            },
                            transition: 'all 0.2s',
                        }}
                    >
                        <ArrowBackIosNewIcon />
                    </IconButton>
                )}

                {/* Centered Image with Zoom & Rotation */}
                <Box
                    sx={{
                        maxWidth: '92%',
                        maxHeight: '85vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.15s ease-out',
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    }}
                >
                    <Box
                        component="img"
                        src={currentImage.previewUrl}
                        alt={currentImage.file.name}
                        sx={{
                            maxWidth: '100%',
                            maxHeight: '82vh',
                            objectFit: 'contain',
                            borderRadius: '10px',
                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                        }}
                    />
                </Box>

                {/* Next Button */}
                {images.length > 1 && (
                    <IconButton
                        onClick={handleNext}
                        sx={{
                            position: 'absolute',
                            right: { xs: 8, sm: 24 },
                            zIndex: 5,
                            color: '#ffffff',
                            bgcolor: 'rgba(15, 23, 42, 0.7)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            p: 1.5,
                            '&:hover': {
                                bgcolor: 'rgba(37, 99, 235, 0.8)',
                                transform: 'scale(1.1)',
                            },
                            transition: 'all 0.2s',
                        }}
                    >
                        <ArrowForwardIosIcon />
                    </IconButton>
                )}
            </Box>

            {/* Bottom Thumbnail Strip */}
            {images.length > 1 && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1.5,
                        px: 2,
                        py: 1.5,
                        bgcolor: 'rgba(15, 23, 42, 0.8)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        overflowX: 'auto',
                        zIndex: 10,
                    }}
                >
                    {images.map((img, idx) => {
                        const isSelected = idx === currentIndex;
                        return (
                            <Box
                                key={img.id}
                                onClick={() => {
                                    setCurrentIndex(idx);
                                    setZoom(1);
                                    setRotation(0);
                                    setConfirmDelete(false);
                                }}
                                sx={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    border: isSelected
                                        ? '2.5px solid #3b82f6'
                                        : '1px solid rgba(255, 255, 255, 0.2)',
                                    opacity: isSelected ? 1 : 0.6,
                                    transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                                    transition: 'all 0.2s',
                                    flexShrink: 0,
                                    '&:hover': {
                                        opacity: 1,
                                        borderColor: '#60a5fa',
                                    },
                                }}
                            >
                                <Box
                                    component="img"
                                    src={img.previewUrl}
                                    alt={img.file.name}
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    }}
                                />
                            </Box>
                        );
                    })}
                </Box>
            )}
        </Dialog>
    );
};
