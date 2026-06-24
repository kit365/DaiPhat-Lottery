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
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import {
    createUpdateSystemConfigSchema,
    UpdateSystemConfigFormValues,
} from '../../../schemas/system-config.schema';
import {
    CONFIG_DATA_TYPE_LABELS,
    CONFIG_TYPE_LABELS,
    ConfigDataType,
    SystemConfigResponse,
} from '../types/system-config';

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

    const schema = config ? createUpdateSystemConfigSchema(config.dataType) : null;

    const { control, handleSubmit, reset } = useForm<UpdateSystemConfigFormValues>({
        resolver: schema ? zodResolver(schema) : undefined,
        defaultValues: {
            configValue: '',
            description: '',
        },
    });

    useEffect(() => {
        if (!config || !open) return;

        reset({
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
                        Cập nhật cấu hình
                    </DialogTitle>
                    <DialogContent sx={{ py: '20px !important' }}>
                        <Stack spacing={3}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    Khóa cấu hình
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, mt: 0.5 }}>
                                    {config.configKey}
                                </Typography>
                            </Box>

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip
                                    size="small"
                                    label={CONFIG_TYPE_LABELS[config.configType] || config.configType}
                                    color="primary"
                                    variant="outlined"
                                />
                                <Chip
                                    size="small"
                                    label={CONFIG_DATA_TYPE_LABELS[config.dataType] || config.dataType}
                                    variant="outlined"
                                />
                            </Stack>

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
                                                helperText={fieldState.error?.message || 'Nhập số nguyên'}
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
                                                    'Định dạng HH:mm (ví dụ: 14:30)'
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
