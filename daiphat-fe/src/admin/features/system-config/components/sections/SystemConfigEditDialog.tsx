"use client";

import {
    Alert,
    Box,
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
import { useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import {
    createUpdateSystemConfigSchema,
    UpdateSystemConfigFormValues,
} from '@/admin/features/system-config/schemas/system-config.schema';
import {
    CONFIG_DATA_TYPE_LABELS,
    CONFIG_TYPE_LABELS,
    ConfigDataType,
    parseValidationRules,
    SystemConfigResponse,
} from '../../types/system-config';
import { CommissionTiersEditor } from './CommissionTiersEditor';
import {
    FortuneCooldownDurationEditor,
    isFortuneCooldownConfig,
} from './FortuneCooldownDurationEditor';

interface SystemConfigEditDialogProps {
    config: SystemConfigResponse | null;
    open: boolean;
    onClose: () => void;
    onSubmit: (data: UpdateSystemConfigFormValues) => void;
    isPending: boolean;
}

const LATE_RETURN_POLICY_LABELS: Record<string, string> = {
    FORFEIT_DEPOSIT: 'Tịch thu tiền cọc',
    FORCE_PURCHASE_ALL: 'Tính tiền toàn bộ số vé',
};

const isCommissionTiersConfig = (config: SystemConfigResponse) =>
    config.configKey === 'PRIZE_PAYOUT_COMMISSION_TIERS';

const VENDOR_TIMING_LABELS: Record<string, string> = {
    VENDOR_RETURN_CUTOFF: 'Giờ cuối người bán vé số trả vé trong ngày',
    VENDOR_DRAFT_RESERVATION_TTL_MINUTES: 'Thời gian giữ phiếu chưa xác nhận',
};

const VENDOR_TIMING_HELPERS: Record<string, string> = {
    VENDOR_RETURN_CUTOFF:
        'Sau mốc này, vé trả được tính là trễ và không thể xác nhận bàn giao mới trong cùng ngày.',
    VENDOR_DRAFT_RESERVATION_TTL_MINUTES:
        'Hết thời gian này mà chưa xác nhận, hệ thống tự trả vé đang giữ về kho.',
};

const getAllowedValues = (config: SystemConfigResponse): string[] => {
    const rules = parseValidationRules(config.validationRules);
    return rules?.allowedValues?.filter(Boolean) ?? [];
};

const getNumericBounds = (config: SystemConfigResponse): { min?: number; max?: number; step?: number | string } => {
    const rules = parseValidationRules(config.validationRules);
    const min = typeof rules?.min === 'number' ? rules.min : undefined;
    const max = typeof rules?.max === 'number' ? rules.max : undefined;
    if (config.dataType === ConfigDataType.INT) {
        return { min, max, step: 1 };
    }
    if (config.dataType === ConfigDataType.DECIMAL) {
        return { min, max, step: 'any' };
    }
    return {};
};

const getValueFieldHelper = (config: SystemConfigResponse): string => {
    if (isFortuneCooldownConfig(config.configKey)) {
        return 'Nhập giờ và phút cho mỗi khung giờ đồng hồ';
    }
    switch (config.dataType) {
        case ConfigDataType.INT:
            return config.unit ? `Nhập số nguyên (${config.unit})` : 'Nhập số nguyên';
        case ConfigDataType.DECIMAL:
            return config.unit === '%'
                ? 'Nhập dạng thập phân (ví dụ 0.10 = 10%)'
                : 'Nhập số thập phân';
        case ConfigDataType.TIME:
            return 'Định dạng HH:mm (ví dụ: 17:00)';
        case ConfigDataType.BOOLEAN:
            return 'Chỉ nhận true hoặc false';
        case ConfigDataType.JSON:
            return 'Nhập JSON hợp lệ';
        default:
            return 'Nhập giá trị cấu hình';
    }
};

/** Keep API/legacy values such as 17:00:00 or 1700 compatible with an HTML time input. */
const normalizeTimeValue = (value: string) => {
    const normalized = value.trim();
    const match = normalized.match(/^(\d{1,2}):?(\d{2})(?::\d{2})?$/);
    if (!match) return value;
    return `${match[1].padStart(2, '0')}:${match[2]}`;
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

    const [confirmData, setConfirmData] = useState<UpdateSystemConfigFormValues | null>(null);

    const schema = config
        ? createUpdateSystemConfigSchema(config.dataType, config.validationRules)
        : null;

    const { control, handleSubmit, register, reset } = useForm<UpdateSystemConfigFormValues>({
        resolver: schema ? zodResolver(schema) : undefined,
        defaultValues: {
            configName: '',
            configValue: '',
            description: '',
        },
    });

    const submitForm = handleSubmit((data) => {
        const payload = { ...data };
        if (config?.dataType === ConfigDataType.JSON) {
            try {
                payload.configValue = JSON.stringify(JSON.parse(data.configValue));
            } catch {
                // keep as-is; schema already validates JSON
            }
        }
        if (
            config?.configKey === 'VENDOR_RETURN_CUTOFF' ||
            config?.configKey === 'VENDOR_DRAFT_RESERVATION_TTL_MINUTES'
        ) {
            setConfirmData(payload);
        } else {
            onSubmit(payload);
        }
    });

    useEffect(() => {
        if (!config || !open) return;

        reset({
            configName: config.configName || '',
            configValue:
                config.dataType === ConfigDataType.TIME || config.configKey === 'VENDOR_RETURN_CUTOFF'
                    ? normalizeTimeValue(config.configValue)
                    : config.configValue,
            description: config.description,
        });
        setConfirmData(null);
    }, [config, open, reset]);

    if (!config) return null;

    const isVendorTiming = Object.prototype.hasOwnProperty.call(VENDOR_TIMING_LABELS, config.configKey);
    const isVendorCutoff = config.configKey === 'VENDOR_RETURN_CUTOFF';
    const displayName = VENDOR_TIMING_LABELS[config.configKey] || config.configName || 'Cập nhật cấu hình';

    return (
        <ThemeProvider theme={localTheme}>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <form onSubmit={(event) => { event.preventDefault(); void submitForm(); }}>
                    <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: '1.25rem' }}>
                        {displayName}
                    </DialogTitle>
                    <DialogContent sx={{ py: '20px !important' }}>
                        <Stack spacing={3}>
                            {!isVendorTiming && (
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
                            )}

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
                                            : isFortuneCooldownConfig(config.configKey)
                                              ? 'Giờ + phút'
                                              : CONFIG_DATA_TYPE_LABELS[config.dataType] || config.dataType
                                    }
                                    variant="outlined"
                                />
                                {config.unit && !isCommissionTiersConfig(config) && (
                                    <Chip
                                        size="small"
                                        label={
                                            isFortuneCooldownConfig(config.configKey)
                                                ? 'Khung giờ đồng hồ'
                                                : `Đơn vị: ${config.unit}`
                                        }
                                        variant="outlined"
                                    />
                                )}
                            </Stack>

                            <Divider sx={{ borderStyle: 'dashed' }} />

                            {!isVendorTiming && (
                                <>
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
                                </>
                            )}
                            {isVendorTiming && (
                                <>
                                    <input type="hidden" {...register('configName')} />
                                    <input type="hidden" {...register('description')} />
                                </>
                            )}

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
                                ) : isFortuneCooldownConfig(config.configKey) ? (
                                    <Controller
                                        name="configValue"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <FortuneCooldownDurationEditor
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                ) : getAllowedValues(config).length > 0 ? (
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
                                                helperText={fieldState.error?.message || 'Chọn một giá trị cho phép'}
                                                SelectProps={{ native: true }}
                                            >
                                                {getAllowedValues(config).map((value) => (
                                                    <option key={value} value={value}>
                                                        {config.configKey === 'VENDOR_LATE_RETURN_POLICY'
                                                            ? LATE_RETURN_POLICY_LABELS[value] || value
                                                            : value}
                                                    </option>
                                                ))}
                                            </TextField>
                                        )}
                                    />
                                ) : config.dataType === ConfigDataType.INT ? (
                                    <Controller
                                        name="configValue"
                                        control={control}
                                        render={({ field, fieldState }) => {
                                            const bounds = getNumericBounds(config);
                                            return (
                                                <TextField
                                                    {...field}
                                                    type="number"
                                                    label={isVendorTiming ? 'Thời gian' : 'Giá trị'}
                                                    fullWidth
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message || VENDOR_TIMING_HELPERS[config.configKey] || getValueFieldHelper(config)}
                                                    inputProps={bounds}
                                                />
                                            );
                                        }}
                                    />
                                ) : config.dataType === ConfigDataType.TIME || isVendorCutoff ? (
                                    <Controller
                                        name="configValue"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                type="time"
                                                label="Giờ"
                                                fullWidth
                                                InputLabelProps={{ shrink: true }}
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message || VENDOR_TIMING_HELPERS[config.configKey] || 'Chọn giờ theo định dạng 24 giờ (HH:mm).'}
                                                inputProps={{ step: 60 }}
                                            />
                                        )}
                                    />
                                ) : config.dataType === ConfigDataType.DECIMAL ? (
                                    <Controller
                                        name="configValue"
                                        control={control}
                                        render={({ field, fieldState }) => {
                                            const bounds = getNumericBounds(config);
                                            return (
                                                <TextField
                                                    {...field}
                                                    type="number"
                                                    label="Giá trị"
                                                    fullWidth
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message || getValueFieldHelper(config)}
                                                    inputProps={bounds}
                                                />
                                            );
                                        }}
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
                                                label={isVendorTiming ? 'Thời gian' : 'Giá trị'}
                                                fullWidth
                                                placeholder="14:30"
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message || VENDOR_TIMING_HELPERS[config.configKey] || getValueFieldHelper(config)}
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
                        <Button
                            type="button"
                            onClick={() => void submitForm()}
                            loading={isPending}
                            label="Lưu thay đổi"
                            loadingLabel="Đang lưu..."
                            variant="contained"
                        />
                    </DialogActions>
                </form>
            </Dialog>

            <Dialog open={!!confirmData} onClose={() => setConfirmData(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>Xác nhận thay đổi</DialogTitle>
                <DialogContent>
                    <Typography mb={2}>
                        Bạn có chắc chắn muốn thay đổi <strong>{displayName}</strong>?
                    </Typography>
                    <Alert severity="warning">
                        Thay đổi áp dụng ngay cho phiếu đang giữ và các phiếu tạo sau đó. Phiếu đã bàn giao vẫn giữ mốc đã chốt.
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ pt: 2, px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmData(null)} variant="outlined" color="inherit" disabled={isPending}>
                        Hủy
                    </Button>
                    <Button
                        onClick={() => {
                            if (confirmData) {
                                onSubmit(confirmData);
                                setConfirmData(null);
                            }
                        }}
                        loading={isPending}
                        label="Xác nhận lưu"
                        loadingLabel="Đang lưu..."
                        variant="contained"
                        color="error"
                    />
                </DialogActions>
            </Dialog>
        </ThemeProvider>
    );
};
