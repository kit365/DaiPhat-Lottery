"use client";

import {
    Avatar,
    Box,
    Chip,
    Divider,
    FormControlLabel,
    LinearProgress,
    Paper,
    Stack,
    Switch,
    Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import { Button } from '../../../../components/ui/Button';
import { SupplierFormValues } from '../../schemas/supplier.schema';
import {
    getMissingSupplierFields,
    scrollToFirstMissingField,
    SupplierActivationField,
} from '../../utils/supplier-activation';
import { formatViInteger } from '../../utils/supplierNumberFields';
import { SUPPLIER_TYPE_LABELS } from '../../utils/supplierLabels';

interface SupplierSidebarPanelProps {
    values: SupplierFormValues;
    onActiveToggle: (nextActive: boolean) => void;
    onSubmit: () => void;
    onCancel: () => void;
    isPending: boolean;
    isEdit?: boolean;
}

export const SupplierSidebarPanel = ({
    values,
    onActiveToggle,
    onSubmit,
    onCancel,
    isPending,
    isEdit = false,
}: SupplierSidebarPanelProps) => {
    const missingFields = getMissingSupplierFields(values);
    const totalConditions = 4;
    const metCount = totalConditions - missingFields.length;
    const isReady = metCount === totalConditions;
    const progressPercent = Math.round((metCount / totalConditions) * 100);

    const hasPhone = !missingFields.includes('CONTACT_PHONE');
    const hasAddress = !missingFields.includes('ADDRESS');
    const hasCost = !missingFields.includes('DEFAULT_IMPORT_COST');
    const hasTerm = !missingFields.includes('PAYMENT_TERM_DAYS');

    const getInitials = (name?: string) => {
        if (!name?.trim()) return 'NC';
        const words = name.trim().split(/\s+/);
        if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    };

    const costVal = Number(values.defaultImportCost) || 0;
    const commissionPct = costVal > 0 && costVal < 10000 ? Math.round(((10000 - costVal) / 10000) * 1000) / 10 : 0;

    return (
        <Stack spacing={3} sx={{ position: { lg: 'sticky' }, top: { lg: 24 } }}>
            {/* ── CARD 1: Partner Profile Preview ── */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                }}
            >
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                    <Avatar
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, #FF3030 0%, #ff6b6b 100%)',
                            fontWeight: 800,
                            fontSize: '1.1rem',
                            color: '#ffffff',
                            boxShadow: '0 4px 12px rgba(255, 48, 48, 0.25)',
                        }}
                    >
                        {getInitials(values.name)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            variant="subtitle1"
                            fontWeight={800}
                            color="#0f172a"
                            noWrap
                            title={values.name || 'Tên nhà cung cấp'}
                        >
                            {values.name || 'Nhà cung cấp mới'}
                        </Typography>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
                            <Chip
                                size="small"
                                label={values.code || 'CHƯA CÓ MÃ'}
                                sx={{
                                    height: 22,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    fontFamily: 'monospace',
                                    bgcolor: '#f1f5f9',
                                    color: '#475569',
                                }}
                            />
                            <Chip
                                size="small"
                                icon={
                                    values.type === 'LOTTERY_COMPANY' ? (
                                        <AccountBalanceRoundedIcon sx={{ fontSize: '13px !important' }} />
                                    ) : (
                                        <StorefrontRoundedIcon sx={{ fontSize: '13px !important' }} />
                                    )
                                }
                                label={values.type === 'LOTTERY_COMPANY' ? 'Nhà đài' : 'Tổng đại lý'}
                                sx={{
                                    height: 22,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    bgcolor: values.type === 'LOTTERY_COMPANY' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    color: values.type === 'LOTTERY_COMPANY' ? '#1d4ed8' : '#b45309',
                                }}
                            />
                        </Stack>
                    </Box>
                </Stack>

                <Divider sx={{ my: 1.5, borderColor: '#f1f5f9' }} />

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: '12px',
                        bgcolor: '#f8fafc',
                    }}
                >
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                            Giá vốn mặc định
                        </Typography>
                        <Typography variant="body2" fontWeight={800} color="#0f172a">
                            {costVal > 0 ? `${formatViInteger(costVal)} đ` : '—'}
                        </Typography>
                        {commissionPct > 0 && (
                            <Typography variant="caption" fontWeight={700} color="#16a34a">
                                HH ~{commissionPct}%
                            </Typography>
                        )}
                    </Box>

                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                            Kỳ hạn thanh toán
                        </Typography>
                        <Typography variant="body2" fontWeight={800} color="#0f172a">
                            {Number(values.paymentTermDays) === 0 ? 'Trong ngày' : `${values.paymentTermDays ?? 0} ngày`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {Number(values.paymentTermDays) === 0 ? 'Quyết toán ngày' : 'Gối đầu theo kỳ'}
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            {/* ── CARD 2: Activation & Readiness Meter ── */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                }}
            >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                        Trạng thái hoạt động
                    </Typography>
                    <FormControlLabel
                        sx={{ m: 0 }}
                        control={
                            <Switch
                                checked={values.isActive}
                                onChange={(e) => onActiveToggle(e.target.checked)}
                                color="primary"
                            />
                        }
                        label={
                            <Chip
                                size="small"
                                label={values.isActive ? 'Hoạt động' : 'Tạm dừng'}
                                sx={{
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    height: 24,
                                    bgcolor: values.isActive ? '#dcfce7' : '#f1f5f9',
                                    color: values.isActive ? '#15803d' : '#64748b',
                                }}
                            />
                        }
                    />
                </Stack>

                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    {values.isActive
                        ? 'Nhà cung cấp đang được phép tạo phiếu nhập vé và đối soát.'
                        : 'Nhà cung cấp bị tạm dừng giao dịch và tạo phiếu mới.'}
                </Typography>

                <Box sx={{ mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                        <Typography variant="caption" fontWeight={700} color="#475569">
                            Độ sẵn sàng kích hoạt
                        </Typography>
                        <Typography
                            variant="caption"
                            fontWeight={800}
                            color={isReady ? '#16a34a' : '#ea580c'}
                        >
                            {metCount}/{totalConditions} điều kiện ({progressPercent}%)
                        </Typography>
                    </Stack>
                    <LinearProgress
                        variant="determinate"
                        value={progressPercent}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: '#f1f5f9',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                bgcolor: isReady ? '#16a34a' : '#ea580c',
                            },
                        }}
                    />
                </Box>

                {/* 4 Conditions Checklist */}
                <Stack spacing={1}>
                    <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        onClick={() => !hasPhone && scrollToFirstMissingField(['CONTACT_PHONE'])}
                        sx={{
                            p: 1,
                            borderRadius: '8px',
                            bgcolor: hasPhone ? 'rgba(22, 163, 74, 0.04)' : 'rgba(234, 88, 12, 0.05)',
                            cursor: hasPhone ? 'default' : 'pointer',
                            '&:hover': !hasPhone ? { bgcolor: 'rgba(234, 88, 12, 0.1)' } : undefined,
                        }}
                    >
                        {hasPhone ? (
                            <CheckCircleRoundedIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                        ) : (
                            <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: '#ea580c' }} />
                        )}
                        <Typography
                            variant="caption"
                            fontWeight={hasPhone ? 600 : 700}
                            color={hasPhone ? '#334155' : '#ea580c'}
                        >
                            Số điện thoại liên hệ
                        </Typography>
                    </Stack>

                    <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        onClick={() => !hasAddress && scrollToFirstMissingField(['ADDRESS'])}
                        sx={{
                            p: 1,
                            borderRadius: '8px',
                            bgcolor: hasAddress ? 'rgba(22, 163, 74, 0.04)' : 'rgba(234, 88, 12, 0.05)',
                            cursor: hasAddress ? 'default' : 'pointer',
                            '&:hover': !hasAddress ? { bgcolor: 'rgba(234, 88, 12, 0.1)' } : undefined,
                        }}
                    >
                        {hasAddress ? (
                            <CheckCircleRoundedIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                        ) : (
                            <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: '#ea580c' }} />
                        )}
                        <Typography
                            variant="caption"
                            fontWeight={hasAddress ? 600 : 700}
                            color={hasAddress ? '#334155' : '#ea580c'}
                        >
                            Địa chỉ trụ sở / kho giao nhận
                        </Typography>
                    </Stack>

                    <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        onClick={() => !hasCost && scrollToFirstMissingField(['DEFAULT_IMPORT_COST'])}
                        sx={{
                            p: 1,
                            borderRadius: '8px',
                            bgcolor: hasCost ? 'rgba(22, 163, 74, 0.04)' : 'rgba(234, 88, 12, 0.05)',
                            cursor: hasCost ? 'default' : 'pointer',
                            '&:hover': !hasCost ? { bgcolor: 'rgba(234, 88, 12, 0.1)' } : undefined,
                        }}
                    >
                        {hasCost ? (
                            <CheckCircleRoundedIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                        ) : (
                            <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: '#ea580c' }} />
                        )}
                        <Typography
                            variant="caption"
                            fontWeight={hasCost ? 600 : 700}
                            color={hasCost ? '#334155' : '#ea580c'}
                        >
                            Giá vốn mặc định &gt; 0đ
                        </Typography>
                    </Stack>

                    <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        onClick={() => !hasTerm && scrollToFirstMissingField(['PAYMENT_TERM_DAYS'])}
                        sx={{
                            p: 1,
                            borderRadius: '8px',
                            bgcolor: hasTerm ? 'rgba(22, 163, 74, 0.04)' : 'rgba(234, 88, 12, 0.05)',
                            cursor: hasTerm ? 'default' : 'pointer',
                            '&:hover': !hasTerm ? { bgcolor: 'rgba(234, 88, 12, 0.1)' } : undefined,
                        }}
                    >
                        {hasTerm ? (
                            <CheckCircleRoundedIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                        ) : (
                            <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: '#ea580c' }} />
                        )}
                        <Typography
                            variant="caption"
                            fontWeight={hasTerm ? 600 : 700}
                            color={hasTerm ? '#334155' : '#ea580c'}
                        >
                            Kỳ hạn thanh toán (≥ 0 ngày)
                        </Typography>
                    </Stack>
                </Stack>
            </Paper>

            {/* ── CARD 3: Actions ── */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                }}
            >
                <Stack spacing={1.5}>
                    <Button
                        type="button"
                        variant="contained"
                        loading={isPending}
                        startIcon={<SaveOutlinedIcon />}
                        onClick={onSubmit}
                        fullWidth
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 800,
                            py: 1.4,
                            bgcolor: '#FF3030',
                            color: '#ffffff',
                            fontSize: '0.95rem',
                            boxShadow: '0 4px 14px rgba(255, 48, 48, 0.3)',
                            '&:hover': { bgcolor: '#e02828' },
                        }}
                    >
                        {isPending
                            ? 'Đang lưu...'
                            : isEdit
                            ? 'Lưu thay đổi đối tác'
                            : 'Tạo nhà cung cấp'}
                    </Button>

                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackOutlinedIcon />}
                        onClick={onCancel}
                        fullWidth
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 700,
                            py: 1.2,
                            color: '#475569',
                            borderColor: '#cbd5e1',
                            '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                        }}
                    >
                        Hủy bỏ
                    </Button>
                </Stack>
            </Paper>
        </Stack>
    );
};
