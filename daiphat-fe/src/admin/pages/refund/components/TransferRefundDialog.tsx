import { useEffect, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormHelperText,
    Typography,
} from '@mui/material';
import { UploadSingleFile } from '../../../components/upload/UploadSingleFile';
import { refundAdminApi } from '../../../api/refund.api';

interface TransferRefundDialogProps {
    open: boolean;
    loading?: boolean;
    onClose: () => void;
    onConfirm: (data: { paymentEvidenceUrl: string }) => void;
}

export const TransferRefundDialog = ({ open, loading, onClose, onConfirm }: TransferRefundDialogProps) => {
    const [evidenceUrl, setEvidenceUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [showRequiredHint, setShowRequiredHint] = useState(false);

    useEffect(() => {
        if (!open) {
            setEvidenceUrl('');
            setIsUploading(false);
            setShowRequiredHint(false);
        }
    }, [open]);

    const hasUploadedEvidence = Boolean(evidenceUrl.trim());
    const canConfirm = hasUploadedEvidence && !isUploading && !loading;

    const handleClose = () => {
        setEvidenceUrl('');
        setIsUploading(false);
        setShowRequiredHint(false);
        onClose();
    };

    const handleConfirm = () => {
        if (!hasUploadedEvidence || isUploading || loading) {
            setShowRequiredHint(true);
            return;
        }
        onConfirm({
            paymentEvidenceUrl: evidenceUrl.trim(),
        });
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Xác nhận chuyển khoản hoàn tiền</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Tải ảnh chụp màn hình hoặc biên lai chuyển khoản làm minh chứng. Bắt buộc phải tải ảnh
                    thành công trước khi xác nhận.
                </Typography>
                <UploadSingleFile
                    label="Ảnh biên lai chuyển khoản"
                    required
                    value={evidenceUrl}
                    onChange={(url) => {
                        setEvidenceUrl(typeof url === 'string' ? url : '');
                        if (typeof url === 'string' && url.trim()) {
                            setShowRequiredHint(false);
                        }
                    }}
                    customUpload={refundAdminApi.uploadTransferEvidence}
                    autoUpload
                    onUploadingChange={setIsUploading}
                    disabled={loading}
                    error={
                        showRequiredHint && !hasUploadedEvidence
                            ? 'Vui lòng tải ảnh biên lai trước khi xác nhận'
                            : undefined
                    }
                />
                {!hasUploadedEvidence && !isUploading && (
                    <FormHelperText sx={{ mt: 1 }}>
                        Chưa có ảnh biên lai — nút Xác nhận sẽ bị khóa.
                    </FormHelperText>
                )}
                {isUploading && (
                    <FormHelperText sx={{ mt: 1 }}>Đang tải ảnh biên lai lên hệ thống...</FormHelperText>
                )}
                {hasUploadedEvidence && (
                    <FormHelperText sx={{ mt: 1, color: 'success.main' }}>
                        Đã tải ảnh biên lai thành công.
                    </FormHelperText>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading || isUploading}>
                    Hủy
                </Button>
                <Button
                    onClick={handleConfirm}
                    color="primary"
                    variant="contained"
                    disabled={!canConfirm}
                >
                    {loading ? 'Đang xác nhận...' : 'Xác nhận'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
