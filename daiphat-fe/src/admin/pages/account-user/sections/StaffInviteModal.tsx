import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Stack,
    IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import { AppToast as toast } from '../../../../utils/toast.util';

interface StaffInviteModalProps {
    open: boolean;
    onClose: () => void;
    user: { id: string; fullName: string; email: string } | null;
}

export const StaffInviteModal = ({ open, onClose, user }: StaffInviteModalProps) => {
    const handleInvite = () => {
        // Mock success
        toast.success(`Đã gửi lời mời làm nhân viên đến ${user?.email}`);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            fullWidth
            maxWidth="xs"
            PaperProps={{
                sx: {
                    borderRadius: '20px',
                    p: 1,
                    boxShadow: 'var(--customShadows-z24)'
                }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        bgcolor: 'rgba(255, 171, 0, 0.12)',
                        color: 'var(--palette-warning-main)'
                    }}>
                        <SupervisorAccountIcon />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Mời làm nhân viên</Typography>
                </Stack>
                <IconButton aria-label="close" onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ mt: 1, textAlign: 'center' }}>
                    <Typography variant="body1" sx={{ color: 'var(--palette-text-secondary)', mb: 2 }}>
                        Bạn có chắc chắn muốn gửi lời mời nâng cấp quyền nhân viên cho tài khoản này?
                    </Typography>
                    {user && (
                        <Box sx={{ p: 2, bgcolor: 'var(--palette-background-neutral)', borderRadius: '12px' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{user.fullName}</Typography>
                            <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)' }}>{user.email}</Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2.5 }}>
                <Button onClick={onClose} sx={{ color: 'var(--palette-text-primary)', fontWeight: 700, px: 3 }}>
                    Hủy
                </Button>
                <Button 
                    variant="contained" 
                    onClick={handleInvite}
                    sx={{ 
                        bgcolor: 'var(--palette-warning-main)',
                        color: 'var(--palette-grey-800)',
                        borderRadius: '10px',
                        fontWeight: 700,
                        px: 3,
                        boxShadow: 'var(--customShadows-warning)',
                        '&:hover': {
                            bgcolor: 'var(--palette-warning-dark)',
                        }
                    }}
                >
                    Gửi lời mời
                </Button>
            </DialogActions>
        </Dialog>
    );
};
