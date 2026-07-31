import { useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Grid,
    IconButton,
    Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useAccounts } from '../../../features/users/hooks/useUsers';
import CloseIcon from '@mui/icons-material/Close';
import { dialogStyles } from '../configs/styles.config';

interface DepartmentDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    selectedItem?: any;
}

export const DepartmentDialog = ({
    open,
    onClose,
    onSave,
    selectedItem,
}: DepartmentDialogProps) => {
    const accountsRes = useAccounts();
    const accounts = useMemo(() => {
        if (!accountsRes.data) return [];
        const data: any = accountsRes.data;
        return Array.isArray(data.recordList)
            ? data.recordList
            : (Array.isArray(data.data?.recordList) ? data.data.recordList : (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])));
    }, [accountsRes.data]);

    const { control, handleSubmit, reset } = useForm({
        defaultValues: {
            name: '',
            managerId: '',
            description: '',
            status: 'active',
        }
    });

    useEffect(() => {
        if (selectedItem) {
            reset({
                name: selectedItem.name || '',
                managerId: selectedItem.managerId?._id || '',
                description: selectedItem.description || '',
                status: selectedItem.status || 'active',
            });
        } else {
            reset({
                name: '',
                managerId: '',
                description: '',
                status: 'active',
            });
        }
    }, [selectedItem, reset, open]);

    const onSubmit = (data: any) => {
        onSave(data);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            sx={dialogStyles}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {selectedItem ? 'Chỉnh sửa phòng ban' : 'Thêm phòng ban mới'}
                </Typography>
                <IconButton onClick={onClose} size="small" sx={{ color: 'var(--palette-text-secondary)' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent sx={{ bgcolor: 'var(--palette-background-neutral) !important', py: '24px !important' }}>
                    <Grid container spacing={2.5}>
                        <Grid size={{ xs: 12 }}>
                            <Controller
                                name="name"
                                control={control}
                                rules={{ required: 'Bắt buộc' }}
                                render={({ field, fieldState: { error } }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Tên phòng ban"
                                        error={!!error}
                                        helperText={error?.message}
                                        sx={{ bgcolor: "var(--palette-background-paper)", borderRadius: "var(--shape-borderRadius)" }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Controller
                                name="managerId"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        select
                                        fullWidth
                                        label="Người quản lý"
                                        sx={{ bgcolor: "var(--palette-background-paper)", borderRadius: "var(--shape-borderRadius)" }}
                                    >
                                        <MenuItem value=""><em>Chưa có</em></MenuItem>
                                        {accounts.map((account: any) => (
                                            <MenuItem key={account._id} value={account._id}>
                                                {account.fullName}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Controller
                                name="status"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        select
                                        fullWidth
                                        label="Trạng thái"
                                        sx={{ bgcolor: "var(--palette-background-paper)", borderRadius: "var(--shape-borderRadius)" }}
                                    >
                                        <MenuItem value="active">Hoạt động</MenuItem>
                                        <MenuItem value="inactive">Ngừng hoạt động</MenuItem>
                                    </TextField>
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        multiline
                                        rows={3}
                                        label="Mô tả"
                                        sx={{ bgcolor: "var(--palette-background-paper)", borderRadius: "var(--shape-borderRadius)" }}
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: '16px 24px', gap: 1.5 }}>
                    <Button
                        onClick={onClose}
                        variant="outlined"
                        sx={{
                            borderRadius: "var(--shape-borderRadius)",
                            textTransform: 'none',
                            fontWeight: 700,
                            padding: '8px 20px',
                            color: 'var(--palette-text-primary)',
                            borderColor: 'rgba(145, 158, 171, 0.32)',
                            '&:hover': {
                                bgcolor: 'rgba(145, 158, 171, 0.08)',
                                borderColor: 'var(--palette-text-primary)',
                            }
                        }}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        sx={{
                            borderRadius: "var(--shape-borderRadius)",
                            textTransform: 'none',
                            fontWeight: 700,
                            padding: '8px 20px',
                            bgcolor: 'var(--palette-text-primary)',
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: "var(--palette-grey-700)",
                                boxShadow: "var(--customShadows-z8)",
                            }
                        }}
                    >
                        {selectedItem ? 'Cập nhật' : 'Thêm mới'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
