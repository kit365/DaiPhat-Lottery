import {
    Box,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormHelperText,
    InputAdornment,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import { useRef, useEffect } from 'react';
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
    const lastTermDaysRef = useRef(7);

    useEffect(() => {
        const current = Number(field.value);
        if (Number.isFinite(current) && current > 0) {
            lastTermDaysRef.current = current;
        }
    }, [field.value]);

    const isSameDay =
        field.value === 0 ||
        field.value === '' ||
        field.value === null ||
        field.value === undefined;

    const handleModeChange = (mode: 'same_day' | 'term') => {
        if (mode === 'same_day') {
            const current = Number(field.value);
            if (Number.isFinite(current) && current > 0) {
                lastTermDaysRef.current = current;
            }
            field.onChange(0);
            return;
        }

        field.onChange(lastTermDaysRef.current || 7);
    };

    const handleDaysChange = (raw: string) => {
        if (raw === '') {
            field.onChange('');
            return;
        }
        if (!/^\d{1,3}$/.test(raw)) return;

        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) return;
        lastTermDaysRef.current = parsed;
        field.onChange(parsed);
    };

    const daysInputValue = isSameDay
        ? (lastTermDaysRef.current || 7)
        : (field.value === '' || field.value === null || field.value === undefined ? '' : field.value);

    const isValueError =
        !isSameDay &&
        (field.value === 0 ||
            field.value === null ||
            field.value === undefined ||
            field.value === '');

    const helperText =
        isValueError
            ? 'Số ngày thanh toán theo kỳ phải lớn hơn 0'
            : fieldState.error?.message || fieldHelper('PAYMENT_TERM_DAYS');

    const hasError = !!fieldState.error || activationMissing || isValueError;

    return (
        <FormControl error={hasError} fullWidth>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                Thời hạn thanh toán
            </Typography>

            <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
            >
                <FormControlLabel
                    control={
                        <Checkbox
                            size="small"
                            checked={isSameDay}
                            onChange={() => handleModeChange('same_day')}
                        />
                    }
                    label="Trong ngày"
                />

                <Stack direction="row" spacing={1} alignItems="center">
                    <FormControlLabel
                        control={
                            <Checkbox
                                size="small"
                                checked={!isSameDay}
                                onChange={() => handleModeChange('term')}
                            />
                        }
                        label="Theo ngày"
                    />

                    <TextField
                        name={field.name}
                        onBlur={field.onBlur}
                        inputRef={field.ref}
                        value={daysInputValue}
                        type="number"
                        placeholder="7"
                        size="small"
                        disabled={isSameDay}
                        error={hasError && !isSameDay}
                        onChange={(e) => handleDaysChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                e.preventDefault();
                            }
                        }}
                        onWheel={preventNumberInputWheel}
                        slotProps={{
                            htmlInput: { min: 1, max: 999, step: 1, inputMode: 'numeric', maxLength: 3 },
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end" sx={{ ml: 0, mr: 0.25 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', lineHeight: 1, fontWeight: 600 }}>
                                            ngày
                                        </Typography>
                                    </InputAdornment>
                                ),
                            },
                        }}
                        sx={{
                            width: 84,
                            ...missingFieldInputSx(activationMissing && !isSameDay),
                            '& .MuiOutlinedInput-root': {
                                height: 28,
                                minHeight: 28,
                                fontSize: '0.875rem',
                                borderRadius: '6px',
                                pr: 0.5,
                            },
                            '& .MuiOutlinedInput-input': {
                                py: 0,
                                px: 0.5,
                                height: '100%',
                                boxSizing: 'border-box',
                                textAlign: 'center',
                            },
                            '& .MuiInputAdornment-root': {
                                height: 'auto',
                                ml: 0,
                            },
                            '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                                WebkitAppearance: 'none',
                                margin: 0,
                            },
                            '& input[type=number]': {
                                MozAppearance: 'textfield',
                            },
                        }}
                    />
                </Stack>
            </Stack>

            {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
        </FormControl>
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
                                    slotProps={{
                                        htmlInput: { inputMode: 'numeric' },
                                        input: {
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <Typography variant="body2" color="text.secondary">
                                                        VNĐ
                                                    </Typography>
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                />
                            );
                        }}
                    />
                </Box>
            </Stack>

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
