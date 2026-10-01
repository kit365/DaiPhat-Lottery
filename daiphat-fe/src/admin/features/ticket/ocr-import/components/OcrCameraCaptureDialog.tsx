'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Select,
    Stack,
    Typography,
    Alert,
    CircularProgress,
    Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CameraswitchIcon from '@mui/icons-material/Cameraswitch';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface CapturedItem {
    id: string;
    file: File;
    previewUrl: string;
}

interface OcrCameraCaptureDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirmCapture: (files: File[]) => void;
}

export const OcrCameraCaptureDialog: React.FC<OcrCameraCaptureDialogProps> = ({
    open,
    onClose,
    onConfirmCapture,
}) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [capturedList, setCapturedList] = useState<CapturedItem[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [flashActive, setFlashActive] = useState(false);

    // Stop active camera stream
    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setIsStreaming(false);
    }, []);

    // Start camera stream with specified device
    const startStream = useCallback(async (deviceId?: string) => {
        stopStream();
        setCameraError(null);
        try {
            const constraints: MediaStreamConstraints = {
                video: {
                    deviceId: deviceId ? { exact: deviceId } : undefined,
                    facingMode: deviceId ? undefined : { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setIsStreaming(true);
            }

            // Enumerate cameras
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevs = allDevices.filter((d) => d.kind === 'videoinput');
            setDevices(videoDevs);
            if (!deviceId && videoDevs.length > 0) {
                const activeTrack = stream.getVideoTracks()[0];
                const activeDevId = activeTrack?.getSettings()?.deviceId || videoDevs[0].deviceId;
                setSelectedDeviceId(activeDevId);
            }
        } catch (err: any) {
            console.error('Lỗi khởi tạo camera:', err);
            if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
                setCameraError('Trình duyệt chưa được cấp quyền truy cập Camera. Vui lòng bật quyền Camera trong cài đặt trình duyệt.');
            } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
                setCameraError('Không tìm thấy thiết bị Camera / Webcam nào trên máy tính.');
            } else {
                setCameraError(err?.message || 'Không thể khởi động camera.');
            }
        }
    }, [stopStream]);

    // Handle dialog open / close
    useEffect(() => {
        if (open) {
            setCapturedList([]);
            startStream();
        } else {
            stopStream();
            // Revoke all preview URLs
            capturedList.forEach((item) => URL.revokeObjectURL(item.previewUrl));
            setCapturedList([]);
        }
        return () => {
            stopStream();
        };
    }, [open]);

    // Switch camera
    const handleSwitchCamera = (newDeviceId: string) => {
        setSelectedDeviceId(newDeviceId);
        startStream(newDeviceId);
    };

    // Shutter capture frame
    const handleCaptureFrame = () => {
        if (!videoRef.current || !isStreaming) return;

        // Visual flash trigger
        setFlashActive(true);
        setTimeout(() => setFlashActive(false), 150);

        const video = videoRef.current;
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;

        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, width, height);

        canvas.toBlob((blob) => {
            if (!blob) return;
            const fileName = `ticket_cam_${Date.now()}_${capturedList.length + 1}.jpg`;
            const file = new File([blob], fileName, { type: 'image/jpeg', lastModified: Date.now() });
            const previewUrl = URL.createObjectURL(blob);

            setCapturedList((prev) => [
                ...prev,
                {
                    id: `cam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    file,
                    previewUrl,
                },
            ]);
        }, 'image/jpeg', 0.95);
    };

    const handleDeleteCaptured = (id: string) => {
        setCapturedList((prev) => {
            const item = prev.find((x) => x.id === id);
            if (item) URL.revokeObjectURL(item.previewUrl);
            return prev.filter((x) => x.id !== id);
        });
    };

    const handleConfirm = () => {
        if (capturedList.length === 0) return;
        const files = capturedList.map((item) => item.file);
        onConfirmCapture(files);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    overflow: 'hidden',
                    bgcolor: '#0f172a',
                    color: '#ffffff',
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2.5,
                    py: 1.5,
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                        sx={{
                            width: 34,
                            height: 34,
                            borderRadius: '8px',
                            bgcolor: 'rgba(37, 99, 235, 0.2)',
                            color: '#60a5fa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <CameraAltIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} color="#f8fafc">
                            Chụp vé số trực tiếp từ Camera
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            Đặt vé vào giữa khung hình và nhấn Chụp. Có thể chụp liên tiếp nhiều vé!
                        </Typography>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                    {devices.length > 1 && (
                        <Select
                            size="small"
                            value={selectedDeviceId}
                            onChange={(e) => handleSwitchCamera(e.target.value)}
                            sx={{
                                color: '#ffffff',
                                fontSize: '0.75rem',
                                bgcolor: 'rgba(255,255,255,0.08)',
                                borderRadius: '8px',
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(255,255,255,0.2)',
                                },
                                '& .MuiSvgIcon-root': {
                                    color: '#ffffff',
                                },
                            }}
                        >
                            {devices.map((dev, idx) => (
                                <MenuItem key={dev.deviceId || idx} value={dev.deviceId} sx={{ fontSize: '0.8rem' }}>
                                    {dev.label || `Camera ${idx + 1}`}
                                </MenuItem>
                            ))}
                        </Select>
                    )}
                    <IconButton size="small" onClick={onClose} sx={{ color: '#94a3b8' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </DialogTitle>

            <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {cameraError ? (
                    <Box sx={{ py: 6, px: 2, width: '100%', textAlign: 'center' }}>
                        <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
                            {cameraError}
                        </Alert>
                        <Button
                            variant="outlined"
                            color="inherit"
                            onClick={() => startStream(selectedDeviceId)}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            Thử kết nối lại
                        </Button>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            width: '100%',
                            position: 'relative',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            bgcolor: '#000000',
                            aspectRatio: '16/9',
                            maxHeight: '52vh',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {!isStreaming && (
                            <Stack alignItems="center" spacing={1}>
                                <CircularProgress size={32} sx={{ color: '#38bdf8' }} />
                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                    Đang mở máy ảnh...
                                </Typography>
                            </Stack>
                        )}

                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                display: isStreaming ? 'block' : 'none',
                            }}
                        />

                        {/* Viewfinder guides (Khung ngắm vé số) */}
                        {isStreaming && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: '10%',
                                    border: '2px dashed rgba(59, 130, 246, 0.7)',
                                    borderRadius: '12px',
                                    pointerEvents: 'none',
                                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'rgba(255,255,255,0.7)',
                                        bgcolor: 'rgba(0,0,0,0.5)',
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        letterSpacing: 0.5,
                                    }}
                                >
                                    Căn chỉnh vé số vào trọn khung viền này
                                </Typography>
                            </Box>
                        )}

                        {/* Shutter Flash Animation */}
                        {flashActive && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    bgcolor: '#ffffff',
                                    opacity: 0.8,
                                    pointerEvents: 'none',
                                    transition: 'opacity 0.15s ease-out',
                                }}
                            />
                        )}
                    </Box>
                )}

                {/* Shutter Button Action Row */}
                {!cameraError && isStreaming && (
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleCaptureFrame}
                            startIcon={<CameraAltIcon />}
                            sx={{
                                px: 4,
                                py: 1.25,
                                borderRadius: '999px',
                                bgcolor: '#2563eb',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '1rem',
                                textTransform: 'none',
                                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.5)',
                                '&:hover': {
                                    bgcolor: '#1d4ed8',
                                    transform: 'scale(1.02)',
                                },
                                transition: 'all 0.15s',
                            }}
                        >
                            📸 Chụp vé này
                        </Button>
                    </Box>
                )}

                {/* Captured Strip (Staging list below camera) */}
                {capturedList.length > 0 && (
                    <Box
                        sx={{
                            width: '100%',
                            mt: 2.5,
                            p: 1.5,
                            borderRadius: '12px',
                            bgcolor: 'rgba(30, 41, 59, 0.7)',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: '#38bdf8' }}>
                                VÉ ĐÃ CHỤP CHỜ XÁC NHẬN ({capturedList.length} vé)
                            </Typography>
                            <Button
                                size="small"
                                color="error"
                                onClick={() => setCapturedList([])}
                                sx={{ fontSize: '0.7rem', py: 0, px: 0.5, textTransform: 'none' }}
                            >
                                Xóa tất cả
                            </Button>
                        </Stack>

                        <Stack direction="row" spacing={1.25} sx={{ overflowX: 'auto', pb: 0.5 }}>
                            {capturedList.map((item, idx) => (
                                <Box
                                    key={item.id}
                                    sx={{
                                        position: 'relative',
                                        width: 80,
                                        height: 60,
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        flexShrink: 0,
                                        bgcolor: '#000',
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={item.previewUrl}
                                        alt={`Captured ${idx + 1}`}
                                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: 2,
                                            left: 2,
                                            bgcolor: 'rgba(0,0,0,0.6)',
                                            color: '#fff',
                                            fontSize: '0.625rem',
                                            px: 0.5,
                                            borderRadius: '4px',
                                            fontWeight: 700,
                                        }}
                                    >
                                        #{idx + 1}
                                    </Box>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleDeleteCaptured(item.id)}
                                        sx={{
                                            position: 'absolute',
                                            top: 2,
                                            right: 2,
                                            bgcolor: 'rgba(239, 68, 68, 0.85)',
                                            color: '#fff',
                                            p: 0.25,
                                            '&:hover': { bgcolor: '#dc2626' },
                                        }}
                                    >
                                        <CloseIcon sx={{ fontSize: 12 }} />
                                    </IconButton>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                )}
            </DialogContent>

            {/* Bottom Confirmation Bar */}
            <DialogActions
                sx={{
                    px: 3,
                    py: 2,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Button
                    onClick={onClose}
                    sx={{ color: '#94a3b8', textTransform: 'none', fontWeight: 600 }}
                >
                    Đóng
                </Button>

                <Button
                    variant="contained"
                    color="primary"
                    disabled={capturedList.length === 0}
                    onClick={handleConfirm}
                    startIcon={<CheckCircleIcon />}
                    sx={{
                        px: 3,
                        py: 1,
                        borderRadius: '10px',
                        fontWeight: 800,
                        textTransform: 'none',
                        bgcolor: capturedList.length > 0 ? '#10b981' : undefined,
                        '&:hover': {
                            bgcolor: '#059669',
                        },
                    }}
                >
                    {capturedList.length > 0
                        ? `🚀 Xác nhận & Sử dụng (${capturedList.length} vé)`
                        : 'Chưa có ảnh vé'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
