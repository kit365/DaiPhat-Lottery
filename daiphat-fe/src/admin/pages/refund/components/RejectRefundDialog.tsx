import { useEffect, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from '@mui/material';

interface RejectRefundDialogProps {
    open: boolean;
    loading?: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

export const RejectRefundDialog = ({ open, loading, onClose, onConfirm }: RejectRefundDialogProps) => {
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (!open) setReason('');
    }, [open]);

    const handleClose = () => {
        setReason('');
        onClose();
    };

    const handleConfirm = () => {
        if (!reason.trim()) return;
        onConfirm(reason.trim());
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Từ chối yêu cầu hoàn tiền</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Lý do từ chối"
                    fullWidth
                    required
                    multiline
                    minRows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    inputProps={{ maxLength: 500 }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    Hủy
                </Button>
                <Button
                    onClick={handleConfirm}
                    color="error"
                    variant="contained"
                    disabled={loading || !reason.trim()}
                >
                    Từ chối
                </Button>
            </DialogActions>
        </Dialog>
    );
};
