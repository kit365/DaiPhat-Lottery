import CloseIcon from '@mui/icons-material/Close';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Typography,
} from '@mui/material';

interface ImportBatchDrawDateChangeConfirmDialogProps {
    open: boolean;
    currentDrawDate?: string;
    nextDrawDate?: string;
    isPending?: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const ImportBatchDrawDateChangeConfirmDialog = ({
    open,
    currentDrawDate,
    nextDrawDate,
    isPending = false,
    onClose,
    onConfirm,
}: ImportBatchDrawDateChangeConfirmDialogProps) => {
    const handleClose = () => {
        if (!isPending) {
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1, pr: 6 }}>
                Xác nhận đổi ngày quay
                <IconButton
                    aria-label="Đóng"
                    onClick={handleClose}
                    disabled={isPending}
                    sx={{ position: 'absolute', right: 12, top: 12 }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Đổi ngày quay từ <strong>{currentDrawDate || '—'}</strong> sang{' '}
                    <strong>{nextDrawDate || '—'}</strong> có thể làm các nhà đài hiện tại không còn
                    hợp lệ theo lịch quay mới.
                </Typography>
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    Thay đổi ngày quay có thể vô hiệu hóa các nhà đài hiện tại và dữ liệu đã nhập
                    liên quan. Các dòng phiếu ở trạng thái Nháp, Đang nhập lô hoặc Đã hủy sẽ bị xóa.
                    Bạn có muốn tiếp tục?
                </Alert>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
                <Button
                    onClick={handleClose}
                    disabled={isPending}
                    color="inherit"
                    variant="outlined"
                    sx={{
                        borderColor: 'divider',
                        '&:hover': { borderColor: 'text.primary', bgcolor: 'transparent' },
                    }}
                >
                    Hủy
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color="warning"
                    disabled={isPending}
                    sx={{ bgcolor: '#212B36', color: '#fff', '&:hover': { bgcolor: '#161C24' } }}
                >
                    {isPending ? 'Đang xử lý...' : 'Tiếp tục'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
