'use client';

import { useCallback, useRef, useState, type PointerEvent } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type {
    OcrFieldLayout,
    OcrNormalizedBoundingBox,
    OcrTemplateFieldName,
} from '../../services/ocrTemplateService';

import { AdminStatusBadge } from '../../../../components/ui/AdminStatusBadge';

export const OCR_TEMPLATE_FIELD_OPTIONS: {
    value: OcrTemplateFieldName;
    label: string;
}[] = [
    { value: 'stationName', label: 'Nhà đài' },
    { value: 'numbers', label: 'Dãy số' },
    { value: 'serialNumber', label: 'Số serial' },
    { value: 'drawDate', label: 'Ngày xổ' },
    { value: 'ticketType', label: 'Loại vé' },
    { value: 'batchCode', label: 'Mã lô' },
    { value: 'price', label: 'Giá vé' },
];

export const getBadgeModifierForOcrField = (fieldName: OcrTemplateFieldName) => {
    switch (fieldName) {
        case 'stationName': return 'admin-status-badge--active'; // Blue
        case 'numbers': return 'admin-status-badge--success'; // Green
        case 'serialNumber': return 'admin-status-badge--pending'; // Orange
        case 'drawDate': return 'admin-status-badge--inactive'; // Red
        case 'ticketType': return 'admin-status-badge--active'; 
        case 'batchCode': return 'admin-status-badge--pending'; 
        case 'price': return 'admin-status-badge--success'; 
        default: return 'admin-status-badge--draft';
    }
};

export const getBadgeColorForOcrField = (fieldName: OcrTemplateFieldName) => {
    switch (fieldName) {
        case 'stationName': return 'var(--palette-info-dark)'; 
        case 'numbers': return 'var(--palette-success-dark)'; 
        case 'serialNumber': return 'var(--palette-warning-dark)'; 
        case 'drawDate': return 'var(--palette-error-dark)'; 
        case 'ticketType': return 'var(--palette-info-dark)'; 
        case 'batchCode': return 'var(--palette-warning-dark)'; 
        case 'price': return 'var(--palette-success-dark)'; 
        default: return '#374151';
    }
};

const labelForField = (fieldName: OcrTemplateFieldName): string =>
    OCR_TEMPLATE_FIELD_OPTIONS.find((f) => f.value === fieldName)?.label ?? fieldName;

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
    disabled?: boolean;
};

/**
 * Visual annotator: drag a rectangle on the sample ticket image to mark
 * where each OCR field is expected (normalized 0–1 coordinates).
 */
export const OcrFieldLayoutAnnotator = ({
    sampleImageUrl,
    layouts,
    selectedField,
    onSelectField,
    onBoxDrawn,
    onSelectLayout,
    selectedLayoutId = null,
    disabled = false,
}: Props) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [drag, setDrag] = useState<DragState | null>(null);
    const [imageIssue, setImageIssue] = useState<'load-failed' | 'too-small' | null>(null);

    const toNormalized = useCallback(
        (clientX: number, clientY: number): { x: number; y: number } | null => {
            const el = containerRef.current;
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return null;
            return {
                x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
                y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
            };
        },
        []
    );

    const handlePointerDown = (e: PointerEvent) => {
        if (disabled) return;
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        const point = toNormalized(e.clientX, e.clientY);
        if (!point) return;
        setDrag({
            startX: point.x,
            startY: point.y,
            currentX: point.x,
            currentY: point.y,
        });
    };

    const handlePointerMove = (e: PointerEvent) => {
        if (!drag || disabled) return;
        const point = toNormalized(e.clientX, e.clientY);
        if (!point) return;
        setDrag((prev) =>
            prev
                ? { ...prev, currentX: point.x, currentY: point.y }
                : prev
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
        if (width < 0.01 || height < 0.01) return;
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

    return (
        <Stack gap={1.5}>
            <Typography variant="body2" color="text.secondary">
                Chọn trường bên dưới, rồi kéo chuột trên ảnh để đánh dấu vùng nhận dạng.
                Có thể gắn cùng một trường nhiều lần (vùng dự phòng). Kéo khi đang chọn một
                vùng đã gắn để cập nhật đúng vùng đó; nếu không chọn vùng cũ, lần kéo mới
                sẽ thêm vùng với priority tiếp theo.
            </Typography>

            <Stack direction="row" flexWrap="wrap" gap={1}>
                {OCR_TEMPLATE_FIELD_OPTIONS.map((opt) => {
                    const count = layouts.filter((l) => l.fieldName === opt.value).length;
                    const isSelected = selectedField === opt.value;
                    return (
                        <Box
                            key={opt.value}
                            onClick={() => {
                                onSelectField(opt.value);
                                // New field selection starts a new region, not an edit.
                                onSelectLayout?.(null);
                            }}
                            sx={{
                                cursor: 'pointer',
                                opacity: isSelected ? 1 : 0.4,
                                transition: 'all 0.2s',
                                '&:hover': { opacity: 0.8 },
                                display: 'inline-flex',
                                alignItems: 'center',
                                borderRadius: '6px',
                                color: getBadgeColorForOcrField(opt.value),
                                boxShadow: isSelected ? '0 0 0 1.5px currentColor' : 'none'
                            }}
                        >
                            <AdminStatusBadge
                                label={count > 0 ? `${opt.label} (${count})` : opt.label}
                                modifier={getBadgeModifierForOcrField(opt.value)}
                            />
                        </Box>
                    );
                })}
            </Stack>

            <Box
                ref={containerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishDrag}
                onPointerCancel={() => setDrag(null)}
                sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 640,
                    userSelect: 'none',
                    touchAction: 'none',
                    cursor: disabled ? 'default' : 'crosshair',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'action.hover',
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

                {layouts.map((layout) => {
                    const color = getBadgeColorForOcrField(layout.fieldName);
                    const selected = selectedLayoutId === layout.id;
                    return (
                        <Box
                            key={layout.id}
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
                                border: selected ? `2px solid ${color}` : `1.5px solid ${color}`,
                                bgcolor: selected ? `color-mix(in srgb, ${color} 30%, transparent)` : `color-mix(in srgb, ${color} 15%, transparent)`,
                                boxSizing: 'border-box',
                                pointerEvents: 'auto',
                                cursor: 'pointer',
                            }}
                            title={labelForField(layout.fieldName)}
                        >
                            <Typography
                                variant="caption"
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    px: 0.5,
                                    bgcolor: color,
                                    color: '#fff',
                                    fontSize: 10,
                                    lineHeight: 1.4,
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {labelForField(layout.fieldName)}
                                {layout.priority != null ? ` #${layout.priority}` : ''}
                            </Typography>
                        </Box>
                    );
                })}

                {draftBox && draftBox.width > 0 && draftBox.height > 0 && (
                    <Box
                        sx={{
                            position: 'absolute',
                            left: `${draftBox.x * 100}%`,
                            top: `${draftBox.y * 100}%`,
                            width: `${draftBox.width * 100}%`,
                            height: `${draftBox.height * 100}%`,
                            border: `2px dashed ${getBadgeColorForOcrField(selectedField)}`,
                            bgcolor: `color-mix(in srgb, ${getBadgeColorForOcrField(selectedField)} 20%, transparent)`,
                            boxSizing: 'border-box',
                            pointerEvents: 'none',
                        }}
                    />
                )}
            </Box>
        </Stack>
    );
};
