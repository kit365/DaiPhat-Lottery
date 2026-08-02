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
    Checkbox,
    ListItemText,
    alpha,
    Box,
    Stack,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { useShifts } from '../hooks/useShifts';
import { useAccounts } from '../../../features/users/hooks/useUsers';
import { useSchedules } from '../hooks/useSchedules';
import { useRoles } from '../../../features/role/hooks/useRole';
import CloseIcon from '@mui/icons-material/Close';
import { dialogStyles } from '../configs/styles.config';
import { Icon } from '@iconify/react';

interface BulkScheduleDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    departmentId?: string;
    loading?: boolean;
}

export const BulkScheduleDialog = ({
    open,
    onClose,
    onSave,
    departmentId,
    loading = false,
}: BulkScheduleDialogProps) => {
    const accountsRes = useAccounts({ departmentId, status: 'active' } as any);
    const shiftsRes = useShifts({ departmentId, status: 'active' });
    const { data: rolesRes } = useRoles();

    const accounts = useMemo(() => {
        if (!accountsRes.data) return [];
        const data = accountsRes.data as any;
        if (Array.isArray(data.data?.recordList)) return data.data.recordList;
        if (Array.isArray(data.recordList)) return data.recordList;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data)) return data;
        return [];
    }, [accountsRes.data]);

    const shifts = useMemo(() => {
        if (!shiftsRes.data) return [];
        const data = shiftsRes.data as any;
        if (Array.isArray(data.data?.recordList)) return data.data.recordList;
        if (Array.isArray(data.recordList)) return data.recordList;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data)) return data;
        return [];
    }, [shiftsRes.data]);

    const roles = useMemo(() => {
        if (!rolesRes) return [];
        const data = rolesRes as any;
        if (Array.isArray(data.recordList)) return data.recordList;
        if (Array.isArray(data.data?.recordList)) return data.data.recordList;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data)) return data;
        return [];
    }, [rolesRes]);

    const filteredAccounts = accounts;
    const filteredShifts = shifts;

    const { control, handleSubmit, reset, watch } = useForm({
        defaultValues: {
            staffIds: [] as string[],
            shiftId: '',
            startDate: dayjs(),
            endDate: dayjs().add(6, 'day'),
            overwrite: false,
        }
    });

    const watchStartDate = watch('startDate');
    const watchEndDate = watch('endDate');
    const watchOverwrite = watch('overwrite');
    const watchShiftId = watch('shiftId');
    const watchStaffIds = watch('staffIds') || [];

    const { data: schedulesRes } = useSchedules({
        startDate: watchStartDate?.format('YYYY-MM-DD'),
        endDate: watchEndDate?.format('YYYY-MM-DD'),
        departmentId,
        noLimit: true
    });

    const busyStaffIds = useMemo(() => {
        const payload = schedulesRes?.data as any;
        const data = payload?.data || payload;
        const records = Array.isArray(data?.recordList)
            ? data.recordList
            : (Array.isArray(data) ? data : []);
        return [...new Set(records.map((s: any) => s.staffId?._id || s.staffId))];
    }, [schedulesRes]);

    const staffingStatus = null;
    const isExcessive = false;

    useEffect(() => {
        if (open) {
            reset({
                staffIds: [],
                shiftId: '',
                startDate: dayjs(),
                endDate: dayjs().add(6, 'day'),
                overwrite: false,
            });
        }
    }, [open, reset]);

    const onSubmit = (data: any) => {
        const selectedShift = shifts.find((s: any) => s._id === data.shiftId);
        onSave({
            ...data,
            departmentId: selectedShift?.departmentId || departmentId || null,
            startDate: data.startDate.toDate(),
            endDate: data.endDate.toDate(),
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
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Phân ca hàng loạt
                </Typography>
                <IconButton onClick={onClose} size="small" sx={{ color: 'var(--palette-text-secondary)' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogContent sx={{ bgcolor: 'var(--palette-background-neutral) !important', py: '24px !important' }}>
                        <Grid container spacing={2.5}>
                            <Grid size={{ xs: 12 }}>
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
                                            error={!!error}
                                            helperText={error?.message}
                                            onChange={(e) => {
                                                const { value } = e.target;
                                                const currentVal = Array.isArray(value) ? value : [];

                                                if (currentVal[currentVal.length - 1] === 'all') {
                                                    if (field.value.length === filteredAccounts.length && filteredAccounts.length > 0) {
                                                        field.onChange([]);
                                                    } else {
                                                        field.onChange(filteredAccounts.map((a: any) => a._id));
                                                    }
                                                    return;
                                                }
                                                field.onChange(value);
                                            }}
                                            SelectProps={{
                                                multiple: true,
                                                renderValue: (selected: any) =>
                                                    filteredAccounts
                                                        .filter((a: any) => selected.includes(a._id))
                                                        .map((a: any) => a.fullName)
                                                        .join(', ')
                                            }}
                                            sx={{ bgcolor: "var(--palette-background-paper)", borderRadius: "var(--shape-borderRadius)" }}
                                        >
                                            <MenuItem value="all">
                                                <Checkbox checked={field.value.length === filteredAccounts.length && filteredAccounts.length > 0} />
                                                <ListItemText primary="Chọn tất cả nhân viên" sx={{ fontWeight: 'bold' }} />
                                            </MenuItem>
                                            {filteredAccounts.map((account: any) => {
                                                const isBusy = busyStaffIds.includes(account._id);
                                                const disabled = isBusy && !watchOverwrite;

                                                return (
                                                    <MenuItem
                                                        key={account._id}
                                                        value={account._id}
                                                        disabled={disabled}
                                                        sx={{
                                                            opacity: disabled ? 0.6 : 1,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between'
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <Checkbox checked={field.value.indexOf(account._id) > -1} />
                                                            <ListItemText
                                                                primary={account.fullName}
                                                                secondary={`${account.email} ${account.rolesName?.length ? `• ${account.rolesName.join(', ')}` : ''}`}
                                                                secondaryTypographyProps={{ variant: 'caption', sx: { color: 'text.disabled', fontWeight: 600 } }}
                                                            />
                                                        </Box>
                                                        {isBusy && (
                                                            <Typography variant="caption" sx={{ color: 'var(--palette-error-main)', fontWeight: 700, ml: 1 }}>
                                                                Bận {watchOverwrite ? '(Có thể ghi đè)' : ''}
                                                            </Typography>
                                                        )}
                                                    </MenuItem>
                                                );
                                            })}
                                            {filteredAccounts.length === 0 && (
                                                <MenuItem disabled>Không có nhân viên trong phòng ban này</MenuItem>
                                            )}
                                        </TextField>
                                    )}
                                />
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="shiftId"
                                    control={control}
                                    rules={{ required: 'Vui lòng chọn ca làm việc' }}
                                    render={({ field, fieldState: { error } }) => {
                                        return (
                                            <TextField
                                                {...field}
                                                select
                                                fullWidth
                                                label="Ca làm việc"
                                                error={!!error}
                                                helperText={error?.message}
                                                sx={{ bgcolor: "var(--palette-background-paper)", borderRadius: "var(--shape-borderRadius)" }}
                                            >
                                                {filteredShifts.map((shift: any) => (
                                                    <MenuItem key={shift._id} value={shift._id}>
                                                        {shift.name} ({shift.startTime} - {shift.endTime})
                                                    </MenuItem>
                                                ))}
                                                {filteredShifts.length === 0 && (
                                                    <MenuItem disabled>Không có ca phù hợp cho phòng ban này</MenuItem>
                                                )}
                                            </TextField>
                                        );
                                    }}
                                />
                            </Grid>

                            {staffingStatus && (
                                <Grid size={{ xs: 12 }}>
                                    <Box sx={{
                                        p: 2,
                                        bgcolor: alpha(isExcessive ? '#FFAB00' : '#00A76F', 0.08),
                                        borderRadius: "var(--shape-borderRadius-md)",
                                        border: '1px solid',
                                        borderColor: alpha(isExcessive ? '#FFAB00' : '#00A76F', 0.24)
                                    }}>
                                        <Stack spacing={1.5}>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: isExcessive ? '#B76E00' : '#118D57' }}>
                                                <Icon icon={isExcessive ? "solar:info-circle-bold-duotone" : "solar:check-circle-bold-duotone"} width={20} />
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                    {isExcessive ? 'Định mức nhân sự: Dư người hoặc đã đủ' : 'Định mức nhân sự: Đang thiếu'}
                                                    {isExcessive && " (Vượt quá TicketServiceOrder Config)"}
                                                </Typography>
                                            </Stack>
                                            <Stack spacing={0.75}>
                                                {(staffingStatus as any[]).map((s: any, idx: number) => (
                                                    <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                            {s.roleName}:
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ fontWeight: 700, color: s.isExcess ? '#FF5630' : 'text.primary' }}>
                                                            {s.totalAvg} / {s.required} (Hiện có {s.currentAvg}{s.newlyAdded > 0 ? `, thêm ${s.newlyAdded}` : ''})
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </Stack>
                                            {isExcessive && (
                                                <Typography variant="caption" sx={{ color: '#B76E00', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    * Lưu ý: Bạn đang phân công nhiều hơn số lượng tối thiểu trong cấu hình.
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Box>
                                </Grid>
                            )}

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
                                                    sx: {
                                                        width: '100%',
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
                                                    sx: {
                                                        width: '100%',
                                                        bgcolor: "var(--palette-background-paper)",
                                                        borderRadius: "var(--shape-borderRadius)"
                                                    }
                                                }
                                            }}
                                        />
                                    )}
                                />
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="overwrite"
                                    control={control}
                                    render={({ field }) => (
                                        <Box
                                            onClick={() => field.onChange(!field.value)}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                p: 1.5,
                                                bgcolor: field.value ? alpha('#FFAB00', 0.08) : 'transparent',
                                                borderRadius: "var(--shape-borderRadius-md)",
                                                border: '1px solid',
                                                borderColor: field.value ? '#FFAB00' : alpha('#919EAB', 0.2),
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Checkbox
                                                {...field}
                                                checked={field.value}
                                                sx={{ p: 0, color: '#FFAB00', '&.Mui-checked': { color: '#FFAB00' } }}
                                            />
                                            <Box>
                                                <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: field.value ? '#B76E00' : 'var(--palette-text-primary)' }}>
                                                    Ghi đè lịch cũ
                                                </Typography>
                                                <Typography sx={{ fontSize: '0.75rem', color: field.value ? '#B76E00' : 'var(--palette-text-secondary)' }}>
                                                    Nếu nhân viên đã có lịch trong tầm ngày này, hệ thống sẽ tự động đổi sang ca mới.
                                                </Typography>
                                            </Box>
                                        </Box>
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
                            disabled={loading}
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
                            {loading ? 'Hệ thống đang xử lý...' : 'Xác nhận phân ca'}
                        </Button>
                    </DialogActions>
                </form>
            </LocalizationProvider>
        </Dialog>
    );
};



