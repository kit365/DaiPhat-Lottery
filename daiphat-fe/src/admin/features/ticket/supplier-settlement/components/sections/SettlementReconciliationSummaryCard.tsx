"use client";

import { useMemo } from 'react';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import TrendingFlatOutlinedIcon from '@mui/icons-material/TrendingFlatOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import {
    Box,
    Button,
    Chip,
    Grid,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import type { SupplierSettlement } from '../../types/supplierSettlement.type';

interface SettlementReconciliationSummaryCardProps {
    settlement: SupplierSettlement;
    onEditMatching?: () => void;
    canRematch?: boolean;
}

export const SettlementReconciliationSummaryCard = ({
    settlement,
    onEditMatching,
    canRematch,
}: SettlementReconciliationSummaryCardProps) => {
    // Baseline system numbers
    const systemImportQty = settlement.systemImportQuantity ?? 0;
    const systemImportVal = Number(settlement.systemImportValue ?? 0);
    const actualImportQty = settlement.actualTicketImportQuantity ?? systemImportQty;
    const actualImportVal = Number(settlement.actualTicketImportValue ?? systemImportVal);
    const importQtyDiff = actualImportQty - systemImportQty;
    const importValDiff = actualImportVal - systemImportVal;

    const systemReturnQty = settlement.systemReturnQuantity ?? 0;
    const systemReturnVal = Number(settlement.systemReturnValue ?? 0);
    const actualReturnQty = settlement.actualReturnTicketQuantity ?? systemReturnQty;
    const actualReturnVal = Number(settlement.actualReturnTicketValue ?? systemReturnVal);
    const returnQtyDiff = actualReturnQty - systemReturnQty;
    const returnValDiff = actualReturnVal - systemReturnVal;

    const originalUnitPrice = Number(settlement.originalTicketUnitPrice ?? 0);
    const reconciledUnitPrice = Number(
        settlement.reconciledTicketUnitPrice ?? settlement.actualTicketPrice ?? originalUnitPrice
    );
    const unitPriceDiff = reconciledUnitPrice - originalUnitPrice;

    const initialEstimatedVal =
        settlement.initialEstimatedSettlementValue != null
            ? Number(settlement.initialEstimatedSettlementValue)
            : originalUnitPrice * (systemImportQty - systemReturnQty);

    const finalVal =
        settlement.finalSettlementValue != null
            ? Number(settlement.finalSettlementValue)
            : null;

    const differenceAmount =
        settlement.settlementDifferenceAmount != null
            ? Number(settlement.settlementDifferenceAmount)
            : finalVal != null
            ? finalVal - initialEstimatedVal
            : 0;

    const hasLiveAdjustment =
        unitPriceDiff !== 0
        || importQtyDiff !== 0
        || returnQtyDiff !== 0
        || differenceAmount !== 0
        || settlement.finalSettlementValue != null;

    const differenceTone = useMemo(() => {
        if (!hasLiveAdjustment || differenceAmount === 0) {
            return {
                bg: '#f8fafc',
                border: '#e2e8f0',
                color: '#475569',
                label: 'Không đổi',
                icon: <TrendingFlatOutlinedIcon sx={{ fontSize: '1rem' }} />,
            };
        }
        if (differenceAmount > 0) {
            return {
                bg: '#fff1f2',
                border: '#fecdd3',
                color: '#be123c',
                label: 'Tăng',
                icon: <TrendingUpOutlinedIcon sx={{ fontSize: '1rem' }} />,
            };
        }
        return {
            bg: '#f0fdf4',
            border: '#bbf7d0',
            color: '#15803d',
            label: 'Giảm',
            icon: <TrendingDownOutlinedIcon sx={{ fontSize: '1rem' }} />,
        };
    }, [hasLiveAdjustment, differenceAmount]);

    const discrepancyCount =
        (importQtyDiff !== 0 ? 1 : 0) + (returnQtyDiff !== 0 ? 1 : 0) + (unitPriceDiff !== 0 ? 1 : 0);

    return (
        <Paper
            variant="outlined"
            sx={{
                p: { xs: 2, md: 2.5 },
                borderRadius: '16px',
                borderColor: '#e2e8f0',
                bgcolor: '#ffffff',
                mb: 3,
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            }}
        >
            {/* Header: Title, Status Badge & Quick Edit Button */}
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
                flexWrap="wrap"
                gap={1.5}
            >
                <Stack direction="row" spacing={1.2} alignItems="center">
                    <Box
                        sx={{
                            width: 34,
                            height: 34,
                            borderRadius: '9px',
                            bgcolor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <FactCheckOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ fontSize: '1rem', lineHeight: 1.3 }}>
                            Tóm tắt kết quả đối chiếu số liệu hệ thống & thực tế
                        </Typography>
                        <Typography variant="caption" color="#64748b">
                            Số liệu đã xác nhận tại bước Đối chiếu để làm căn cứ xử lý chênh lệch
                        </Typography>
                    </Box>
                </Stack>

                {canRematch && onEditMatching && (
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ArrowBackOutlinedIcon />}
                        onClick={onEditMatching}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: '9px',
                            color: '#334155',
                            borderColor: '#cbd5e1',
                            bgcolor: '#ffffff',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            '&:hover': {
                                bgcolor: '#f1f5f9',
                                borderColor: '#94a3b8',
                            },
                        }}
                    >
                        Quay lại chỉnh số liệu đối chiếu
                    </Button>
                )}
            </Stack>

            {/* Row 1: Side-by-Side Cards (Nhập vé vs Trả vé) */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
                {/* Column 1: Số liệu Nhập vé */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            borderRadius: '14px',
                            borderColor: importQtyDiff !== 0 ? (importQtyDiff > 0 ? '#fecdd3' : '#fed7aa') : '#bbf7d0',
                            bgcolor: importQtyDiff !== 0 ? (importQtyDiff > 0 ? '#fff1f214' : '#fffaf5') : '#f0fdf414',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                        }}
                    >
                        {/* Header */}
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Box
                                    sx={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '7px',
                                        bgcolor: '#eff6ff',
                                        color: '#2563eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Inventory2OutlinedIcon sx={{ fontSize: '1rem' }} />
                                </Box>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.925rem' }}>
                                    Số liệu Nhập vé
                                </Typography>
                            </Stack>

                            {importQtyDiff > 0 ? (
                                <Chip
                                    size="small"
                                    icon={<TrendingUpOutlinedIcon style={{ fontSize: '0.85rem', color: '#be123c' }} />}
                                    label={`Thừa nhập (+${importQtyDiff.toLocaleString('vi-VN')} vé)`}
                                    sx={{
                                        bgcolor: '#fff1f2',
                                        color: '#be123c',
                                        fontWeight: 700,
                                        fontSize: '0.725rem',
                                        border: '1px solid #fecdd3',
                                    }}
                                />
                            ) : importQtyDiff < 0 ? (
                                <Chip
                                    size="small"
                                    icon={<TrendingDownOutlinedIcon style={{ fontSize: '0.85rem', color: '#b45309' }} />}
                                    label={`Thiếu nhập (${importQtyDiff.toLocaleString('vi-VN')} vé)`}
                                    sx={{
                                        bgcolor: '#fffbeb',
                                        color: '#b45309',
                                        fontWeight: 700,
                                        fontSize: '0.725rem',
                                        border: '1px solid #fde68a',
                                    }}
                                />
                            ) : (
                                <Chip
                                    size="small"
                                    icon={<CheckCircleOutlinedIcon style={{ fontSize: '0.85rem', color: '#15803d' }} />}
                                    label="Khớp hệ thống"
                                    sx={{
                                        bgcolor: '#f0fdf4',
                                        color: '#15803d',
                                        fontWeight: 700,
                                        fontSize: '0.725rem',
                                        border: '1px solid #bbf7d0',
                                    }}
                                />
                            )}
                        </Stack>

                        {/* 2-Column Metrics */}
                        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                            <Grid size={{ xs: 6 }}>
                                <Box sx={{ p: 1.25, borderRadius: '9px', bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
                                    <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ textTransform: 'uppercase', fontSize: '0.675rem', display: 'block', mb: 0.25 }}>
                                        Hệ thống ghi nhận:
                                    </Typography>
                                    <Typography variant="body2" fontWeight={800} color="#0f172a">
                                        {systemImportQty.toLocaleString('vi-VN')} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>vé</span>
                                    </Typography>
                                    <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.7rem' }}>
                                        {formatImportCost(systemImportVal)} VNĐ
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Box sx={{ p: 1.25, borderRadius: '9px', bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
                                    <Typography variant="caption" fontWeight={700} color="#2563eb" sx={{ textTransform: 'uppercase', fontSize: '0.675rem', display: 'block', mb: 0.25 }}>
                                        Thực tế đối soát:
                                    </Typography>
                                    <Typography variant="body2" fontWeight={800} color="#1d4ed8">
                                        {actualImportQty.toLocaleString('vi-VN')} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#60a5fa' }}>vé</span>
                                    </Typography>
                                    <Typography variant="caption" color="#3b82f6" sx={{ fontSize: '0.7rem' }}>
                                        {formatImportCost(actualImportVal)} VNĐ
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>

                        {/* Discrepancy Bar */}
                        <Box
                            sx={{
                                p: 1,
                                px: 1.5,
                                borderRadius: '9px',
                                bgcolor: importQtyDiff > 0 ? '#fff1f2' : importQtyDiff < 0 ? '#fffbeb' : '#f0fdf4',
                                border: '1px solid',
                                borderColor: importQtyDiff > 0 ? '#fecdd3' : importQtyDiff < 0 ? '#fde68a' : '#bbf7d0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 0.5,
                            }}
                        >
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Typography
                                    variant="caption"
                                    fontWeight={800}
                                    sx={{
                                        fontSize: '0.7rem',
                                        textTransform: 'uppercase',
                                        color: importQtyDiff > 0 ? '#be123c' : importQtyDiff < 0 ? '#b45309' : '#15803d',
                                    }}
                                >
                                    Chênh lệch nhập:
                                </Typography>
                                <Chip
                                    size="small"
                                    label={importQtyDiff > 0 ? 'Thừa nhập (+)' : importQtyDiff < 0 ? 'Thiếu nhập (-)' : 'Khớp'}
                                    sx={{
                                        height: 19,
                                        fontSize: '0.675rem',
                                        fontWeight: 800,
                                        bgcolor: '#ffffff',
                                        color: importQtyDiff > 0 ? '#be123c' : importQtyDiff < 0 ? '#b45309' : '#15803d',
                                        border: `1px solid ${importQtyDiff > 0 ? '#fecdd3' : importQtyDiff < 0 ? '#fde68a' : '#bbf7d0'}`,
                                    }}
                                />
                            </Stack>
                            <Typography
                                variant="caption"
                                fontWeight={800}
                                sx={{
                                    fontSize: '0.75rem',
                                    color: importQtyDiff > 0 ? '#be123c' : importQtyDiff < 0 ? '#b45309' : '#15803d',
                                }}
                            >
                                {importQtyDiff > 0 ? `+${importQtyDiff.toLocaleString('vi-VN')}` : importQtyDiff.toLocaleString('vi-VN')} vé{' '}
                                ({importValDiff > 0 ? `+${formatImportCost(importValDiff)}` : formatImportCost(importValDiff)} VNĐ)
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                {/* Column 2: Số liệu Trả vé */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            borderRadius: '14px',
                            borderColor: returnQtyDiff !== 0 ? (returnQtyDiff > 0 ? '#fecdd3' : '#fed7aa') : '#bbf7d0',
                            bgcolor: returnQtyDiff !== 0 ? (returnQtyDiff > 0 ? '#fff1f214' : '#fffaf5') : '#f0fdf414',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                        }}
                    >
                        {/* Header */}
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Box
                                    sx={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '7px',
                                        bgcolor: '#fff7ed',
                                        color: '#ea580c',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <AssignmentReturnOutlinedIcon sx={{ fontSize: '1rem' }} />
                                </Box>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.925rem' }}>
                                    Số liệu Trả vé
                                </Typography>
                            </Stack>

                            {returnQtyDiff > 0 ? (
                                <Chip
                                    size="small"
                                    icon={<TrendingUpOutlinedIcon style={{ fontSize: '0.85rem', color: '#be123c' }} />}
                                    label={`Thừa trả (+${returnQtyDiff.toLocaleString('vi-VN')} vé)`}
                                    sx={{
                                        bgcolor: '#fff1f2',
                                        color: '#be123c',
                                        fontWeight: 700,
                                        fontSize: '0.725rem',
                                        border: '1px solid #fecdd3',
                                    }}
                                />
                            ) : returnQtyDiff < 0 ? (
                                <Chip
                                    size="small"
                                    icon={<TrendingDownOutlinedIcon style={{ fontSize: '0.85rem', color: '#b45309' }} />}
                                    label={`Thiếu trả (${returnQtyDiff.toLocaleString('vi-VN')} vé)`}
                                    sx={{
                                        bgcolor: '#fffbeb',
                                        color: '#b45309',
                                        fontWeight: 700,
                                        fontSize: '0.725rem',
                                        border: '1px solid #fde68a',
                                    }}
                                />
                            ) : (
                                <Chip
                                    size="small"
                                    icon={<CheckCircleOutlinedIcon style={{ fontSize: '0.85rem', color: '#15803d' }} />}
                                    label="Khớp hệ thống"
                                    sx={{
                                        bgcolor: '#f0fdf4',
                                        color: '#15803d',
                                        fontWeight: 700,
                                        fontSize: '0.725rem',
                                        border: '1px solid #bbf7d0',
                                    }}
                                />
                            )}
                        </Stack>

                        {/* 2-Column Metrics */}
                        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                            <Grid size={{ xs: 6 }}>
                                <Box sx={{ p: 1.25, borderRadius: '9px', bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
                                    <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ textTransform: 'uppercase', fontSize: '0.675rem', display: 'block', mb: 0.25 }}>
                                        Hệ thống ghi nhận:
                                    </Typography>
                                    <Typography variant="body2" fontWeight={800} color="#0f172a">
                                        {systemReturnQty.toLocaleString('vi-VN')} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>vé</span>
                                    </Typography>
                                    <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.7rem' }}>
                                        {formatImportCost(systemReturnVal)} VNĐ
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Box sx={{ p: 1.25, borderRadius: '9px', bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
                                    <Typography variant="caption" fontWeight={700} color="#ea580c" sx={{ textTransform: 'uppercase', fontSize: '0.675rem', display: 'block', mb: 0.25 }}>
                                        Thực tế đối soát:
                                    </Typography>
                                    <Typography variant="body2" fontWeight={800} color="#c2410c">
                                        {actualReturnQty.toLocaleString('vi-VN')} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fdba74' }}>vé</span>
                                    </Typography>
                                    <Typography variant="caption" color="#ea580c" sx={{ fontSize: '0.7rem' }}>
                                        {formatImportCost(actualReturnVal)} VNĐ
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>

                        {/* Discrepancy Bar */}
                        <Box
                            sx={{
                                p: 1,
                                px: 1.5,
                                borderRadius: '9px',
                                bgcolor: returnQtyDiff > 0 ? '#fff1f2' : returnQtyDiff < 0 ? '#fffbeb' : '#f0fdf4',
                                border: '1px solid',
                                borderColor: returnQtyDiff > 0 ? '#fecdd3' : returnQtyDiff < 0 ? '#fde68a' : '#bbf7d0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 0.5,
                            }}
                        >
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Typography
                                    variant="caption"
                                    fontWeight={800}
                                    sx={{
                                        fontSize: '0.7rem',
                                        textTransform: 'uppercase',
                                        color: returnQtyDiff > 0 ? '#be123c' : returnQtyDiff < 0 ? '#b45309' : '#15803d',
                                    }}
                                >
                                    Chênh lệch trả:
                                </Typography>
                                <Chip
                                    size="small"
                                    label={returnQtyDiff > 0 ? 'Thừa trả (+)' : returnQtyDiff < 0 ? 'Thiếu trả (-)' : 'Khớp'}
                                    sx={{
                                        height: 19,
                                        fontSize: '0.675rem',
                                        fontWeight: 800,
                                        bgcolor: '#ffffff',
                                        color: returnQtyDiff > 0 ? '#be123c' : returnQtyDiff < 0 ? '#b45309' : '#15803d',
                                        border: `1px solid ${returnQtyDiff > 0 ? '#fecdd3' : returnQtyDiff < 0 ? '#fde68a' : '#bbf7d0'}`,
                                    }}
                                />
                            </Stack>
                            <Typography
                                variant="caption"
                                fontWeight={800}
                                sx={{
                                    fontSize: '0.75rem',
                                    color: returnQtyDiff > 0 ? '#be123c' : returnQtyDiff < 0 ? '#b45309' : '#15803d',
                                }}
                            >
                                {returnQtyDiff > 0 ? `+${returnQtyDiff.toLocaleString('vi-VN')}` : returnQtyDiff.toLocaleString('vi-VN')} vé{' '}
                                ({returnValDiff > 0 ? `+${formatImportCost(returnValDiff)}` : formatImportCost(returnValDiff)} VNĐ)
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Row 2: Đơn giá mỗi vé & Tình trạng đối chiếu */}
            <Paper
                variant="outlined"
                sx={{
                    p: 1.75,
                    borderRadius: '12px',
                    bgcolor: '#f8fafc',
                    borderColor: '#e2e8f0',
                    mb: 2,
                }}
            >
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1}>
                            <Box
                                sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '6px',
                                    bgcolor: '#ffffff',
                                    color: '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid #e2e8f0',
                                }}
                            >
                                <LocalOfferOutlinedIcon sx={{ fontSize: '1rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="#64748b" fontWeight={600}>
                                    Đơn giá ban đầu: <strong style={{ color: '#0f172a' }}>{formatImportCost(originalUnitPrice)} VNĐ/vé</strong>
                                    {' → '}Sau đối soát: <strong style={{ color: unitPriceDiff !== 0 ? (unitPriceDiff > 0 ? '#be123c' : '#b45309') : '#0f172a' }}>
                                        {formatImportCost(reconciledUnitPrice)} VNĐ/vé
                                    </strong>
                                </Typography>
                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                                    {unitPriceDiff > 0 ? (
                                        <Typography variant="caption" sx={{ color: '#be123c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                            <TrendingUpOutlinedIcon sx={{ fontSize: '0.85rem' }} /> Tăng +{formatImportCost(unitPriceDiff)} VNĐ/vé
                                        </Typography>
                                    ) : unitPriceDiff < 0 ? (
                                        <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                            <TrendingDownOutlinedIcon sx={{ fontSize: '0.85rem' }} /> Giảm {formatImportCost(unitPriceDiff)} VNĐ/vé
                                        </Typography>
                                    ) : (
                                        <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                            <TrendingFlatOutlinedIcon sx={{ fontSize: '0.85rem' }} /> Không đổi (khớp giá ban đầu)
                                        </Typography>
                                    )}
                                </Stack>
                            </Box>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap" useFlexGap>
                            <Typography variant="caption" fontWeight={700} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: '0.3px', mr: 0.5 }}>
                                Tình trạng:
                            </Typography>
                            {discrepancyCount === 0 ? (
                                <Chip
                                    size="small"
                                    icon={<CheckCircleOutlinedIcon style={{ fontSize: '0.9rem', color: '#16a34a' }} />}
                                    label="Số liệu & Đơn giá hoàn toàn khớp"
                                    sx={{ bgcolor: '#ffffff', color: '#16a34a', fontWeight: 700, fontSize: '0.725rem', border: '1px solid #86efac' }}
                                />
                            ) : (
                                <>
                                    {unitPriceDiff !== 0 && (
                                        <Chip
                                            size="small"
                                            icon={unitPriceDiff > 0 ? <TrendingUpOutlinedIcon style={{ fontSize: '0.85rem', color: '#be123c' }} /> : <TrendingDownOutlinedIcon style={{ fontSize: '0.85rem', color: '#b45309' }} />}
                                            label={unitPriceDiff > 0 ? `Tăng đơn giá (+${formatImportCost(unitPriceDiff)} VNĐ/vé)` : `Giảm đơn giá (${formatImportCost(unitPriceDiff)} VNĐ/vé)`}
                                            sx={{
                                                bgcolor: unitPriceDiff > 0 ? '#fff1f2' : '#fffbeb',
                                                color: unitPriceDiff > 0 ? '#be123c' : '#b45309',
                                                fontWeight: 800,
                                                fontSize: '0.7rem',
                                                border: `1px solid ${unitPriceDiff > 0 ? '#fecdd3' : '#fde68a'}`,
                                            }}
                                        />
                                    )}
                                    {importQtyDiff !== 0 && (
                                        <Chip
                                            size="small"
                                            icon={importQtyDiff > 0 ? <TrendingUpOutlinedIcon style={{ fontSize: '0.85rem', color: '#be123c' }} /> : <TrendingDownOutlinedIcon style={{ fontSize: '0.85rem', color: '#b45309' }} />}
                                            label={importQtyDiff > 0 ? `Thừa nhập (+${importQtyDiff.toLocaleString('vi-VN')} vé)` : `Thiếu nhập (${importQtyDiff.toLocaleString('vi-VN')} vé)`}
                                            sx={{
                                                bgcolor: importQtyDiff > 0 ? '#fff1f2' : '#fffbeb',
                                                color: importQtyDiff > 0 ? '#be123c' : '#b45309',
                                                fontWeight: 800,
                                                fontSize: '0.7rem',
                                                border: `1px solid ${importQtyDiff > 0 ? '#fecdd3' : '#fde68a'}`,
                                            }}
                                        />
                                    )}
                                    {returnQtyDiff !== 0 && (
                                        <Chip
                                            size="small"
                                            icon={returnQtyDiff > 0 ? <TrendingUpOutlinedIcon style={{ fontSize: '0.85rem', color: '#be123c' }} /> : <TrendingDownOutlinedIcon style={{ fontSize: '0.85rem', color: '#b45309' }} />}
                                            label={returnQtyDiff > 0 ? `Thừa trả (+${returnQtyDiff.toLocaleString('vi-VN')} vé)` : `Thiếu trả (${returnQtyDiff.toLocaleString('vi-VN')} vé)`}
                                            sx={{
                                                bgcolor: returnQtyDiff > 0 ? '#fff1f2' : '#fffbeb',
                                                color: returnQtyDiff > 0 ? '#be123c' : '#b45309',
                                                fontWeight: 800,
                                                fontSize: '0.7rem',
                                                border: `1px solid ${returnQtyDiff > 0 ? '#fecdd3' : '#fde68a'}`,
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>

            {/* Row 3: 3-Card Financial Trio */}
            <Grid container spacing={2} sx={{ mb: settlement.reconciliationNote ? 2 : 0 }}>
                {/* Card 1: Tạm tính ban đầu */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            bgcolor: '#f8fafc',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                            <Box
                                sx={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: '6px',
                                    bgcolor: '#ffffff',
                                    color: '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid #e2e8f0',
                                }}
                            >
                                <ReceiptLongOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                            </Box>
                            <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                Tạm tính ban đầu
                            </Typography>
                        </Stack>
                        <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ fontSize: '1.15rem', my: 0.25 }}>
                            {formatImportCost(initialEstimatedVal)} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>VNĐ</span>
                        </Typography>
                        <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.7rem' }}>
                            Baseline hệ thống (giá gốc × SL hệ thống)
                        </Typography>
                    </Paper>
                </Grid>

                {/* Card 2: Sau chênh lệch (Thực tế) */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            borderRadius: '12px',
                            border: '1px solid #bfdbfe',
                            bgcolor: '#eff6ff',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                            <Box
                                sx={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: '6px',
                                    bgcolor: '#dbeafe',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <CalculateOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                            </Box>
                            <Typography variant="caption" fontWeight={700} color="#1e40af" sx={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                Sau chênh lệch (Thực tế)
                            </Typography>
                        </Stack>
                        <Typography variant="h6" fontWeight={800} color="#1d4ed8" sx={{ fontSize: '1.15rem', my: 0.25 }}>
                            {finalVal != null ? (
                                <>{formatImportCost(finalVal)} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#60a5fa' }}>VNĐ</span></>
                            ) : (
                                '—'
                            )}
                        </Typography>
                        <Typography variant="caption" color="#3b82f6" sx={{ fontSize: '0.7rem' }}>
                            {finalVal != null ? 'Kết quả sau điều chỉnh đối soát' : 'Chưa có chênh lệch'}
                        </Typography>
                    </Paper>
                </Grid>

                {/* Card 3: Tiền chênh lệch */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            borderRadius: '12px',
                            border: `1px solid ${differenceTone.border}`,
                            bgcolor: differenceTone.bg,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Box
                                    sx={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: '6px',
                                        bgcolor: '#ffffff',
                                        color: differenceTone.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `1px solid ${differenceTone.border}`,
                                    }}
                                >
                                    {differenceTone.icon}
                                </Box>
                                <Typography variant="caption" fontWeight={700} color={differenceTone.color} sx={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                    Tiền chênh lệch
                                </Typography>
                            </Stack>
                            <Chip
                                size="small"
                                label={differenceTone.label}
                                sx={{
                                    height: 20,
                                    fontSize: '0.675rem',
                                    fontWeight: 800,
                                    bgcolor: '#ffffff',
                                    color: differenceTone.color,
                                    border: `1px solid ${differenceTone.border}`,
                                }}
                            />
                        </Stack>
                        <Typography variant="h6" fontWeight={800} color={differenceTone.color} sx={{ fontSize: '1.15rem', my: 0.25 }}>
                            {hasLiveAdjustment ? (
                                <>{differenceAmount > 0 ? `+${formatImportCost(differenceAmount)}` : formatImportCost(differenceAmount)} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>VNĐ</span></>
                            ) : (
                                <>{formatImportCost(0)} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>VNĐ</span></>
                            )}
                        </Typography>
                        <Typography variant="caption" sx={{ color: differenceTone.color, opacity: 0.85, fontSize: '0.7rem' }}>
                            = Sau chênh lệch − Tạm tính ban đầu
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Row 4: Ghi chú đối chiếu (nếu có) */}
            {settlement.reconciliationNote && (
                <Box
                    sx={{
                        mt: 2,
                        p: 1.5,
                        borderRadius: '10px',
                        bgcolor: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                    }}
                >
                    <EditNoteOutlinedIcon sx={{ color: '#64748b', fontSize: '1.2rem', mt: 0.1 }} />
                    <Box>
                        <Typography variant="caption" fontWeight={700} color="#475569" sx={{ display: 'block', mb: 0.25 }}>
                            Ghi chú đối chiếu:
                        </Typography>
                        <Typography variant="body2" color="#1e293b" sx={{ fontSize: '0.85rem' }}>
                            {settlement.reconciliationNote}
                        </Typography>
                    </Box>
                </Box>
            )}
        </Paper>
    );
};
