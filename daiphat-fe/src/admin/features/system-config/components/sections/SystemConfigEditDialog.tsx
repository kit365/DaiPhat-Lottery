"use client";

import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    ThemeProvider,
    Typography,
    createTheme,
    useMediaQuery,
    useTheme,
    Paper,
    Divider,
} from '@mui/material';
import { KeyRound, Clock, User } from 'lucide-react';
import dayjs from 'dayjs';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import {
    createUpdateSystemConfigSchema,
    UpdateSystemConfigFormValues,
} from '../../../../schemas/system-config.schema';
import {
    CONFIG_DATA_TYPE_LABELS,
    CONFIG_TYPE_LABELS,
    ConfigDataType,
    SystemConfigResponse,
} from '../../types/system-config';

interface SystemConfigEditDialogProps {
    config: SystemConfigResponse | null;
    open: boolean;
    onClose: () => void;
    onSubmit: (data: UpdateSystemConfigFormValues) => void;
    isPending: boolean;
}

export const SystemConfigEditDialog = ({
    config,
    open,
    onClose,
    onSubmit,
    isPending,
}: SystemConfigEditDialogProps) => {
    const outerTheme = useTheme();
    const isMobile = useMediaQuery(outerTheme.breakpoints.down('sm'));
    const localTheme = createTheme(outerTheme, {
        components: {
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: '16px',
                        padding: '16px',
                        width: '100%',
                        maxWidth: '560px',
                        margin: isMobile ? '16px' : '32px',
                        backgroundImage: 'none',
                        backgroundColor: outerTheme.palette.background.paper,
                        boxShadow: 'var(--customShadows-dialog)',
                    },
                },
            },
        },
    });

    const schema = config
        ? createUpdateSystemConfigSchema(config.dataType, config.validationRules)
        : null;

    const { control, handleSubmit, reset } = useForm<UpdateSystemConfigFormValues>({
        resolver: schema ? zodResolver(schema) : undefined,
        defaultValues: {
            configName: '',
            configValue: '',
            description: '',
        },
    });

    useEffect(() => {
        if (!config || !open) return;

        reset({
            configName: config.configName || '',
            configValue: config.configValue,
            description: config.description,
        });
    }, [config, open, reset]);

    if (!config) return null;

    return (
        <ThemeProvider theme={localTheme}>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: '1.25rem' }}>
                        {config.configName || 'Cập nhật cấu hình'}
                    </DialogTitle>
                    <DialogContent sx={{ py: '20px !important' }}>
                        <Stack spacing={3}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: 'var(--palette-background-neutral, rgba(145, 158, 171, 0.08))',
                                    border: '1px solid var(--palette-divider)',
                                }}
                            >
                                <Stack spacing={1.5}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <KeyRound size={16} color="var(--palette-text-secondary)" />
                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, width: 120 }}>
                                            Khóa cấu hình:
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                            {config.configKey}
                                        </Typography>
                                    </Stack>
                                    {config.updatedAt && (
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Clock size={16} color="var(--palette-text-secondary)" />
                                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, width: 120 }}>
                                                Cập nhật lúc:
                                            </Typography>
                                            <Typography variant="body2">
                                                {dayjs(config.updatedAt).format('DD/MM/YYYY HH:mm:ss')}
                                            </Typography>
                                        </Stack>
                                    )}
                                    {config.updatedBy && (
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <User size={16} color="var(--palette-text-secondary)" />
                                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, width: 120 }}>
                                                Thực hiện bởi:
                                            </Typography>
                                            <Typography variant="body2">
                                                {config.updatedBy}
                                            </Typography>
                                        </Stack>
                                    )}
                                </Stack>
                            </Paper>

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip
                                    size="small"
                                    label={CONFIG_TYPE_LABELS[config.configType] || config.configType}
                                    color="primary"
                                />
                                {config.unit && (
                                    <Chip size="small" label={`Đơn vị: ${config.unit}`} variant="outlined" />
                                )}
                            </Stack>

                            <Divider sx={{ borderStyle: 'dashed' }} />

                            <Box>
                                <Controller
                                    name="configName"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextField
                                            {...field}
                                            label="Tên cấu hình"
                                            fullWidth
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                            inputProps={{ maxLength: 255 }}
                                        />
                                    )}
                                />
                            </Box>

                            <Box>
                                <Controller
                                    name="description"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextField
                                            {...field}
                                            label="Mô tả"
                                            fullWidth
                                            multiline
                                            minRows={2}
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message || 'Tối đa 255 ký tự'}
                                            inputProps={{ maxLength: 255 }}
                                        />
                                    )}
                                />
                            </Box>

                            <Box>
                                {config.dataType === ConfigDataType.INT ? (
                                    <Controller
                                        name="configValue"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                type="number"
                                                label="Giá trị"
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={
                                                    fieldState.error?.message ||
                                                    (config.unit
                                                        ? `Nhập số nguyên (${config.unit})`
                                                        : 'Nhập số nguyên')
                                                }
                                                inputProps={{ step: 1 }}
                                            />
                                        )}
                                    />
                                ) : (
                                    <Controller
                                        name="configValue"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Giá trị"
                                                fullWidth
                                                placeholder="14:30"
                                                error={!!fieldState.error}
                                                helperText={
                                                    fieldState.error?.message ||
                                                    (config.unit
                                                        ? `Định dạng ${config.unit} (ví dụ: 14:30)`
                                                        : 'Định dạng HH:mm (ví dụ: 14:30)')
                                                }
                                                inputProps={{ maxLength: 5 }}
                                            />
                                        )}
                                    />
                                )}
                            </Box>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ pt: 2, px: 3, pb: 2 }}>
                        <Button onClick={onClose} variant="outlined" color="inherit" disabled={isPending}>
                            Hủy
                        </Button>
                        <LoadingButton
                            type="submit"
                            loading={isPending}
                            label="Lưu thay đổi"
                            loadingLabel="Đang lưu..."
                            variant="contained"
                        />
                    </DialogActions>
                </form>
            </Dialog>
        </ThemeProvider>
    );
};
