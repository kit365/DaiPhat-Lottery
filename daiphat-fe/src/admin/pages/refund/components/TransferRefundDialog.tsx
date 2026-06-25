import { useEffect, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from '@mui/material';

interface TransferRefundDialogProps {
    open: boolean;
    loading?: boolean;
    onClose: () => void;
    onConfirm: (data: { transferEvidenceUrl: string; transferNote?: string }) => void;
}

export const TransferRefundDialog = ({ open, loading, onClose, onConfirm }: TransferRefundDialogProps) => {
    const [evidenceUrl, setEvidenceUrl] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (!open) {
            setEvidenceUrl('');
            setNote('');
        }
    }, [open]);

    const handleClose = () => {
        setEvidenceUrl('');
        setNote('');
        onClose();
    };

    const handleConfirm = () => {
        if (!evidenceUrl.trim()) return;
        onConfirm({
            transferEvidenceUrl: evidenceUrl.trim(),
            transferNote: note.trim() || undefined,
        });
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Xác nhận chuyển khoản hoàn tiền</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="URL minh chứng chuyển khoản"
                    fullWidth
                    required
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    inputProps={{ maxLength: 500 }}
                    sx={{ mb: 2 }}
                />
                <TextField
                    margin="dense"
                    label="Ghi chú (tuỳ chọn)"
                    fullWidth
                    multiline
                    minRows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    inputProps={{ maxLength: 500 }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    Hủy
                </Button>
                <Button
                    onClick={handleConfirm}
                    color="primary"
                    variant="contained"
                    disabled={loading || !evidenceUrl.trim()}
                >
                    Xác nhận
                </Button>
            </DialogActions>
        </Dialog>
    );
};
