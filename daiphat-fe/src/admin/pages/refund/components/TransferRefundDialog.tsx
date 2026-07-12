import { useEffect, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
} from '@mui/material';
import { UploadSingleFile } from '../../../components/upload/UploadSingleFile';
import { refundAdminApi } from '../../../api/refund.api';

interface TransferRefundDialogProps {
    open: boolean;
    loading?: boolean;
    onClose: () => void;
    onConfirm: (data: { paymentEvidenceUrl: string; note?: string }) => void;
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
            paymentEvidenceUrl: evidenceUrl.trim(),
            note: note.trim() || undefined,
        });
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Xác nhận chuyển khoản hoàn tiền</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Tải ảnh chụp màn hình hoặc biên lai chuyển khoản làm minh chứng.
                </Typography>
                <UploadSingleFile
                    value={evidenceUrl}
                    onChange={setEvidenceUrl}
                    customUpload={refundAdminApi.uploadTransferEvidence}
                    disabled={loading}
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
                    sx={{ mt: 2 }}
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
