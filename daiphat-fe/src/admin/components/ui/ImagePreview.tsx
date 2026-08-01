"use client";

import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

import {
    Box,
    Button,
    Chip,
    Dialog,
    Divider,
    IconButton,
    Stack,
    SxProps,
    Theme,
    Tooltip,
    Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';

export type ImagePreviewInfoItem = {
    label: string;
    value: string;
};

type ImagePreviewProps = {
    src: string;
    alt?: string;
    dialogTitle?: string;
    infoItems?: ImagePreviewInfoItem[];
    thumbnailSx?: SxProps<Theme>;
};

type Size = { width: number; height: number };
type Point = { x: number; y: number };

const MIN_ZOOM_RATIO = 1;
const MAX_ZOOM_RATIO = 5;
const ZOOM_STEP = 1.15;

const computeFitScale = (imageSize: Size, viewportSize: Size) => {
    if (!imageSize.width || !imageSize.height || !viewportSize.width || !viewportSize.height) {
        return 1;
    }

    return Math.min(
        viewportSize.width / imageSize.width,
        viewportSize.height / imageSize.height
    );
};

const clampPosition = (position: Point, scale: number, imageSize: Size, viewportSize: Size): Point => {
    const renderedWidth = imageSize.width * scale;
    const renderedHeight = imageSize.height * scale;
    const maxX = Math.max(0, (renderedWidth - viewportSize.width) / 2);
    const maxY = Math.max(0, (renderedHeight - viewportSize.height) / 2);

    return {
        x: Math.min(maxX, Math.max(-maxX, position.x)),
        y: Math.min(maxY, Math.max(-maxY, position.y)),
    };
};

const getZoomPercent = (scale: number, fitScale: number) => {
    if (!fitScale) return 100;
    return Math.round((scale / fitScale) * 100);
};

type ZoomableImageViewerProps = {
    src: string;
    alt: string;
    open: boolean;
};

const ZoomableImageViewer = ({ src, alt, open }: ZoomableImageViewerProps) => {
    const viewportRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const dragStateRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

    const [naturalSize, setNaturalSize] = useState<Size>({ width: 0, height: 0 });
    const [viewportSize, setViewportSize] = useState<Size>({ width: 0, height: 0 });
    const [fitScale, setFitScale] = useState(1);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const zoomPercent = getZoomPercent(scale, fitScale);
    const canPan = scale > fitScale + 0.001;

    const applyViewportSize = useCallback(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const nextViewportSize = {
            width: viewport.clientWidth,
            height: viewport.clientHeight,
        };
        setViewportSize(nextViewportSize);
        return nextViewportSize;
    }, []);

    const resetView = useCallback(
        (imageSize: Size, nextViewportSize: Size) => {
            const nextFitScale = computeFitScale(imageSize, nextViewportSize);
            setFitScale(nextFitScale);
            setScale(nextFitScale);
            setPosition({ x: 0, y: 0 });
        },
        []
    );

    const handleImageLoad = useCallback(() => {
        const image = imageRef.current;
        const nextViewportSize = applyViewportSize();
        if (!image || !nextViewportSize) return;

        const imageSize = {
            width: image.naturalWidth,
            height: image.naturalHeight,
        };
        setNaturalSize(imageSize);
        resetView(imageSize, nextViewportSize);
    }, [applyViewportSize, resetView]);

    const updateZoom = useCallback(
        (nextScale: number, anchor?: { x: number; y: number }) => {
            if (!viewportSize.width || !naturalSize.width) return;

            const minScale = fitScale * MIN_ZOOM_RATIO;
            const maxScale = fitScale * MAX_ZOOM_RATIO;
            const clampedScale = Math.min(maxScale, Math.max(minScale, nextScale));

            if (clampedScale === scale) return;

            setIsAnimating(true);

            const scaleRatio = clampedScale / scale;
            const anchorX = anchor?.x ?? 0;
            const anchorY = anchor?.y ?? 0;
            const nextPosition = {
                x: anchorX - (anchorX - position.x) * scaleRatio,
                y: anchorY - (anchorY - position.y) * scaleRatio,
            };

            setScale(clampedScale);
            setPosition(clampPosition(nextPosition, clampedScale, naturalSize, viewportSize));
        },
        [fitScale, naturalSize, position, scale, viewportSize]
    );

    const handleFitToScreen = useCallback(() => {
        if (!naturalSize.width || !viewportSize.width) return;
        setIsAnimating(true);
        resetView(naturalSize, viewportSize);
    }, [naturalSize, resetView, viewportSize]);

    const handleResetZoom = useCallback(() => {
        handleFitToScreen();
    }, [handleFitToScreen]);

    const handleZoomBy = useCallback(
        (direction: 'in' | 'out') => {
            const factor = direction === 'in' ? ZOOM_STEP : 1 / ZOOM_STEP;
            updateZoom(scale * factor);
        },
        [scale, updateZoom]
    );

    useEffect(() => {
        if (!open) return;

        const viewport = viewportRef.current;
        if (!viewport) return;

        const observer = new ResizeObserver(() => {
            const nextViewportSize = applyViewportSize();
            if (!nextViewportSize || !naturalSize.width) return;

            const nextFitScale = computeFitScale(naturalSize, nextViewportSize);
            setFitScale(nextFitScale);

            if (Math.abs(scale - fitScale) < 0.001 && Math.abs(position.x) < 0.5 && Math.abs(position.y) < 0.5) {
                setScale(nextFitScale);
                setPosition({ x: 0, y: 0 });
            } else {
                setPosition((current) =>
                    clampPosition(current, scale, naturalSize, nextViewportSize)
                );
            }
        });

        observer.observe(viewport);
        return () => observer.disconnect();
    }, [applyViewportSize, fitScale, naturalSize, open, position.x, position.y, scale]);

    useEffect(() => {
        if (!open) return;

        const viewport = viewportRef.current;
        if (!viewport) return;

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();

            const rect = viewport.getBoundingClientRect();
            const anchor = {
                x: event.clientX - rect.left - rect.width / 2,
                y: event.clientY - rect.top - rect.height / 2,
            };
            const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
            updateZoom(scale * factor, anchor);
        };

        viewport.addEventListener('wheel', handleWheel, { passive: false });
        return () => viewport.removeEventListener('wheel', handleWheel);
    }, [open, scale, updateZoom]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (event: MouseEvent) => {
            const dragState = dragStateRef.current;
            if (!dragState || !naturalSize.width) return;

            const nextPosition = {
                x: dragState.posX + (event.clientX - dragState.x),
                y: dragState.posY + (event.clientY - dragState.y),
            };
            setPosition(clampPosition(nextPosition, scale, naturalSize, viewportSize));
        };

        const handleMouseUp = () => {
            dragStateRef.current = null;
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, naturalSize, scale, viewportSize]);

    useEffect(() => {
        if (!isAnimating) return;
        const timer = window.setTimeout(() => setIsAnimating(false), 220);
        return () => window.clearTimeout(timer);
    }, [isAnimating, scale, position]);

    useEffect(() => {
        if (!open) {
            setNaturalSize({ width: 0, height: 0 });
            setViewportSize({ width: 0, height: 0 });
            setFitScale(1);
            setScale(1);
            setPosition({ x: 0, y: 0 });
            setIsDragging(false);
            setIsAnimating(false);
            dragStateRef.current = null;
        }
    }, [open]);

    return (
        <Stack sx={{ flex: 1, minHeight: 0, minWidth: 0 }}>
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={{
                    px: { xs: 1.5, sm: 2 },
                    py: 1.25,
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    flexWrap: 'wrap',
                    gap: 1,
                }}
            >
                <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap">
                    <Tooltip title="Thu nhỏ">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => handleZoomBy('out')}
                                disabled={zoomPercent <= MIN_ZOOM_RATIO * 100}
                                aria-label="Thu nhỏ"
                            >
                                <ZoomOutIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Chip
                        size="small"
                        label={`${zoomPercent}%`}
                        sx={{
                            minWidth: 64,
                            fontWeight: 700,
                            bgcolor: 'action.hover',
                        }}
                    />

                    <Tooltip title="Phóng to">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => handleZoomBy('in')}
                                disabled={zoomPercent >= MAX_ZOOM_RATIO * 100}
                                aria-label="Phóng to"
                            >
                                <ZoomInIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RestartAltIcon />}
                        onClick={handleResetZoom}
                    >
                        Đặt lại
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FitScreenIcon />}
                        onClick={handleFitToScreen}
                    >
                        Vừa màn hình
                    </Button>
                </Stack>
            </Stack>

            <Box
                ref={viewportRef}
                onMouseDown={(event) => {
                    if (!canPan || event.button !== 0) return;
                    event.preventDefault();
                    dragStateRef.current = {
                        x: event.clientX,
                        y: event.clientY,
                        posX: position.x,
                        posY: position.y,
                    };
                    setIsDragging(true);
                    setIsAnimating(false);
                }}
                sx={{
                    position: 'relative',
                    flex: 1,
                    minHeight: { xs: 280, sm: 360, md: 480 },
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: (theme) =>
                        theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                    cursor: canPan ? (isDragging ? 'grabbing' : 'grab') : 'default',
                    userSelect: 'none',
                    touchAction: 'none',
                }}
            >
                <Box
                    sx={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transformOrigin: 'center center',
                        transition: isDragging || !isAnimating ? 'none' : 'transform 0.22s ease-out',
                        willChange: 'transform',
                    }}
                >
                    <Box
                        component="img"
                        ref={imageRef}
                        src={src}
                        alt={alt}
                        draggable={false}
                        onLoad={handleImageLoad}
                        sx={{
                            display: 'block',
                            width: naturalSize.width || 'auto',
                            height: naturalSize.height || 'auto',
                            maxWidth: 'none',
                            maxHeight: 'none',
                            borderRadius: 1,
                            boxShadow: 2,
                            pointerEvents: 'none',
                        }}
                    />
                </Box>

                {canPan && (
                    <Typography
                        variant="caption"
                        sx={{
                            position: 'absolute',
                            left: 12,
                            bottom: 12,
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: 'rgba(0,0,0,0.55)',
                            color: '#fff',
                        }}
                    >
                        Kéo để di chuyển ảnh
                    </Typography>
                )}
            </Box>
        </Stack>
    );
};

export const ImagePreview = ({
    src,
    alt = 'Ảnh',
    dialogTitle,
    infoItems,
    thumbnailSx,
}: ImagePreviewProps) => {
    const [open, setOpen] = useState(false);
    const title = dialogTitle ?? alt;

    return (
        <>
            <Box
                component="img"
                src={src}
                alt={alt}
                onClick={() => setOpen(true)}
                sx={{
                    cursor: 'zoom-in',
                    transition: 'opacity 0.2s, box-shadow 0.2s',
                    '&:hover': {
                        opacity: 0.92,
                        boxShadow: 2,
                    },
                    ...thumbnailSx,
                }}
            />

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="lg"
                fullWidth
                scroll="paper"
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: 'hidden',
                        maxHeight: { xs: '92vh', md: '88vh' },
                    },
                }}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                        px: { xs: 2, sm: 2.5 },
                        py: 1.5,
                        borderBottom: 1,
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Box sx={{ minWidth: 0, pr: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                            {title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Cuộn chuột để phóng to / thu nhỏ · Kéo ảnh khi đã phóng to
                        </Typography>
                    </Box>
                    <IconButton aria-label="Đóng xem ảnh" onClick={() => setOpen(false)}>
                        <CloseIcon />
                    </IconButton>
                </Stack>

                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        minHeight: { xs: 420, md: 520 },
                        maxHeight: { xs: 'calc(92vh - 72px)', md: 'calc(88vh - 72px)' },
                    }}
                >
                    {infoItems && infoItems.length > 0 && (
                        <Box
                            sx={{
                                width: { xs: '100%', md: 280 },
                                flexShrink: 0,
                                borderRight: { md: 1 },
                                borderBottom: { xs: 1, md: 0 },
                                borderColor: 'divider',
                                bgcolor: (theme) =>
                                    theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                                p: { xs: 2, md: 2.5 },
                                overflowY: 'auto',
                            }}
                        >
                            <Typography
                                variant="overline"
                                color="text.secondary"
                                sx={{ fontWeight: 700, letterSpacing: 0.8 }}
                            >
                                Thông tin phiếu
                            </Typography>
                            <Stack spacing={1.5} sx={{ mt: 1.5 }} divider={<Divider flexItem />}>
                                {infoItems.map((item) => (
                                    <Box key={item.label}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            display="block"
                                            sx={{ mb: 0.25 }}
                                        >
                                            {item.label}
                                        </Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            {item.value}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <ZoomableImageViewer src={src} alt={alt} open={open} />
                    </Box>
                </Box>
            </Dialog>
        </>
    );
};
