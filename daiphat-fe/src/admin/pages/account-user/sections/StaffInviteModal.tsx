import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    Typography,
    IconButton,
    Box,
    Divider,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import { useInviteStaff } from '../hooks/useAccountUser';
import { AppToast as toast } from "../../../../client/utils/toast.util";
import { RoleEnum } from '../configs/constants';

interface StaffInviteModalProps {
    open: boolean;
    onClose: () => void;
    user: { id: string; fullName: string; email: string } | null;
}

export const StaffInviteModal: React.FC<StaffInviteModalProps> = ({ open, onClose, user }) => {
    const [roleCode, setRoleCode] = useState<string>(RoleEnum.STAFF_SHIPPER);
    const { mutate: inviteStaff, isPending } = useInviteStaff();

    const handleSubmit = () => {
        if (!user) return;
        inviteStaff(
            { id: user.id, roleCode },
            {
                onSuccess: () => {
                    toast.success(`Đã gửi lời mời làm nhân viên cho ${user.fullName} thành công!`);
                    onClose();
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.message || "Không thể gửi lời mời làm nhân viên");
                }
            }
        );
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
                        bgcolor: 'rgba(255, 98, 98, 0.12)',
                        color: '#FF6262'
                    }}>
                        <AssignmentIndIcon />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Mời làm nhân viên</Typography>
                </Stack>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                <Typography variant="body2" sx={{ mb: 3, color: 'var(--palette-text-secondary)', lineHeight: 1.6 }}>
                    Hệ thống sẽ gửi email mời tham gia làm nhân viên cho người dùng <span style={{ fontWeight: 700, color: '#102937' }}>{user?.fullName}</span> ({user?.email}).
                </Typography>

                <Stack spacing={2.5}>
                    <FormControl fullWidth sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                            '&:hover fieldset': {
                                borderColor: '#FF6262',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: '#FF6262',
                            }
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                            color: '#FF6262',
                        }
                    }}>
                        <InputLabel id="role-select-label">Vai trò nhân viên</InputLabel>
                        <Select
                            labelId="role-select-label"
                            value={roleCode}
                            label="Vai trò nhân viên"
                            onChange={(e) => setRoleCode(e.target.value)}
                        >
                            <MenuItem value={RoleEnum.STAFF_SHIPPER}>Nhân viên giao hàng (Shipper)</MenuItem>
                            <MenuItem value={RoleEnum.STAFF_MANAGER}>Quản lý (Staff Manager)</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </DialogContent>

            <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

            <DialogActions sx={{ p: 2.5 }}>
                <Button 
                    onClick={onClose} 
                    disabled={isPending}
                    sx={{ 
                        color: 'var(--palette-text-primary)',
                        fontWeight: 700,
                        px: 3
                    }}
                >
                    Hủy
                </Button>
                <Button 
                    variant="contained" 
                    onClick={handleSubmit}
                    disabled={isPending}
                    sx={{ 
                        bgcolor: '#FF6262',
                        borderRadius: '10px',
                        fontWeight: 700,
                        px: 3,
                        boxShadow: '0 10px 15px -3px rgba(255, 98, 98, 0.26)',
                        '&:hover': {
                            bgcolor: '#ef4444',
                        }
                    }}
                >
                    {isPending ? <CircularProgress size={24} color="inherit" /> : "Gửi lời mời"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
