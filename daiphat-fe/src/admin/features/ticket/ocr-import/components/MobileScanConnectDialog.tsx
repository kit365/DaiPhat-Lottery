'use client';

import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import type { OcrSessionStatus } from '../types/ocrSession.type';

interface MobileScanConnectDialogProps {
    open: boolean;
    onClose: () => void;
    sessionCode: string | null;
    status: OcrSessionStatus;
    connectedStaff?: string | null;
    connectedDevice?: string | null;
    scannedCount: number;
    qrToken?: string | null;
    isCreating?: boolean;
    onEndSession?: () => void;
}

export const MobileScanConnectDialog: React.FC<MobileScanConnectDialogProps> = ({
    open,
    onClose,
    sessionCode,
    status,
    connectedStaff,
    connectedDevice,
    scannedCount,
    qrToken,
    isCreating = false,
    onEndSession,
}) => {
    const [confirmDisconnectOpen, setConfirmDisconnectOpen] = useState(false);
    const isConnected = status === 'CONNECTED';

    const handleCopyCode = () => {
        if (sessionCode) {
            navigator.clipboard.writeText(sessionCode);
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <PhoneIphoneIcon color="primary" />
                            <Typography variant="h6" fontWeight="bold">
                                Kết nối Quét vé Mobile
                            </Typography>
                        </Stack>
                        <IconButton size="small" onClick={onClose}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </DialogTitle>

                <DialogContent dividers>
                    {isCreating ? (
                        <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                            <CircularProgress size={36} />
                            <Typography variant="body2" color="text.secondary">
                                Đang khởi tạo phiên kết nối...
                            </Typography>
                        </Stack>
                    ) : (
                        <Stack spacing={2} alignItems="center" sx={{ py: 1, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                Mở ứng dụng Mobile Đại Phát, chọn <b>Quét vé OCR</b> và nhập mã PIN hoặc quét mã QR dưới đây:
                            </Typography>

                            {/* QR Code */}
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    bgcolor: '#ffffff',
                                    borderRadius: 3,
                                    display: 'inline-block',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                }}
                            >
                                {qrToken ? (
                                    <QRCode
                                        value={qrToken}
                                        size={160}
                                        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                        viewBox="0 0 160 160"
                                    />
                                ) : (
                                    <Box sx={{ width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CircularProgress size={24} />
                                    </Box>
                                )}
                            </Paper>

                            {/* PIN Code Box */}
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 1.5,
                                    width: '100%',
                                    bgcolor: isConnected ? '#f0fdf4' : 'action.hover',
                                    borderColor: isConnected ? '#86efac' : 'primary.main',
                                    borderRadius: 2,
                                }}
                            >
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                    MÃ KẾT NỐI PHIÊN (PIN)
                                </Typography>
                                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ my: 0.5 }}>
                                    <Typography
                                        variant="h3"
                                        color="primary.main"
                                        fontWeight="900"
                                        letterSpacing={6}
                                        sx={{ fontFamily: 'monospace' }}
                                    >
                                        {sessionCode || '------'}
                                    </Typography>
                                    <Tooltip title="Sao chép mã PIN">
                                        <IconButton size="small" onClick={handleCopyCode}>
                                            <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>

                                {/* Status indicator */}
                                {isConnected ? (
                                    <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                                        <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />
                                        <Typography variant="body2" color="success.main" fontWeight="bold">
                                            Đã kết nối: {connectedDevice || 'Mobile'} ({connectedStaff || 'Nhân viên'})
                                        </Typography>
                                    </Stack>
                                ) : (
                                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                                        <CircularProgress size={14} color="primary" />
                                        <Typography variant="caption" color="text.secondary" fontWeight="medium">
                                            Đang lắng nghe kết nối Real-time từ Mobile...
                                        </Typography>
                                    </Stack>
                                )}
                            </Paper>

                            {/* Scanned ticket counter */}
                            <Paper
                                variant="outlined"
                                sx={{
                                    px: 2,
                                    py: 1,
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderRadius: 2,
                                    bgcolor: scannedCount > 0 ? '#eff6ff' : '#f8fafc',
                                    borderColor: scannedCount > 0 ? '#93c5fd' : '#e2e8f0',
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <ConfirmationNumberIcon color={scannedCount > 0 ? 'primary' : 'disabled'} />
                                    <Typography variant="body2" fontWeight="bold">
                                        Số vé đã nhận từ điện thoại:
                                    </Typography>
                                </Stack>
                                <Chip
                                    label={`${scannedCount} vé`}
                                    color={scannedCount > 0 ? 'primary' : 'default'}
                                    size="small"
                                    sx={{ fontWeight: 'bold' }}
                                />
                            </Paper>

                            <Alert severity="info" sx={{ textAlign: 'left', width: '100%', fontSize: '0.8125rem' }}>
                                Mỗi khi bạn chụp hoặc tải ảnh vé trên điện thoại, hệ thống sẽ tự động bóc tách và đẩy ngay vào danh sách đối soát trên máy tính.
                            </Alert>
                        </Stack>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 2.5, py: 1.5, display: 'flex', justifyContent: isConnected && onEndSession ? 'space-between' : 'flex-end', gap: 1 }}>
                    {isConnected && onEndSession && (
                        <Button
                            onClick={() => setConfirmDisconnectOpen(true)}
                            color="error"
                            variant="outlined"
                            sx={{ py: 1, px: 2, fontWeight: 600, textTransform: 'none' }}
                        >
                            Ngắt kết nối
                        </Button>
                    )}
                    <Button
                        onClick={onClose}
                        variant="contained"
                        color="primary"
                        sx={{
                            py: 1.2,
                            px: 2.5,
                            fontWeight: 'bold',
                            textTransform: 'none',
                            flex: isConnected && onEndSession ? 1 : 'none',
                            width: isConnected && onEndSession ? 'auto' : '100%',
                        }}
                    >
                        {scannedCount > 0 ? `Đóng và xem bảng duyệt (${scannedCount} vé đã nhận)` : (isConnected ? 'Hoàn tất quét vé' : 'Đóng')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal xác nhận ngắt kết nối */}
            <Dialog
                open={confirmDisconnectOpen}
                onClose={() => setConfirmDisconnectOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ pb: 1, pt: 2, px: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            bgcolor: 'rgba(239, 68, 68, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'error.main',
                        }}
                    >
                        <PhoneIphoneIcon />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight="bold" fontSize="1.05rem">
                            Xác nhận ngắt kết nối
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Phiên quét vé Mobile
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ px: 2.5, py: 1.5 }}>
                    <DialogContentText sx={{ color: 'text.primary', fontSize: '0.9rem' }}>
                        Bạn có chắc chắn muốn ngắt kết nối với thiết bị <b>{connectedDevice || 'Mobile'}</b> không? Sau khi ngắt kết nối, điện thoại sẽ dừng đồng bộ vé vào phiên này.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2, pt: 1, gap: 1 }}>
                    <Button
                        variant="outlined"
                        onClick={() => setConfirmDisconnectOpen(false)}
                        sx={{ textTransform: 'none', fontWeight: 600, flex: 1 }}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => {
                            setConfirmDisconnectOpen(false);
                            onEndSession?.();
                        }}
                        sx={{ textTransform: 'none', fontWeight: 700, flex: 1 }}
                    >
                        Ngắt kết nối
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
