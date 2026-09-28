import React, { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Slider,
    Typography,
    Box,
    Stack,
    IconButton
} from '@mui/material';
import { Button } from '../ui/Button';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import CloseIcon from '@mui/icons-material/Close';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import getCroppedImg from './cropImageHelper';
import { toast } from 'react-toastify';

export interface ImageCropModalProps {
    open: boolean;
    imageFile: File | null;
    onClose: () => void;
    onSave: (croppedFile: File) => void | Promise<void>;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({ open, imageFile, onClose, onSave }) => {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [rotation, setRotation] = useState(0);
    const [loading, setLoading] = useState(false);
    
    const imgRef = useRef<HTMLImageElement>(null);

    const imageUrl = React.useMemo(() => {
        if (!imageFile) return '';
        return URL.createObjectURL(imageFile);
    }, [imageFile]);

    // reset when image changes
    useEffect(() => {
        setRotation(0);
        setCrop(undefined);
        setCompletedCrop(undefined);
    }, [imageFile]);

    const handleSave = async () => {
        if (!imageFile || !imgRef.current) return;
        setLoading(true);
        try {
            const img = imgRef.current;
            
            // Because react-image-crop works on the visually rendered size,
            // we need to scale the crop coordinates to match the natural/canvas size.
            // When rotated 90/270 degrees, the bounding box width/height are swapped.
            const rotRad = (rotation * Math.PI) / 180;
            const bBoxWidth = Math.abs(Math.cos(rotRad) * img.naturalWidth) + Math.abs(Math.sin(rotRad) * img.naturalHeight);
            const bBoxHeight = Math.abs(Math.sin(rotRad) * img.naturalWidth) + Math.abs(Math.cos(rotRad) * img.naturalHeight);

            // getBoundingClientRect() gives the actual visual size of the rotated image on screen
            const rect = img.getBoundingClientRect();
            const scaleX = bBoxWidth / rect.width;
            const scaleY = bBoxHeight / rect.height;

            const finalCrop = completedCrop ? {
                x: completedCrop.x * scaleX,
                y: completedCrop.y * scaleY,
                width: completedCrop.width * scaleX,
                height: completedCrop.height * scaleY,
            } : {
                x: 0,
                y: 0,
                width: bBoxWidth,
                height: bBoxHeight,
            };

            const croppedFile = await getCroppedImg(
                imageUrl,
                finalCrop,
                rotation,
                imageFile.name
            );
            if (croppedFile) {
                await onSave(croppedFile);
            }
        } catch (e) {
            console.error(e);
            toast.error("Có lỗi xảy ra khi cắt ảnh");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* Changed to component="span" to fix hydration error (h6 cannot be child of h2) */}
                <Typography variant="h6" component="span">Chỉnh sửa ảnh mẫu vé</Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ 
                    position: 'relative', 
                    width: '100%', 
                    maxHeight: '60vh', 
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    bgcolor: '#f5f5f5', 
                    borderRadius: 1 
                }}>
                    {imageUrl && (
                        <ReactCrop
                            crop={crop}
                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                            onComplete={(c) => setCompletedCrop(c)}
                        >
                            <img
                                ref={imgRef}
                                alt="Crop me"
                                src={imageUrl}
                                style={{ 
                                    transform: `rotate(${rotation}deg)`,
                                    maxWidth: '100%',
                                    maxHeight: '60vh'
                                }}
                            />
                        </ReactCrop>
                    )}
                </Box>
                <Stack spacing={2} sx={{ mt: 3, px: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="nowrap">
                        <Typography sx={{ whiteSpace: 'nowrap' }}>Xoay ảnh</Typography>
                        <IconButton onClick={() => setRotation(r => r - 90)} size="small" sx={{ bgcolor: 'action.hover' }}>
                            <RotateLeftIcon />
                        </IconButton>
                        <Slider
                            value={rotation}
                            min={0}
                            max={360}
                            step={1}
                            onChange={(e, rotation) => setRotation(Number(rotation))}
                        />
                        <IconButton onClick={() => setRotation(r => r + 90)} size="small" sx={{ bgcolor: 'action.hover' }}>
                            <RotateRightIcon />
                        </IconButton>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button 
                    variant="outlined" 
                    className="btn-outlined-admin"
                    onClick={onClose} 
                    disabled={loading} 
                    label="Hủy" 
                />
                <Button 
                    variant="contained" 
                    className="btn-primary-admin"
                    onClick={() => void handleSave()} 
                    disabled={!imageUrl} 
                    loading={loading}
                    label="Xác nhận và Tải lên"
                    loadingLabel="Đang xử lý..."
                />
            </DialogActions>
        </Dialog>
    );
};
