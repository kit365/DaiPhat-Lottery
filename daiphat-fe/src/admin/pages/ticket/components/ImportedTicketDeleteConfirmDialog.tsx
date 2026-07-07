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

interface ImportedTicketDeleteConfirmDialogProps {
    open: boolean;
    ticketNumbers?: string;
    isPending?: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const ImportedTicketDeleteConfirmDialog = ({
    open,
    ticketNumbers,
    isPending = false,
    onClose,
    onConfirm,
}: ImportedTicketDeleteConfirmDialogProps) => {
    const handleClose = () => {
        if (!isPending) {
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1, pr: 6 }}>
                Xác nhận xóa dãy số đã nhập
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
                    {ticketNumbers
                        ? `Dãy số "${ticketNumbers}" và toàn bộ số sê-ri liên quan sẽ bị xóa vĩnh viễn khỏi dòng phiếu nhập.`
                        : 'Dãy số này và toàn bộ số sê-ri liên quan sẽ bị xóa vĩnh viễn khỏi dòng phiếu nhập.'}
                </Typography>
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    Hành động này không thể hoàn tác. Vui lòng xác nhận nếu bạn chắc chắn muốn tiếp tục.
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
                    color="error"
                    disabled={isPending}
                >
                    {isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
