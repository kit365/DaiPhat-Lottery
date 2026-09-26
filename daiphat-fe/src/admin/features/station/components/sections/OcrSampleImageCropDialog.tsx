'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
    IconButton,
} from '@mui/material';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import { toast } from 'react-toastify';

type DragState = {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
};

type Props = {
    open: boolean;
    /** Object URL or remote image URL to crop. */
    imageSrc: string | null;
    /** Suggested filename for the cropped File. */
    fileName?: string;
    mimeType?: string;
    /** Parent is uploading the cropped file. */
    uploading?: boolean;
    onClose: () => void;
    onConfirm: (file: File) => void;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Manual crop dialog for OCR sample ticket images.
 * Drag a rectangle on the preview, then export a cropped File via canvas.
 */
export const OcrSampleImageCropDialog = ({
    open,
    imageSrc,
    fileName = 'ocr-sample-cropped.jpg',
    mimeType = 'image/jpeg',
    uploading = false,
    onClose,
    onConfirm,
}: Props) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [drag, setDrag] = useState<DragState | null>(null);
    const [crop, setCrop] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);
    const [busy, setBusy] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [localImageSrc, setLocalImageSrc] = useState<string | null>(null);

    useEffect(() => {
        setLocalImageSrc(imageSrc);
    }, [imageSrc]);

    useEffect(() => {
        if (!open) {
            setDrag(null);
            setCrop(null);
            setBusy(false);
            setLoadError(false);
        }
    }, [open, imageSrc]);

    const toNormalized = useCallback((clientX: number, clientY: number) => {
        const el = containerRef.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return null;
        return {
            x: clamp01((clientX - rect.left) / rect.width),
            y: clamp01((clientY - rect.top) / rect.height),
        };
    }, []);

    const handlePointerDown = (e: PointerEvent) => {
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
        if (!drag) return;
        const point = toNormalized(e.clientX, e.clientY);
        if (!point) return;
        setDrag((prev) =>
            prev ? { ...prev, currentX: point.x, currentY: point.y } : prev
        );
    };

    const finishDrag = () => {
        if (!drag) {
            setDrag(null);
            return;
        }
        const x = Math.min(drag.startX, drag.currentX);
        const y = Math.min(drag.startY, drag.currentY);
        const width = Math.abs(drag.currentX - drag.startX);
        const height = Math.abs(drag.currentY - drag.startY);
        setDrag(null);
        if (width < 0.02 || height < 0.02) return;
        setCrop({ x, y, width, height });
    };

    const draftBox =
        drag != null
            ? {
                  x: Math.min(drag.startX, drag.currentX),
                  y: Math.min(drag.startY, drag.currentY),
                  width: Math.abs(drag.currentX - drag.startX),
                  height: Math.abs(drag.currentY - drag.startY),
              }
            : crop;

    const handleUseFullImage = () => {
        setCrop({ x: 0, y: 0, width: 1, height: 1 });
    };

    const handleRotate = async () => {
        if (!imageRef.current || !localImageSrc) return;
        setBusy(true);
        try {
            const img = imageRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalHeight;
            canvas.height = img.naturalWidth;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Cannot get canvas context');
            
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((90 * Math.PI) / 180);
            ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
            
            const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, mimeType || 'image/jpeg', 0.95));
            if (blob) {
                const newUrl = URL.createObjectURL(blob);
                setLocalImageSrc(newUrl);
                setCrop(null); // Reset crop box because dimensions changed
            }
        } catch (e: any) {
            toast.error('Lỗi khi xoay ảnh.');
        } finally {
            setBusy(false);
        }
    };

    const handleConfirm = async () => {
        const img = imageRef.current;
        const box = crop ?? (draftBox && draftBox.width > 0.02 && draftBox.height > 0.02 ? draftBox : null);
        if (!img || !box) {
            return;
        }
        setBusy(true);
        try {
            const naturalW = img.naturalWidth;
            const naturalH = img.naturalHeight;
            if (naturalW < 2 || naturalH < 2) {
                throw new Error('Ảnh không hợp lệ.');
            }
            const sx = Math.round(box.x * naturalW);
            const sy = Math.round(box.y * naturalH);
            const sw = Math.max(1, Math.round(box.width * naturalW));
            const sh = Math.max(1, Math.round(box.height * naturalH));

            const canvas = document.createElement('canvas');
            canvas.width = sw;
            canvas.height = sh;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Không tạo được canvas crop.');
            }
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

            const outputType = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
            const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(
                    (result) => resolve(result),
                    outputType === 'image/png' ? 'image/png' : 'image/jpeg',
                    0.92
                );
            });
            if (!blob) {
                throw new Error('Không xuất được ảnh đã crop (có thể do CORS). Hãy chọn lại tệp ảnh từ máy.');
            }
            const baseName = (fileName || 'ocr-sample').replace(/\.[^.]+$/, '');
            const ext = outputType === 'image/png' ? 'png' : 'jpg';
            const file = new File([blob], `${baseName}-cropped.${ext}`, {
                type: outputType === 'image/png' ? 'image/png' : 'image/jpeg',
            });
            onConfirm(file);
        } catch (err: unknown) {
            const message =
                (err as { message?: string })?.message ||
                'Crop ảnh thất bại. Vui lòng thử lại.';
            toast.error(message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={busy || uploading ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle>Crop ảnh mẫu vé</DialogTitle>
            <DialogContent>
                <Stack gap={1.5}>
                    <Typography variant="body2" color="text.secondary">
                        Kéo chuột trên ảnh để chọn vùng vé cần giữ lại (loại bỏ nền thừa).
                        Có thể dùng toàn ảnh nếu không cần crop.
                    </Typography>
                    <Stack direction="row" justifyContent="flex-end">
                        <Button 
                            variant="outlined" 
                            size="small" 
                            startIcon={<RotateRightIcon />} 
                            onClick={() => void handleRotate()}
                            disabled={busy || uploading || !localImageSrc}
                        >
                            Xoay 90°
                        </Button>
                    </Stack>
                    {!localImageSrc || loadError ? (
                        <Typography variant="body2" color="error">
                            Không tải được ảnh để crop. Hãy chọn lại tệp ảnh.
                        </Typography>
                    ) : (
                        <Box
                            ref={containerRef}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={finishDrag}
                            onPointerCancel={() => setDrag(null)}
                            sx={{
                                position: 'relative',
                                width: '100%',
                                maxHeight: '70vh',
                                userSelect: 'none',
                                touchAction: 'none',
                                cursor: 'crosshair',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                overflow: 'hidden',
                                bgcolor: 'action.hover',
                                pointerEvents: busy || uploading ? 'none' : 'auto',
                                opacity: busy || uploading ? 0.85 : 1,
                            }}
                        >
                            <img
                                ref={imageRef}
                                src={localImageSrc}
                                alt="Ảnh mẫu cần crop"
                                draggable={false}
                                onError={() => setLoadError(true)}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    height: 'auto',
                                    maxHeight: '70vh',
                                    objectFit: 'contain',
                                    pointerEvents: 'none',
                                }}
                            />
                            {draftBox && draftBox.width > 0 && draftBox.height > 0 && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        left: `${draftBox.x * 100}%`,
                                        top: `${draftBox.y * 100}%`,
                                        width: `${draftBox.width * 100}%`,
                                        height: `${draftBox.height * 100}%`,
                                        border: '2px solid #38bdf8',
                                        boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)',
                                        boxSizing: 'border-box',
                                        pointerEvents: 'none',
                                    }}
                                />
                            )}
                        </Box>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button onClick={onClose} disabled={busy || uploading} sx={{ textTransform: 'none' }}>
                    Hủy
                </Button>
                <Button
                    variant="outlined"
                    onClick={handleUseFullImage}
                    disabled={busy || uploading || !imageSrc || loadError}
                    sx={{ textTransform: 'none' }}
                >
                    Dùng toàn ảnh
                </Button>
                <Button
                    variant="contained"
                    onClick={() => void handleConfirm()}
                    disabled={
                        busy ||
                        uploading ||
                        !imageSrc ||
                        loadError ||
                        !(crop || (draftBox && draftBox.width > 0.02 && draftBox.height > 0.02))
                    }
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    {busy || uploading ? 'Đang xử lý…' : 'Xác nhận crop & tải lên'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
