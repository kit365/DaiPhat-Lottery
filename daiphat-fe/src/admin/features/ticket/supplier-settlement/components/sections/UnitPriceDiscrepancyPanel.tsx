"use client";

import { useState } from 'react';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import {
    Alert,
    Box,
    Button,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import type { SupplierSettlement } from '../../types/supplierSettlement.type';
import { formatSettlementMoney } from '../../utils/settlementCashflow';

interface Props {
    settlement: SupplierSettlement;
    afterCommissionUnitPrice?: number | null;
    submitting?: boolean;
    direction: 'POSITIVE' | 'NEGATIVE';
    difference?: number;
    onResolve: (payload: { note?: string; markResolved: boolean }) => void;
}

export const UnitPriceDiscrepancyPanel = ({
    settlement,
    afterCommissionUnitPrice,
    submitting,
    direction,
    difference,
    onResolve,
}: Props) => {
    const [note, setNote] = useState('');
    const storedOriginal = Number(settlement.originalTicketUnitPrice ?? 0);
    const original = Number(afterCommissionUnitPrice ?? storedOriginal);
    const reconciled = Number(settlement.reconciledTicketUnitPrice ?? settlement.actualTicketPrice ?? original);
    const delta = difference != null && Number.isFinite(Number(difference))
        ? Number(difference)
        : reconciled - original;
    const isIncrease = direction === 'POSITIVE';
    const netQty =
        Number(settlement.actualTicketImportQuantity ?? 0) - Number(settlement.actualReturnTicketQuantity ?? 0);
    const impact = delta * netQty;
    const facePrice = storedOriginal > 0 && Math.abs(storedOriginal - original) > 0.5
        ? storedOriginal
        : null;
    const noAfterCommissionGap = Math.abs(delta) < 0.5;

    return (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px', borderColor: '#fde68a', bgcolor: '#fffbeb' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
                <PaymentsOutlinedIcon sx={{ color: '#d97706' }} />
                <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                    {noAfterCommissionGap
                        ? 'Xác nhận giá vốn sau hoa hồng'
                        : isIncrease ? 'Xử lý tăng giá nhập (dương)' : 'Xử lý giảm giá nhập (âm)'}
                </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {noAfterCommissionGap
                    ? 'Giá đối chiếu đã khớp giá vốn sau hoa hồng đài. Chênh 10.000đ là giá nhập mệnh giá, không phải giảm giá phải trả NCC.'
                    : isIncrease
                    ? 'Giá đối chiếu > giá vốn sau hoa hồng đài (actual − system > 0). Ghi nhận tăng phải trả NCC.'
                    : 'Giá đối chiếu < giá vốn sau hoa hồng đài (actual − system < 0). Ghi nhận giảm phải trả NCC.'}
                {' '}Thao tác này không đánh dấu chênh lệch số lượng nhập/trả là đã xử lý.
            </Typography>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                    gap: 1.5,
                    mb: 2,
                }}
            >
                <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#ffffff', border: '1px solid #f1f5f9' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        Giá vốn sau HH (hệ thống)
                    </Typography>
                    <Typography fontWeight={800}>{formatSettlementMoney(original)} VNĐ</Typography>
                    {facePrice != null && (
                        <Typography variant="caption" color="#94a3b8" sx={{ display: 'block', mt: 0.5 }}>
                            Giá nhập mệnh giá {formatSettlementMoney(facePrice)} VNĐ × (1 − HH)
                        </Typography>
                    )}
                </Box>
                <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#ffffff', border: '1px solid #fde68a' }}>
                    <Typography variant="caption" color="#b45309" fontWeight={700}>
                        Giá đối chiếu
                    </Typography>
                    <Typography fontWeight={800} color="#b45309">
                        {formatSettlementMoney(reconciled)} VNĐ
                    </Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#ffffff', border: '1px solid #fecaca' }}>
                    <Typography variant="caption" color="#991b1b" fontWeight={700}>
                        Ảnh hưởng (Δ giá × SL ròng)
                    </Typography>
                    <Typography fontWeight={800} color={impact >= 0 ? '#b91c1c' : '#15803d'}>
                        {impact > 0 ? '+' : ''}
                        {formatSettlementMoney(impact)} VNĐ
                    </Typography>
                </Box>
            </Box>

            <TextField
                fullWidth
                size="small"
                label="Ghi chú điều chỉnh giá"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                sx={{ mb: 2, bgcolor: '#ffffff' }}
            />

            <Alert severity="info" sx={{ mb: 2, borderRadius: '10px' }}>
                Δ mỗi vé: {delta > 0 ? '+' : ''}
                {formatSettlementMoney(delta)} VNĐ · SL ròng đối chiếu: {netQty.toLocaleString('vi-VN')} vé.
            </Alert>

            <Stack direction="row" justifyContent="flex-end">
                <Button
                    variant="contained"
                    startIcon={<CheckCircleOutlinedIcon />}
                    disabled={submitting}
                    onClick={() => onResolve({ note: note.trim() || undefined, markResolved: true })}
                    sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '10px', bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }}
                >
                    {submitting ? 'Đang ghi nhận...' : noAfterCommissionGap
                        ? 'Xác nhận đã khớp giá sau HH'
                        : isIncrease ? 'Xác nhận tăng giá (dương)' : 'Xác nhận giảm giá (âm)'}
                </Button>
            </Stack>
        </Paper>
    );
};
