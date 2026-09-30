"use client";

import { useEffect, useState } from 'react';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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
    resolved?: boolean;
    draftOnly?: boolean;
    onBackToEdit?: () => void;
    onResolve: (payload: { note?: string; markResolved: boolean }) => void;
}

export const UnitPriceDiscrepancyPanel = ({
    settlement,
    afterCommissionUnitPrice,
    submitting,
    direction,
    difference,
    resolved = false,
    draftOnly = false,
    onBackToEdit,
    onResolve,
}: Props) => {
    const [note, setNote] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [expanded, setExpanded] = useState(!resolved);
    useEffect(() => {
        if (resolved) setExpanded(false);
    }, [resolved]);
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

    if (resolved && !expanded) {
        return (
            <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: '12px', borderColor: '#bbf7d0', bgcolor: '#f0fdf4' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
                    <Stack direction="row" spacing={1.25} alignItems="center">
                        <CheckCircleOutlinedIcon sx={{ color: '#16a34a' }} />
                        <Box>
                            <Typography variant="subtitle2" fontWeight={800} color="#166534">
                                {draftOnly ? 'Đã xác nhận tạm' : 'Đã xác nhận'} {isIncrease ? 'tăng giá nhập' : 'giảm giá nhập'}
                            </Typography>
                            <Typography variant="caption" color="#15803d">
                                Giá đối chiếu {formatSettlementMoney(reconciled)} VNĐ/vé · Ảnh hưởng {impact > 0 ? '+' : ''}{formatSettlementMoney(impact)} VNĐ
                                {draftOnly ? ' · Chưa lưu lên hệ thống' : ''}
                            </Typography>
                        </Box>
                    </Stack>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackOutlinedIcon />}
                        onClick={() => {
                            onBackToEdit?.();
                            setExpanded(true);
                        }}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '9px' }}
                    >
                        Quay lại
                    </Button>
                </Stack>
            </Paper>
        );
    }

    return (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px', borderColor: resolved ? '#bbf7d0' : '#fde68a', bgcolor: resolved ? '#f7fef9' : '#fffbeb' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
                <PaymentsOutlinedIcon sx={{ color: '#d97706' }} />
                <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                    {noAfterCommissionGap
                        ? 'Xác nhận giá vốn sau hoa hồng'
                        : isIncrease ? 'Xử lý tăng giá nhập' : 'Xử lý giảm giá nhập'}
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

            <Stack direction="row" justifyContent="flex-end">
                <Button
                    variant="contained"
                    startIcon={<CheckCircleOutlinedIcon />}
                    disabled={submitting}
                    onClick={() => setConfirmOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '10px', bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }}
                >
                    {submitting ? 'Đang ghi nhận...' : noAfterCommissionGap
                        ? 'Xác nhận đã khớp giá sau HH'
                        : isIncrease ? 'Xác nhận tăng giá' : 'Xác nhận giảm giá'}
                </Button>
            </Stack>
            <Dialog open={confirmOpen} onClose={() => !submitting && setConfirmOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Xác nhận điều chỉnh giá nhập?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        Thông tin sẽ được giữ tạm trên màn hình, chưa lưu lên hệ thống. Giá đối chiếu <strong>{formatSettlementMoney(reconciled)} VNĐ/vé</strong>,
                        {' '}ảnh hưởng <strong>{impact > 0 ? '+' : ''}{formatSettlementMoney(impact)} VNĐ</strong> trên
                        {' '}{netQty.toLocaleString('vi-VN')} vé ròng. Dữ liệu chỉ được gửi khi bấm Hoàn tất xử lý.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button disabled={submitting} onClick={() => setConfirmOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        disabled={submitting}
                        startIcon={<CheckCircleOutlinedIcon />}
                        onClick={() => {
                            onResolve({ note: note.trim() || undefined, markResolved: true });
                            setConfirmOpen(false);
                        }}
                        sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }}
                    >
                        {submitting ? 'Đang xác nhận...' : 'Xác nhận'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};
