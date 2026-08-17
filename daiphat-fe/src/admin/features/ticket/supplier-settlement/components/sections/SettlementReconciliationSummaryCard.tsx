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
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import TrendingFlatOutlinedIcon from '@mui/icons-material/TrendingFlatOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import {
    Box,
    Button,
    Chip,
    Divider,
    Grid,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import type {
    SettlementAdjustmentReasonCode,
    SettlementOverviewImportBatch,
    SettlementOverviewReturnBatch,
    SettlementStationInventory,
    SettlementStationPricing,
    SupplierSettlement,
    SupplierSettlementAdjustment,
    SupplierSettlementKpis,
} from '../../types/supplierSettlement.type';
import {
    formatSettlementMoney,
    formatSignedCashflow,
    getAgencyCashflowLabel,
    toAgencyCashflow,
} from '../../utils/settlementCashflow';
import {
    getDiscrepancyItemLabel,
    getDetectedDiscrepancyItems,
    isReturnBatchHandedOver,
    isReturnMatchingOverdueUnhanded,
    resolveLiveSystemReturnQuantity,
    weightedStationNetUnitPrice,
} from '../../utils/settlementLabels';

interface SettlementReconciliationSummaryCardProps {
    settlement: SupplierSettlement;
    kpis?: SupplierSettlementKpis | null;
    adjustments?: SupplierSettlementAdjustment[];
    stationPricing?: SettlementStationPricing[];
    inventoryByStation?: SettlementStationInventory[];
    importBatches?: SettlementOverviewImportBatch[];
    returnBatches?: SettlementOverviewReturnBatch[];
    onEditMatching?: () => void;
    canRematch?: boolean;
    mode?: 'full' | 'discrepancy_summary';
}

const ledgerRowSx = {
    px: 2,
    py: 1.25,
} as const;

const ADJUSTMENT_REASON_LABELS: Record<SettlementAdjustmentReasonCode, string> = {
    MISSING_IMPORT: 'Thiếu nhập',
    INSUFFICIENT_IMPORT: 'Nhập thiếu số lượng',
    WRONG_DENOMINATION: 'Sai mệnh giá',
    EXCESS_IMPORT: 'Nhập thừa',
    MISSING_RETURN: 'Thiếu trả',
    LOST_DURING_RETURN: 'Mất khi trả',
    EXPIRED_UNRETURNED: 'Quá hạn chưa trả',
    EXCESS_RETURN: 'Trả thừa',
    SHIPPING_FEE: 'Phí vận chuyển',
    LATE_PENALTY: 'Phạt chậm',
    DISCOUNT: 'Chiết khấu / giảm trừ',
    OTHER: 'Khác',
};

const scaleMoney = (value: number): number => {
    if (!Number.isFinite(value)) return 0;
    const factor = 1_000;
    const rounded = Math.round((Math.abs(value) + Number.EPSILON) * factor) / factor;
    return value < 0 ? -rounded : rounded;
};

const StatusChip = ({
    ok,
    okLabel,
    badLabel,
}: {
    ok: boolean;
    okLabel: string;
    badLabel: string;
}) => (
    <Chip
        size="small"
        icon={
            ok ? (
                <CheckCircleOutlinedIcon style={{ fontSize: '0.85rem', color: '#15803d' }} />
            ) : (
                <WarningAmberOutlinedIcon style={{ fontSize: '0.85rem', color: '#be123c' }} />
            )
        }
        label={ok ? okLabel : badLabel}
        sx={{
            height: 22,
            fontWeight: 800,
            fontSize: '0.675rem',
            bgcolor: ok ? '#f0fdf4' : '#fff1f2',
            color: ok ? '#15803d' : '#be123c',
            border: `1px solid ${ok ? '#bbf7d0' : '#fecdd3'}`,
        }}
    />
);

const MiniStatCard = ({
    label,
    value,
    hint,
    color = '#0f172a',
    bg = '#ffffff',
}: {
    label: string;
    value: string;
    hint?: string;
    color?: string;
    bg?: string;
}) => (
    <Box
        sx={{
            px: 1.25,
            py: 1,
            borderRadius: '10px',
            bgcolor: bg,
            border: '1px solid #e2e8f0',
            minWidth: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
        }}
    >
        <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ display: 'block', lineHeight: 1.2 }}>
            {label}
        </Typography>
        <Typography fontWeight={800} sx={{ color, fontSize: '0.95rem', lineHeight: 1.35, mt: 0.25 }}>
            {value}
        </Typography>
        {hint && (
            <Typography variant="caption" color="#94a3b8" sx={{ display: 'block', fontSize: '0.65rem', mt: 0.25 }}>
                {hint}
            </Typography>
        )}
    </Box>
);

const MetricCompareRow = ({
    label,
    systemVal,
    actualVal,
    diffVal,
    isDiff = false,
    diffType = 'neutral',
    subtext,
}: {
    label: string;
    systemVal: string | React.ReactNode;
    actualVal: string | React.ReactNode;
    diffVal: string | React.ReactNode;
    isDiff?: boolean;
    diffType?: 'success' | 'error' | 'warning' | 'neutral';
    subtext?: string;
}) => (
    <Box
        sx={{
            py: 1,
            px: 1.25,
            borderRadius: '8px',
            bgcolor: isDiff ? (diffType === 'error' ? 'rgba(254, 226, 226, 0.45)' : 'rgba(254, 243, 199, 0.45)') : '#ffffff',
            border: '1px solid',
            borderColor: isDiff ? (diffType === 'error' ? '#fecaca' : '#fed7aa') : '#f1f5f9',
            mb: 0.75,
        }}
    >
        <Grid container spacing={1} alignItems="center">
            <Grid size={{ xs: 12, sm: 3.8 }}>
                <Typography variant="caption" fontWeight={700} color="#334155" sx={{ display: 'block' }}>
                    {label}
                </Typography>
                {subtext && (
                    <Typography variant="caption" color="#94a3b8" sx={{ display: 'block', fontSize: '0.65rem' }}>
                        {subtext}
                    </Typography>
                )}
            </Grid>
            <Grid size={{ xs: 4, sm: 2.7 }}>
                <Typography variant="caption" color="#64748b" sx={{ display: 'block', fontSize: '0.65rem' }}>
                    Hệ thống
                </Typography>
                <Typography variant="body2" fontWeight={700} color="#0f172a">
                    {systemVal}
                </Typography>
            </Grid>
            <Grid size={{ xs: 4, sm: 2.7 }}>
                <Typography variant="caption" color="#1d4ed8" sx={{ display: 'block', fontSize: '0.65rem', fontWeight: 600 }}>
                    Thực tế NCC
                </Typography>
                <Typography variant="body2" fontWeight={800} color="#1e40af">
                    {actualVal}
                </Typography>
            </Grid>
            <Grid size={{ xs: 4, sm: 2.8 }} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                <Typography variant="caption" color="#64748b" sx={{ display: 'block', fontSize: '0.65rem' }}>
                    Chênh lệch
                </Typography>
                <Typography
                    variant="body2"
                    fontWeight={800}
                    color={
                        !isDiff
                            ? '#15803d'
                            : diffType === 'error'
                            ? '#be123c'
                            : diffType === 'warning'
                            ? '#b45309'
                            : '#334155'
                    }
                >
                    {diffVal}
                </Typography>
            </Grid>
        </Grid>
    </Box>
);

export const SettlementReconciliationSummaryCard = ({
    settlement,
    kpis,
    adjustments = [],
    stationPricing = [],
    inventoryByStation = [],
    importBatches = [],
    returnBatches = [],
    onEditMatching,
    canRematch,
    mode = 'full',
}: SettlementReconciliationSummaryCardProps) => {
    const systemImportQty = settlement.systemImportQuantity ?? 0;
    const storedSystemImportVal = Number(settlement.systemImportValue ?? 0);
    const actualImportQty = settlement.actualTicketImportQuantity ?? systemImportQty;
    const actualImportVal = Number(settlement.actualTicketImportValue ?? storedSystemImportVal);

    const systemReturnQty = resolveLiveSystemReturnQuantity(settlement, returnBatches);
    const storedSystemReturnVal = Number(settlement.systemReturnValue ?? 0);
    const actualReturnQty = settlement.actualReturnTicketQuantity ?? systemReturnQty;
    const actualReturnVal = Number(settlement.actualReturnTicketValue ?? storedSystemReturnVal);

    const originalUnitPrice = Number(settlement.originalTicketUnitPrice ?? 0);
    const afterHhUnitPrice = weightedStationNetUnitPrice(stationPricing);
    const reconciledUnitPrice = Number(
        settlement.reconciledTicketUnitPrice ?? settlement.actualTicketPrice ?? afterHhUnitPrice ?? originalUnitPrice
    );
    const baselineUnitPrice = afterHhUnitPrice && afterHhUnitPrice > 0 ? afterHhUnitPrice : originalUnitPrice;
    const unitPriceDiff = reconciledUnitPrice - baselineUnitPrice;

    const afterHhSystemImportVal =
        baselineUnitPrice > 0 ? scaleMoney(baselineUnitPrice * systemImportQty) : storedSystemImportVal;
    const afterHhSystemReturnVal =
        baselineUnitPrice > 0 ? scaleMoney(baselineUnitPrice * systemReturnQty) : storedSystemReturnVal;
    const importBookGap = scaleMoney(storedSystemImportVal - afterHhSystemImportVal);
    const returnBookGap = scaleMoney(storedSystemReturnVal - afterHhSystemReturnVal);

    const importQtyDiff = actualImportQty - systemImportQty;
    const importValDiff = scaleMoney(actualImportVal - afterHhSystemImportVal);
    const returnQtyDiff = actualReturnQty - systemReturnQty;
    const returnValDiff = scaleMoney(actualReturnVal - afterHhSystemReturnVal);

    const netQty = actualImportQty - actualReturnQty;
    const ticketNetVal = scaleMoney(reconciledUnitPrice * netQty);

    const initialEstimatedVal =
        settlement.initialEstimatedSettlementValue != null
            ? Number(settlement.initialEstimatedSettlementValue)
            : scaleMoney(baselineUnitPrice * (systemImportQty - systemReturnQty));

    const finalVal =
        settlement.finalSettlementValue != null ? Number(settlement.finalSettlementValue) : null;

    const payableDifferenceAmount =
        settlement.settlementDifferenceAmount != null
            ? Number(settlement.settlementDifferenceAmount)
            : finalVal != null
              ? finalVal - initialEstimatedVal
              : 0;
    const differenceAmount = toAgencyCashflow(payableDifferenceAmount);

    const settlementAdjustments = adjustments.filter((row) => row.groupType === 'SETTLEMENT');
    const inventoryAdjustments = adjustments.filter((row) => row.groupType === 'IMPORT' || row.groupType === 'RETURN');
    const additionalCostTotal = settlementAdjustments.reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const actualPaid =
        settlement.actualPaidAmount != null ? Number(settlement.actualPaidAmount) : null;
    const isSupplierRefund = actualPaid != null && actualPaid < 0;
    const paymentDiff =
        actualPaid != null && finalVal != null ? toAgencyCashflow(actualPaid - finalVal) : null;

    const isReturnForfeited = isReturnMatchingOverdueUnhanded(
        {
            isReturnExpired: settlement.isReturnExpired,
            periodTo: settlement.periodTo,
            periodFrom: settlement.periodFrom,
        },
        returnBatches
    ) || (Boolean(settlement.isReturnExpired) && actualReturnQty === 0);

    const handedOverReturnQty = returnBatches
        .filter((batch) => isReturnBatchHandedOver(batch.status))
        .reduce((sum, batch) => sum + (batch.totalQuantity ?? 0), 0);

    const inventoryTotals = useMemo(() => {
        if (kpis) {
            return {
                imported: kpis.totalImportedTickets,
                sold: kpis.totalSoldTickets,
                remaining: kpis.totalRemainingTickets,
                returned: kpis.totalPreparedForReturnTickets,
                damaged: kpis.totalDamagedTickets,
                lost: kpis.totalLostTickets,
                voided: kpis.totalVoidedTickets,
            };
        }
        return inventoryByStation.reduce(
            (acc, row) => ({
                imported: acc.imported + (row.importedQuantity || 0),
                sold: acc.sold + (row.soldQuantity || 0),
                remaining: acc.remaining + (row.remainingQuantity || 0),
                returned: acc.returned + (row.returnQuantity || 0),
                damaged: acc.damaged + (row.damagedQuantity || 0),
                lost: acc.lost + (row.lostQuantity || 0),
                voided: acc.voided + (row.voidedQuantity || 0),
            }),
            { imported: 0, sold: 0, remaining: 0, returned: 0, damaged: 0, lost: 0, voided: 0 }
        );
    }, [kpis, inventoryByStation]);

    const incidentTotal = inventoryTotals.damaged + inventoryTotals.lost + inventoryTotals.voided;
    const discrepancyItems = getDetectedDiscrepancyItems(settlement, {
        afterCommissionUnitPrice: afterHhUnitPrice,
    });

    const hasLiveAdjustment =
        unitPriceDiff !== 0
        || importQtyDiff !== 0
        || returnQtyDiff !== 0
        || differenceAmount !== 0
        || settlement.finalSettlementValue != null;

    const qtyMatched = importQtyDiff === 0 && returnQtyDiff === 0;
    const valueMatched = importValDiff === 0 && returnValDiff === 0 && unitPriceDiff === 0;
    const fullyMatched = qtyMatched && valueMatched && additionalCostTotal === 0 && (paymentDiff == null || paymentDiff === 0);

    const differenceTone = useMemo(() => {
        if (!hasLiveAdjustment || differenceAmount === 0) {
            return {
                bg: '#f8fafc',
                border: '#e2e8f0',
                color: '#475569',
                icon: <TrendingFlatOutlinedIcon sx={{ fontSize: '1rem' }} />,
            };
        }
        if (differenceAmount < 0) {
            return {
                bg: '#fff1f2',
                border: '#fecdd3',
                color: '#be123c',
                icon: <TrendingUpOutlinedIcon sx={{ fontSize: '1rem' }} />,
            };
        }
        return {
            bg: '#f0fdf4',
            border: '#bbf7d0',
            color: '#15803d',
            icon: <TrendingDownOutlinedIcon sx={{ fontSize: '1rem' }} />,
        };
    }, [hasLiveAdjustment, differenceAmount]);

    const sectionTitleSx = {
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        display: 'block',
        mb: 1.25,
    } as const;

    return (
        <Paper
            variant="outlined"
            sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: '16px',
                borderColor: '#e2e8f0',
                bgcolor: '#fafafa',
                mb: 3,
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            }}
        >
            {/* Header Area */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={1.5}
                sx={{ mb: 2 }}
            >
                <Stack direction="row" spacing={1.2} alignItems="center">
                    <Box
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: '10px',
                            bgcolor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <FactCheckOutlinedIcon sx={{ fontSize: '1.35rem' }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ fontSize: '1.05rem', lineHeight: 1.3 }}>
                            Tóm tắt kết quả đối chiếu số liệu hệ thống & thực tế
                        </Typography>
                        <Typography variant="caption" color="#64748b">
                            {settlement.supplierName || 'NCC'} · {settlement.supplierSettlementCode || `#${settlement.id}`}
                            {' — '}bảng kê đối chiếu số lượng và quy đổi giá vốn
                        </Typography>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip
                        size="small"
                        icon={
                            fullyMatched ? (
                                <CheckCircleOutlinedIcon style={{ fontSize: '0.95rem', color: '#15803d' }} />
                            ) : (
                                <WarningAmberOutlinedIcon style={{ fontSize: '0.95rem', color: '#c2410c' }} />
                            )
                        }
                        label={
                            fullyMatched
                                ? 'Khớp toàn bộ dữ liệu'
                                : qtyMatched && !valueMatched
                                  ? 'Khớp số lượng · lệch giá trị / hoa hồng'
                                  : `Phát hiện ${discrepancyItems.length || (importQtyDiff !== 0 ? 1 : 0) + (returnQtyDiff !== 0 ? 1 : 0) + (unitPriceDiff !== 0 ? 1 : 0)} chênh lệch`
                        }
                        sx={{
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            bgcolor: fullyMatched ? '#f0fdf4' : '#fff7ed',
                            color: fullyMatched ? '#15803d' : '#c2410c',
                            border: `1px solid ${fullyMatched ? '#bbf7d0' : '#fed7aa'}`,
                        }}
                    />
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
                                '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' },
                            }}
                        >
                            Quay lại chỉnh số liệu đối chiếu
                        </Button>
                    )}
                </Stack>
            </Stack>

            {/* Prominent Discrepancy Banner */}
            {discrepancyItems.length > 0 && (
                <Box
                    sx={{
                        p: 1.5,
                        mb: 2.5,
                        borderRadius: '12px',
                        bgcolor: '#fff7ed',
                        border: '1px solid #fed7aa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 1.25,
                    }}
                >
                    <Stack direction="row" spacing={1} alignItems="center">
                        <WarningAmberOutlinedIcon sx={{ color: '#c2410c', fontSize: '1.25rem', flexShrink: 0 }} />
                        <Typography variant="body2" fontWeight={700} color="#9a3412">
                            Phát hiện các mục chênh lệch giữa Hệ thống và Thực tế:
                        </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        {discrepancyItems.map((item) => {
                            const resolved =
                                (item.type === 'IMPORT_UNIT_PRICE' && Boolean(settlement.unitPriceDiscrepancyResolved))
                                || (item.type === 'IMPORT_QUANTITY' && Boolean(settlement.importDiscrepancyResolved))
                                || (item.type === 'RETURN_QUANTITY' && Boolean(settlement.returnDiscrepancyResolved));
                            return (
                                <Chip
                                    key={`${item.type}-${item.direction}`}
                                    size="small"
                                    color={resolved ? 'success' : item.direction === 'NEGATIVE' ? 'warning' : 'error'}
                                    variant={resolved ? 'filled' : 'outlined'}
                                    label={`${getDiscrepancyItemLabel(item)}${resolved ? ' · đã xử lý' : ''}`}
                                    sx={{ fontWeight: 700, bgcolor: resolved ? undefined : '#ffffff' }}
                                />
                            );
                        })}
                    </Stack>
                </Box>
            )}

            {/* SECTION A: SỐ LIỆU ĐÃ ĐỐI CHIẾU */}
            <Paper elevation={0} sx={{ p: 2.25, mb: 2.5, borderRadius: '14px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.75 }}>
                    <Typography variant="caption" fontWeight={800} color="#475569" sx={sectionTitleSx}>
                        A. Số liệu đã đối chiếu (Nhập vé vs Trả vé)
                    </Typography>
                    <Typography variant="caption" color="#64748b">
                        Đơn vị tính: Vé / VNĐ sau hoa hồng
                    </Typography>
                </Stack>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                    {/* Card 1: Số liệu Nhập vé */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Box
                            sx={{
                                p: 1.75,
                                borderRadius: '12px',
                                border: '1px solid',
                                borderColor: importQtyDiff !== 0 ? '#fecdd3' : importValDiff !== 0 ? '#fed7aa' : '#bbf7d0',
                                bgcolor: importQtyDiff !== 0 ? '#fff5f5' : importValDiff !== 0 ? '#fffbf5' : '#f9fefb',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }} gap={1}>
                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                        <Inventory2OutlinedIcon sx={{ fontSize: '1.1rem', color: '#2563eb' }} />
                                        <Typography variant="body2" fontWeight={800} color="#0f172a">
                                            Số liệu Nhập vé
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                                        <StatusChip
                                            ok={importQtyDiff === 0}
                                            okLabel="Khớp SL"
                                            badLabel={`Lệch ${importQtyDiff > 0 ? `+${importQtyDiff}` : importQtyDiff} vé`}
                                        />
                                        <StatusChip
                                            ok={importValDiff === 0}
                                            okLabel="Khớp giá sau HH"
                                            badLabel="Lệch giá sau HH"
                                        />
                                    </Stack>
                                </Stack>

                                {/* Metric 1: Số lượng vé nhập */}
                                <MetricCompareRow
                                    label="Số lượng vé"
                                    systemVal={`${systemImportQty.toLocaleString('vi-VN')} vé`}
                                    actualVal={`${actualImportQty.toLocaleString('vi-VN')} vé`}
                                    diffVal={
                                        importQtyDiff === 0
                                            ? '0 vé (Khớp)'
                                            : `${importQtyDiff > 0 ? '+' : ''}${importQtyDiff.toLocaleString('vi-VN')} vé`
                                    }
                                    isDiff={importQtyDiff !== 0}
                                    diffType={importQtyDiff !== 0 ? 'error' : 'success'}
                                />

                                {/* Metric 2: Thành tiền sau hoa hồng */}
                                <MetricCompareRow
                                    label="Giá trị sau hoa hồng"
                                    subtext="Tiền vốn tính theo đài"
                                    systemVal={`${formatSettlementMoney(afterHhSystemImportVal)} đ`}
                                    actualVal={`${formatSettlementMoney(actualImportVal)} đ`}
                                    diffVal={
                                        importValDiff === 0
                                            ? '0 đ (Khớp)'
                                            : `${importValDiff > 0 ? '+' : ''}${formatSettlementMoney(importValDiff)} đ`
                                    }
                                    isDiff={importValDiff !== 0}
                                    diffType={importValDiff !== 0 ? (importQtyDiff !== 0 ? 'error' : 'warning') : 'success'}
                                />

                                {/* Metric 3: Mệnh giá ghi sổ trước hoa hồng (nếu có gap) */}
                                {importBookGap !== 0 && (
                                    <MetricCompareRow
                                        label="Mệnh giá ghi sổ"
                                        subtext="Trước khi quy đổi HH"
                                        systemVal={`${formatSettlementMoney(storedSystemImportVal)} đ`}
                                        actualVal={`${formatSettlementMoney(actualImportQty * 10000)} đ`}
                                        diffVal={`HH −${formatSettlementMoney(Math.abs(importBookGap))} đ`}
                                        isDiff={false}
                                        diffType="neutral"
                                    />
                                )}
                            </Box>

                            {/* Alert footer on Diff */}
                            {(importQtyDiff !== 0 || importValDiff !== 0) && (
                                <Box
                                    sx={{
                                        mt: 1,
                                        p: 1,
                                        borderRadius: '8px',
                                        bgcolor: '#ffffff',
                                        border: '1px dashed #fca5a5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.75,
                                    }}
                                >
                                    <Typography variant="caption" fontWeight={700} color="#be123c">
                                        ⚠ {importQtyDiff < 0 ? `Hệ thống thừa ${Math.abs(importQtyDiff)} vé nhập` : `Hệ thống thiếu ${importQtyDiff} vé nhập`} so với thực tế NCC (Chênh lệch: {formatSignedCashflow(importValDiff, formatSettlementMoney)} VNĐ).
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Grid>

                    {/* Card 2: Số liệu Trả vé */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Box
                            sx={{
                                p: 1.75,
                                borderRadius: '12px',
                                border: '1px solid',
                                borderColor: returnQtyDiff !== 0 ? '#fecdd3' : returnValDiff !== 0 ? '#fed7aa' : '#bbf7d0',
                                bgcolor: returnQtyDiff !== 0 ? '#fff5f5' : returnValDiff !== 0 ? '#fffbf5' : '#f9fefb',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }} gap={1}>
                                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                                        <AssignmentReturnOutlinedIcon sx={{ fontSize: '1.1rem', color: '#ea580c' }} />
                                        <Typography variant="body2" fontWeight={800} color="#0f172a">
                                            Số liệu Trả vé
                                        </Typography>
                                        {isReturnForfeited && (
                                            <Chip
                                                size="small"
                                                icon={<LockOutlinedIcon style={{ fontSize: '0.75rem', color: '#c2410c' }} />}
                                                label="Đại lý chịu"
                                                sx={{
                                                    height: 20,
                                                    fontSize: '0.65rem',
                                                    fontWeight: 800,
                                                    bgcolor: '#fff7ed',
                                                    color: '#c2410c',
                                                    border: '1px solid #fed7aa',
                                                }}
                                            />
                                        )}
                                    </Stack>
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                                        <StatusChip
                                            ok={returnQtyDiff === 0}
                                            okLabel="Khớp SL"
                                            badLabel={`Lệch ${returnQtyDiff > 0 ? `+${returnQtyDiff}` : returnQtyDiff} vé`}
                                        />
                                        <StatusChip
                                            ok={returnValDiff === 0}
                                            okLabel="Khớp giá sau HH"
                                            badLabel="Lệch giá sau HH"
                                        />
                                    </Stack>
                                </Stack>

                                {/* Metric 1: Số lượng vé trả */}
                                <MetricCompareRow
                                    label="Số lượng vé"
                                    systemVal={`${systemReturnQty.toLocaleString('vi-VN')} vé`}
                                    actualVal={`${actualReturnQty.toLocaleString('vi-VN')} vé`}
                                    diffVal={
                                        returnQtyDiff === 0
                                            ? '0 vé (Khớp)'
                                            : `${returnQtyDiff > 0 ? '+' : ''}${returnQtyDiff.toLocaleString('vi-VN')} vé`
                                    }
                                    isDiff={returnQtyDiff !== 0}
                                    diffType={returnQtyDiff !== 0 ? 'error' : 'success'}
                                />

                                {/* Metric 2: Thành tiền sau hoa hồng */}
                                <MetricCompareRow
                                    label="Giá trị sau hoa hồng"
                                    subtext="Tiền vốn tính theo đài"
                                    systemVal={`${formatSettlementMoney(afterHhSystemReturnVal)} đ`}
                                    actualVal={`${formatSettlementMoney(actualReturnVal)} đ`}
                                    diffVal={
                                        returnValDiff === 0
                                            ? '0 đ (Khớp)'
                                            : `${returnValDiff > 0 ? '+' : ''}${formatSettlementMoney(returnValDiff)} đ`
                                    }
                                    isDiff={returnValDiff !== 0}
                                    diffType={returnValDiff !== 0 ? 'error' : 'success'}
                                />

                                {/* Metric 3: Mệnh giá ghi sổ trước hoa hồng (nếu có gap) */}
                                {returnBookGap !== 0 && (
                                    <MetricCompareRow
                                        label="Mệnh giá ghi sổ"
                                        subtext="Trước khi quy đổi HH"
                                        systemVal={`${formatSettlementMoney(storedSystemReturnVal)} đ`}
                                        actualVal={`${formatSettlementMoney(actualReturnQty * 10000)} đ`}
                                        diffVal={`HH −${formatSettlementMoney(Math.abs(returnBookGap))} đ`}
                                        isDiff={false}
                                        diffType="neutral"
                                    />
                                )}
                            </Box>

                            {/* Alert footer on Diff */}
                            {(returnQtyDiff !== 0 || returnValDiff !== 0) && (
                                <Box
                                    sx={{
                                        mt: 1,
                                        p: 1,
                                        borderRadius: '8px',
                                        bgcolor: '#ffffff',
                                        border: '1px dashed #fca5a5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.75,
                                    }}
                                >
                                    <Typography variant="caption" fontWeight={700} color="#be123c">
                                        ⚠ {returnQtyDiff < 0 ? `Hệ thống thừa ${Math.abs(returnQtyDiff)} vé trả` : `Hệ thống thiếu ${returnQtyDiff} vé trả`} so với thực tế NCC.
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Grid>
                </Grid>

                {/* Summary Ribbon */}
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 1, borderTop: '1px solid #f1f5f9' }}>
                    <Chip
                        size="small"
                        icon={<ReceiptLongOutlinedIcon style={{ fontSize: '0.85rem', color: '#1d4ed8' }} />}
                        label={`${importBatches.length} phiếu nhập · ${systemImportQty.toLocaleString('vi-VN')} vé HT`}
                        sx={{ fontWeight: 700, bgcolor: '#eff6ff', color: '#1d4ed8' }}
                    />
                    <Chip
                        size="small"
                        icon={<AssignmentReturnOutlinedIcon style={{ fontSize: '0.85rem', color: '#c2410c' }} />}
                        label={`${returnBatches.length} phiếu trả · ${handedOverReturnQty.toLocaleString('vi-VN')} vé đã bàn giao`}
                        sx={{ fontWeight: 700, bgcolor: '#fff7ed', color: '#c2410c' }}
                    />
                    <Chip
                        size="small"
                        label={`Thực nhập ròng: ${netQty.toLocaleString('vi-VN')} vé (${formatSettlementMoney(ticketNetVal)} VNĐ)`}
                        sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0' }}
                    />
                </Stack>
            </Paper>

            {/* SECTION B: TỒN KHO KỲ & XỬ LÝ VÉ */}
            <Paper elevation={0} sx={{ p: 2.25, mb: 2.5, borderRadius: '14px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.75 }}>
                    <Typography variant="caption" fontWeight={800} color="#475569" sx={sectionTitleSx}>
                        B. Tồn kho kỳ & Xử lý vé trong kỳ
                    </Typography>
                    <Typography variant="caption" color="#64748b">
                        Cập nhật từ dữ liệu quét mã & kiểm kho chi tiết
                    </Typography>
                </Stack>

                <Grid container spacing={1.5}>
                    {/* Pod 1: Phân phối & Bán vé (3 thẻ) */}
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#f8fafc', borderColor: '#e2e8f0', height: '100%' }}>
                            <Typography variant="caption" fontWeight={800} color="#475569" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.75, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                <PointOfSaleOutlinedIcon sx={{ fontSize: '0.95rem', color: '#2563eb' }} /> 1. Nhập & Bán vé trong kỳ
                            </Typography>
                            <Grid container spacing={1}>
                                <Grid size={{ xs: 4 }}>
                                    <MiniStatCard label="Nhập HT" value={inventoryTotals.imported.toLocaleString('vi-VN')} color="#0f172a" bg="#ffffff" />
                                </Grid>
                                <Grid size={{ xs: 4 }}>
                                    <MiniStatCard label="Đã bán" value={inventoryTotals.sold.toLocaleString('vi-VN')} color="#ea580c" bg="#ffffff" />
                                </Grid>
                                <Grid size={{ xs: 4 }}>
                                    <MiniStatCard label="Tồn GOOD" value={inventoryTotals.remaining.toLocaleString('vi-VN')} color="#16a34a" bg="#ffffff" />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* Pod 2: Trả ế NCC (1 thẻ) */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#f8fafc', borderColor: '#e2e8f0', height: '100%' }}>
                            <Typography variant="caption" fontWeight={800} color="#475569" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.75, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                <AssignmentReturnOutlinedIcon sx={{ fontSize: '0.95rem', color: '#ea580c' }} /> 2. Trả ế nhà cung cấp
                            </Typography>
                            <MiniStatCard
                                label="Đã lập phiếu trả"
                                value={inventoryTotals.returned.toLocaleString('vi-VN')}
                                hint={handedOverReturnQty > 0 ? `Đã bàn giao: ${handedOverReturnQty.toLocaleString('vi-VN')} vé` : undefined}
                                color="#0f172a"
                                bg="#ffffff"
                            />
                        </Paper>
                    </Grid>

                    {/* Pod 3: Sự cố / Rủi ro (3 thẻ + Badge tổng) */}
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 1.5,
                                borderRadius: '12px',
                                bgcolor: incidentTotal > 0 ? '#fff5f5' : '#f8fafc',
                                borderColor: incidentTotal > 0 ? '#fecdd3' : '#e2e8f0',
                                height: '100%',
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="caption" fontWeight={800} color={incidentTotal > 0 ? '#be123c' : '#475569'} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    <WarningAmberOutlinedIcon sx={{ fontSize: '0.95rem', color: incidentTotal > 0 ? '#be123c' : '#64748b' }} /> 3. Vé sự cố trong kỳ
                                </Typography>
                                {incidentTotal > 0 && (
                                    <Chip
                                        size="small"
                                        label={`Tổng ${incidentTotal.toLocaleString('vi-VN')} sự cố`}
                                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#ffffff', color: '#be123c', border: '1px solid #fecdd3' }}
                                    />
                                )}
                            </Stack>
                            <Grid container spacing={1}>
                                <Grid size={{ xs: 4 }}>
                                    <MiniStatCard label="Vé Lạc" value={inventoryTotals.lost.toLocaleString('vi-VN')} color={inventoryTotals.lost > 0 ? '#be123c' : '#64748b'} bg="#ffffff" />
                                </Grid>
                                <Grid size={{ xs: 4 }}>
                                    <MiniStatCard label="Vé Hỏng" value={inventoryTotals.damaged.toLocaleString('vi-VN')} color={inventoryTotals.damaged > 0 ? '#b45309' : '#64748b'} bg="#ffffff" />
                                </Grid>
                                <Grid size={{ xs: 4 }}>
                                    <MiniStatCard label="Vé Hủy" value={inventoryTotals.voided.toLocaleString('vi-VN')} color={inventoryTotals.voided > 0 ? '#64748b' : '#64748b'} bg="#ffffff" />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                </Grid>

                {inventoryAdjustments.length > 0 && (
                    <Typography variant="caption" color="#64748b" sx={{ display: 'block', mt: 1.5 }}>
                        Đã ghi nhận {inventoryAdjustments.length} điều chỉnh nhập/trả từ quá trình đối soát chênh lệch.
                    </Typography>
                )}
            </Paper>

            {mode !== 'discrepancy_summary' && (
                <>
                    <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                        <Typography variant="caption" fontWeight={800} color="#475569" sx={sectionTitleSx}>
                            C. Giá vốn & hoa hồng
                        </Typography>
                        <Grid container spacing={1.5} alignItems="center" sx={{ mb: stationPricing.length > 0 ? 1.5 : 0 }}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Stack direction="row" spacing={0.75} alignItems="center">
                                    <LocalOfferOutlinedIcon sx={{ fontSize: '1rem', color: '#64748b' }} />
                                    <Box>
                                        <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ display: 'block' }}>
                                            Giá gốc hệ thống → sau đối soát
                                        </Typography>
                                        <Typography variant="body2" fontWeight={800}>
                                            {formatSettlementMoney(baselineUnitPrice)} →{' '}
                                            <Box component="span" sx={{ color: unitPriceDiff !== 0 ? (unitPriceDiff > 0 ? '#be123c' : '#b45309') : '#0f172a' }}>
                                                {formatSettlementMoney(reconciledUnitPrice)}
                                            </Box>{' '}
                                            <Typography component="span" variant="caption" color="#94a3b8">VNĐ/vé</Typography>
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                {unitPriceDiff === 0 ? (
                                    <Typography variant="caption" color="#64748b" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <TrendingFlatOutlinedIcon sx={{ fontSize: '0.95rem' }} /> Không đổi — khớp giá vốn sau hoa hồng
                                    </Typography>
                                ) : unitPriceDiff > 0 ? (
                                    <Typography variant="caption" fontWeight={700} color="#be123c" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <TrendingUpOutlinedIcon sx={{ fontSize: '0.95rem' }} /> Tăng +{formatSettlementMoney(unitPriceDiff)} VNĐ/vé
                                    </Typography>
                                ) : (
                                    <Typography variant="caption" fontWeight={700} color="#b45309" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <TrendingDownOutlinedIcon sx={{ fontSize: '0.95rem' }} /> Giảm {formatSettlementMoney(unitPriceDiff)} VNĐ/vé
                                    </Typography>
                                )}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Typography variant="caption" color="#64748b">
                                    Công thức tiền vé: {formatSettlementMoney(reconciledUnitPrice)} × ({actualImportQty.toLocaleString('vi-VN')} − {actualReturnQty.toLocaleString('vi-VN')}) = {formatSettlementMoney(ticketNetVal)} VNĐ
                                </Typography>
                            </Grid>
                        </Grid>

                        {stationPricing.length > 0 && (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 800, color: '#64748b' }}>Nhà đài</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800, color: '#64748b' }}>SL nhập</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800, color: '#64748b' }}>Giá nhập</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800, color: '#64748b' }}>HH</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800, color: '#64748b' }}>Giá sau HH</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {stationPricing.map((row) => (
                                        <TableRow key={row.lotteryStationId}>
                                            <TableCell sx={{ fontWeight: 700 }}>{row.lotteryStationName || `Đài #${row.lotteryStationId}`}</TableCell>
                                            <TableCell align="right">{(row.importedQuantity ?? 0).toLocaleString('vi-VN')}</TableCell>
                                            <TableCell align="right">{formatSettlementMoney(row.importCost)}</TableCell>
                                            <TableCell align="right">{(Number(row.commissionRate || 0) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800 }}>{formatSettlementMoney(row.netUnitPrice)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Paper>

                    <Paper
                        elevation={0}
                        sx={{ mb: 2, borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#ffffff', overflow: 'hidden' }}
                    >
                        <Box sx={{ px: 2, pt: 1.75, pb: 1 }}>
                            <Typography variant="caption" fontWeight={800} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                D. Tính tiền vé & điều chỉnh phát sinh
                            </Typography>
                        </Box>
                        <Stack divider={<Divider sx={{ borderColor: '#f1f5f9' }} />}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={ledgerRowSx} gap={2}>
                                <Box>
                                    <Typography variant="body2" fontWeight={700} color="#334155">Tạm tính ban đầu</Typography>
                                    <Typography variant="caption" color="#94a3b8">
                                        Giá vốn sau HH × (SL nhập hệ thống − SL trả hệ thống)
                                    </Typography>
                                </Box>
                                <Typography fontWeight={800} sx={{ whiteSpace: 'nowrap' }}>
                                    {formatSettlementMoney(initialEstimatedVal)} VNĐ
                                </Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={ledgerRowSx} gap={2}>
                                <Box>
                                    <Typography variant="body2" fontWeight={700} color="#1e40af">Tiền vé sau đối chiếu</Typography>
                                    <Typography variant="caption" color="#64748b">
                                        {formatSettlementMoney(reconciledUnitPrice)} × {netQty.toLocaleString('vi-VN')} vé ròng
                                    </Typography>
                                </Box>
                                <Typography fontWeight={800} color="#1d4ed8" sx={{ whiteSpace: 'nowrap' }}>
                                    {formatSettlementMoney(ticketNetVal)} VNĐ
                                </Typography>
                            </Stack>
                            {settlementAdjustments.length > 0 ? (
                                settlementAdjustments.map((row) => (
                                    <Stack
                                        key={row.id}
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="flex-start"
                                        sx={ledgerRowSx}
                                        gap={2}
                                    >
                                        <Box>
                                            <Typography variant="body2" fontWeight={700} color="#475569">
                                                {row.customName || row.reasonLabel || ADJUSTMENT_REASON_LABELS[row.reasonCode] || row.reasonCode}
                                                {row.autoGenerated ? ' · tự sinh' : ''}
                                            </Typography>
                                            <Typography variant="caption" color="#94a3b8">
                                                {row.note || 'Điều chỉnh SETTLEMENT từ bước đối chiếu'}
                                            </Typography>
                                        </Box>
                                        <Typography
                                            fontWeight={800}
                                            color={Number(row.amount) > 0 ? '#be123c' : Number(row.amount) < 0 ? '#15803d' : '#475569'}
                                            sx={{ whiteSpace: 'nowrap' }}
                                        >
                                            {Number(row.amount) > 0 ? '+' : ''}{formatSettlementMoney(row.amount)} VNĐ
                                        </Typography>
                                    </Stack>
                                ))
                            ) : (
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={ledgerRowSx}>
                                    <Typography variant="body2" color="#64748b">Không có khoản điều chỉnh phát sinh</Typography>
                                    <Typography fontWeight={700} color="#94a3b8">0 VNĐ</Typography>
                                </Stack>
                            )}
                            {(hasLiveAdjustment || differenceAmount !== 0) && (
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    sx={{ ...ledgerRowSx, bgcolor: differenceTone.bg }}
                                    gap={2}
                                >
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Box sx={{ color: differenceTone.color, display: 'flex' }}>{differenceTone.icon}</Box>
                                        <Box>
                                            <Typography variant="body2" fontWeight={700} color={differenceTone.color}>
                                                Chênh lệch so với tạm tính · {getAgencyCashflowLabel(differenceAmount)}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: differenceTone.color, opacity: 0.85 }}>
                                                = Chênh lệch sau đối soát − tạm tính ban đầu
                                            </Typography>
                                        </Box>
                                    </Stack>
                                    <Typography fontWeight={800} color={differenceTone.color} sx={{ whiteSpace: 'nowrap' }}>
                                        {formatSignedCashflow(differenceAmount, formatSettlementMoney)} VNĐ
                                    </Typography>
                                </Stack>
                            )}
                        </Stack>
                    </Paper>

                    <Grid container spacing={1.5} sx={{ mb: settlement.reconciliationNote ? 2 : 0 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    px: 2,
                                    py: 1.75,
                                    height: '100%',
                                    borderRadius: '12px',
                                    border: '1px solid #bfdbfe',
                                    bgcolor: '#eff6ff',
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                                    <Box>
                                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.25 }}>
                                            <CalculateOutlinedIcon sx={{ fontSize: '1.05rem', color: '#2563eb' }} />
                                            <Typography
                                                variant="caption"
                                                fontWeight={800}
                                                color="#1e40af"
                                                sx={{ textTransform: 'uppercase', letterSpacing: '0.4px' }}
                                            >
                                                {finalVal != null && finalVal < 0
                                                    ? 'E. NCC hoàn / ghi có'
                                                    : 'E. Số tiền hệ thống tính'}
                                            </Typography>
                                        </Stack>
                                        <Typography variant="caption" color="#3b82f6">
                                            Tiền vé sau đối chiếu + điều chỉnh phát sinh
                                        </Typography>
                                    </Box>
                                    <Typography fontWeight={900} color="#1d4ed8" sx={{ fontSize: '1.35rem', whiteSpace: 'nowrap' }}>
                                        {finalVal != null
                                            ? `${finalVal < 0 ? `+${formatSettlementMoney(Math.abs(finalVal))}` : formatSettlementMoney(finalVal)} VNĐ`
                                            : '—'}
                                    </Typography>
                                </Stack>
                            </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    px: 2,
                                    py: 1.75,
                                    height: '100%',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    bgcolor: '#ffffff',
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                                    <Stack direction="row" spacing={1} alignItems="flex-start">
                                        <PaymentsOutlinedIcon sx={{ color: '#64748b', fontSize: '1.15rem', mt: 0.15 }} />
                                        <Box>
                                            <Typography variant="caption" fontWeight={800} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>
                                                F. So khớp biên lai NCC
                                            </Typography>
                                            <Typography variant="caption" color="#64748b" sx={{ display: 'block' }}>
                                                {actualPaid == null
                                                    ? 'Chưa nhập số tiền cần trả thực tế'
                                                    : isSupplierRefund
                                                      ? 'Số tiền NCC hoàn / ghi có thực tế'
                                                      : 'Số tiền cần trả thực tế'}
                                            </Typography>
                                            <Typography fontWeight={800} sx={{ mt: 0.25 }}>
                                                {actualPaid == null ? '—' : `${formatSettlementMoney(Math.abs(actualPaid))} VNĐ`}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                    {paymentDiff != null && (
                                        <Chip
                                            size="small"
                                            icon={
                                                paymentDiff === 0 ? (
                                                    <CheckCircleOutlinedIcon style={{ fontSize: '0.85rem', color: '#15803d' }} />
                                                ) : (
                                                    <WarningAmberOutlinedIcon style={{ fontSize: '0.85rem', color: paymentDiff > 0 ? '#15803d' : '#be123c' }} />
                                                )
                                            }
                                            label={
                                                paymentDiff === 0
                                                    ? 'Khớp 0 VNĐ'
                                                    : `${paymentDiff > 0 ? 'Dư / giảm chi' : 'Chi vượt'} ${formatSignedCashflow(paymentDiff, formatSettlementMoney)} VNĐ`
                                            }
                                            sx={{
                                                fontWeight: 800,
                                                bgcolor: paymentDiff === 0 || paymentDiff > 0 ? '#f0fdf4' : '#fff1f2',
                                                color: paymentDiff === 0 || paymentDiff > 0 ? '#15803d' : '#be123c',
                                                border: `1px solid ${paymentDiff === 0 || paymentDiff > 0 ? '#bbf7d0' : '#fecdd3'}`,
                                            }}
                                        />
                                    )}
                                </Stack>
                            </Paper>
                        </Grid>
                    </Grid>

                    {settlement.reconciliationNote && (
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: '10px',
                                bgcolor: '#ffffff',
                                border: '1px dashed #cbd5e1',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1,
                            }}
                        >
                            <EditNoteOutlinedIcon sx={{ color: '#64748b', fontSize: '1.2rem', mt: 0.1 }} />
                            <Box>
                                <Typography variant="caption" fontWeight={700} color="#475569" sx={{ display: 'block', mb: 0.25 }}>
                                    Ghi chú đối chiếu
                                </Typography>
                                <Typography variant="body2" color="#1e293b" sx={{ fontSize: '0.85rem' }}>
                                    {settlement.reconciliationNote}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </>
            )}
        </Paper>
    );
};
