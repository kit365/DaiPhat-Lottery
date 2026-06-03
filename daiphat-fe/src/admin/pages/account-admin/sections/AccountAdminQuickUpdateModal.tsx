import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    TextField,
    MenuItem,
    CircularProgress,
    IconButton,
    Grid,
    Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAccountDetail, useUpdateAccount } from '../hooks/useAccountAdmin';
import { useRoles } from '../../role/hooks/useRole';
import { toast } from 'react-toastify';
import { useUserStatuses } from '../../account-user/hooks/useAccountUser';

interface AccountAdminQuickUpdateModalProps {
    open: boolean;
    onClose: () => void;
    id: string | null;
}

export const AccountAdminQuickUpdateModal = ({ open, onClose, id }: AccountAdminQuickUpdateModalProps) => {
    const { data: account, isLoading } = useAccountDetail(id || undefined);
    const { mutate: update, isPending } = useUpdateAccount();
    const { data: roles = [] } = useRoles();
    const { data: statuses = [] } = useUserStatuses();

    const [formValues, setFormValues] = useState({
        status: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        roles: [] as string[],
    });

    useEffect(() => {
        if (account) {
            setFormValues({
                status: account.status || 'ACTIVE',
                firstName: account.firstName || '',
                lastName: account.lastName || '',
                email: account.email || '',
                phone: account.phone || '',
                roles: account.role ? [account.role.code] : [],
            });
        }
    }, [account, open]);

    const handleInputChange = (field: string, value: any) => {
        setFormValues(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        if (!formValues.firstName.trim()) {
            toast.error("Vui lòng nhập tên");
            return;
        }
        if (!formValues.lastName.trim()) {
            toast.error("Vui lòng nhập họ");
            return;
        }
        if (!formValues.email.trim()) {
            toast.error("Vui lòng nhập email");
            return;
        }
        if (formValues.roles.length === 0) {
            toast.error("Vui lòng chọn ít nhất một vai trò");
            return;
        }

        update({ id, data: formValues }, {
            onSuccess: () => {
                toast.success("Cập nhật quản trị viên thành công!");
                onClose();
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Cập nhật thất bại");
            }
        });
    };

    const getStatusMessage = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'Tài khoản đang chờ xác nhận';
            case 'BANNED':
                return 'Tài khoản đang bị cấm';
            case 'LOCKED':
                return 'Tài khoản đang bị khóa';
            default:
                return 'Tài khoản đang hoạt động bình thường';
        }
    };

    const getAlertSeverity = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'info';
            case 'BANNED':
            case 'LOCKED':
                return 'warning';
            default:
                return 'success';
        }
    };

    if (!open) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    boxShadow: 'var(--customShadows-dialog, 0px 24px 48px -8px rgba(0, 0, 0, 0.16))',
                    p: 1
                }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                    Quick update
                </Typography>
                <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ border: 'none', px: 3, py: 1 }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                        <Alert
                            icon={<InfoOutlinedIcon fontSize="inherit" />}
                            severity={getAlertSeverity(formValues.status)}
                            sx={{
                                mb: 3,
                                borderRadius: '12px',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                '& .MuiAlert-icon': {
                                    mr: 1
                                }
                            }}
                        >
                            {getStatusMessage(formValues.status)}
                        </Alert>

                        <Grid container spacing={2.5}>
                            <Grid item xs={12}>
                                <TextField
                                    select
                                    label="Status"
                                    fullWidth
                                    value={formValues.status}
                                    onChange={(e) => handleInputChange('status', e.target.value)}
                                >
                                    {statuses
                                        .filter((status) => status.value !== 'DELETED')
                                        .map((status) => (
                                            <MenuItem key={status.value} value={status.value} sx={{ fontSize: '0.875rem' }}>
                                                {status.label}
                                            </MenuItem>
                                        ))
                                    }
                                </TextField>
                            </Grid>

                            <Grid item xs={6}>
                                <TextField
                                    label="Họ"
                                    fullWidth
                                    value={formValues.lastName}
                                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                                />
                            </Grid>

                            <Grid item xs={6}>
                                <TextField
                                    label="Tên"
                                    fullWidth
                                    value={formValues.firstName}
                                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                                />
                            </Grid>

                            <Grid item xs={6}>
                                <TextField
                                    label="Địa chỉ email"
                                    fullWidth
                                    value={formValues.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                />
                            </Grid>

                            <Grid item xs={6}>
                                <TextField
                                    label="Số điện thoại"
                                    fullWidth
                                    value={formValues.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    select
                                    label="Vai trò"
                                    fullWidth
                                    SelectProps={{
                                        multiple: true,
                                        value: formValues.roles,
                                        onChange: (e) => handleInputChange('roles', e.target.value),
                                        renderValue: (selected: any) => {
                                            return roles
                                                .filter((r: any) => selected.includes(r.code))
                                                .map((r: any) => r.name)
                                                .join(', ');
                                        }
                                    }}
                                >
                                    {roles.map((role: any) => (
                                        <MenuItem key={role.code} value={role.code} sx={{ fontSize: '0.875rem' }}>
                                            {role.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 3, justifyContent: 'flex-end', gap: 1.5 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        px: 3,
                        py: 1,
                        borderColor: 'var(--palette-text-disabled)33',
                        color: 'var(--palette-text-primary)',
                        '&:hover': {
                            borderColor: 'var(--palette-text-primary)',
                            bgcolor: 'rgba(0, 0, 0, 0.04)'
                        }
                    }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={isPending || isLoading}
                    sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        px: 3,
                        py: 1,
                        bgcolor: 'var(--palette-text-primary, #1C252E)',
                        color: 'var(--palette-common-white, #FFFFFF)',
                        '&:hover': {
                            bgcolor: 'rgba(28, 37, 46, 0.8)'
                        }
                    }}
                >
                    {isPending ? <CircularProgress size={20} color="inherit" /> : "Update"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
