import type { TicketBoundingBox } from '../types/ticketOcr.type';

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

/** True when box looks like normalized 0..1 fractions of the image. */
export const isNormalizedBoundingBox = (box: TicketBoundingBox): boolean => {
    const values = [box.x, box.y, box.width, box.height];
    if (values.some((v) => !Number.isFinite(v) || v < 0)) {
        return false;
    }
    return values.every((v) => v <= 1) && box.width > 0 && box.height > 0;
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
