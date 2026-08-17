"use client";

import {
    Box,
    Chip,
    FormControl,
    FormHelperText,
    IconButton,
    InputAdornment,
    Paper,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useRef, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Control, Controller, useWatch } from 'react-hook-form';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import ContactPhoneOutlinedIcon from '@mui/icons-material/ContactPhoneOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import PhoneIphoneOutlinedIcon from '@mui/icons-material/PhoneIphoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { toast } from 'react-toastify';
import { AdminTimePicker } from '../../../../components/ui/AdminTimePicker';
import { SupplierFormValues } from '../../schemas/supplier.schema';
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

/** Quick preset prices for lottery tickets */
const QUICK_PRICE_PRESETS = [8400, 8500, 8600, 8800, 9000, 10000];

/* ── Subcomponent: Payment Term Field ── */
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
        field.value === '0' ||
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
            field.value === '0' ||
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
            <Typography variant="caption" fontWeight={700} sx={{ mb: 1, color: '#334155' }}>
                Thời hạn thanh toán *
            </Typography>

            <RadioGroup
                row
                value={isSameDay ? 'same_day' : 'term'}
                onChange={(e) => handleModeChange(e.target.value as 'same_day' | 'term')}
                sx={{ gap: 2, mb: 1 }}
            >
                <Paper
                    elevation={0}
                    onClick={() => handleModeChange('same_day')}
                    sx={{
                        p: 1.5,
                        px: 2,
                        borderRadius: '12px',
                        border: isSameDay ? '2px solid #FF3030' : '1px solid #e2e8f0',
                        bgcolor: isSameDay ? 'rgba(255, 48, 48, 0.04)' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        flex: 1,
                        transition: 'all 0.2s',
                        '&:hover': {
                            borderColor: isSameDay ? '#FF3030' : '#cbd5e1',
                            bgcolor: isSameDay ? 'rgba(255, 48, 48, 0.06)' : '#f8fafc',
                        },
                    }}
                >
                    <Radio
                        checked={isSameDay}
                        value="same_day"
                        size="small"
                        sx={{ p: 0, color: '#94a3b8', '&.Mui-checked': { color: '#FF3030' } }}
                    />
                    <Box>
                        <Typography variant="body2" fontWeight={700} color={isSameDay ? '#0f172a' : 'text.secondary'}>
                            Trong ngày (0 ngày)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Thanh toán dứt điểm khi kết thúc đối soát
                        </Typography>
                    </Box>
                </Paper>

                <Paper
                    elevation={0}
                    onClick={() => handleModeChange('term')}
                    sx={{
                        p: 1.5,
                        px: 2,
                        borderRadius: '12px',
                        border: !isSameDay ? '2px solid #FF3030' : '1px solid #e2e8f0',
                        bgcolor: !isSameDay ? 'rgba(255, 48, 48, 0.04)' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        flex: 1,
                        transition: 'all 0.2s',
                        '&:hover': {
                            borderColor: !isSameDay ? '#FF3030' : '#cbd5e1',
                            bgcolor: !isSameDay ? 'rgba(255, 48, 48, 0.06)' : '#f8fafc',
                        },
                    }}
                >
                    <Radio
                        checked={!isSameDay}
                        value="term"
                        size="small"
                        sx={{ p: 0, color: '#94a3b8', '&.Mui-checked': { color: '#FF3030' } }}
                    />
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={700} color={!isSameDay ? '#0f172a' : 'text.secondary'}>
                            Theo kỳ hạn
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Gối đầu thanh toán sau số ngày cố định
                        </Typography>
                    </Box>
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
                        onClick={(e) => e.stopPropagation()}
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
                                    <InputAdornment position="end">
                                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                                            ngày
                                        </Typography>
                                    </InputAdornment>
                                ),
                            },
                        }}
                        sx={{
                            width: 105,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '8px',
                                bgcolor: isSameDay ? '#f1f5f9' : '#ffffff',
                                fontWeight: 700,
                            },
                        }}
                    />
                </Paper>
            </RadioGroup>

            {helperText && <FormHelperText sx={{ mx: 0.5 }}>{helperText}</FormHelperText>}
        </FormControl>
    );
};

interface SupplierFormFieldsProps {
    control: Control<SupplierFormValues>;
    missingFields?: SupplierActivationField[];
    isEdit?: boolean;
    onUserEditedCode?: () => void;
}

export const SupplierFormFields = ({
    control,
    missingFields = [],
    isEdit = false,
    onUserEditedCode,
}: SupplierFormFieldsProps) => {
    const [manualCodeEdit, setManualCodeEdit] = useState(false);

    const fieldHelper = (field: SupplierActivationField, defaultText?: string) =>
        isFieldMissing(missingFields, field) ? getActivationFieldHelperText(field) : defaultText;

    const importAllowFromVal = useWatch({ control, name: 'importAllowFrom' });
    const returnCutOffTimeVal = useWatch({ control, name: 'returnCutOffTime' });
    const defaultCostVal = useWatch({ control, name: 'defaultImportCost' });

    const minReturnCutOffTime = importAllowFromVal ? dayjs(`2000-01-01T${importAllowFromVal}`) : undefined;

    const numericCost = Number(defaultCostVal) || 0;
    const discountAmount = numericCost > 0 && numericCost < 10000 ? 10000 - numericCost : 0;
    const commissionRate = numericCost > 0 && numericCost < 10000 ? Math.round((discountAmount / 10000) * 1000) / 10 : 0;

    return (
        <Stack spacing={3}>
            {/* ── CARD 1: Thông tin chung & Pháp lý ── */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
                    <Box
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: '12px',
                            bgcolor: 'rgba(255, 48, 48, 0.08)',
                            color: '#FF3030',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <BusinessOutlinedIcon fontSize="small" />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                            1. Thông tin đối tác & Pháp lý
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Phân loại đối tác, tên định danh, mã hệ thống và mã số thuế
                        </Typography>
                    </Box>
                </Stack>

                <Stack spacing={2.5}>
                    {/* Visual Type Selector (Radio Cards) */}
                    <Box>
                        <Typography variant="caption" fontWeight={700} sx={{ mb: 1, display: 'block', color: '#334155' }}>
                            Loại đối tác nhà cung cấp *
                        </Typography>
                        <Controller
                            name="type"
                            control={control}
                            render={({ field }) => (
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                        gap: 2,
                                    }}
                                >
                                    {/* Option 1: DISTRIBUTOR */}
                                    <Paper
                                        elevation={0}
                                        onClick={() => field.onChange('DISTRIBUTOR')}
                                        sx={{
                                            p: 2,
                                            borderRadius: '12px',
                                            border: field.value === 'DISTRIBUTOR' ? '2px solid #FF3030' : '1px solid #e2e8f0',
                                            bgcolor: field.value === 'DISTRIBUTOR' ? 'rgba(255, 48, 48, 0.04)' : '#ffffff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 1.5,
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                borderColor: field.value === 'DISTRIBUTOR' ? '#FF3030' : '#cbd5e1',
                                                bgcolor: field.value === 'DISTRIBUTOR' ? 'rgba(255, 48, 48, 0.06)' : '#f8fafc',
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: '10px',
                                                bgcolor: field.value === 'DISTRIBUTOR' ? 'rgba(255, 48, 48, 0.12)' : '#f1f5f9',
                                                color: field.value === 'DISTRIBUTOR' ? '#FF3030' : '#64748b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <StorefrontRoundedIcon fontSize="small" />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                                <Typography variant="body2" fontWeight={800} color={field.value === 'DISTRIBUTOR' ? '#0f172a' : '#475569'}>
                                                    Tổng đại lý / Nhà phân phối
                                                </Typography>
                                                <Radio
                                                    checked={field.value === 'DISTRIBUTOR'}
                                                    value="DISTRIBUTOR"
                                                    size="small"
                                                    sx={{ p: 0, color: '#94a3b8', '&.Mui-checked': { color: '#FF3030' } }}
                                                />
                                            </Stack>
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                                Đại lý cấp 1 phân phối nhiều đài, hoa hồng và chiết khấu linh hoạt
                                            </Typography>
                                        </Box>
                                    </Paper>

                                    {/* Option 2: LOTTERY_COMPANY */}
                                    <Paper
                                        elevation={0}
                                        onClick={() => field.onChange('LOTTERY_COMPANY')}
                                        sx={{
                                            p: 2,
                                            borderRadius: '12px',
                                            border: field.value === 'LOTTERY_COMPANY' ? '2px solid #FF3030' : '1px solid #e2e8f0',
                                            bgcolor: field.value === 'LOTTERY_COMPANY' ? 'rgba(255, 48, 48, 0.04)' : '#ffffff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 1.5,
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                borderColor: field.value === 'LOTTERY_COMPANY' ? '#FF3030' : '#cbd5e1',
                                                bgcolor: field.value === 'LOTTERY_COMPANY' ? 'rgba(255, 48, 48, 0.06)' : '#f8fafc',
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: '10px',
                                                bgcolor: field.value === 'LOTTERY_COMPANY' ? 'rgba(255, 48, 48, 0.12)' : '#f1f5f9',
                                                color: field.value === 'LOTTERY_COMPANY' ? '#FF3030' : '#64748b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <AccountBalanceRoundedIcon fontSize="small" />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                                <Typography variant="body2" fontWeight={800} color={field.value === 'LOTTERY_COMPANY' ? '#0f172a' : '#475569'}>
                                                    Công ty Xổ số kiến thiết
                                                </Typography>
                                                <Radio
                                                    checked={field.value === 'LOTTERY_COMPANY'}
                                                    value="LOTTERY_COMPANY"
                                                    size="small"
                                                    sx={{ p: 0, color: '#94a3b8', '&.Mui-checked': { color: '#FF3030' } }}
                                                />
                                            </Stack>
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                                Nhà đài phát hành trực thuộc nhà nước, nhập trực tiếp từ nguồn
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </Box>
                            )}
                        />
                    </Box>

                    {/* Partner Name */}
                    <Controller
                        name="name"
                        control={control}
                        render={({ field, fieldState }) => (
                            <TextField
                                {...field}
                                label="Tên công ty / Tổng đại lý"
                                placeholder="VD: Công ty TNHH MTV Xổ số Kiến thiết Minh Ngọc"
                                fullWidth
                                required
                                error={!!fieldState.error}
                                helperText={fieldState.error?.message}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                        )}
                    />

                    {/* Code & Tax Code Grid */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                            gap: 2.5,
                        }}
                    >
                        {/* Supplier Code */}
                        <Controller
                            name="code"
                            control={control}
                            render={({ field, fieldState }) => (
                                <TextField
                                    {...field}
                                    label="Mã nhà cung cấp"
                                    placeholder="VD: NCC_MINHNGOC"
                                    fullWidth
                                    required
                                    disabled={isEdit || (!manualCodeEdit && !isEdit)}
                                    onChange={(e) => {
                                        const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '');
                                        field.onChange(upper);
                                        onUserEditedCode?.();
                                    }}
                                    error={!!fieldState.error}
                                    helperText={
                                        fieldState.error?.message ||
                                        (isEdit
                                            ? 'Mã nhà cung cấp cố định không thể thay đổi'
                                            : manualCodeEdit
                                            ? 'Đang mở chỉnh sửa mã thủ công'
                                            : 'Tự động tạo từ tên (bấm ổ khóa để sửa thủ công)')
                                    }
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <BadgeOutlinedIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                {!isEdit && (
                                                    <Tooltip title={manualCodeEdit ? 'Khóa mã tự động' : 'Mở khóa chỉnh sửa mã'}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setManualCodeEdit(!manualCodeEdit)}
                                                        >
                                                            {manualCodeEdit ? (
                                                                <LockOpenOutlinedIcon fontSize="small" color="primary" />
                                                            ) : (
                                                                <LockOutlinedIcon fontSize="small" />
                                                            )}
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {field.value && (
                                                    <Tooltip title="Sao chép mã">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(field.value);
                                                                toast.info('Đã sao chép mã NCC');
                                                            }}
                                                        >
                                                            <ContentCopyOutlinedIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '12px',
                                            fontFamily: 'monospace',
                                            fontWeight: 700,
                                        },
                                    }}
                                />
                            )}
                        />

                        {/* Tax Code */}
                        <Controller
                            name="taxCode"
                            control={control}
                            render={({ field, fieldState }) => (
                                <TextField
                                    {...field}
                                    label="Mã số thuế doanh nghiệp"
                                    placeholder="VD: 0312345678"
                                    fullWidth
                                    required
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                />
                            )}
                        />
                    </Box>
                </Stack>
            </Paper>

            {/* ── CARD 2: Thông tin liên hệ & Kho nhận vé ── */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
                    <Box
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: '12px',
                            bgcolor: 'rgba(14, 165, 233, 0.08)',
                            color: '#0ea5e9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <ContactPhoneOutlinedIcon fontSize="small" />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                            2. Thông tin liên hệ & Kho nhận vé
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Người phụ trách giao dịch, số điện thoại, email và kho nhận/trả vé vật lý
                        </Typography>
                    </Box>
                </Stack>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        gap: 2.5,
                    }}
                >
                    <Controller
                        name="contactName"
                        control={control}
                        render={({ field, fieldState }) => (
                            <TextField
                                {...field}
                                label="Người đại diện / phụ trách"
                                placeholder="VD: Nguyễn Văn An"
                                fullWidth
                                error={!!fieldState.error}
                                helperText={fieldState.error?.message}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PersonOutlineOutlinedIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                        )}
                    />

                    <Box data-activation-field="contactPhone">
                        <Controller
                            name="contactPhone"
                            control={control}
                            render={({ field, fieldState }) => {
                                const activationMissing = isFieldMissing(missingFields, 'CONTACT_PHONE');
                                return (
                                    <TextField
                                        {...field}
                                        label="Số điện thoại liên hệ chính"
                                        placeholder="VD: 0901234567"
                                        fullWidth
                                        required
                                        error={!!fieldState.error || activationMissing}
                                        helperText={fieldState.error?.message || fieldHelper('CONTACT_PHONE')}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <PhoneIphoneOutlinedIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            ...missingFieldInputSx(activationMissing),
                                            '& .MuiOutlinedInput-root': { borderRadius: '12px' },
                                        }}
                                    />
                                );
                            }}
                        />
                    </Box>

                    <Box sx={{ gridColumn: { md: 'span 2' } }}>
                        <Controller
                            name="contactEmail"
                            control={control}
                            render={({ field, fieldState }) => (
                                <TextField
                                    {...field}
                                    label="Email nhận thông báo & đối soát"
                                    placeholder="VD: doisoat@veminhngoc.com.vn"
                                    fullWidth
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <EmailOutlinedIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                />
                            )}
                        />
                    </Box>

                    <Box sx={{ gridColumn: { md: 'span 2' } }} data-activation-field="address">
                        <Controller
                            name="address"
                            control={control}
                            render={({ field, fieldState }) => {
                                const activationMissing = isFieldMissing(missingFields, 'ADDRESS');
                                return (
                                    <TextField
                                        {...field}
                                        label="Địa chỉ trụ sở / Kho nhận & trả vé"
                                        placeholder="VD: 123 Đường Nguyễn Trãi, Phường 2, Quận 5, TP. Hồ Chí Minh"
                                        fullWidth
                                        required
                                        multiline
                                        minRows={2}
                                        error={!!fieldState.error || activationMissing}
                                        helperText={fieldState.error?.message || fieldHelper('ADDRESS')}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.25 }}>
                                                    <PlaceOutlinedIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            ...missingFieldInputSx(activationMissing),
                                            '& .MuiOutlinedInput-root': { borderRadius: '12px' },
                                        }}
                                    />
                                );
                            }}
                        />
                    </Box>
                </Box>
            </Paper>

            {/* ── CARD 3: Chính sách Giá vốn & Chiết khấu ── */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
                    <Box
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: '12px',
                            bgcolor: 'rgba(16, 185, 129, 0.08)',
                            color: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <PaymentsOutlinedIcon fontSize="small" />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                            3. Chính sách Giá vốn & Thanh toán
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Đơn giá vốn mặc định mỗi vé và kỳ hạn quyết toán công nợ
                        </Typography>
                    </Box>
                </Stack>

                <Stack spacing={3}>
                    {/* Default Import Cost + Presets */}
                    <Box data-activation-field="defaultImportCost">
                        <Controller
                            name="defaultImportCost"
                            control={control}
                            render={({ field, fieldState }) => {
                                const activationMissing = isFieldMissing(missingFields, 'DEFAULT_IMPORT_COST');
                                return (
                                    <Box>
                                        <TextField
                                            name={field.name}
                                            onBlur={field.onBlur}
                                            inputRef={field.ref}
                                            value={formatViInteger(field.value)}
                                            label="Giá vốn mặc định mỗi vé *"
                                            fullWidth
                                            required
                                            error={!!fieldState.error || activationMissing}
                                            helperText={
                                                fieldState.error?.message ||
                                                fieldHelper('DEFAULT_IMPORT_COST', 'Đơn giá vốn áp dụng mặc định khi tạo lô nhập vé từ nhà cung cấp')
                                            }
                                            onChange={(e) => {
                                                field.onChange(parseNonNegativeIntegerInput(e.target.value));
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                                    e.preventDefault();
                                                }
                                            }}
                                            onWheel={preventNumberInputWheel}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <PaymentsOutlinedIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <Typography variant="body2" fontWeight={700} color="text.secondary">
                                                            VNĐ / vé
                                                        </Typography>
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                ...missingFieldInputSx(activationMissing),
                                                '& .MuiOutlinedInput-root': { borderRadius: '12px' },
                                            }}
                                        />

                                        {/* Quick Price Presets */}
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                Chọn nhanh mức giá:
                                            </Typography>
                                            {QUICK_PRICE_PRESETS.map((preset) => (
                                                <Chip
                                                    key={preset}
                                                    size="small"
                                                    label={`${formatViInteger(preset)} đ`}
                                                    onClick={() => field.onChange(preset)}
                                                    variant={Number(field.value) === preset ? 'filled' : 'outlined'}
                                                    sx={{
                                                        fontWeight: 700,
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                        bgcolor: Number(field.value) === preset ? '#FF3030' : '#ffffff',
                                                        color: Number(field.value) === preset ? '#ffffff' : '#475569',
                                                        borderColor: Number(field.value) === preset ? '#FF3030' : '#e2e8f0',
                                                        '&:hover': {
                                                            bgcolor: Number(field.value) === preset ? '#e02828' : '#f1f5f9',
                                                        },
                                                    }}
                                                />
                                            ))}
                                        </Stack>

                                        {/* Dynamic Commission Estimation Box */}
                                        {numericCost > 0 && (
                                            <Paper
                                                elevation={0}
                                                sx={{
                                                    mt: 1.5,
                                                    p: 1.5,
                                                    px: 2,
                                                    borderRadius: '10px',
                                                    bgcolor: '#f0fdf4',
                                                    border: '1px solid #bbf7d0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1.5,
                                                }}
                                            >
                                                <PercentOutlinedIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                                                <Typography variant="caption" color="#15803d" fontWeight={700}>
                                                    Hoa hồng ước tính theo mệnh giá 10.000đ:{' '}
                                                    <Box component="span" sx={{ fontSize: '0.85rem', fontWeight: 800 }}>
                                                        {commissionRate}%
                                                    </Box>{' '}
                                                    ({formatViInteger(discountAmount)} đ/vé)
                                                </Typography>
                                            </Paper>
                                        )}
                                    </Box>
                                );
                            }}
                        />
                    </Box>

                    {/* Payment Term Mode */}
                    <Box data-activation-field="paymentTermDays">
                        <Controller
                            name="paymentTermDays"
                            control={control}
                            render={({ field, fieldState }) => {
                                const activationMissing = isFieldMissing(missingFields, 'PAYMENT_TERM_DAYS');
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
                </Stack>
            </Paper>

            {/* ── CARD 4: Khung giờ vận hành hàng ngày (Timeline) ── */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
                    <Box
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: '12px',
                            bgcolor: 'rgba(245, 158, 11, 0.08)',
                            color: '#f59e0b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <AccessTimeOutlinedIcon fontSize="small" />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                            4. Khung giờ vận hành hàng ngày
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Chuỗi thời gian nhận vé, trả ế và đối soát công nợ trong ngày
                        </Typography>
                    </Box>
                </Stack>

                <Stack spacing={2.5}>
                    {/* Operational Time Windows Grid */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                            gap: 2,
                            p: 2.5,
                            borderRadius: '14px',
                            bgcolor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                        }}
                    >
                        {/* Step 1: Import allow from */}
                        <Box>
                            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
                                <Chip
                                    size="small"
                                    label="1. Mở nhận vé"
                                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#e0f2fe', color: '#0369a1' }}
                                />
                            </Stack>
                            <Controller
                                name="importAllowFrom"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <AdminTimePicker
                                        label="Giờ cho phép nhập vé *"
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
                                                    'Bắt đầu được tạo phiếu nhập kho',
                                                InputLabelProps: { shrink: true },
                                                sx: { '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#fff' } },
                                            },
                                        }}
                                    />
                                )}
                            />
                        </Box>

                        {/* Step 2: Return cut-off time */}
                        <Box>
                            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
                                <Chip
                                    size="small"
                                    label="2. Hạn trả vé ế"
                                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#fef3c7', color: '#b45309' }}
                                />
                            </Stack>
                            <Controller
                                name="returnCutOffTime"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <AdminTimePicker
                                        label="Hạn trả vé vật lý *"
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
                                                    'Hạn chót trả vé ế cho nhà cung cấp',
                                                InputLabelProps: { shrink: true },
                                                sx: { '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#fff' } },
                                            },
                                        }}
                                    />
                                )}
                            />
                        </Box>

                        {/* Step 3: Payment cut-off time */}
                        <Box>
                            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
                                <Chip
                                    size="small"
                                    label="3. Giờ đối soát"
                                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#dcfce7', color: '#15803d' }}
                                />
                            </Stack>
                            <Controller
                                name="paymentCutOffTime"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <AdminTimePicker
                                        label="Giờ đối soát & thanh toán"
                                        value={field.value ? dayjs(`2000-01-01T${field.value}`) : null}
                                        readOnly
                                        disabled
                                        localeText={{ cancelButtonLabel: 'Hủy' }}
                                        slotProps={{
                                            textField: {
                                                fullWidth: true,
                                                error: !!fieldState.error,
                                                helperText:
                                                    fieldState.error?.message ||
                                                    'Khung giờ chốt đối soát hàng ngày',
                                                InputLabelProps: { shrink: true },
                                                sx: { '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#f1f5f9' } },
                                            },
                                        }}
                                    />
                                )}
                            />
                        </Box>
                    </Box>

                    {/* Operational Time Logic Note */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
                        <InfoOutlinedIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                        <Typography variant="caption" color="text.secondary">
                            Hạn chót trả vé ế bắt buộc phải sau giờ mở nhận vé để đảm bảo chu trình phân phối và hoàn trả diễn ra hợp lệ.
                        </Typography>
                    </Box>
                </Stack>
            </Paper>
        </Stack>
    );
};
