import React, { useMemo, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Checkbox,
    ListItemText,
    IconButton,
    Typography,
    Box,
    alpha,
    Stack,
    Grid
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Icon } from '@iconify/react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useForm, Controller } from 'react-hook-form';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { useAccounts } from '../../account-admin/hooks/useAccountAdmin';

interface BulkDeleteDialogProps {
    open: boolean;
    onClose: () => void;
    onDelete: (data: any) => void;
    departmentId?: string;
    loading?: boolean;
}

const dialogStyles = {
    "& .MuiDialog-paper": {
        borderRadius: "var(--shape-borderRadius-lg)",
        boxShadow: "var(--customShadows-dialog)",
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden'
    },
    "& .MuiDialogTitle-root": {
        p: '20px 24px',
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider'
    },
    "& .MuiDialogContent-root": {
        p: '24px !important',
        bgcolor: 'var(--palette-background-neutral) !important'
    },
    "& .MuiDialogActions-root": {
        p: '16px 24px',
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
    }
};

export const BulkDeleteDialog: React.FC<BulkDeleteDialogProps> = ({
    open,
    onClose,
    onDelete,
    departmentId,
    loading = false
}) => {
    const accountsRes = useAccounts({ departmentId, status: 'active' });

    const accounts = useMemo(() => {
        if (!accountsRes.data) return [];
        const data = accountsRes.data;
        if (Array.isArray(data.data?.recordList)) return data.data.recordList;
        if (Array.isArray(data.recordList)) return data.recordList;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data)) return data;
        return [];
    }, [accountsRes.data]);

    const { control, handleSubmit, reset, watch } = useForm({
        defaultValues: {
            staffIds: [] as string[],
            startDate: dayjs().startOf('week'),
            endDate: dayjs().endOf('week')
        }
    });

    useEffect(() => {
        if (open) {
            reset({
                staffIds: [],
                startDate: dayjs().startOf('week'),
                endDate: dayjs().endOf('week')
            });
        }
    }, [open, reset]);

    const selectedStaffIds = watch('staffIds') || [];

    const onSubmit = async (data: any) => {
        if (!data.staffIds || data.staffIds.length === 0) {
            toast.error('Vui lòng chọn ít nhất một nhân viên');
            return;
        }
        onDelete({
            staffIds: data.staffIds,
            startDate: data.startDate.format('YYYY-MM-DD'),
            endDate: data.endDate.format('YYYY-MM-DD')
        });
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            sx={dialogStyles}
        >
            <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Icon icon="solar:trash-bin-trash-bold-duotone" width={24} color="var(--palette-error-main)" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Xóa ca làm việc hàng loạt
                    </Typography>
                </Stack>
                <IconButton onClick={onClose} size="small" sx={{ color: 'var(--palette-text-secondary)' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
                    <DialogContent>
                        <Box sx={{ mb: 3, p: 2, bgcolor: alpha('#FF5630', 0.08), borderRadius: "var(--shape-borderRadius-md)", border: '1px solid', borderColor: alpha('#FF5630', 0.16) }}>
                            <Typography variant="body2" sx={{ color: '#B71D18', fontWeight: 600 }}>
                                Lưu ý: Hệ thống sẽ xóa các ca làm việc của nhân viên được chọn trong khoảng thời gian này.
                            </Typography>
                        </Box>

                        <Stack spacing={3}>
                            <Controller
                                name="staffIds"
                                control={control}
                                rules={{ required: 'Vui lòng chọn ít nhất một nhân viên' }}
                                render={({ field, fieldState: { error } }) => (
                                    <TextField
                                        {...field}
                                        select
                                        fullWidth
                                        label="Nhân viên"
                                        placeholder="Chọn nhân viên"
                                        error={!!error}
                                        helperText={error?.message}
                                        onChange={(e) => {
                                            const { value } = e.target;
                                            // Handle "Select All"
                                            if (Array.isArray(value) && value[value.length - 1] === 'all') {
                                                if (selectedStaffIds.length === accounts.length && accounts.length > 0) {
                                                    field.onChange([]);
                                                } else {
                                                    field.onChange(accounts.map((a: any) => a._id));
                                                }
                                                return;
                                            }
                                            field.onChange(value);
                                        }}
                                        SelectProps={{
                                            multiple: true,
                                            renderValue: (selected: any) => {
                                                const s = selected || [];
                                                if (s.length === (accounts?.length || 0) && (accounts?.length || 0) > 0) return 'Tất cả nhân viên';
                                                return (accounts || [])
                                                    .filter((a: any) => s.includes(a._id))
                                                    .map((a: any) => a.fullName)
                                                    .join(', ');
                                            }
                                        }}
                                        sx={{
                                            bgcolor: "var(--palette-background-paper)",
                                            borderRadius: "var(--shape-borderRadius)",
                                            '& .MuiInputBase-root': { height: '56px' }
                                        }}
                                    >
                                        <MenuItem value="all">
                                            <Checkbox
                                                checked={selectedStaffIds.length === (accounts?.length || 0) && (accounts?.length || 0) > 0}
                                                indeterminate={selectedStaffIds.length > 0 && selectedStaffIds.length < (accounts?.length || 0)}
                                            />
                                            <ListItemText primary="Chọn tất cả nhân viên" sx={{ '& .MuiTypography-root': { fontWeight: 700 } }} />
                                        </MenuItem>
                                        {(accounts || []).map((account: any) => (
                                            <MenuItem key={account._id} value={account._id}>
                                                <Checkbox checked={selectedStaffIds.indexOf(account._id) > -1} />
                                                <ListItemText primary={account.fullName} secondary={account.email} />
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />

                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Controller
                                        name="startDate"
                                        control={control}
                                        render={({ field }) => (
                                            <DatePicker
                                                {...field}
                                                label="Từ ngày"
                                                slotProps={{
                                                    textField: {
                                                        fullWidth: true,
                                                        sx: {
                                                            bgcolor: "var(--palette-background-paper)",
                                                            borderRadius: "var(--shape-borderRadius)"
                                                        }
                                                    }
                                                }}
                                            />
                                        )}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Controller
                                        name="endDate"
                                        control={control}
                                        render={({ field }) => (
                                            <DatePicker
                                                {...field}
                                                label="Đến ngày"
                                                slotProps={{
                                                    textField: {
                                                        fullWidth: true,
                                                        sx: {
                                                            bgcolor: "var(--palette-background-paper)",
                                                            borderRadius: "var(--shape-borderRadius)"
                                                        }
                                                    }
                                                }}
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </Stack>
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
                            }}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={loading}
                            sx={{
                                borderRadius: "var(--shape-borderRadius)",
                                textTransform: 'none',
                                fontWeight: 700,
                                padding: '8px 20px',
                                bgcolor: '#FF5630',
                                boxShadow: 'none',
                                color: 'white',
                                '&:hover': {
                                    bgcolor: '#B71D18',
                                }
                            }}
                        >
                            {loading ? 'Đang xóa...' : 'Xác nhận xóa'}
                        </Button>
                    </DialogActions>
                </LocalizationProvider>
            </form>
        </Dialog>
    );
};

