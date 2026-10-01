'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { toast } from 'react-toastify';

type Props = {
    imageFile: File | null;
    onClose: () => void;
    onSave: (file: File) => void;
};

const canvasBlob = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Không xuất được ảnh đã chỉnh sửa.')), 'image/jpeg', 0.94);
});

export default function OcrImageEditDialog({ imageFile, onClose, onSave }: Props) {
    const imageRef = useRef<HTMLImageElement | null>(null);
    const activeUrlRef = useRef('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [crop, setCrop] = useState<Crop>();
    const [busy, setBusy] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!imageFile) {
            setSourceUrl('');
            return;
        }
        const url = URL.createObjectURL(imageFile);
        activeUrlRef.current = url;
        setSourceUrl(url);
        setCrop(undefined);
        setReady(false);
        return () => {
            if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);
            activeUrlRef.current = '';
        };
    }, [imageFile]);

    const rotate = async (degrees: -90 | 90) => {
        const image = imageRef.current;
        if (!image) return;
        setBusy(true);
        try {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalHeight;
            canvas.height = image.naturalWidth;
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Không thể xoay ảnh.');
            context.translate(canvas.width / 2, canvas.height / 2);
            context.rotate(degrees * Math.PI / 180);
            context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
            const blob = await canvasBlob(canvas);
            const nextUrl = URL.createObjectURL(blob);
            setReady(false);
            if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);
            activeUrlRef.current = nextUrl;
            setSourceUrl(nextUrl);
            setCrop(undefined);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Không thể xoay ảnh.');
        } finally {
            setBusy(false);
        }
    };

    const save = async () => {
        const image = imageRef.current;
        if (!image || !imageFile || !ready) return;
        setBusy(true);
        try {
            const scaleX = image.naturalWidth / image.width;
            const scaleY = image.naturalHeight / image.height;
            const area = crop && crop.width > 1 && crop.height > 1
                ? { x: Math.round(crop.x * scaleX), y: Math.round(crop.y * scaleY), width: Math.round(crop.width * scaleX), height: Math.round(crop.height * scaleY) }
                : { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.min(area.width, image.naturalWidth - area.x));
            canvas.height = Math.max(1, Math.min(area.height, image.naturalHeight - area.y));
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Không thể cắt ảnh.');
            context.drawImage(image, area.x, area.y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
            const blob = await canvasBlob(canvas);
            const name = imageFile.name.replace(/\.[^.]+$/, '') || 've-ocr';
            onSave(new File([blob], `${name}-edited.jpg`, { type: 'image/jpeg', lastModified: Date.now() }));
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Không thể lưu ảnh đã chỉnh sửa.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={Boolean(imageFile)} onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Chỉnh sửa ảnh trước khi quét
                <IconButton aria-label="Đóng" onClick={onClose} disabled={busy}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                        Kéo trên ảnh để chọn vùng cần giữ. Có thể xoay ảnh và lưu toàn ảnh nếu không chọn vùng cắt.
                    </Typography>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" startIcon={<RotateLeftIcon />} onClick={() => void rotate(-90)} disabled={busy}>Xoay trái 90°</Button>
                        <Button size="small" startIcon={<RotateRightIcon />} onClick={() => void rotate(90)} disabled={busy}>Xoay phải 90°</Button>
                    </Stack>
                    <Box sx={{ display: 'flex', justifyContent: 'center', bgcolor: '#f1f5f9', p: 1, overflow: 'auto', maxHeight: '65vh' }}>
                        {sourceUrl && <ReactCrop crop={crop} onChange={(next) => setCrop(next)}>
                            <img ref={imageRef} src={sourceUrl} alt="Ảnh vé cần chỉnh sửa" onLoad={() => setReady(true)} style={{ maxWidth: '100%', maxHeight: '60vh', display: 'block' }} />
                        </ReactCrop>}
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setCrop(undefined)} disabled={busy || !crop}>Dùng toàn ảnh</Button>
                <Button onClick={onClose} disabled={busy}>Hủy</Button>
                <Button variant="contained" onClick={() => void save()} disabled={busy || !ready}>{busy ? 'Đang xử lý…' : 'Lưu ảnh & quét lại'}</Button>
            </DialogActions>
        </Dialog>
    );
}
