'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import type { OcrReviewRow, TicketBoundingBox } from '../types/ticketOcr.type';
import {
    OCR_FIELD_KEYS,
    OCR_FIELD_LABELS,
    type OcrFieldKey,
} from '../utils/ocrImportHelpers';
import {
    boxPolygonPoints,
    computeContainedImageRect,
    fillForField,
    mapBoxToNaturalPixels,
    resolveCoordSize,
    resolveSourceFieldBox,
    strokeForField,
    type ContainedImageRect,
} from '../utils/ocrBboxOverlay';
import type { OcrFieldSelection } from './OcrReviewImagePane';

type Props = {
    imageUrl: string;
    row: OcrReviewRow;
    selection?: OcrFieldSelection | null;
    onSelectField?: (fieldName: OcrFieldKey) => void;
    maxHeight?: number | string;
    alt?: string;
    /**
     * `crop`: `imageUrl` is the cropped ticket, boxes are crop-local `fieldBoxes`.
     * `source`: `imageUrl` is the original upload, boxes are `sourceFieldBoxes`.
     */
    space?: 'crop' | 'source';
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

/** Older scans stored fieldBoxes in full-frame coords — map into crop space via ticket bbox. */
const toCropLocalBox = (
    box: TicketBoundingBox,
    row: OcrReviewRow,
    cropW: number,
    cropH: number
): TicketBoundingBox | null => {
    if (box.x + box.width <= cropW * 1.05 && box.y + box.height <= cropH * 1.05) {
        return box;
    }
    const ticket = row.bbox;
    if (!ticket || ticket.width <= 0 || ticket.height <= 0) {
        return null;
    }
    const sx = cropW / ticket.width;
    const sy = cropH / ticket.height;
    const x = Math.max(0, (box.x - ticket.x) * sx);
    const y = Math.max(0, (box.y - ticket.y) * sy);
    const width = Math.max(1, box.width * sx);
    const height = Math.max(1, box.height * sy);
    if (x >= cropW || y >= cropH) {
        return null;
    }
    return {
        x,
        y,
        width: Math.min(width, cropW - x),
        height: Math.min(height, cropH - y),
    };
};

/**
 * Ticket image with per-field bounding boxes: the cropped ticket with
 * crop-local boxes, or the original upload with the template regions
 * projected onto it (`space="source"`).
 */
export default function OcrCroppedTicketOverlay({
    imageUrl,
    row,
    selection = null,
    onSelectField,
    maxHeight = '70vh',
    alt = 'Ảnh vé',
    space = 'crop',
}: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [layout, setLayout] = useState<ContainedImageRect | null>(null);

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
    }, [updateLayout, imageUrl]);

    const naturalWidth = layout?.naturalWidth ?? 0;
    const naturalHeight = layout?.naturalHeight ?? 0;
    const onSource = space === 'source';
    const { coordWidth, coordHeight } = onSource
        ? resolveCoordSize(row.imageWidth, row.imageHeight, naturalWidth, naturalHeight)
        : resolveCoordSize(0, 0, naturalWidth, naturalHeight);
    const viewWidth = naturalWidth > 0 ? naturalWidth : coordWidth;
    const viewHeight = naturalHeight > 0 ? naturalHeight : coordHeight;

    const toOverlayBox = (box: TicketBoundingBox): TicketBoundingBox =>
        mapBoxToNaturalPixels(box, coordWidth, coordHeight, viewWidth, viewHeight);

    const fieldBoxInCoords = (fieldName: OcrFieldKey): TicketBoundingBox | null => {
        if (onSource) {
            return resolveSourceFieldBox(row, fieldName);
        }
        const raw = resolveFieldBox(row, fieldName);
        return raw ? toCropLocalBox(raw, row, viewWidth, viewHeight) : null;
    };
    const ticketOutline =
        onSource && row.bbox && row.bbox.width > 0 && row.bbox.height > 0
            ? toOverlayBox(row.bbox)
            : null;

    return (
        <Box
            ref={containerRef}
            sx={{
                position: 'relative',
                width: '100%',
                maxHeight,
                minHeight: 200,
                bgcolor: '#0f172a',
                borderRadius: '8px',
                overflow: 'hidden',
            }}
        >
            <Box
                component="img"
                ref={imgRef}
                src={imageUrl}
                alt={alt}
                onLoad={updateLayout}
                sx={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    maxHeight,
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
                    {ticketOutline && (
                        <polygon
                            points={boxPolygonPoints(ticketOutline)}
                            fill="none"
                            stroke="#16a34a"
                            strokeWidth={Math.max(viewWidth, viewHeight) * 0.0025}
                        />
                    )}
                    {OCR_FIELD_KEYS.map((fieldName) => {
                        const inCoords = fieldBoxInCoords(fieldName);
                        if (!inCoords) return null;
                        const box = toOverlayBox(inCoords);
                        const confidence =
                            row.fields?.[fieldName]?.confidence ?? row.fieldConfidences[fieldName];
                        const validationStatus =
                            row.fields?.[fieldName]?.validationStatus ??
                            row.fieldValidations[fieldName]?.status;
                        const selected =
                            selection?.rowKey === row.key && selection.fieldName === fieldName;
                        const caption =
                            validationStatus === 'UNREADABLE'
                                ? `${OCR_FIELD_LABELS[fieldName]} — chưa đọc được`
                                : OCR_FIELD_LABELS[fieldName];
                        return (
                            <g
                                key={fieldName}
                                style={{
                                    pointerEvents: onSelectField ? 'auto' : 'none',
                                    cursor: onSelectField ? 'pointer' : 'default',
                                }}
                            >
                                <polygon
                                    points={boxPolygonPoints(box)}
                                    fill={fillForField(confidence, selected, validationStatus)}
                                    stroke={strokeForField(confidence, selected, validationStatus)}
                                    strokeWidth={Math.max(viewWidth, viewHeight) * (selected ? 0.004 : 0.0025)}
                                    strokeDasharray={
                                        validationStatus === 'UNREADABLE'
                                            ? `${Math.max(viewWidth, viewHeight) * 0.008}`
                                            : undefined
                                    }
                                    onClick={() => onSelectField?.(fieldName)}
                                />
                                <text
                                    x={box.x + 2}
                                    y={Math.max(10, box.y - 3)}
                                    fill={strokeForField(confidence, selected, validationStatus)}
                                    fontSize={Math.max(10, Math.round(viewWidth * (onSource ? 0.014 : 0.028)))}
                                    fontWeight={700}
                                    style={{ pointerEvents: 'none' }}
                                >
                                    {caption}
                                </text>
                            </g>
                        );
                    })}
                </Box>
            )}
        </Box>
    );
}
