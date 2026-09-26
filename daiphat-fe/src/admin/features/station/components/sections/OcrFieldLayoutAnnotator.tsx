'use client';

import { useCallback, useRef, useState, type PointerEvent } from 'react';
import {
    Box,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Paper,
    Stack,
    Tooltip,
    Typography,
    Button,
} from '@mui/material';
import ZoomInRoundedIcon from '@mui/icons-material/ZoomInRounded';
import ZoomOutRoundedIcon from '@mui/icons-material/ZoomOutRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FitScreenRoundedIcon from '@mui/icons-material/FitScreenRounded';
import CropFreeRoundedIcon from '@mui/icons-material/CropFreeRounded';
import type {
    OcrFieldLayout,
    OcrNormalizedBoundingBox,
    OcrTemplateFieldName,
} from '../../services/ocrTemplateService';

/** Ticket outline on the sample photo — OCR locates fields relative to it. */
export const TICKET_FRAME_FIELD: OcrTemplateFieldName = 'ticketFrame';

export const OCR_TEMPLATE_FIELD_OPTIONS: {
    value: OcrTemplateFieldName;
    label: string;
    color: string;
}[] = [
    { value: 'ticketFrame', label: 'Khung vé', color: '#0f766e' },
    { value: 'stationName', label: 'Nhà đài', color: '#2563eb' },
    { value: 'numbers', label: 'Dãy số', color: '#059669' },
    { value: 'serialNumber', label: 'Số serial', color: '#d97706' },
    { value: 'drawDate', label: 'Ngày xổ', color: '#7c3aed' },
    { value: 'batchCode', label: 'Mã lô', color: '#db2777' },
    { value: 'price', label: 'Giá vé', color: '#4f46e5' },
];

/** Labels for display (includes legacy fields no longer offered for new tags). */
const FIELD_LABELS: Partial<Record<OcrTemplateFieldName, string>> = {
    stationName: 'Nhà đài',
    numbers: 'Dãy số',
    serialNumber: 'Số serial',
    drawDate: 'Ngày xổ',
    ticketType: 'Loại vé',
    batchCode: 'Mã lô',
    price: 'Giá vé',
    ticketFrame: 'Khung vé',
};

/** Mirrors core-api: centre inside the frame and ≥60% of the box area inside. */
export const isInsideTicketFrame = (
    box: OcrNormalizedBoundingBox,
    frame: OcrNormalizedBoundingBox
): boolean => {
    const tol = 0.005;
    const fx0 = frame.x - tol;
    const fy0 = frame.y - tol;
    const fx1 = frame.x + frame.width + tol;
    const fy1 = frame.y + frame.height + tol;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    if (cx < fx0 || cx > fx1 || cy < fy0 || cy > fy1) return false;
    const ix = Math.max(0, Math.min(box.x + box.width, fx1) - Math.max(box.x, fx0));
    const iy = Math.max(0, Math.min(box.y + box.height, fy1) - Math.max(box.y, fy0));
    const area = box.width * box.height;
    return area > 0 && (ix * iy) / area >= 0.6;
};

const colorForField = (fieldName: OcrTemplateFieldName): string =>
    OCR_TEMPLATE_FIELD_OPTIONS.find((f) => f.value === fieldName)?.color ??
    (fieldName === 'ticketType' ? '#0891b2' : '#64748b');

const labelForField = (fieldName: OcrTemplateFieldName): string =>
    FIELD_LABELS[fieldName] ?? fieldName;

type DragState = {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
};

type Props = {
    sampleImageUrl: string;
    layouts: OcrFieldLayout[];
    selectedField: OcrTemplateFieldName;
    onSelectField: (field: OcrTemplateFieldName) => void;
    onBoxDrawn: (fieldName: OcrTemplateFieldName, box: OcrNormalizedBoundingBox) => void;
    onSelectLayout?: (layout: OcrFieldLayout | null) => void;
    selectedLayoutId?: number | null;
    hoveredLayoutId?: number | null;
    onHoverLayout?: (layoutId: number | null) => void;
    disabled?: boolean;
};

/**
 * Visual annotator: drag a rectangle on the sample ticket image to mark
 * where each OCR field is expected (normalized 0–1 coordinates).
 * Redesigned into a matching unified Card with Zoom controls and Fullscreen mode.
 */
export const OcrFieldLayoutAnnotator = ({
    sampleImageUrl,
    layouts,
    selectedField,
    onSelectField,
    onBoxDrawn,
    onSelectLayout,
    selectedLayoutId = null,
    hoveredLayoutId = null,
    onHoverLayout,
    disabled = false,
}: Props) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const modalContainerRef = useRef<HTMLDivElement | null>(null);
    const [drag, setDrag] = useState<DragState | null>(null);
    const [imageIssue, setImageIssue] = useState<'load-failed' | 'too-small' | null>(null);

    // Zoom states: 1 = 100%, 1.25 = 125%, 1.5 = 150%, etc.
    const [zoom, setZoom] = useState<number>(1);
    const [modalZoom, setModalZoom] = useState<number>(1.25);
    const [openFullscreen, setOpenFullscreen] = useState<boolean>(false);

    const frameLayout = layouts.find((l) => l.fieldName === TICKET_FRAME_FIELD) ?? null;
    const fieldLayouts = layouts.filter((l) => l.fieldName !== TICKET_FRAME_FIELD);
    const outsideFrameIds = new Set(
        frameLayout
            ? fieldLayouts
                  .filter((l) => !isInsideTicketFrame(l.boundingBox, frameLayout.boundingBox))
                  .map((l) => l.id)
            : []
    );

    const toNormalized = useCallback(
        (clientX: number, clientY: number, targetEl: HTMLDivElement | null): { x: number; y: number } | null => {
            if (!targetEl) return null;
            const rect = targetEl.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return null;
            return {
                x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
                y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
            };
        },
        []
    );

    const handlePointerDown = (e: PointerEvent, isModal = false) => {
        if (disabled) return;
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        const targetEl = isModal ? modalContainerRef.current : containerRef.current;
        const point = toNormalized(e.clientX, e.clientY, targetEl);
        if (!point) return;
        setDrag({
            startX: point.x,
            startY: point.y,
            currentX: point.x,
            currentY: point.y,
        });
    };

    const handlePointerMove = (e: PointerEvent, isModal = false) => {
        if (!drag || disabled) return;
        const targetEl = isModal ? modalContainerRef.current : containerRef.current;
        const point = toNormalized(e.clientX, e.clientY, targetEl);
        if (!point) return;
        setDrag((prev) =>
            prev ? { ...prev, currentX: point.x, currentY: point.y } : prev
        );
    };

    const finishDrag = () => {
        if (!drag || disabled) {
            setDrag(null);
            return;
        }
        const x = Math.min(drag.startX, drag.currentX);
        const y = Math.min(drag.startY, drag.currentY);
        const width = Math.abs(drag.currentX - drag.startX);
        const height = Math.abs(drag.currentY - drag.startY);
        setDrag(null);
        // Ignore tiny accidental clicks
        if (width < 0.008 || height < 0.008) return;
        onBoxDrawn(selectedField, {
            x: Number(x.toFixed(4)),
            y: Number(y.toFixed(4)),
            width: Number(width.toFixed(4)),
            height: Number(height.toFixed(4)),
        });
    };

    const draftBox =
        drag != null
            ? {
                  x: Math.min(drag.startX, drag.currentX),
                  y: Math.min(drag.startY, drag.currentY),
                  width: Math.abs(drag.currentX - drag.startX),
                  height: Math.abs(drag.currentY - drag.startY),
              }
            : null;

    // Field Selector Toolbar
    const renderFieldToolbar = () => (
        <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
            {OCR_TEMPLATE_FIELD_OPTIONS.map((opt) => {
                const count = layouts.filter((l) => l.fieldName === opt.value).length;
                return (
                    <Chip
                        key={opt.value}
                        label={count > 0 ? `${opt.label} (${count})` : opt.label}
                        onClick={() => {
                            onSelectField(opt.value);
                            onSelectLayout?.(null);
                        }}
                        variant={selectedField === opt.value ? 'filled' : 'outlined'}
                        sx={{
                            borderColor: opt.color,
                            bgcolor:
                                selectedField === opt.value
                                    ? `${opt.color}22`
                                    : count > 0
                                      ? `${opt.color}14`
                                      : undefined,
                            color: opt.color,
                            fontWeight: selectedField === opt.value ? 700 : 500,
                            cursor: 'pointer',
                        }}
                    />
                );
            })}
        </Stack>
    );

    // Canvas Viewport Element
    const renderCanvas = (isModal = false) => {
        const currentZoom = isModal ? modalZoom : zoom;
        const ref = isModal ? modalContainerRef : containerRef;

        return (
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    minHeight: isModal ? 'calc(100vh - 200px)' : 520,
                    maxHeight: isModal ? 'calc(100vh - 200px)' : 650,
                    overflow: 'auto',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '12px',
                    bgcolor: '#0f172a08',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    p: { xs: 1.5, sm: 3 },
                    '::-webkit-scrollbar': { width: 8, height: 8 },
                    '::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 4 },
                }}
            >
                <Box
                    ref={ref}
                    onPointerDown={(e) => handlePointerDown(e, isModal)}
                    onPointerMove={(e) => handlePointerMove(e, isModal)}
                    onPointerUp={finishDrag}
                    onPointerCancel={() => setDrag(null)}
                    sx={{
                        position: 'relative',
                        width: `${Math.round(currentZoom * 720)}px`,
                        maxWidth: currentZoom === 1 ? '100%' : 'none',
                        userSelect: 'none',
                        touchAction: 'none',
                        cursor: disabled ? 'default' : 'crosshair',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        bgcolor: 'action.hover',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                        flexShrink: 0,
                        margin: '0 auto',
                    }}
                >
                    <img
                        key={sampleImageUrl}
                        src={sampleImageUrl}
                        alt="Ảnh mẫu vé OCR"
                        draggable={false}
                        onError={() => setImageIssue('load-failed')}
                        onLoad={(e) => {
                            const img = e.currentTarget;
                            if (img.naturalWidth < 200 || img.naturalHeight < 200) {
                                setImageIssue('too-small');
                            } else {
                                setImageIssue(null);
                            }
                        }}
                        style={{
                            display: imageIssue ? 'none' : 'block',
                            width: '100%',
                            height: 'auto',
                            pointerEvents: 'none',
                        }}
                    />

                    {imageIssue && (
                        <Box sx={{ p: 2 }}>
                            <Typography variant="body2" color="error">
                                {imageIssue === 'too-small'
                                    ? 'Ảnh mẫu đã lưu quá nhỏ hoặc không phải ảnh vé thật. Hãy tải lại ảnh mẫu vé.'
                                    : 'Không tải được ảnh mẫu từ máy chủ lưu trữ. Kiểm tra URL hoặc tải lại ảnh.'}
                            </Typography>
                        </Box>
                    )}

                    {/* Ticket frame: dims the desk around the ticket. The body ignores
                        pointer events so field boxes can still be dragged inside it. */}
                    {frameLayout && !imageIssue && (() => {
                        const color = colorForField(TICKET_FRAME_FIELD);
                        const selected = selectedLayoutId === frameLayout.id;
                        const hovered = hoveredLayoutId === frameLayout.id;
                        return (
                            <Box
                                key={frameLayout.id}
                                sx={{
                                    position: 'absolute',
                                    left: `${frameLayout.boundingBox.x * 100}%`,
                                    top: `${frameLayout.boundingBox.y * 100}%`,
                                    width: `${frameLayout.boundingBox.width * 100}%`,
                                    height: `${frameLayout.boundingBox.height * 100}%`,
                                    border: `${selected || hovered ? 3 : 2}px dashed ${color}`,
                                    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.35)',
                                    boxSizing: 'border-box',
                                    borderRadius: '4px',
                                    pointerEvents: 'none',
                                    zIndex: 0,
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    onMouseEnter={() => onHoverLayout?.(frameLayout.id)}
                                    onMouseLeave={() => onHoverLayout?.(null)}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectField(TICKET_FRAME_FIELD);
                                        onSelectLayout?.(frameLayout);
                                    }}
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        px: 0.75,
                                        py: 0.15,
                                        bgcolor: color,
                                        color: '#fff',
                                        fontSize: 10,
                                        fontWeight: 700,
                                        lineHeight: 1.3,
                                        whiteSpace: 'nowrap',
                                        borderBottomLeftRadius: '4px',
                                        pointerEvents: 'auto',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {labelForField(TICKET_FRAME_FIELD)}
                                </Typography>
                            </Box>
                        );
                    })()}

                    {/* Bounding Boxes */}
                    {fieldLayouts.map((layout) => {
                        const outside = outsideFrameIds.has(layout.id);
                        const color = outside ? '#dc2626' : colorForField(layout.fieldName);
                        const selected = selectedLayoutId === layout.id;
                        const hovered = hoveredLayoutId === layout.id;
                        return (
                            <Box
                                key={layout.id}
                                onMouseEnter={() => onHoverLayout?.(layout.id)}
                                onMouseLeave={() => onHoverLayout?.(null)}
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectField(layout.fieldName);
                                    onSelectLayout?.(layout);
                                }}
                                sx={{
                                    position: 'absolute',
                                    left: `${layout.boundingBox.x * 100}%`,
                                    top: `${layout.boundingBox.y * 100}%`,
                                    width: `${layout.boundingBox.width * 100}%`,
                                    height: `${layout.boundingBox.height * 100}%`,
                                    border: selected
                                        ? `2.5px solid ${color}`
                                        : hovered
                                          ? `2px solid ${color}`
                                          : `1.5px solid ${color}`,
                                    bgcolor: selected
                                        ? `${color}40`
                                        : hovered
                                          ? `${color}30`
                                          : `${color}18`,
                                    boxShadow: selected
                                        ? `0 0 0 3px ${color}55, 0 4px 12px rgba(0,0,0,0.15)`
                                        : hovered
                                          ? `0 0 0 2px ${color}33`
                                          : 'none',
                                    borderRadius: '3px',
                                    boxSizing: 'border-box',
                                    pointerEvents: 'auto',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease-in-out',
                                    zIndex: selected ? 10 : hovered ? 9 : 1,
                                }}
                                title={`${labelForField(layout.fieldName)}${layout.priority != null ? ` #${layout.priority}` : ''}${outside ? ' — nằm ngoài khung vé' : ''}`}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        px: 0.6,
                                        py: 0.1,
                                        bgcolor: color,
                                        color: '#fff',
                                        fontSize: 10,
                                        fontWeight: 700,
                                        lineHeight: 1.3,
                                        maxWidth: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        borderBottomRightRadius: '4px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                    }}
                                >
                                    {labelForField(layout.fieldName)}
                                    {layout.priority != null ? ` #${layout.priority}` : ''}
                                    {outside ? ' · ngoài khung' : ''}
                                </Typography>
                            </Box>
                        );
                    })}

                    {/* Draft Box when user is dragging */}
                    {draftBox && draftBox.width > 0 && draftBox.height > 0 && (
                        <Box
                            sx={{
                                position: 'absolute',
                                left: `${draftBox.x * 100}%`,
                                top: `${draftBox.y * 100}%`,
                                width: `${draftBox.width * 100}%`,
                                height: `${draftBox.height * 100}%`,
                                border: `2px dashed ${colorForField(selectedField)}`,
                                bgcolor: `${colorForField(selectedField)}28`,
                                boxSizing: 'border-box',
                                pointerEvents: 'none',
                            }}
                        />
                    )}
                </Box>
            </Box>
        );
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: '16px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
            }}
        >
            {/* 1. Header: Title on Left, Zoom & Fullscreen Controls on Right */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                gap={1.5}
            >
                <Stack direction="row" alignItems="center" gap={1}>
                    <Box
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            bgcolor: 'primary.50',
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <CropFreeRoundedIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        Không gian gắn vùng OCR
                    </Typography>
                    <Chip
                        size="small"
                        label={`Đang chọn: ${labelForField(selectedField)}`}
                        sx={{
                            height: 22,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            bgcolor: `${colorForField(selectedField)}20`,
                            color: colorForField(selectedField),
                            border: '1px solid',
                            borderColor: `${colorForField(selectedField)}40`,
                        }}
                    />
                </Stack>

                {/* Right: Zoom & Fullscreen Toolbar */}
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                    <Paper
                        elevation={0}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 0.25,
                            px: 0.5,
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'action.hover',
                        }}
                    >
                        <Tooltip title="Thu nhỏ (Zoom Out)">
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={zoom <= 0.75}
                                    onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
                                    sx={{ p: 0.4 }}
                                >
                                    <ZoomOutRoundedIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Typography variant="caption" sx={{ minWidth: 42, textAlign: 'center', fontWeight: 700 }}>
                            {Math.round(zoom * 100)}%
                        </Typography>

                        <Tooltip title="Phóng to (Zoom In)">
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={zoom >= 2.5}
                                    onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                                    sx={{ p: 0.4 }}
                                >
                                    <ZoomInRoundedIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Đặt lại kích thước chuẩn (100%)">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => setZoom(1)}
                                    sx={{ p: 0.4, color: zoom === 1 ? 'text.disabled' : 'primary.main' }}
                                >
                                    <RestartAltRoundedIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Paper>

                    <Tooltip title="Mở ảnh to toàn màn hình để zoom & đánh tags chuẩn xác">
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<OpenInFullRoundedIcon sx={{ fontSize: '15px !important' }} />}
                            onClick={() => {
                                setModalZoom(1.5);
                                setOpenFullscreen(true);
                            }}
                            sx={{
                                textTransform: 'none',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                py: 0.4,
                                px: 1.2,
                                borderColor: 'divider',
                                color: 'text.primary',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    color: 'primary.main',
                                    bgcolor: 'primary.50',
                                },
                            }}
                        >
                            Phóng to toàn màn hình
                        </Button>
                    </Tooltip>
                </Stack>
            </Stack>

            <Divider />

            {/* 2. Field Selection Toolbar & Helper */}
            <Stack gap={1}>
                <Typography variant="caption" color="text.secondary">
                    {selectedField === TICKET_FRAME_FIELD
                        ? frameLayout
                            ? 'Kéo lại trên ảnh để chỉnh Khung vé. Khung phải bao sát mép tờ vé và bao trọn các vùng trường đã gắn.'
                            : 'Kéo khung bao sát mép tờ vé (không gồm nền bàn). Khi quét, YOLO nhận diện khung vé thật và các vùng trường được định vị tương đối theo khung này.'
                        : selectedLayoutId != null
                          ? `Đang sửa vùng đã chọn (#${layouts.find((l) => l.id === selectedLayoutId)?.priority ?? '?'}). Kéo trên ảnh để cập nhật lại vị trí.`
                          : `Chọn loại trường dưới đây, sau đó kéo chuột trên ảnh vé để tạo vùng nhận dạng OCR:`}
                </Typography>

                {renderFieldToolbar()}

                {!frameLayout && !disabled && (
                    <Typography variant="caption" sx={{ color: 'warning.dark', fontWeight: 600 }}>
                        Chưa đánh dấu Khung vé. Nên gắn Khung vé trước để OCR định vị chính xác các trường khi ảnh mẫu có nền xung quanh.
                    </Typography>
                )}
                {outsideFrameIds.size > 0 && (
                    <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600 }}>
                        {outsideFrameIds.size} vùng trường nằm ngoài Khung vé và sẽ bị bỏ qua khi quét. Hãy kéo lại các vùng này bên trong khung.
                    </Typography>
                )}
            </Stack>

            {/* 3. Centered Canvas Viewport */}
            {renderCanvas(false)}

            {/* 4. Fullscreen / High Precision Tagging Dialog */}
            <Dialog
                open={openFullscreen}
                onClose={() => setOpenFullscreen(false)}
                maxWidth="xl"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        maxHeight: '94vh',
                        bgcolor: 'background.paper',
                    },
                }}
            >
                <DialogTitle sx={{ p: 2, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" alignItems="center" gap={1}>
                            <CropFreeRoundedIcon color="primary" />
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                Đánh tags chi tiết (Phóng to ảnh mẫu vé)
                            </Typography>
                        </Stack>

                        {/* Dialog Zoom Controls & Close */}
                        <Stack direction="row" alignItems="center" gap={1}>
                            <Paper
                                elevation={0}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    p: 0.5,
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'action.hover',
                                }}
                            >
                                <Tooltip title="Thu nhỏ">
                                    <span>
                                        <IconButton
                                            size="small"
                                            disabled={modalZoom <= 0.75}
                                            onClick={() => setModalZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
                                            sx={{ p: 0.5 }}
                                        >
                                            <ZoomOutRoundedIcon fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Typography variant="caption" sx={{ minWidth: 44, textAlign: 'center', fontWeight: 700 }}>
                                    {Math.round(modalZoom * 100)}%
                                </Typography>
                                <Tooltip title="Phóng to">
                                    <span>
                                        <IconButton
                                            size="small"
                                            disabled={modalZoom >= 3.5}
                                            onClick={() => setModalZoom((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))))}
                                            sx={{ p: 0.5 }}
                                        >
                                            <ZoomInRoundedIcon fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Vừa khung nhìn (100%)">
                                    <span>
                                        <IconButton
                                            size="small"
                                            onClick={() => setModalZoom(1)}
                                            sx={{ p: 0.5 }}
                                        >
                                            <FitScreenRoundedIcon fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </Paper>

                            <IconButton onClick={() => setOpenFullscreen(false)} sx={{ borderRadius: '8px' }}>
                                <CloseRoundedIcon />
                            </IconButton>
                        </Stack>
                    </Stack>

                    {/* Field selector chips inside modal */}
                    <Box sx={{ mt: 1.5 }}>
                        {renderFieldToolbar()}
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ p: 2, display: 'flex', justifyContent: 'center', bgcolor: '#0f172a04' }}>
                    {renderCanvas(true)}
                </DialogContent>
            </Dialog>
        </Paper>
    );
};
