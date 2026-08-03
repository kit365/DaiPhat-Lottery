"use client";

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
    Box,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useShifts } from '../hooks/useShifts';
import { useAccounts } from '../../../features/users/hooks/useUsers';
import { useSchedules } from '../hooks/useSchedules';
import CloseIcon from '@mui/icons-material/Close';
import { dialogStyles } from '../configs/styles.config';

interface ScheduleEventDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    onDelete?: (id: string) => void;
    selectedEvent?: any;
    selectedDate?: Date;
    departmentId?: string;
    loading?: boolean;
}

export const ScheduleEventDialog = ({
    open,
    onClose,
    onSave,
    onDelete,
    selectedEvent,
    selectedDate,
    departmentId,
    loading = false,
}: ScheduleEventDialogProps) => {
    const accountsRes = useAccounts({ departmentId, status: 'active' } as any);
    const shiftsRes = useShifts({ departmentId, status: 'active' });

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

    const filteredAccounts = accounts;
    const filteredShifts = shifts;

    const { control, handleSubmit, reset, watch } = useForm({
        defaultValues: {
            staffId: '',
            shiftId: '',
            date: dayjs(),
            notes: '',
        }
    });

    const watchDate = watch('date');
    const { data: schedulesRes } = useSchedules({
        date: watchDate?.format('YYYY-MM-DD'),
        departmentId
    });
    const busyStaffIds = useMemo(() => {
        const data = schedulesRes?.data;
        const records = Array.isArray(data?.recordList)
            ? data.recordList
            : (Array.isArray(data) ? data : []);
        return records.map((s: any) => s.staffId?._id || s.staffId);
    }, [schedulesRes]);

    useEffect(() => {
        if (selectedEvent) {
            reset({
                staffId: selectedEvent.extendedProps?.staffId || '',
                shiftId: selectedEvent.extendedProps?.shiftId || '',
                date: dayjs(selectedEvent.start),
                notes: selectedEvent.extendedProps?.notes || '',
            });
        } else if (selectedDate) {
            reset({
                staffId: '',
                shiftId: '',
                date: dayjs(selectedDate),
                notes: '',
            });
        } else {
            reset({
                staffId: '',
                shiftId: '',
                date: dayjs(),
                notes: '',
            });
        }
    }, [selectedEvent, selectedDate, reset, open]);

    const onSubmit = (data: any) => {
        const selectedShift = shifts.find((s: any) => s._id === data.shiftId);
        onSave({
            ...data,
            date: data.date.toDate(),
            departmentId: selectedShift?.departmentId || departmentId || null,
            id: selectedEvent?.id,
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
                    {selectedEvent ? 'Chỉnh sửa lịch làm việc' : 'Phân ca làm việc mới'}
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
                                    name="staffId"
                                    control={control}
                                    rules={{ required: 'Vui lòng chọn nhân viên' }}
                                    render={({ field, fieldState: { error } }) => (
                                        <TextField
                                            {...field}
                                            select
                                            fullWidth
                                            label="Nhân viên"
                                            error={!!error}
                                            helperText={error?.message}
                                            sx={{ bgcolor: "var(--palette-background-paper)", borderRadius: "var(--shape-borderRadius)" }}
                                        >
                                            {filteredAccounts.map((account: any) => {
                                                const isBusy = busyStaffIds.includes(account._id) && account._id !== selectedEvent?.extendedProps?.staffId;
                                                return (
                                                    <MenuItem
                                                        key={account._id}
                                                        value={account._id}
                                                        disabled={isBusy}
                                                        sx={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            opacity: isBusy ? 0.6 : 1
                                                        }}
                                                    >
                                                        <Box>
                                                            {account.fullName} ({account.email})
                                                        </Box>
                                                        {isBusy && (
                                                            <Typography variant="caption" sx={{ color: 'var(--palette-error-main)', fontWeight: 600 }}>
                                                                Bận
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

                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="date"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            {...field}
                                            label="Ngày làm việc"
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                    sx: { bgcolor: "var(--palette-background-paper)", borderRadius: "var(--shape-borderRadius)" }
                                                }
                                            }}
                                        />
                                    )}
                                />
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="notes"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            multiline
                                            rows={3}
                                            label="Ghi chú"
                                            sx={{ bgcolor: "var(--palette-background-paper)", borderRadius: "var(--shape-borderRadius)" }}
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: '16px 24px', gap: 1.5 }}>
                        {selectedEvent && (
                            <Button
                                onClick={() => onDelete?.(selectedEvent.id)}
                                color="error"
                                variant="outlined"
                                disabled={loading}
                                sx={{
                                    borderRadius: "var(--shape-borderRadius)",
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    mr: 'auto',
                                    borderColor: 'rgba(255, 86, 48, 0.32)',
                                    '&:hover': {
                                        bgcolor: 'rgba(255, 86, 48, 0.08)',
                                        borderColor: 'var(--palette-error-main)',
                                    }
                                }}
                            >
                                {loading ? 'Đang xóa...' : 'Xóa ca'}
                            </Button>
                        )}
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
                            {loading ? 'Đang xử lý...' : (selectedEvent ? 'Cập nhật' : 'Thêm mới')}
                        </Button>
                    </DialogActions>
                </form>
            </LocalizationProvider>
        </Dialog>
    );
};
