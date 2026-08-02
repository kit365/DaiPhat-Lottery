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
import { CommissionTiersEditor } from './CommissionTiersEditor';

interface SystemConfigEditDialogProps {
    config: SystemConfigResponse | null;
    open: boolean;
    onClose: () => void;
    onSubmit: (data: UpdateSystemConfigFormValues) => void;
    isPending: boolean;
}

const isCommissionTiersConfig = (config: SystemConfigResponse) =>
    config.configKey === 'PRIZE_PAYOUT_COMMISSION_TIERS';

const getValueFieldHelper = (config: SystemConfigResponse): string => {
    switch (config.dataType) {
        case ConfigDataType.INT:
            return config.unit ? `Nhập số nguyên (${config.unit})` : 'Nhập số nguyên';
        case ConfigDataType.DECIMAL:
            return config.unit === '%'
                ? 'Nhập dạng thập phân (ví dụ 0.10 = 10%)'
                : 'Nhập số thập phân';
        case ConfigDataType.TIME:
            return 'Định dạng HH:mm (ví dụ: 14:30)';
        case ConfigDataType.BOOLEAN:
            return 'Chỉ nhận true hoặc false';
        case ConfigDataType.JSON:
            return 'Nhập JSON hợp lệ';
        default:
            return 'Nhập giá trị cấu hình';
    }
};

export const SystemConfigEditDialog = ({
    config,
    open,
    onClose,
    onSubmit,
    isPending,
}: SystemConfigEditDialogProps) => {
    const outerTheme = useTheme();
    const isMobile = useMediaQuery(outerTheme.breakpoints.down('sm'));
    const useWideDialog = Boolean(config && isCommissionTiersConfig(config));
    const localTheme = createTheme(outerTheme, {
        components: {
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: '16px',
                        padding: '16px',
                        width: '100%',
                        maxWidth: useWideDialog ? '680px' : '560px',
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
                <form
                    onSubmit={handleSubmit((data) => {
                        const payload = { ...data };
                        if (config.dataType === ConfigDataType.JSON) {
                            try {
                                payload.configValue = JSON.stringify(JSON.parse(data.configValue));
                            } catch {
                                // keep as-is; schema already validates JSON
                            }
                        }
                        onSubmit(payload);
                    })}
                >
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
                                <Chip
                                    size="small"
                                    label={
                                        isCommissionTiersConfig(config)
                                            ? 'Bậc thang %'
                                            : CONFIG_DATA_TYPE_LABELS[config.dataType] || config.dataType
                                    }
                                    variant="outlined"
                                />
                                {config.unit && !isCommissionTiersConfig(config) && (
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
                                {isCommissionTiersConfig(config) ? (
                                    <Controller
                                        name="configValue"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <CommissionTiersEditor
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                ) : config.dataType === ConfigDataType.INT ? (
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
                                                helperText={fieldState.error?.message || getValueFieldHelper(config)}
                                                inputProps={{ step: 1 }}
                                            />
                                        )}
                                    />
                                ) : config.dataType === ConfigDataType.DECIMAL ? (
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
                                                helperText={fieldState.error?.message || getValueFieldHelper(config)}
                                                inputProps={{ step: 'any' }}
                                            />
                                        )}
                                    />
                                ) : config.dataType === ConfigDataType.BOOLEAN ? (
                                    <Controller
                                        name="configValue"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                select
                                                label="Giá trị"
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message || getValueFieldHelper(config)}
                                                SelectProps={{ native: true }}
                                            >
                                                <option value="true">true</option>
                                                <option value="false">false</option>
                                            </TextField>
                                        )}
                                    />
                                ) : config.dataType === ConfigDataType.JSON ? (
                                    <Controller
                                        name="configValue"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Giá trị (JSON)"
                                                fullWidth
                                                multiline
                                                minRows={6}
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message || getValueFieldHelper(config)}
                                                inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
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
                                                helperText={fieldState.error?.message || getValueFieldHelper(config)}
                                                inputProps={{
                                                    maxLength: config.dataType === ConfigDataType.TIME ? 5 : undefined,
                                                }}
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
