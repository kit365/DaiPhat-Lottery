import type { OcrReviewRow, TicketBoundingBox } from '../types/ticketOcr.type';

export type ContainedImageRect = {
    /** Offset of the drawn bitmap inside the container (object-fit: contain). */
    offsetX: number;
    offsetY: number;
    displayWidth: number;
    displayHeight: number;
    naturalWidth: number;
    naturalHeight: number;
};

/**
 * Compute where an object-fit:contain image paints inside its container.
 * Overlay SVGs must be positioned to this rect — not the full container —
 * or boxes drift when the container aspect ratio differs from the image.
 */
export const computeContainedImageRect = (
    containerWidth: number,
    containerHeight: number,
    naturalWidth: number,
    naturalHeight: number
): ContainedImageRect | null => {
    if (
        containerWidth <= 0 ||
        containerHeight <= 0 ||
        naturalWidth <= 0 ||
        naturalHeight <= 0
    ) {
        return null;
    }
    const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
    const displayWidth = naturalWidth * scale;
    const displayHeight = naturalHeight * scale;
    return {
        offsetX: (containerWidth - displayWidth) / 2,
        offsetY: (containerHeight - displayHeight) / 2,
        displayWidth,
        displayHeight,
        naturalWidth,
        naturalHeight,
    };
};

/** True when box looks like normalized 0..1 fractions of the full image. */
export const isNormalizedBoundingBox = (box: TicketBoundingBox): boolean => {
    const { x, y, width, height } = box;
    if (![x, y, width, height].every((v) => Number.isFinite(v) && v >= 0)) {
        return false;
    }
    if (width <= 0 || height <= 0) {
        return false;
    }
    // Mirror BE `_looks_normalized`: unit-square fractions only.
    return (
        x <= 1 &&
        y <= 1 &&
        width <= 1 &&
        height <= 1 &&
        x + width <= 1.01 &&
        y + height <= 1.01
    );
};

/**
 * Map a bbox from OCR coordinate space (often a resized scan) into the
 * natural/displayed image pixel space used for the overlay viewBox.
 */
export const mapBoxToNaturalPixels = (
    box: TicketBoundingBox,
    coordWidth: number,
    coordHeight: number,
    naturalWidth: number,
    naturalHeight: number
): TicketBoundingBox => {
    if (isNormalizedBoundingBox(box)) {
        return {
            ...box,
            x: box.x * naturalWidth,
            y: box.y * naturalHeight,
            width: box.width * naturalWidth,
            height: box.height * naturalHeight,
            corners: box.corners?.map(([cx, cy]) => [
                (cx <= 1 ? cx : cx / Math.max(coordWidth, 1)) * naturalWidth,
                (cy <= 1 ? cy : cy / Math.max(coordHeight, 1)) * naturalHeight,
            ]),
        };
    }

    const safeCoordW = coordWidth > 0 ? coordWidth : naturalWidth;
    const safeCoordH = coordHeight > 0 ? coordHeight : naturalHeight;
    const sx = naturalWidth / safeCoordW;
    const sy = naturalHeight / safeCoordH;

    return {
        ...box,
        x: box.x * sx,
        y: box.y * sy,
        width: box.width * sx,
        height: box.height * sy,
        corners: box.corners?.map(([cx, cy]) => [cx * sx, cy * sy]),
    };
};

export const strokeForField = (
    confidence: number | null | undefined,
    selected: boolean,
    validationStatus?: string | null
): string => {
    if (selected) return '#2563eb';
    if (validationStatus === 'UNREADABLE' || validationStatus === 'MISMATCHED' || validationStatus === 'NOT_FOUND') {
        return '#dc2626';
    }
    if (confidence != null && confidence < 0.6) return '#d97706';
    if (confidence != null && confidence >= 0.85) return '#16a34a';
    return '#0ea5e9';
};

export const fillForField = (
    confidence: number | null | undefined,
    selected: boolean,
    validationStatus?: string | null
): string => {
    if (selected) return 'rgba(37,99,235,0.22)';
    if (validationStatus === 'UNREADABLE') return 'rgba(220,38,38,0.28)';
    if (validationStatus === 'MISMATCHED' || validationStatus === 'NOT_FOUND') {
        return 'rgba(239,68,68,0.22)';
    }
    if (confidence != null && confidence < 0.6) return 'rgba(217,119,6,0.18)';
    return 'rgba(14,165,233,0.14)';
};

/** SVG `points` for a box: its four corners when present (tilted tickets), else the rect. */
export const boxPolygonPoints = (box: TicketBoundingBox): string => {
    const corners =
        box.corners && box.corners.length === 4
            ? box.corners
            : [
                  [box.x, box.y],
                  [box.x + box.width, box.y],
                  [box.x + box.width, box.y + box.height],
                  [box.x, box.y + box.height],
              ];
    return corners.map(([cx, cy]) => `${cx},${cy}`).join(' ');
};

/** Template field region on the original image, in the row's `bbox` space. */
export const resolveSourceFieldBox = (
    row: OcrReviewRow,
    fieldName: string
): TicketBoundingBox | null => {
    const box = row.sourceFieldBoxes?.[fieldName];
    return box && box.width > 0 && box.height > 0 ? box : null;
};

export const hasSourceFieldBoxes = (row: OcrReviewRow): boolean =>
    Object.keys(row.sourceFieldBoxes ?? {}).some((field) => resolveSourceFieldBox(row, field));

/**
 * Prefer OCR-reported dimensions when present (bbox space); fall back to the
 * browser-decoded natural size. Caller still maps boxes into natural pixels
 * when these differ.
 */
export const resolveCoordSize = (
    ocrWidth?: number | null,
    ocrHeight?: number | null,
    naturalWidth?: number | null,
    naturalHeight?: number | null
): { coordWidth: number; coordHeight: number } => {
    const coordWidth =
        ocrWidth && ocrWidth > 0 ? ocrWidth : naturalWidth && naturalWidth > 0 ? naturalWidth : 0;
    const coordHeight =
        ocrHeight && ocrHeight > 0
            ? ocrHeight
            : naturalHeight && naturalHeight > 0
              ? naturalHeight
              : 0;
    return { coordWidth, coordHeight };
};
