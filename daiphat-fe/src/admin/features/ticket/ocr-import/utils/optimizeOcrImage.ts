/**
 * Client-side OCR image prep: crop empty margins + mild color adjust.
 *
 * Prefer keeping the original JPEG when no crop is needed.
 * When pixels must change, re-encode as high-quality JPEG (not PNG) —
 * lossless PNG of phone photos often balloons past multipart / OCR limits
 * (UI may show a few MB while the prepared upload exceeds the server cap).
 */

export const OCR_UPLOAD_SOFT_MAX_BYTES = 7_500_000; // under ticket-vision ~8MB guard
export const OCR_UPLOAD_HARD_MAX_BYTES = 45_000_000; // under Spring multipart 50MB
/** Match ticket-vision TICKET_VISION_MAX_IMAGE_DIMENSION — keeps glyphs readable. */
export const OCR_PREP_MAX_DIMENSION = 1920;
export const OCR_PREP_JPEG_QUALITY = 0.95;
export const OCR_PREP_MIN_JPEG_QUALITY = 0.90;

type TrimBounds = { x: number; y: number; width: number; height: number };

const loadImageElement = async (file: File): Promise<HTMLImageElement | ImageBitmap> => {
    if (typeof createImageBitmap === 'function') {
        try {
            return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
        } catch {
            // Fall through to HTMLImageElement path.
        }
    }
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Không đọc được ảnh để tối ưu OCR.'));
        };
        image.src = url;
    });
};

const getImageSize = (image: HTMLImageElement | ImageBitmap) => {
    if ('naturalWidth' in image) {
        return {
            width: image.naturalWidth || image.width,
            height: image.naturalHeight || image.height,
        };
    }
    return { width: image.width, height: image.height };
};

const canvasToJpegBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Không xuất được ảnh OCR.'));
                    return;
                }
                resolve(blob);
            },
            'image/jpeg',
            quality
        );
    });

const buildPreparedFileName = (originalName: string): string => {
    const base = originalName.replace(/\.[^.]+$/, '') || 'ticket';
    return `${base}-ocr.jpg`;
};

/** Detect near-uniform letterbox / table margins (mirrors BE trim_uniform_borders). */
const findContentBounds = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    maxTrimRatio = 0.18
): TrimBounds | null => {
    if (width < 40 || height < 40) {
        return null;
    }

    const probeScale = Math.min(1, 640 / Math.max(width, height));
    const probeW = Math.max(1, Math.round(width * probeScale));
    const probeH = Math.max(1, Math.round(height * probeScale));
    const probe = document.createElement('canvas');
    probe.width = probeW;
    probe.height = probeH;
    const probeCtx = probe.getContext('2d', { willReadFrequently: true });
    if (!probeCtx) {
        return null;
    }
    probeCtx.drawImage(ctx.canvas, 0, 0, width, height, 0, 0, probeW, probeH);
    const { data } = probeCtx.getImageData(0, 0, probeW, probeH);

    let minX = probeW;
    let minY = probeH;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < probeH; y += 1) {
        for (let x = 0; x < probeW; x += 1) {
            const i = (y * probeW + x) * 4;
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (gray > 28 && gray < 245) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < minX || maxY < minY) {
        return null;
    }

    const inv = 1 / probeScale;
    let x1 = Math.max(0, Math.floor(minX * inv));
    let y1 = Math.max(0, Math.floor(minY * inv));
    let x2 = Math.min(width, Math.ceil((maxX + 1) * inv));
    let y2 = Math.min(height, Math.ceil((maxY + 1) * inv));
    const pad = Math.round(Math.min(width, height) * 0.03);
    x1 = Math.max(0, x1 - pad);
    y1 = Math.max(0, y1 - pad);
    x2 = Math.min(width, x2 + pad);
    y2 = Math.min(height, y2 + pad);
    const cropW = Math.max(1, x2 - x1);
    const cropH = Math.max(1, y2 - y1);
    const areaRatio = (cropW * cropH) / (width * height);
    if (areaRatio > 0.98 || areaRatio < 1 - maxTrimRatio) {
        return null;
    }
    return { x: x1, y: y1, width: cropW, height: cropH };
};

const encodePreparedJpeg = async (
    sourceCanvas: HTMLCanvasElement,
    crop: TrimBounds,
    targetBytes: number
): Promise<Blob> => {
    const longest = Math.max(crop.width, crop.height);
    // Downscale oversized phone photos before OCR encode (faster upload + ITPM).
    let scale = longest > OCR_PREP_MAX_DIMENSION ? OCR_PREP_MAX_DIMENSION / longest : 1;
    let quality = OCR_PREP_JPEG_QUALITY;
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
        const outW = Math.max(1, Math.round(crop.width * scale));
        const outH = Math.max(1, Math.round(crop.height * scale));
        const out = document.createElement('canvas');
        out.width = outW;
        out.height = outH;
        const ctx = out.getContext('2d');
        if (!ctx) {
            throw new Error('Không tạo được canvas OCR.');
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // Mild OCR-friendly lift — avoid aggressive filters that blur digits.
        ctx.filter = 'contrast(1.06) brightness(1.03) saturate(1.02)';
        ctx.drawImage(
            sourceCanvas,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            0,
            0,
            outW,
            outH
        );
        ctx.filter = 'none';
        blob = await canvasToJpegBlob(out, quality);
        if (blob.size <= targetBytes) {
            return blob;
        }
        if (quality > OCR_PREP_MIN_JPEG_QUALITY) {
            quality = Math.max(OCR_PREP_MIN_JPEG_QUALITY, quality - 0.02);
        } else if (scale > 0.72) {
            scale *= 0.92;
            quality = OCR_PREP_JPEG_QUALITY;
        } else {
            break;
        }
    }
    if (!blob) {
        throw new Error('Không xuất được ảnh OCR.');
    }
    return blob;
};

/**
 * Crop empty margins, cap resolution, mild contrast — optimized for YOLO + OCR.
 * Uploads stay as JPEG so size stays under BE multipart + ticket-vision limits.
 */
export const optimizeOcrScanImage = async (file: File): Promise<File> => {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
        return file;
    }
    if (!file.type.startsWith('image/')) {
        return file;
    }
    if (file.name.endsWith('-ocr.jpg') && file.type === 'image/jpeg') {
        return file;
    }

    let bitmap: ImageBitmap | null = null;
    try {
        const image = await loadImageElement(file);
        if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) {
            bitmap = image;
        }
        const { width: sourceW, height: sourceH } = getImageSize(image);
        if (sourceW <= 0 || sourceH <= 0) {
            return file;
        }

        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = sourceW;
        sourceCanvas.height = sourceH;
        const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
        if (!sourceCtx) {
            return file;
        }
        sourceCtx.drawImage(image, 0, 0);

        const bounds = findContentBounds(sourceCtx, sourceW, sourceH);
        const crop: TrimBounds = bounds ?? {
            x: 0,
            y: 0,
            width: sourceW,
            height: sourceH,
        };
        const didCrop = Boolean(bounds);
        const longest = Math.max(crop.width, crop.height);
        const needsDownscale = longest > OCR_PREP_MAX_DIMENSION;
        const alreadyReadyJpeg =
            file.type === 'image/jpeg' &&
            file.size <= OCR_UPLOAD_SOFT_MAX_BYTES &&
            !didCrop &&
            !needsDownscale;

        // Sharp, already-sized JPEG with no letterbox — keep original bytes.
        if (alreadyReadyJpeg) {
            return file;
        }

        const targetBytes =
            file.size > OCR_UPLOAD_HARD_MAX_BYTES
                ? OCR_UPLOAD_SOFT_MAX_BYTES
                : Math.min(OCR_UPLOAD_SOFT_MAX_BYTES, Math.max(file.size, 800_000));

        const blob = await encodePreparedJpeg(sourceCanvas, crop, targetBytes);
        return new File([blob], buildPreparedFileName(file.name), {
            type: 'image/jpeg',
            lastModified: Date.now(),
        });
    } catch {
        return file;
    } finally {
        bitmap?.close();
    }
};

export const optimizeOcrScanImages = async (files: File[]): Promise<File[]> => {
    const next: File[] = [];
    for (const file of files) {
        next.push(await optimizeOcrScanImage(file));
    }
    return next;
};

/** @deprecated kept for type compatibility. */
export type _TrimBounds = TrimBounds;
