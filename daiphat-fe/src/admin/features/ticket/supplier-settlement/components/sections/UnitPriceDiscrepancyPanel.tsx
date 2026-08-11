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
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';

interface Props {
    settlement: SupplierSettlement;
    submitting?: boolean;
    direction: 'POSITIVE' | 'NEGATIVE';
    difference?: number;
    onResolve: (payload: { note?: string; markResolved: boolean }) => void;
}

export const UnitPriceDiscrepancyPanel = ({ settlement, submitting, direction, difference, onResolve }: Props) => {
    const [note, setNote] = useState('');
    const original = Number(settlement.originalTicketUnitPrice ?? 0);
    const reconciled = Number(settlement.reconciledTicketUnitPrice ?? settlement.actualTicketPrice ?? original);
    const delta = difference != null ? Number(difference) : reconciled - original;
    const isIncrease = direction === 'POSITIVE';
    const netQty =
        Number(settlement.actualTicketImportQuantity ?? 0) - Number(settlement.actualReturnTicketQuantity ?? 0);
    const impact = delta * netQty;

    return (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px', borderColor: '#fde68a', bgcolor: '#fffbeb' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
                <PaymentsOutlinedIcon sx={{ color: '#d97706' }} />
                <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                    {isIncrease ? 'Xử lý tăng giá nhập (dương)' : 'Xử lý giảm giá nhập (âm)'}
                </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {isIncrease
                    ? 'Giá đối chiếu > giá hệ thống (actual − system > 0). Ghi nhận tăng phải trả NCC.'
                    : 'Giá đối chiếu < giá hệ thống (actual − system < 0). Ghi nhận giảm phải trả NCC.'}
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
                        Giá hệ thống
                    </Typography>
                    <Typography fontWeight={800}>{formatImportCost(original)} VNĐ</Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#ffffff', border: '1px solid #fde68a' }}>
                    <Typography variant="caption" color="#b45309" fontWeight={700}>
                        Giá đối chiếu
                    </Typography>
                    <Typography fontWeight={800} color="#b45309">
                        {formatImportCost(reconciled)} VNĐ
                    </Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#ffffff', border: '1px solid #fecaca' }}>
                    <Typography variant="caption" color="#991b1b" fontWeight={700}>
                        Ảnh hưởng (Δ giá × SL ròng)
                    </Typography>
                    <Typography fontWeight={800} color={impact >= 0 ? '#b91c1c' : '#15803d'}>
                        {impact > 0 ? '+' : ''}
                        {formatImportCost(impact)} VNĐ
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
                {formatImportCost(delta)} VNĐ · SL ròng đối chiếu: {netQty.toLocaleString('vi-VN')} vé.
            </Alert>

            <Stack direction="row" justifyContent="flex-end">
                <Button
                    variant="contained"
                    startIcon={<CheckCircleOutlinedIcon />}
                    disabled={submitting}
                    onClick={() => onResolve({ note: note.trim() || undefined, markResolved: true })}
                    sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '10px', bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }}
                >
                    {submitting ? 'Đang ghi nhận...' : isIncrease ? 'Xác nhận tăng giá (dương)' : 'Xác nhận giảm giá (âm)'}
                </Button>
            </Stack>
        </Paper>
    );
};
