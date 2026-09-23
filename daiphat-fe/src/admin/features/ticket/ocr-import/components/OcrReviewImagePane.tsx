'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
    Box,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import ZoomInOutlinedIcon from '@mui/icons-material/ZoomInOutlined';
import CloseIcon from '@mui/icons-material/Close';
import type { OcrReviewRow, TicketBoundingBox } from '../types/ticketOcr.type';
import { buildTicketOverlayLabel, type OcrFieldKey } from '../utils/ocrImportHelpers';
import {
    computeContainedImageRect,
    mapBoxToNaturalPixels,
    resolveCoordSize,
    type ContainedImageRect,
} from '../utils/ocrBboxOverlay';

export type OcrFieldSelection = {
    rowKey: string;
    fieldName: OcrFieldKey | null;
};

type Props = {
    previewUrl: string;
    fileName: string;
    ticketCount: number;
    rows: OcrReviewRow[];
    selection: OcrFieldSelection | null;
    onSelect: (selection: OcrFieldSelection) => void;
    previewHeight?: number;
    hideHeader?: boolean;
};

/**
 * Source photo overlay: ticket bounding boxes only.
 * Field boxes are drawn on each cropped ticket preview (see OcrCroppedTicketOverlay).
 */
export default function OcrReviewImagePane({
    previewUrl,
    fileName,
    ticketCount,
    rows,
    selection,
    onSelect,
    previewHeight = 360,
    hideHeader = false,
}: Props) {
    const [zoomOpen, setZoomOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [layout, setLayout] = useState<ContainedImageRect | null>(null);

    const basis = rows.find((row) => row.imageWidth && row.imageHeight);
    const ocrWidth = basis?.imageWidth ?? 0;
    const ocrHeight = basis?.imageHeight ?? 0;

    const updateLayout = useCallback(() => {
        const container = containerRef.current;
        const img = imgRef.current;
        if (!container || !img || !img.naturalWidth || !img.naturalHeight) {
            setLayout(null);
            return;
        }
        setLayout(
            computeContainedImageRect(
                container.clientWidth,
                container.clientHeight,
                img.naturalWidth,
                img.naturalHeight
            )
        );
    }, []);

    useLayoutEffect(() => {
        updateLayout();
        const container = containerRef.current;
        if (!container || typeof ResizeObserver === 'undefined') {
            return;
        }
        const observer = new ResizeObserver(() => updateLayout());
        observer.observe(container);
        return () => observer.disconnect();
    }, [updateLayout, previewUrl, previewHeight]);

    const naturalWidth = layout?.naturalWidth ?? 0;
    const naturalHeight = layout?.naturalHeight ?? 0;
    const { coordWidth, coordHeight } = resolveCoordSize(
        ocrWidth,
        ocrHeight,
        naturalWidth,
        naturalHeight
    );
    const viewWidth = naturalWidth > 0 ? naturalWidth : coordWidth;
    const viewHeight = naturalHeight > 0 ? naturalHeight : coordHeight;

    const toOverlayBox = (box: TicketBoundingBox): TicketBoundingBox =>
        mapBoxToNaturalPixels(box, coordWidth, coordHeight, viewWidth, viewHeight);

    return (
        <Stack spacing={1} sx={{ height: '100%' }}>
            {!hideHeader && (
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                    flexWrap="wrap"
                    useFlexGap
                >
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" noWrap sx={{ maxWidth: 280 }}>
                            Ảnh gốc chứa vé: {fileName}
                        </Typography>
                        <Chip
                            size="small"
                            label={`${ticketCount} vé nhận diện`}
                            color="error"
                            sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }}
                        />
                    </Stack>
                    <Tooltip title="Phóng to ảnh gốc">
                        <IconButton
                            size="small"
                            onClick={() => setZoomOpen(true)}
                            sx={{ color: '#64748b' }}
                        >
                            <ZoomInOutlinedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            )}

            <Box
                ref={containerRef}
                sx={{
                    position: 'relative',
                    width: '100%',
                    height: previewHeight,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#0f172a',
                }}
            >
                <Box
                    component="img"
                    ref={imgRef}
                    src={previewUrl}
                    alt={fileName}
                    onLoad={updateLayout}
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        objectPosition: 'center',
                    }}
                />
                {layout && viewWidth > 0 && viewHeight > 0 && (
                    <Box
                        component="svg"
                        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
                        preserveAspectRatio="none"
                        sx={{
                            position: 'absolute',
                            left: layout.offsetX,
                            top: layout.offsetY,
                            width: layout.displayWidth,
                            height: layout.displayHeight,
                            pointerEvents: 'none',
                            overflow: 'visible',
                        }}
                    >
                        {rows.map((row) => {
                            const ticketSelected =
                                selection?.rowKey === row.key && !selection.fieldName;
                            const ticketStroke =
                                row.status === 'FAILED' ||
                                row.overallValidationStatus === 'INVALID' ||
                                row.status === 'INCOMPLETE'
                                    ? '#ef4444'
                                    : row.overallValidationStatus === 'NEEDS_REVIEW' ||
                                        row.status === 'NEEDS_REVIEW' ||
                                        row.status === 'PARTIAL'
                                      ? '#f59e0b'
                                      : '#16a34a';
                            const ticketBox =
                                row.bbox && row.bbox.width > 0 && row.bbox.height > 0
                                    ? toOverlayBox(row.bbox)
                                    : null;

                            if (!ticketBox) {
                                return null;
                            }

                            return (
                                <g
                                    key={row.key}
                                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                                >
                                    <rect
                                        x={ticketBox.x}
                                        y={ticketBox.y}
                                        width={ticketBox.width}
                                        height={ticketBox.height}
                                        fill={
                                            ticketSelected
                                                ? 'rgba(37,99,235,0.12)'
                                                : row.status === 'FAILED'
                                                  ? 'rgba(239,68,68,0.12)'
                                                  : 'rgba(0,0,0,0.02)'
                                        }
                                        stroke={ticketSelected ? '#2563eb' : ticketStroke}
                                        strokeWidth={
                                            ticketSelected
                                                ? Math.max(viewWidth, viewHeight) * 0.0035
                                                : Math.max(viewWidth, viewHeight) *
                                                  (row.status === 'FAILED' ? 0.0035 : 0.002)
                                        }
                                        onClick={() =>
                                            onSelect({ rowKey: row.key, fieldName: null })
                                        }
                                    />
                                    <text
                                        x={ticketBox.x + 4}
                                        y={Math.max(14, ticketBox.y - 6)}
                                        fill={ticketSelected ? '#1d4ed8' : ticketStroke}
                                        fontSize={Math.max(12, Math.round(viewWidth * 0.016))}
                                        fontWeight={700}
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        {row.status === 'FAILED'
                                            ? `#${row.ticketIndex + 1} — Không đọc được`
                                            : buildTicketOverlayLabel(row)}
                                    </text>
                                </g>
                            );
                        })}
                    </Box>
                )}
            </Box>

            <Dialog
                open={zoomOpen}
                onClose={() => setZoomOpen(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        overflow: 'hidden',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        p: 2,
                        bgcolor: '#ffffff',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                            Ảnh gốc: {fileName}
                        </Typography>
                        <Chip
                            size="small"
                            label={`${ticketCount} vé nhận diện`}
                            color="primary"
                            variant="outlined"
                            sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }}
                        />
                    </Stack>
                    <IconButton size="small" onClick={() => setZoomOpen(false)}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 2, bgcolor: '#0f172a', textAlign: 'center' }}>
                    <Box
                        component="img"
                        src={previewUrl}
                        alt={fileName}
                        sx={{
                            maxWidth: '100%',
                            maxHeight: '80vh',
                            objectFit: 'contain',
                            borderRadius: '8px',
                            mx: 'auto',
                            display: 'block',
                        }}
                    />
                </DialogContent>
            </Dialog>
        </Stack>
    );
}
