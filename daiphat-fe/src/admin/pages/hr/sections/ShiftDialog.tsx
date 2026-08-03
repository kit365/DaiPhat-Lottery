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
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import CloseIcon from '@mui/icons-material/Close';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useDepartments } from '../hooks/useDepartments';
import { dialogStyles } from '../configs/styles.config';

interface ShiftDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    selectedItem?: any;
}

export const ShiftDialog = ({
    open,
    onClose,
    onSave,
    selectedItem,
}: ShiftDialogProps) => {
    const departmentsRes = useDepartments();
    const departments = useMemo(() => {
        if (!departmentsRes.data) return [];
        const data: any = departmentsRes.data;
        if (Array.isArray(data.data?.recordList)) return data.data.recordList;
        if (Array.isArray(data.recordList)) return data.recordList;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data)) return data;
        return [];
    }, [departmentsRes.data]);

    const { control, handleSubmit, reset } = useForm({
        defaultValues: {
            name: '',
            startTime: dayjs().set('hour', 8).set('minute', 0),
            endTime: dayjs().set('hour', 12).set('minute', 0),
            departmentId: '',
            status: 'active',
        }
    });

    const parseTimeString = (timeStr: string) => {
        if (!timeStr) return dayjs().set('hour', 8).set('minute', 0);
        const [hours, minutes] = timeStr.split(':').map(Number);
        return dayjs().set('hour', hours).set('minute', minutes).set('second', 0);
    };

    useEffect(() => {
        if (selectedItem) {
            reset({
                name: selectedItem.name || '',
                startTime: parseTimeString(selectedItem.startTime),
                endTime: parseTimeString(selectedItem.endTime),
                departmentId: selectedItem.departmentId || '',
                status: selectedItem.status || 'active',
            });
        } else {
            reset({
                name: '',
                startTime: dayjs().set('hour', 8).set('minute', 0),
                endTime: dayjs().set('hour', 12).set('minute', 0),
                departmentId: '',
                status: 'active',
            });
        }
    }, [selectedItem, reset, open]);

    const onSubmit = (data: any) => {
        const formattedData = {
            ...data,
            startTime: data.startTime ? dayjs(data.startTime).format('HH:mm') : '08:00',
            endTime: data.endTime ? dayjs(data.endTime).format('HH:mm') : '12:00',
        };
        onSave(formattedData);
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
                    {selectedItem ? 'Chỉnh sửa ca làm việc' : 'Thêm ca làm việc mới'}
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
                                        label="Tên ca"
                                        placeholder="VD: Ca Sáng"
                                        error={!!error}
                                        helperText={error?.message}
                                        sx={{ bgcolor: "var(--palette-background-paper)", borderRadius: "var(--shape-borderRadius)" }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <Controller
                                    name="startTime"
                                    control={control}
                                    render={({ field }) => (
                                        <TimePicker
                                            {...field}
                                            label="Giờ bắt đầu"
                                            ampm={false}
                                            format="HH:mm"
                                            minutesStep={15}
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                    sx: { bgcolor: "var(--palette-background-paper)", borderRadius: "var(--shape-borderRadius)" }
                                                }
                                            }}
                                        />
                                    )}
                                />
                            </LocalizationProvider>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <Controller
                                    name="endTime"
                                    control={control}
                                    render={({ field }) => (
                                        <TimePicker
                                            {...field}
                                            label="Giờ kết thúc"
                                            ampm={false}
                                            format="HH:mm"
                                            minutesStep={15}
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                    sx: { bgcolor: "var(--palette-background-paper)", borderRadius: "var(--shape-borderRadius)" }
                                                }
                                            }}
                                        />
                                    )}
                                />
                            </LocalizationProvider>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Controller
                                name="departmentId"
                                control={control}
                                rules={{ required: 'Bắt buộc chọn phòng ban' }}
                                render={({ field, fieldState: { error } }) => (
                                    <TextField
                                        {...field}
                                        select
                                        fullWidth
                                        label="Phòng ban áp dụng"
                                        error={!!error}
                                        helperText={error?.message || "Chọn phòng ban quản lý ca này"}
                                        sx={{ bgcolor: "var(--palette-background-paper)", borderRadius: "var(--shape-borderRadius)" }}
                                    >
                                        {departments.map((dept: any) => (
                                            <MenuItem key={dept._id} value={dept._id}>
                                                {dept.name}
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




