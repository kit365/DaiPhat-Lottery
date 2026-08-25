import { Box, Chip, Stack, Typography } from '@mui/material';
import type { OcrReviewRow, TicketBoundingBox } from '../types/ticketOcr.type';
import {
    OCR_FIELD_KEYS,
    OCR_FIELD_LABELS,
    buildTicketOverlayLabel,
    getConfidenceEmphasis,
    getUnreadableFieldCaption,
    type OcrFieldKey,
} from '../utils/ocrImportHelpers';

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
    /** Fixed preview height in px — independent of ticket count. */
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
 * Preview uses a fixed-height container so ticket count does not resize the image.
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
    const basis = rows.find((row) => row.imageWidth && row.imageHeight);
    const imageWidth = basis?.imageWidth ?? 0;
    const imageHeight = basis?.imageHeight ?? 0;

    return (
        <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle2" fontWeight={700} noWrap title={fileName}>
                    {fileName}
                </Typography>
                <Chip
                    size="small"
                    label={`${ticketCount} vé nhận diện`}
                    variant="outlined"
                />
            </Stack>
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    height: previewHeight,
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'grey.100',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Box
                    component="img"
                    src={previewUrl}
                    alt={fileName}
                    sx={{
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                    }}
                />
                {imageWidth > 0 && imageHeight > 0 && (
                    <Box
                        component="svg"
                        viewBox={`0 0 ${imageWidth} ${imageHeight}`}
                        preserveAspectRatio="xMidYMid meet"
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
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

                            return (
                                <g key={row.key}>
                                    {row.bbox && row.bbox.width > 0 && row.bbox.height > 0 && (
                                        <g style={{ pointerEvents: 'auto', cursor: 'pointer' }}>
                                            <rect
                                                x={row.bbox.x}
                                                y={row.bbox.y}
                                                width={row.bbox.width}
                                                height={row.bbox.height}
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
                                                        ? Math.max(imageWidth, imageHeight) * 0.0035
                                                        : Math.max(imageWidth, imageHeight) *
                                                          (row.status === 'FAILED' ? 0.0035 : 0.002)
                                                }
                                                onClick={() =>
                                                    onSelect({ rowKey: row.key, fieldName: null })
                                                }
                                            />
                                            <text
                                                x={row.bbox.x + 4}
                                                y={Math.max(14, row.bbox.y - 6)}
                                                fill={ticketSelected ? '#1d4ed8' : ticketStroke}
                                                fontSize={Math.max(12, Math.round(imageWidth * 0.016))}
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
                                        const box = resolveFieldBox(row, fieldName);
                                        if (!box) {
                                            return null;
                                        }
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
                                                        imageWidth,
                                                        imageHeight,
                                                        validationStatus
                                                    )}
                                                    strokeDasharray={
                                                        validationStatus === 'UNREADABLE'
                                                            ? `${Math.max(imageWidth, imageHeight) * 0.008}`
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
                                                        Math.round(imageWidth * 0.012)
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
        </Stack>
    );
}
