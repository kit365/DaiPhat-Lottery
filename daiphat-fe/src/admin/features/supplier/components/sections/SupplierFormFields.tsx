import { useState, useEffect } from 'react';
import {
    Box,
    FormControlLabel,
    InputAdornment,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { Control, Controller, useWatch } from 'react-hook-form';
import { AdminTimePicker } from '../../../../components/ui/AdminTimePicker';
import { SupplierFormValues } from '../../schemas/supplier.schema';
import { SUPPLIER_TYPE_LABELS } from '../../utils/supplierLabels';
import {
    getActivationFieldHelperText,
    isFieldMissing,
    missingFieldInputSx,
    SupplierActivationField,
} from '../../utils/supplier-activation';
import {
    formatViInteger,
    parseNonNegativeIntegerInput,
    preventNumberInputWheel,
} from '../../utils/supplierNumberFields';

const PAYMENT_TERM_HELPER = '0 = Thanh toán trong ngày.';

const PaymentTermField = ({
    field,
    fieldState,
    activationMissing,
    fieldHelper,
}: {
    field: any;
    fieldState: any;
    activationMissing: boolean;
    fieldHelper: (field: SupplierActivationField, defaultText?: string) => string | undefined;
}) => {
    const [isSameDayMode, setIsSameDayMode] = useState<boolean>(() => (field.value ?? 0) === 0);

    const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setIsSameDayMode(checked);
        if (checked) {
            field.onChange(0);
        } else {
            const nextVal = (field.value && Number(field.value) > 0) ? Number(field.value) : 7;
            field.onChange(nextVal);
        }
    };

    const isValueError = !isSameDayMode && (field.value === 0 || field.value === null || field.value === undefined || field.value === '');

    return (
        <Box
            sx={{
                p: 2.25,
                borderRadius: '12px',
                bgcolor: '#f8fafc',
                border: '1px solid',
                borderColor: (fieldState.error || activationMissing || isValueError) ? '#ef4444' : '#e2e8f0',
                transition: 'all 0.2s ease',
                ...missingFieldInputSx(activationMissing),
            }}
        >
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={2}
            >
                <Box>
                    <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                        Thời hạn thanh toán
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {isSameDayMode
                            ? 'Thanh toán ngay trong ngày quay vé'
                            : `Thanh toán theo kỳ dài hạn (${field.value || 0} ngày)`}
                    </Typography>
                </Box>

                <FormControlLabel
                    control={
                        <Switch
                            checked={isSameDayMode}
                            onChange={handleSwitchChange}
                            color="primary"
                        />
                    }
                    label={
                        <Typography variant="body2" fontWeight={600} color={isSameDayMode ? '#0f172a' : '#64748b'}>
                            Thanh toán trong ngày
                        </Typography>
                    }
                />
            </Stack>

            {!isSameDayMode && (
                <Box sx={{ mt: 2 }}>
                    <TextField
                        name={field.name}
                        onBlur={field.onBlur}
                        inputRef={field.ref}
                        value={field.value ?? ''}
                        type="number"
                        label="Số ngày thanh toán (theo kỳ)"
                        fullWidth
                        size="small"
                        error={!!fieldState.error || isValueError || activationMissing}
                        helperText={
                            (isValueError
                                ? 'Số ngày thanh toán theo kỳ phải lớn hơn 0'
                                : fieldState.error?.message) ||
                            fieldHelper(
                                'PAYMENT_TERM_DAYS',
                                'Nhập số ngày hạn thanh toán (ví dụ: 7, 15, 30 ngày)'
                            )
                        }
                        onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                                field.onChange('');
                                return;
                            }
                            const parsed = Number(raw);
                            if (!Number.isFinite(parsed)) return;
                            field.onChange(parsed);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                e.preventDefault();
                            }
                        }}
                        onWheel={(e) => {
                            if (e.target && 'blur' in e.target && typeof (e.target as any).blur === 'function') {
                                (e.target as HTMLElement).blur();
                            }
                        }}
                        sx={{
                            '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                                WebkitAppearance: 'none',
                                margin: 0,
                            },
                            '& input[type=number]': {
                                MozAppearance: 'textfield',
                            },
                        }}
                        inputProps={{ min: 1, step: 1, inputMode: 'numeric' }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <Typography variant="body2" color="text.secondary">
                                        ngày
                                    </Typography>
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>
            )}
        </Box>
    );
};

interface SupplierFormFieldsProps {
    control: Control<SupplierFormValues>;
    missingFields?: SupplierActivationField[];
    onActiveToggle?: (nextActive: boolean) => boolean;
    hideIsActive?: boolean;
}

export const SupplierFormFields = ({
    control,
    missingFields = [],
    onActiveToggle,
    hideIsActive = false,
}: SupplierFormFieldsProps) => {
    const fieldHelper = (field: SupplierActivationField, defaultText?: string) =>
        isFieldMissing(missingFields, field) ? getActivationFieldHelperText(field) : defaultText;

    const importAllowFromVal = useWatch({ control, name: 'importAllowFrom' });
    const returnCutOffTimeVal = useWatch({ control, name: 'returnCutOffTime' });

    const minReturnCutOffTime = importAllowFromVal ? dayjs(`2000-01-01T${importAllowFromVal}`) : undefined;
    const minPaymentCutOffTime = returnCutOffTimeVal ? dayjs(`2000-01-01T${returnCutOffTimeVal}`) : undefined;

    return (
        <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller
                    name="name"
                    control={control}
                    render={({ field, fieldState }) => (
                        <TextField
                            {...field}
                            label="Tên tổng đại lý"
                            fullWidth
                            required
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                        />
                    )}
                />
                <Controller
                    name="code"
                    control={control}
                    render={({ field, fieldState }) => (
                        <TextField
                            {...field}
                            label="Mã nhà cung cấp"
                            fullWidth
                            required
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                        />
                    )}
                />
            </Stack>

            <Controller
                name="type"
                control={control}
                render={({ field, fieldState }) => (
                    <TextField
                        {...field}
                        select
                        label="Loại nhà cung cấp"
                        fullWidth
                        required
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                    >
                        {Object.entries(SUPPLIER_TYPE_LABELS).map(([value, label]) => (
                            <MenuItem key={value} value={value}>
                                {label}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller
                    name="contactName"
                    control={control}
                    render={({ field }) => <TextField {...field} label="Người liên hệ" fullWidth />}
                />
                <Box sx={{ width: '100%' }} data-activation-field="contactPhone">
                    <Controller
                        name="contactPhone"
                        control={control}
                        render={({ field, fieldState }) => {
                            const activationMissing = isFieldMissing(missingFields, 'CONTACT_PHONE');
                            return (
                                <TextField
                                    {...field}
                                    label="Số điện thoại"
                                    fullWidth
                                    required
                                    error={!!fieldState.error || activationMissing}
                                    helperText={
                                        fieldState.error?.message || fieldHelper('CONTACT_PHONE')
                                    }
                                    sx={missingFieldInputSx(activationMissing)}
                                />
                            );
                        }}
                    />
                </Box>
            </Stack>

            <Controller
                name="contactEmail"
                control={control}
                render={({ field, fieldState }) => (
                    <TextField
                        {...field}
                        label="Email"
                        fullWidth
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                    />
                )}
            />

            <Box data-activation-field="address">
                <Controller
                    name="address"
                    control={control}
                    render={({ field, fieldState }) => {
                        const activationMissing = isFieldMissing(missingFields, 'ADDRESS');
                        return (
                            <TextField
                                {...field}
                                label="Địa chỉ"
                                fullWidth
                                multiline
                                minRows={2}
                                error={!!fieldState.error || activationMissing}
                                helperText={fieldState.error?.message || fieldHelper('ADDRESS')}
                                sx={missingFieldInputSx(activationMissing)}
                            />
                        );
                    }}
                />
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller
                    name="taxCode"
                    control={control}
                    render={({ field, fieldState }) => (
                        <TextField
                            {...field}
                            label="Mã số thuế"
                            fullWidth
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                        />
                    )}
                />
                <Box sx={{ width: '100%' }} data-activation-field="defaultImportCost">
                    <Controller
                        name="defaultImportCost"
                        control={control}
                        render={({ field, fieldState }) => {
                            const activationMissing = isFieldMissing(
                                missingFields,
                                'DEFAULT_IMPORT_COST'
                            );
                            return (
                                <TextField
                                    name={field.name}
                                    onBlur={field.onBlur}
                                    inputRef={field.ref}
                                    value={formatViInteger(field.value)}
                                    label="Giá vốn mặc định"
                                    fullWidth
                                    error={!!fieldState.error || activationMissing}
                                    helperText={
                                        fieldState.error?.message ||
                                        fieldHelper('DEFAULT_IMPORT_COST')
                                    }
                                    sx={missingFieldInputSx(activationMissing)}
                                    onChange={(e) => {
                                        field.onChange(parseNonNegativeIntegerInput(e.target.value));
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                            e.preventDefault();
                                        }
                                    }}
                                    onWheel={preventNumberInputWheel}
                                    inputProps={{ inputMode: 'numeric' }}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Typography variant="body2" color="text.secondary">
                                                    VNĐ
                                                </Typography>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            );
                        }}
                    />
                </Box>
            </Stack>

            {/* Chế độ thanh toán (Số ngày thanh toán) */}
            <Box data-activation-field="paymentTermDays">
                <Controller
                    name="paymentTermDays"
                    control={control}
                    render={({ field, fieldState }) => {
                        const activationMissing = isFieldMissing(
                            missingFields,
                            'PAYMENT_TERM_DAYS'
                        );
                        return (
                            <PaymentTermField
                                field={field}
                                fieldState={fieldState}
                                activationMissing={activationMissing}
                                fieldHelper={fieldHelper}
                            />
                        );
                    }}
                />
            </Box>

            {/* Mốc thời gian quy định */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller
                    name="importAllowFrom"
                    control={control}
                    render={({ field, fieldState }) => (
                        <AdminTimePicker
                            label="Giờ cho phép nhập vé"
                            value={field.value ? dayjs(`2000-01-01T${field.value}`) : null}
                            onChange={(newValue) => {
                                field.onChange(newValue ? newValue.format('HH:mm') : '');
                            }}
                            localeText={{ cancelButtonLabel: 'Hủy' }}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    error: !!fieldState.error,
                                    helperText:
                                        fieldState.error?.message ||
                                        'Từ giờ này trở đi mới được tạo phiếu nhập lô',
                                    InputLabelProps: { shrink: true },
                                },
                            }}
                        />
                    )}
                />
                <Controller
                    name="returnCutOffTime"
                    control={control}
                    render={({ field, fieldState }) => (
                        <AdminTimePicker
                            label="Hạn trả vé"
                            value={field.value ? dayjs(`2000-01-01T${field.value}`) : null}
                            minTime={minReturnCutOffTime}
                            onChange={(newValue) => {
                                field.onChange(newValue ? newValue.format('HH:mm') : '');
                            }}
                            localeText={{ cancelButtonLabel: 'Hủy' }}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    error: !!fieldState.error,
                                    helperText:
                                        fieldState.error?.message ||
                                        'Hạn trả vé số vật lý cho nhà cung cấp',
                                    InputLabelProps: { shrink: true },
                                },
                            }}
                        />
                    )}
                />
                <Controller
                    name="paymentCutOffTime"
                    control={control}
                    render={({ field, fieldState }) => (
                        <AdminTimePicker
                            label="Giờ thanh toán"
                            value={field.value ? dayjs(`2000-01-01T${field.value}`) : null}
                            minTime={minPaymentCutOffTime}
                            onChange={(newValue) => {
                                field.onChange(newValue ? newValue.format('HH:mm') : '');
                            }}
                            localeText={{ cancelButtonLabel: 'Hủy' }}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    error: !!fieldState.error,
                                    helperText:
                                        fieldState.error?.message ||
                                        'Giờ chót thực hiện thanh toán cho nhà cung cấp',
                                    InputLabelProps: { shrink: true },
                                },
                            }}
                        />
                    )}
                />
            </Stack>

            {!hideIsActive && (
                <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={field.value}
                                    onChange={(e) => {
                                        const nextActive = e.target.checked;
                                        if (nextActive && onActiveToggle && !onActiveToggle(true)) {
                                            return;
                                        }
                                        if (!nextActive) {
                                            onActiveToggle?.(false);
                                        }
                                        field.onChange(nextActive);
                                    }}
                                />
                            }
                            label={field.value ? 'Hoạt động' : 'Ngừng hoạt động'}
                        />
                    )}
                />
            )}
        </Stack>
    );
};
