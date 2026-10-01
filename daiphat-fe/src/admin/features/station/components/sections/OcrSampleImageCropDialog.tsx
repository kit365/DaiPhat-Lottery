'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Slider, Stack, Typography } from '@mui/material';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import ReactCrop, { type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { toast } from 'react-toastify';

type Props = {
    open: boolean;
    imageSrc: string | null;
    fileName?: string;
    uploading?: boolean;
    onClose: () => void;
    onConfirm: (file: File) => void;
};

const rotatedCanvas = (image: HTMLImageElement, degrees: number, scale = 1) => {
    const angle = degrees * Math.PI / 180;
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(Math.abs(width * Math.cos(angle)) + Math.abs(height * Math.sin(angle)));
    canvas.height = Math.ceil(Math.abs(width * Math.sin(angle)) + Math.abs(height * Math.cos(angle)));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Không thể xử lý ảnh.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(angle);
    context.drawImage(image, -width / 2, -height / 2, width, height);
    return canvas;
};

/** The crop is selected on a rotated preview, then applied at full resolution. */
export const OcrSampleImageCropDialog = ({ open, imageSrc, fileName = 'ocr-sample.jpg', uploading = false, onClose, onConfirm }: Props) => {
    const [source, setSource] = useState<HTMLImageElement | null>(null);
    const [preview, setPreview] = useState('');
    const [quarterTurns, setQuarterTurns] = useState(0);
    const [fineRotation, setFineRotation] = useState(0);
    const [crop, setCrop] = useState<PercentCrop>();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const rotation = quarterTurns * 90 + fineRotation;

    useEffect(() => {
        if (!open || !imageSrc) return;
        const image = new Image();
        let active = true;
        image.crossOrigin = 'anonymous';
        image.onload = () => { if (active) { setSource(image); setError(''); } };
        image.onerror = () => { if (active) setError('Không tải được ảnh để chỉnh sửa. Hãy chọn lại ảnh mẫu.'); };
        image.src = imageSrc;
        return () => { active = false; };
    }, [open, imageSrc]);

    useEffect(() => {
        if (!open) {
            setSource(null);
            setPreview('');
            setQuarterTurns(0);
            setFineRotation(0);
            setCrop(undefined);
            setError('');
        }
    }, [open]);

    useEffect(() => {
        if (!source) return;
        try {
            const scale = Math.min(1, 1600 / Math.max(source.naturalWidth, source.naturalHeight));
            setPreview(rotatedCanvas(source, rotation, scale).toDataURL('image/jpeg', 0.85));
            setCrop(undefined);
            setError('');
        } catch {
            setError('Không thể chỉnh sửa ảnh này. Máy chủ ảnh có thể không cho phép xử lý ảnh.');
        }
    }, [source, rotation]);

    const save = async () => {
        if (!source || error) return;
        setBusy(true);
        try {
            const rotated = rotatedCanvas(source, rotation);
            const area = crop && crop.width > 0 && crop.height > 0 ? crop : { x: 0, y: 0, width: 100, height: 100 };
            const x = Math.max(0, Math.floor(rotated.width * area.x / 100));
            const y = Math.max(0, Math.floor(rotated.height * area.y / 100));
            const width = Math.min(rotated.width - x, Math.round(rotated.width * area.width / 100));
            const height = Math.min(rotated.height - y, Math.round(rotated.height * area.height / 100));
            if (width < 200 || height < 200) throw new Error('Vùng ảnh sau khi cắt phải có kích thước tối thiểu 200×200 px.');
            const result = document.createElement('canvas');
            result.width = width;
            result.height = height;
            const context = result.getContext('2d');
            if (!context) throw new Error('Không thể cắt ảnh.');
            context.drawImage(rotated, x, y, width, height, 0, 0, width, height);
            const blob = await new Promise<Blob>((resolve, reject) => result.toBlob(
                (value) => value ? resolve(value) : reject(new Error('Không xuất được ảnh đã chỉnh sửa.')), 'image/jpeg', 0.94
            ));
            const name = fileName.replace(/\.[^.]+$/, '') || 'ocr-sample';
            onConfirm(new File([blob], `${name}-edited.jpg`, { type: 'image/jpeg' }));
        } catch (reason) {
            toast.error(reason instanceof Error ? reason.message : 'Không thể lưu ảnh đã chỉnh sửa.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={busy || uploading ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle>Chỉnh sửa ảnh mẫu vé OCR</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">Kéo trên ảnh để chọn vùng cần giữ. Để trống vùng chọn nếu muốn dùng toàn ảnh.</Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Button startIcon={<RotateLeftIcon />} onClick={() => setQuarterTurns((n) => n - 1)} disabled={busy || uploading || !source}>Xoay trái</Button>
                        <Box sx={{ flex: 1, minWidth: 100 }}>
                            <Typography id="ocr-fine-rotation-label" variant="caption">Xoay chính xác: {fineRotation}°</Typography>
                            <Slider aria-labelledby="ocr-fine-rotation-label" value={fineRotation} min={-45} max={45} step={1}
                                onChange={(_, value) => setFineRotation(value as number)} disabled={busy || uploading || !source} />
                        </Box>
                        <Button endIcon={<RotateRightIcon />} onClick={() => setQuarterTurns((n) => n + 1)} disabled={busy || uploading || !source}>Xoay phải</Button>
                    </Stack>
                    {error && <Typography color="error" variant="body2">{error}</Typography>}
                    <Box sx={{ display: 'flex', justifyContent: 'center', bgcolor: '#f1f5f9', p: 1, overflow: 'auto', maxHeight: '65vh' }}>
                        {preview && !error && <ReactCrop crop={crop} onChange={(_, percent) => setCrop(percent)}>
                            <img src={preview} alt="Ảnh mẫu vé đang chỉnh sửa" draggable={false} style={{ maxWidth: '100%', maxHeight: '60vh', display: 'block' }} />
                        </ReactCrop>}
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setCrop(undefined)} disabled={busy || uploading || !crop}>Dùng toàn ảnh</Button>
                <Button onClick={onClose} disabled={busy || uploading}>Hủy</Button>
                <Button variant="contained" onClick={() => void save()} disabled={busy || uploading || !preview || !!error}>
                    {busy || uploading ? 'Đang xử lý…' : 'Lưu thay đổi'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
