'use client';

import { useCallback, useRef, useState, type PointerEvent } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type {
    OcrFieldLayout,
    OcrNormalizedBoundingBox,
    OcrTemplateFieldName,
} from '../../services/ocrTemplateService';

export const OCR_TEMPLATE_FIELD_OPTIONS: {
    value: OcrTemplateFieldName;
    label: string;
    color: string;
}[] = [
    { value: 'stationName', label: 'Nhà đài', color: '#2563eb' },
    { value: 'numbers', label: 'Dãy số', color: '#059669' },
    { value: 'serialNumber', label: 'Số serial', color: '#d97706' },
    { value: 'drawDate', label: 'Ngày xổ', color: '#7c3aed' },
    { value: 'ticketType', label: 'Loại vé', color: '#0891b2' },
    { value: 'batchCode', label: 'Mã lô', color: '#db2777' },
    { value: 'price', label: 'Giá vé', color: '#4f46e5' },
];

const colorForField = (fieldName: OcrTemplateFieldName): string =>
    OCR_TEMPLATE_FIELD_OPTIONS.find((f) => f.value === fieldName)?.color ?? '#64748b';

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
                    return (
                        <Chip
                            key={opt.value}
                            label={count > 0 ? `${opt.label} (${count})` : opt.label}
                            onClick={() => {
                                onSelectField(opt.value);
                                // New field selection starts a new region, not an edit.
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
                            }}
                        />
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={sampleImageUrl}
                    alt="Ảnh mẫu vé OCR"
                    draggable={false}
                    style={{
                        display: 'block',
                        width: '100%',
                        height: 'auto',
                        pointerEvents: 'none',
                    }}
                />

                {layouts.map((layout) => {
                    const color = colorForField(layout.fieldName);
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
                                bgcolor: selected ? `${color}33` : `${color}22`,
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
                            border: `2px dashed ${colorForField(selectedField)}`,
                            bgcolor: `${colorForField(selectedField)}28`,
                            boxSizing: 'border-box',
                            pointerEvents: 'none',
                        }}
                    />
                )}
            </Box>
        </Stack>
    );
};
