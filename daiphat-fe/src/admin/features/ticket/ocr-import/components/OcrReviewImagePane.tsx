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
import {
    OCR_FIELD_KEYS,
    OCR_FIELD_LABELS,
    buildTicketOverlayLabel,
    getConfidenceEmphasis,
    getUnreadableFieldCaption,
    type OcrFieldKey,
} from '../utils/ocrImportHelpers';
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
    /** Fixed or minimum preview height in px. */
    previewHeight?: number;
};

const strokeForConfidence = (confidence?: number | null, selected?: boolean): string => {
    if (selected) {
        return '#2563eb';
    }
    switch (getConfidenceEmphasis(confidence)) {
        case 'low':
            return '#ef4444';
        case 'medium':
            return '#f59e0b';
        case 'high':
        default:
            return '#64748b';
    }
};

const fillForConfidence = (confidence?: number | null, selected?: boolean): string => {
    if (selected) {
        return 'rgba(37,99,235,0.22)';
    }
    switch (getConfidenceEmphasis(confidence)) {
        case 'low':
            return 'rgba(239,68,68,0.28)';
        case 'medium':
            return 'rgba(245,158,11,0.18)';
        case 'high':
        default:
            return 'rgba(100,116,139,0.06)';
    }
};

const strokeForField = (
    confidence: number | null | undefined,
    selected: boolean,
    validationStatus?: string | null
): string => {
    if (selected) {
        return '#2563eb';
    }
    if (validationStatus === 'UNREADABLE' || validationStatus === 'NOT_FOUND') {
        return '#dc2626';
    }
    if (validationStatus === 'MISMATCHED') {
        return '#ef4444';
    }
    return strokeForConfidence(confidence, selected);
};

const fillForField = (
    confidence: number | null | undefined,
    selected: boolean,
    validationStatus?: string | null
): string => {
    if (selected) {
        return 'rgba(37,99,235,0.22)';
    }
    if (validationStatus === 'UNREADABLE') {
        return 'rgba(220,38,38,0.32)';
    }
    if (validationStatus === 'MISMATCHED' || validationStatus === 'NOT_FOUND') {
        return 'rgba(239,68,68,0.28)';
    }
    return fillForConfidence(confidence, selected);
};

const strokeWidthForField = (
    confidence: number | null | undefined,
    selected: boolean,
    imageWidth: number,
    imageHeight: number,
    validationStatus?: string | null
): number => {
    const base = Math.max(imageWidth, imageHeight);
    if (selected) {
        return base * 0.0045;
    }
    if (validationStatus === 'UNREADABLE' || validationStatus === 'MISMATCHED') {
        return base * 0.005;
    }
    switch (getConfidenceEmphasis(confidence)) {
        case 'low':
            return base * 0.004;
        case 'medium':
            return base * 0.003;
        case 'high':
        default:
            return base * 0.002;
    }
};

const resolveFieldBox = (row: OcrReviewRow, field: OcrFieldKey): TicketBoundingBox | null => {
    const fromFields = row.fields?.[field]?.boundingBox;
    if (fromFields && fromFields.width > 0 && fromFields.height > 0) {
        return fromFields;
    }
    const fromMap = row.fieldBoxes?.[field];
    if (fromMap && fromMap.width > 0 && fromMap.height > 0) {
        return fromMap;
    }
    return null;
};

/**
 * Source image with ticket + per-field bounding boxes.
 * Overlay is locked to the object-fit:contain content rect so boxes track
 * responsive resizing and OCR-resized coordinate spaces.
 */
export default function OcrReviewImagePane({
    previewUrl,
    fileName,
    ticketCount,
    rows,
    selection,
    onSelect,
    previewHeight = 360,
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
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                <Stack direction="row" spacing={0.75} alignItems="center">
                    <Typography variant="caption" fontWeight={800} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Ảnh gốc ({ticketCount} vé)
                    </Typography>
                </Stack>
                <Tooltip title="Xem ảnh gốc toàn màn hình" arrow>
                    <IconButton
                        size="small"
                        onClick={() => setZoomOpen(true)}
                        sx={{
                            color: '#64748b',
                            p: 0.35,
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            '&:hover': { color: '#2563eb', bgcolor: '#eff6ff', borderColor: '#bfdbfe' },
                        }}
                    >
                        <ZoomInOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            </Stack>
            <Box
                ref={containerRef}
                sx={{
                    position: 'relative',
                    width: '100%',
                    flex: 1,
                    minHeight: previewHeight,
                    borderRadius: '10px',
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

                            return (
                                <g key={row.key}>
                                    {ticketBox && (
                                        <g style={{ pointerEvents: 'auto', cursor: 'pointer' }}>
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
                                    )}

                                    {OCR_FIELD_KEYS.map((fieldName) => {
                                        const rawBox = resolveFieldBox(row, fieldName);
                                        if (!rawBox) {
                                            return null;
                                        }
                                        const box = toOverlayBox(rawBox);
                                        const confidence =
                                            row.fields?.[fieldName]?.confidence ??
                                            row.fieldConfidences[fieldName];
                                        const validationStatus =
                                            row.fields?.[fieldName]?.validationStatus ??
                                            row.fieldValidations[fieldName]?.status;
                                        const selected =
                                            selection?.rowKey === row.key &&
                                            selection.fieldName === fieldName;
                                        const caption =
                                            validationStatus === 'UNREADABLE'
                                                ? getUnreadableFieldCaption(
                                                      fieldName,
                                                      row.fieldValidations[fieldName]
                                                  )
                                                : OCR_FIELD_LABELS[fieldName];
                                        return (
                                            <g
                                                key={`${row.key}-${fieldName}`}
                                                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                                            >
                                                <rect
                                                    x={box.x}
                                                    y={box.y}
                                                    width={box.width}
                                                    height={box.height}
                                                    fill={fillForField(
                                                        confidence,
                                                        selected,
                                                        validationStatus
                                                    )}
                                                    stroke={strokeForField(
                                                        confidence,
                                                        selected,
                                                        validationStatus
                                                    )}
                                                    strokeWidth={strokeWidthForField(
                                                        confidence,
                                                        selected,
                                                        viewWidth,
                                                        viewHeight,
                                                        validationStatus
                                                    )}
                                                    strokeDasharray={
                                                        validationStatus === 'UNREADABLE'
                                                            ? `${Math.max(viewWidth, viewHeight) * 0.008}`
                                                            : undefined
                                                    }
                                                    onClick={() =>
                                                        onSelect({ rowKey: row.key, fieldName })
                                                    }
                                                />
                                                <text
                                                    x={box.x + 2}
                                                    y={Math.max(10, box.y - 3)}
                                                    fill={strokeForField(
                                                        confidence,
                                                        selected,
                                                        validationStatus
                                                    )}
                                                    fontSize={Math.max(
                                                        10,
                                                        Math.round(viewWidth * 0.012)
                                                    )}
                                                    fontWeight={600}
                                                    style={{ pointerEvents: 'none' }}
                                                >
                                                    {caption.length > 48
                                                        ? `${caption.slice(0, 45)}…`
                                                        : caption}
                                                </text>
                                            </g>
                                        );
                                    })}
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
