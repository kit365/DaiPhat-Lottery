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
import { Control, Controller } from 'react-hook-form';
import { SupplierFormValues } from './schemas/supplier.schema';
import { SUPPLIER_TYPE_LABELS } from './utils/supplierLabels';
import {
    getActivationFieldHelperText,
    isFieldMissing,
    missingFieldInputSx,
    SupplierActivationField,
} from './utils/supplier-activation';
import {
    formatViInteger,
    parseNonNegativeIntegerInput,
    preventNumberInputWheel,
} from './utils/supplierNumberFields';

const PAYMENT_TERM_HELPER = '0 = Thanh toán trong ngày.';

interface SupplierFormFieldsProps {
    control: Control<SupplierFormValues>;
    missingFields?: SupplierActivationField[];
    onActiveToggle?: (nextActive: boolean) => boolean;
}

export const SupplierFormFields = ({
    control,
    missingFields = [],
    onActiveToggle,
}: SupplierFormFieldsProps) => {
    const fieldHelper = (field: SupplierActivationField, defaultText?: string) =>
        isFieldMissing(missingFields, field) ? getActivationFieldHelperText(field) : defaultText;

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
                    render={({ field }) => <TextField {...field} label="Mã số thuế" fullWidth />}
                />
                <Box sx={{ width: '100%' }} data-activation-field="paymentTermDays">
                    <Controller
                        name="paymentTermDays"
                        control={control}
                        render={({ field, fieldState }) => {
                            const activationMissing = isFieldMissing(
                                missingFields,
                                'PAYMENT_TERM_DAYS'
                            );
                            return (
                                <TextField
                                    name={field.name}
                                    onBlur={field.onBlur}
                                    inputRef={field.ref}
                                    value={field.value ?? ''}
                                    type="number"
                                    label="Số ngày thanh toán"
                                    fullWidth
                                    error={!!fieldState.error || activationMissing}
                                    helperText={
                                        fieldState.error?.message ||
                                        fieldHelper('PAYMENT_TERM_DAYS', PAYMENT_TERM_HELPER)
                                    }
                                    sx={missingFieldInputSx(activationMissing)}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        if (raw === '') {
                                            field.onChange(null);
                                            return;
                                        }
                                        const parsed = Number(raw);
                                        if (!Number.isFinite(parsed)) {
                                            return;
                                        }
                                        field.onChange(Math.max(0, Math.trunc(parsed)));
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                            e.preventDefault();
                                        }
                                    }}
                                    onWheel={preventNumberInputWheel}
                                    inputProps={{ min: 0, step: 1, inputMode: 'numeric' }}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Typography variant="body2" color="text.secondary">
                                                    days
                                                </Typography>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            );
                        }}
                    />
                </Box>
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
        </Stack>
    );
};
