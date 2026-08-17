"use client";

import { useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import type {
    SettlementAdjustmentReasonCode,
    SupplierSettlementAdjustment,
} from '../../types/supplierSettlement.type';
import {
    formatSettlementMoney,
    formatSignedCashflow,
    toAgencyCashflow,
    toSupplierPayableDelta,
} from '../../utils/settlementCashflow';

const MONETARY_REASONS: Array<{ value: SettlementAdjustmentReasonCode; label: string }> = [
    { value: 'SHIPPING_FEE', label: 'Phí vận chuyển (−)' },
    { value: 'LATE_PENALTY', label: 'Phạt chậm (−)' },
    { value: 'DISCOUNT', label: 'Chiết khấu / giảm trừ (+)' },
    { value: 'OTHER', label: 'Khác (±)' },
];

interface Props {
    adjustments: SupplierSettlementAdjustment[];
    receiptUrl?: string | null;
    submitting?: boolean;
    readOnly?: boolean;
    onAdd: (payload: { amount: number; reasonCode: SettlementAdjustmentReasonCode; note: string }) => void;
}

export const SettlementMonetaryAdjustmentPanel = ({
    adjustments,
    receiptUrl,
    submitting,
    readOnly,
    onAdd,
}: Props) => {
    const locked = Boolean(readOnly) || !receiptUrl || !String(receiptUrl).trim();
    const [amount, setAmount] = useState('');
    const [reasonCode, setReasonCode] = useState<SettlementAdjustmentReasonCode>('SHIPPING_FEE');
    const [note, setNote] = useState('');

    const settlementRows = useMemo(
        () => (adjustments || []).filter((a) => a.groupType === 'SETTLEMENT'),
        [adjustments]
    );

    const parsedAmount = Number(String(amount).replace(/,/g, '').trim());
    const canSubmit = !locked && Number.isFinite(parsedAmount) && parsedAmount !== 0 && note.trim().length > 0;

    return (
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
                Điều chỉnh thanh toán (SETTLEMENT)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Dương (+) = đại lý dư / giảm chi · Âm (−) = đại lý mất tiền / phát sinh chi phí. Không ghi đè giá trị ước tính ban đầu.
            </Typography>

            {locked && !readOnly && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: '12px' }}>
                    Kỳ đối soát đang khóa điều chỉnh tiền cho đến khi Admin tải biên lai đối soát.
                </Alert>
            )}

            {!readOnly && (
            <Stack spacing={1.5} sx={{ mb: 2.5, opacity: locked ? 0.55 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                        label="Số tiền điều chỉnh"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        fullWidth
                        size="small"
                        helperText="Ví dụ: 50000 hoặc -20000"
                    />
                    <FormControl fullWidth size="small">
                        <InputLabel>Loại điều chỉnh</InputLabel>
                        <Select
                            label="Loại điều chỉnh"
                            value={reasonCode}
                            onChange={(e) => setReasonCode(e.target.value as SettlementAdjustmentReasonCode)}
                        >
                            {MONETARY_REASONS.map((r) => (
                                <MenuItem key={r.value} value={r.value}>
                                    {r.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
                <TextField
                    label="Lý do chi tiết"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                />
                <Box>
                    <Button
                        variant="contained"
                        startIcon={<SaveOutlinedIcon />}
                        disabled={!canSubmit || !!submitting}
                        onClick={() =>
                            onAdd({
                                amount: toSupplierPayableDelta(parsedAmount),
                                reasonCode,
                                note: note.trim(),
                            })
                        }
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
                    >
                        Thêm điều chỉnh
                    </Button>
                </Box>
            </Stack>
            )}

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Lịch sử điều chỉnh tiền ({settlementRows.length})
            </Typography>
            {settlementRows.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    Chưa có điều chỉnh thanh toán.
                </Typography>
            ) : (
                <Stack spacing={1}>
                    {settlementRows.map((row) => (
                        <Box
                            key={row.id}
                            sx={{
                                p: 1.25,
                                borderRadius: '10px',
                                bgcolor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                            }}
                        >
                            <Typography variant="body2" fontWeight={700}>
                                {row.reasonCode === 'OTHER' && row.customName
                                    ? row.customName
                                    : (row.reasonLabel || row.reasonCode)}
                                : {formatSignedCashflow(toAgencyCashflow(row.amount), formatSettlementMoney)} VNĐ
                            </Typography>
                            {row.note && (
                                <Typography variant="caption" color="text.secondary">
                                    {row.note}
                                </Typography>
                            )}
                        </Box>
                    ))}
                </Stack>
            )}
        </Paper>
    );
};
