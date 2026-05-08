import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    Typography,
    IconButton,
    MenuItem,
    Box,
    Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

interface AccountInviteModalProps {
    open: boolean;
    onClose: () => void;
    onInvite: (data: any) => void;
}

const ROLE_OPTIONS = [
    { value: 'STAFF', label: 'Nhân viên' },
    { value: 'MANAGER', label: 'Quản lý' },
    { value: 'ADMIN', label: 'Quản trị viên' },
];

const AccountInviteModal: React.FC<AccountInviteModalProps> = ({ open, onClose, onInvite }) => {
    const [formData, setFormData] = React.useState({
        email: '',
        fullName: '',
        role: 'STAFF'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        onInvite(formData);
        onClose();
        // Reset form
        setFormData({ email: '', fullName: '', role: 'STAFF' });
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
                        bgcolor: 'rgba(0, 167, 111, 0.12)',
                        color: 'var(--palette-primary-main)'
                    }}>
                        <PersonAddIcon />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Mời nhân viên mới</Typography>
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
                <Typography variant="body2" sx={{ mb: 3, color: 'var(--palette-text-secondary)' }}>
                    Lời mời kèm theo hướng dẫn tạo mật khẩu sẽ được gửi đến email của nhân viên.
                </Typography>

                <Stack spacing={2.5}>
                    <TextField
                        fullWidth
                        label="Họ và tên"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="Ví dụ: Nguyễn Văn A"
                        variant="outlined"
                        sx={textFieldStyles}
                    />

                    <TextField
                        fullWidth
                        label="Địa chỉ Email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="email@example.com"
                        variant="outlined"
                        sx={textFieldStyles}
                    />

                    <TextField
                        select
                        fullWidth
                        label="Vai trò"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        variant="outlined"
                        sx={textFieldStyles}
                    >
                        {ROLE_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </Stack>
            </DialogContent>

            <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

            <DialogActions sx={{ p: 2.5 }}>
                <Button 
                    onClick={onClose} 
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
                    sx={{ 
                        bgcolor: 'var(--palette-primary-main)',
                        borderRadius: '10px',
                        fontWeight: 700,
                        px: 3,
                        boxShadow: 'var(--customShadows-primary)',
                        '&:hover': {
                            bgcolor: 'var(--palette-primary-dark)',
                        }
                    }}
                >
                    Gửi lời mời
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const textFieldStyles = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '12px',
        '&:hover fieldset': {
            borderColor: 'var(--palette-primary-main)',
        },
    },
    '& .MuiInputLabel-root.Mui-focused': {
        color: 'var(--palette-primary-main)',
    }
};

export default AccountInviteModal;
