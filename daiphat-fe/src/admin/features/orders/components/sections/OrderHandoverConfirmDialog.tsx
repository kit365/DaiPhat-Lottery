import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    FormControlLabel,
    Checkbox,
    Box,
    Stack,
} from '@mui/material';
import { Icon } from '@iconify/react';

interface OrderHandoverConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

/**
 * Confirmation before PENDING_PICKUP → COMPLETED.
 * Confirm stays disabled until staff acknowledges the customer inspection checklist.
 */
export const OrderHandoverConfirmDialog = ({
    open,
    onClose,
    onConfirm,
}: OrderHandoverConfirmDialogProps) => {
    const [acknowledged, setAcknowledged] = useState(false);

    useEffect(() => {
        if (open) {
            setAcknowledged(false);
        }
    }, [open]);

    const handleConfirm = () => {
        if (!acknowledged) return;
        onConfirm();
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 'var(--shape-borderRadius-lg)',
                    boxShadow: 'var(--customShadows-dialog)',
                },
            }}
        >
            <DialogTitle sx={{ pb: 1.5, pt: 2.5, px: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'var(--palette-warning-lighter)',
                            color: 'var(--palette-warning-dark)',
                            flexShrink: 0,
                        }}
                    >
                        <Icon icon="solar:hand-heart-bold-duotone" width={22} />
                    </Box>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 800,
                            fontSize: '1.05rem',
                            letterSpacing: 0.4,
                            textTransform: 'uppercase',
                            color: 'var(--palette-text-primary)',
                        }}
                    >
                        Xác nhận bàn giao
                    </Typography>
                </Stack>
            </DialogTitle>

            <DialogContent sx={{ px: 3, pb: 1 }}>
                <Typography
                    variant="body2"
                    sx={{
                        color: 'var(--palette-text-secondary)',
                        lineHeight: 1.7,
                        mb: 2.5,
                    }}
                >
                    Yêu cầu khách hàng kiểm tra kỹ số lượng và tình trạng vật lý của vé. Hệ thống{' '}
                    <Box component="span" sx={{ fontWeight: 800, color: 'var(--palette-error-dark)' }}>
                        KHÔNG
                    </Box>{' '}
                    hỗ trợ hoàn tiền hoặc đổi vé sau khi đã hoàn tất bàn giao.
                </Typography>

                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: '12px',
                        border: '1px solid var(--palette-divider)',
                        bgcolor: 'var(--palette-background-neutral)',
                    }}
                >
                    <FormControlLabel
                        sx={{
                            alignItems: 'flex-start',
                            m: 0,
                            gap: 0.5,
                            '& .MuiFormControlLabel-label': { pt: 0.25 },
                        }}
                        control={
                            <Checkbox
                                checked={acknowledged}
                                onChange={(e) => setAcknowledged(e.target.checked)}
                                color="warning"
                                sx={{ pt: 0 }}
                            />
                        }
                        label={
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 600,
                                    color: 'var(--palette-text-primary)',
                                    lineHeight: 1.5,
                                }}
                            >
                                Tôi xác nhận khách hàng đã kiểm tra và đồng ý nhận đủ vé.
                            </Typography>
                        }
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, pt: 2, gap: 1 }}>
                <Button
                    variant="outlined"
                    color="inherit"
                    onClick={onClose}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: '8px',
                        minWidth: 96,
                    }}
                >
                    Hủy
                </Button>
                <Button
                    variant="contained"
                    className="btn-primary-admin"
                    disabled={!acknowledged}
                    onClick={handleConfirm}
                    sx={{ minWidth: 140 }}
                >
                    Xác nhận hoàn thành
                </Button>
            </DialogActions>
        </Dialog>
    );
};
