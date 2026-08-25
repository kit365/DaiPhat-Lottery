"use client";

import { useMemo } from 'react';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import TrendingFlatOutlinedIcon from '@mui/icons-material/TrendingFlatOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import {
    Box,
    Button,
    Divider,
    Grid,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableFooter,
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
    getDiscrepancyItemBadgeModifier,
    getMatchBadgeModifier,
    getReturnMatchingLockDetails,
    isReturnBatchHandedOver,
    isReturnMatchingOverdueUnhanded,
    resolveLiveSystemImportQuantity,
    resolveLiveSystemReturnQuantity,
    weightedStationNetUnitPrice,
} from '../../utils/settlementLabels';
import { AllStationsTable } from './SettlementReconciliationTabs';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';

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
    mode?: 'full' | 'discrepancy_summary' | 'completion_min';
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

const cleanAdjustmentNote = (raw?: string | null): string | null => {
    if (!raw) return null;
    return raw
        .replace(/\(UNDER_IMPORTED\)/gi, '(Nhập thiếu)')
        .replace(/\(DAMAGED\)/gi, '(Bị hư hỏng / rách)')
        .replace(/\(LOST\)/gi, '(Thất lạc)')
        .replace(/\(VOIDED\)/gi, '(Báo hủy)')
        .replace(/UNDER_IMPORTED/gi, 'Nhập thiếu')
        .replace(/DAMAGED/gi, 'Hư hỏng')
        .replace(/LOST/gi, 'Thất lạc')
        .replace(/VOIDED/gi, 'Báo hủy');
};

const uniqueResolutionNotes = (rows: SupplierSettlementAdjustment[]): string[] => {
    const notes = rows
        .map((row) => cleanAdjustmentNote(row.note)?.trim())
        .filter((note): note is string => Boolean(note));
    return Array.from(new Set(notes));
};

const describeResolutionDetail = (
    rows: SupplierSettlementAdjustment[],
    fallback: string
): string => {
    const notes = uniqueResolutionNotes(rows);
    if (notes.length === 1) return notes[0];
    if (notes.length > 1) return notes.join(' · ');
    return fallback;
};

const scaleMoney = (value: number): number => {
    if (!Number.isFinite(value)) return 0;
    const factor = 1_000;
    const rounded = Math.round((Math.abs(value) + Number.EPSILON) * factor) / factor;
    return value < 0 ? -rounded : rounded;
};

const formatSignedQty = (value: number) => {
    if (!Number.isFinite(value) || value === 0) return '0';
    return `${value > 0 ? '+' : '−'}${Math.abs(value).toLocaleString('vi-VN')}`;
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
    <AdminStatusBadge
        label={ok ? okLabel : badLabel}
        modifier={getMatchBadgeModifier(ok)}
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
    diffType?: 'success' | 'error' | 'warning' | 'neutral' | 'info';
    subtext?: string;
}) => (
    <Box
        sx={{
            py: 1.25,
            px: 1.5,
            borderRadius: '10px',
            bgcolor: isDiff
                ? diffType === 'error'
                    ? '#fff5f5'
                    : diffType === 'info'
                      ? '#eff6ff'
                      : '#fffbeb'
                : '#ffffff',
            border: '1px solid',
            borderColor: isDiff
                ? diffType === 'error'
                    ? '#fecaca'
                    : diffType === 'info'
                      ? '#bfdbfe'
                      : '#fde68a'
                : '#f1f5f9',
            mb: 1,
            boxShadow: isDiff ? '0 1px 3px rgba(0,0,0,0.02)' : 'none',
        }}
    >
        <Grid container spacing={1} alignItems="center">
            <Grid size={{ xs: 12, sm: 3.6 }}>
                <Typography variant="caption" fontWeight={800} color="#1e293b" sx={{ display: 'block' }}>
                    {label}
                </Typography>
                {subtext && (
                    <Typography variant="caption" color="#64748b" sx={{ display: 'block', fontSize: '0.7rem' }}>
                        {subtext}
                    </Typography>
                )}
            </Grid>
            <Grid size={{ xs: 4, sm: 2.7 }}>
                <Typography variant="caption" color="#64748b" sx={{ display: 'block', fontSize: '0.675rem', fontWeight: 600 }}>
                    Hệ thống
                </Typography>
                <Typography variant="body2" fontWeight={700} color="#0f172a">
                    {systemVal}
                </Typography>
            </Grid>
            <Grid size={{ xs: 4, sm: 2.7 }}>
                <Typography variant="caption" color="#1d4ed8" sx={{ display: 'block', fontSize: '0.675rem', fontWeight: 700 }}>
                    Thực tế NCC
                </Typography>
                <Typography variant="body2" fontWeight={800} color="#1e40af">
                    {actualVal}
                </Typography>
            </Grid>
            <Grid size={{ xs: 4, sm: 3 }} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                <Typography variant="caption" color="#64748b" sx={{ display: 'block', fontSize: '0.675rem', fontWeight: 600 }}>
                    Chênh lệch (NCC so với HT)
                </Typography>
                <Typography
                    variant="body2"
                    fontWeight={800}
                    color={
                        !isDiff
                            ? '#15803d'
                            : diffType === 'error'
                            ? '#dc2626'
                            : diffType === 'info'
                            ? '#1d4ed8'
                            : diffType === 'warning'
                            ? '#d97706'
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
    const systemImportQty = resolveLiveSystemImportQuantity(settlement, importBatches, inventoryByStation);
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
    const importAdjustments = adjustments.filter((row) => row.groupType === 'IMPORT');
    const returnAdjustments = adjustments.filter((row) => row.groupType === 'RETURN');
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

    const returnLockDetails = getReturnMatchingLockDetails(returnBatches, {
        isReturnExpired: settlement.isReturnExpired,
        periodTo: settlement.periodTo,
        periodFrom: settlement.periodFrom,
    });
    const isReturnInputsLocked = returnLockDetails.inputsLocked;

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
    const voidedExplainsImportGap =
        inventoryTotals.voided > 0 && importQtyDiff === inventoryTotals.voided;
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

    if (mode === 'completion_min') {
        const importItem = discrepancyItems.find((item) => item.type === 'IMPORT_QUANTITY');
        const returnItem = discrepancyItems.find((item) => item.type === 'RETURN_QUANTITY');
        const unitPriceItem = discrepancyItems.find((item) => item.type === 'IMPORT_UNIT_PRICE');
        const types = settlement.discrepancyTypes || [];
        const hadImport =
            Boolean(importItem)
            || Boolean(settlement.importDiscrepancyResolved)
            || importAdjustments.length > 0
            || types.includes('IMPORT_QUANTITY');
        const hadReturn =
            Boolean(returnItem)
            || Boolean(settlement.returnDiscrepancyResolved)
            || returnAdjustments.length > 0
            || types.includes('RETURN_QUANTITY');
        const hadUnitPrice =
            Boolean(unitPriceItem)
            || types.includes('IMPORT_UNIT_PRICE');
        const importDetail = describeResolutionDetail(
            importAdjustments,
            importItem?.direction === 'POSITIVE'
                ? 'Đã bổ sung vé hệ thống ghi thiếu (Nhập thiếu).'
                : importItem?.direction === 'NEGATIVE'
                  ? 'Đã ghi nhận vé hệ thống ghi thừa.'
                  : 'Đã xử lý chênh lệch nhập vé.'
        );
        const returnDetail = describeResolutionDetail(
            returnAdjustments,
            returnItem?.direction === 'POSITIVE'
                ? 'Đã ghi nhận vé thừa trả so với hệ thống.'
                : returnItem?.direction === 'NEGATIVE'
                  ? 'Đã ghi nhận vé thiếu trả (có trong phiếu trả nhưng không có trong kiểm đếm).'
                  : 'Đã xử lý chênh lệch trả vé.'
        );
        const systemImportPrice = Number(settlement.systemTicketImportPrice ?? originalUnitPrice);
        const actualImportPrice = Number(settlement.actualTicketImportPrice ?? 0);
        const displayActualImportPrice = actualImportPrice || reconciledUnitPrice;
        const importPriceChanged = Math.abs(systemImportPrice - displayActualImportPrice) > 0.001;
        const uniqueCommissionRates = Array.from(
            new Set(stationPricing.map((row) => Number(row.commissionRate || 0)))
        );
        const importTicketMoney = scaleMoney(reconciledUnitPrice * actualImportQty);
        const returnTicketMoney = scaleMoney(reconciledUnitPrice * actualReturnQty);
        const payableAmount = finalVal ?? ticketNetVal + additionalCostTotal;
        const vsInitialDiff = scaleMoney(payableAmount - initialEstimatedVal);

        const resolutionRows = [
            {
                key: 'import',
                title: 'Nhập vé',
                skipped: !hadImport,
                resolved: Boolean(settlement.importDiscrepancyResolved) || !hadImport,
                detail: !hadImport
                    ? 'Không lệch số lượng nhập.'
                    : Boolean(settlement.importDiscrepancyResolved)
                      ? importDetail
                      : 'Chưa xử lý xong chênh lệch nhập.',
            },
            {
                key: 'return',
                title: 'Trả vé',
                skipped: !hadReturn,
                resolved: Boolean(settlement.returnDiscrepancyResolved) || !hadReturn,
                detail: !hadReturn
                    ? 'Không lệch số lượng trả.'
                    : Boolean(settlement.returnDiscrepancyResolved)
                      ? returnDetail
                      : 'Chưa xử lý xong chênh lệch trả.',
            },
            {
                key: 'price',
                title: 'Giá nhập',
                skipped: !hadUnitPrice,
                resolved: Boolean(settlement.unitPriceDiscrepancyResolved) || !hadUnitPrice,
                detail: !hadUnitPrice
                    ? 'Giá nhập và hoa hồng không đổi.'
                    : unitPriceItem
                      ? getDiscrepancyItemLabel(unitPriceItem)
                      : 'Đã ghi nhận điều chỉnh giá nhập.',
            },
        ];

        return (
            <Stack spacing={2.5} sx={{ mb: 2.5 }}>
                {/* 1. Tóm tắt hoàn tất đối soát */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: '16px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    }}
                >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Box
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '8px',
                                    bgcolor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <FactCheckOutlinedIcon sx={{ fontSize: '1.2rem' }} />
                            </Box>
                            <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                Tóm tắt hoàn tất đối soát
                            </Typography>
                        </Stack>
                        <AdminStatusBadge
                            label={fullyMatched ? 'Khớp toàn bộ dữ liệu' : 'Còn chênh lệch cần rà soát'}
                            modifier={fullyMatched ? 'admin-status-badge--success' : 'admin-status-badge--pending'}
                        />
                    </Stack>

                    <Grid container spacing={1.5} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box
                                sx={{
                                    p: 1.75,
                                    borderRadius: '12px',
                                    bgcolor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Box>
                                    <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', mb: 0.75 }}>
                                        Vé nhập thực tế
                                    </Typography>
                                    <Typography fontWeight={800} color="#0f172a" sx={{ fontSize: '1.35rem', lineHeight: 1.2 }}>
                                        {actualImportQty.toLocaleString('vi-VN')}{' '}
                                        <Typography component="span" variant="body2" color="#64748b" fontWeight={600}>vé</Typography>
                                    </Typography>
                                    <Typography variant="caption" color="#64748b" sx={{ display: 'block', mt: 0.5 }}>
                                        Hệ thống ghi nhận: <strong>{systemImportQty.toLocaleString('vi-VN')} vé</strong>
                                    </Typography>
                                </Box>
                                <Box sx={{ mt: 1.5 }}>
                                    <AdminStatusBadge
                                        label={importQtyDiff === 0 ? 'Khớp hệ thống' : `Lệch ${formatSignedQty(importQtyDiff)} vé`}
                                        modifier={
                                            importQtyDiff === 0
                                                ? 'admin-status-badge--success'
                                                : importQtyDiff > 0
                                                  ? 'admin-status-badge--inactive'
                                                  : 'admin-status-badge--pending'
                                        }
                                    />
                                </Box>
                            </Box>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box
                                sx={{
                                    p: 1.75,
                                    borderRadius: '12px',
                                    bgcolor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Box>
                                    <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', mb: 0.75 }}>
                                        Vé trả thực tế
                                    </Typography>
                                    <Typography fontWeight={800} color="#0f172a" sx={{ fontSize: '1.35rem', lineHeight: 1.2 }}>
                                        {actualReturnQty.toLocaleString('vi-VN')}{' '}
                                        <Typography component="span" variant="body2" color="#64748b" fontWeight={600}>vé</Typography>
                                    </Typography>
                                    <Typography variant="caption" color="#64748b" sx={{ display: 'block', mt: 0.5 }}>
                                        Hệ thống ghi nhận: <strong>{systemReturnQty.toLocaleString('vi-VN')} vé</strong>
                                    </Typography>
                                </Box>
                                <Box sx={{ mt: 1.5 }}>
                                    <AdminStatusBadge
                                        label={
                                            isReturnInputsLocked
                                                ? 'Đã khóa sổ trả'
                                                : returnQtyDiff === 0
                                                  ? 'Khớp hệ thống'
                                                  : `Lệch ${formatSignedQty(returnQtyDiff)} vé`
                                        }
                                        modifier={
                                            isReturnInputsLocked
                                                ? 'admin-status-badge--pending'
                                                : returnQtyDiff === 0
                                                  ? 'admin-status-badge--success'
                                                  : 'admin-status-badge--inactive'
                                        }
                                    />
                                </Box>
                            </Box>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box
                                sx={{
                                    p: 1.75,
                                    borderRadius: '12px',
                                    bgcolor: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Box>
                                    <Typography variant="caption" color="#1e40af" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', mb: 0.75 }}>
                                        Vé ròng thanh toán
                                    </Typography>
                                    <Typography fontWeight={900} color="#1d4ed8" sx={{ fontSize: '1.35rem', lineHeight: 1.2 }}>
                                        {netQty.toLocaleString('vi-VN')}{' '}
                                        <Typography component="span" variant="body2" color="#3b82f6" fontWeight={600}>vé</Typography>
                                    </Typography>
                                    <Typography variant="caption" color="#3b82f6" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                                        Nhập {actualImportQty.toLocaleString('vi-VN')} − trả {actualReturnQty.toLocaleString('vi-VN')}
                                    </Typography>
                                </Box>
                                <Box sx={{ mt: 1.5 }}>
                                    <AdminStatusBadge
                                        label={`${formatSettlementMoney(reconciledUnitPrice)} đ/vé sau HH`}
                                        modifier="admin-status-badge--active"
                                    />
                                </Box>
                            </Box>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box
                                sx={{
                                    p: 1.75,
                                    borderRadius: '12px',
                                    bgcolor: payableAmount < 0 ? '#fff1f2' : '#f0fdf4',
                                    border: `1px solid ${payableAmount < 0 ? '#fecdd3' : '#bbf7d0'}`,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Box>
                                    <Typography variant="caption" color={payableAmount < 0 ? '#991b1b' : '#166534'} fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', mb: 0.75 }}>
                                        {payableAmount < 0 ? 'NCC hoàn / ghi có' : 'Phải trả nhà cung cấp'}
                                    </Typography>
                                    <Typography fontWeight={900} color={payableAmount < 0 ? '#be123c' : '#15803d'} sx={{ fontSize: '1.35rem', lineHeight: 1.2 }}>
                                        {`${formatSettlementMoney(Math.abs(payableAmount))} VNĐ`}
                                    </Typography>
                                    <Typography variant="caption" color={payableAmount < 0 ? '#be123c' : '#16a34a'} sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                                        {vsInitialDiff === 0
                                            ? 'Khớp tạm tính hệ thống'
                                            : `${vsInitialDiff > 0 ? 'Cao hơn' : 'Thấp hơn'} tạm tính ${formatSettlementMoney(Math.abs(vsInitialDiff))} VNĐ`}
                                    </Typography>
                                </Box>
                                <Box sx={{ mt: 1.5 }}>
                                    <AdminStatusBadge
                                        label={vsInitialDiff === 0 ? 'Đã chốt số liệu' : 'Có điều chỉnh so với HT'}
                                        modifier={vsInitialDiff === 0 ? 'admin-status-badge--success' : 'admin-status-badge--pending'}
                                    />
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>

                    {incidentTotal > 0 && (
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: '12px',
                            bgcolor: '#fff7ed',
                            border: '1px solid #fed7aa',
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            justifyContent: 'space-between',
                            gap: 1.5,
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center">
                            <WarningAmberOutlinedIcon sx={{ color: '#ea580c', fontSize: '1.15rem' }} />
                            <Typography variant="body2" fontWeight={700} color="#9a3412">
                                Vé sự cố trong kỳ (không tính vào tiền vé):{' '}
                                <Typography component="span" fontWeight={800} color="#7c2d12">{incidentTotal.toLocaleString('vi-VN')} vé</Typography>
                            </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {inventoryTotals.lost > 0 && (
                                <AdminStatusBadge
                                    label={`Thất lạc: ${inventoryTotals.lost.toLocaleString('vi-VN')} vé`}
                                    modifier="admin-status-badge--inactive"
                                />
                            )}
                            {inventoryTotals.damaged > 0 && (
                                <AdminStatusBadge
                                    label={`Hư hỏng: ${inventoryTotals.damaged.toLocaleString('vi-VN')} vé`}
                                    modifier="admin-status-badge--pending"
                                />
                            )}
                            {inventoryTotals.voided > 0 && (
                                <AdminStatusBadge
                                    label={`Báo hủy: ${inventoryTotals.voided.toLocaleString('vi-VN')} vé`}
                                    modifier="admin-status-badge--draft"
                                />
                            )}
                        </Stack>
                    </Box>
                    )}
                </Paper>

                {/* 2. KẾT QUẢ XỬ LÝ CHÊNH LỆCH */}
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#ffffff',
                    }}
                >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                        <Box
                            sx={{
                                width: 28,
                                height: 28,
                                borderRadius: '7px',
                                bgcolor: '#f0fdf4',
                                color: '#16a34a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <FactCheckOutlinedIcon sx={{ fontSize: '1.1rem' }} />
                        </Box>
                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Kết quả xử lý chênh lệch
                        </Typography>
                    </Stack>

                    <Stack spacing={1}>
                        {resolutionRows.map((row) => (
                            <Stack
                                key={row.key}
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                gap={2}
                                sx={{
                                    px: 1.75,
                                    py: 1.35,
                                    borderRadius: '10px',
                                    border: '1px solid',
                                    borderColor: row.skipped ? '#e2e8f0' : row.resolved ? '#bbf7d0' : '#fed7aa',
                                    bgcolor: row.skipped ? '#f8fafc' : row.resolved ? '#f9fefb' : '#fffbf5',
                                }}
                            >
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={800} color="#0f172a">
                                        {row.title}
                                    </Typography>
                                    <Typography variant="caption" color="#64748b" sx={{ display: 'block', mt: 0.25 }}>
                                        {row.detail}
                                    </Typography>
                                </Box>
                                <AdminStatusBadge
                                    label={row.skipped ? 'Không lệch' : row.resolved ? 'Đã xử lý' : 'Chưa xử lý'}
                                    modifier={
                                        row.skipped
                                            ? 'admin-status-badge--draft'
                                            : row.resolved
                                              ? 'admin-status-badge--success'
                                              : 'admin-status-badge--pending'
                                    }
                                />
                            </Stack>
                        ))}
                    </Stack>
                </Paper>

                {/* 3. GIÁ NHẬP & HOA HỒNG */}
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#ffffff',
                    }}
                >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.75 }}>
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
                            <LocalOfferOutlinedIcon sx={{ fontSize: '1.1rem' }} />
                        </Box>
                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Giá nhập & hoa hồng
                        </Typography>
                    </Stack>

                    <Typography variant="body2" color="#334155" sx={{ mb: stationPricing.length > 0 ? 1.5 : 0 }}>
                        Giá nhập{' '}
                        <Box component="span" fontWeight={800}>
                            {importPriceChanged
                                ? `${formatSettlementMoney(systemImportPrice)} → ${formatSettlementMoney(displayActualImportPrice)}`
                                : formatSettlementMoney(displayActualImportPrice)}
                        </Box>
                        {' '}VNĐ/vé
                        {' · '}
                        Giá sau HH{' '}
                        <Box component="span" fontWeight={800} color="#1d4ed8">
                            {formatSettlementMoney(reconciledUnitPrice)}
                        </Box>
                        {' '}VNĐ/vé
                        {uniqueCommissionRates.length === 1 && (
                            <>
                                {' · '}HH{' '}
                                <Box component="span" fontWeight={800}>
                                    {(uniqueCommissionRates[0] * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%
                                </Box>
                            </>
                        )}
                    </Typography>

                    {stationPricing.length > 0 && (
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.75rem', py: 1 } }}>
                                    <TableCell>Nhà đài</TableCell>
                                    <TableCell align="right">SL nhập</TableCell>
                                    <TableCell align="right">Hoa hồng</TableCell>
                                    <TableCell align="right">Giá sau HH</TableCell>
                                    <TableCell align="right">Thành tiền</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {stationPricing.map((row) => {
                                    const qty = Number(row.importedQuantity || 0);
                                    const lineAmount = scaleMoney(Number(row.netUnitPrice || 0) * qty);
                                    return (
                                        <TableRow key={row.lotteryStationId}>
                                            <TableCell sx={{ fontWeight: 700, py: 1 }}>
                                                {row.lotteryStationName || `Đài #${row.lotteryStationId}`}
                                            </TableCell>
                                            <TableCell align="right" sx={{ py: 1 }}>
                                                {qty.toLocaleString('vi-VN')}
                                            </TableCell>
                                            <TableCell align="right" sx={{ py: 1 }}>
                                                {(Number(row.commissionRate || 0) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, py: 1 }}>
                                                {formatSettlementMoney(row.netUnitPrice)} VNĐ
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, py: 1 }}>
                                                {formatSettlementMoney(lineAmount)} VNĐ
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </Paper>

                {/* 4. CHI PHÍ PHÁT SINH & SỔ TIỀN */}
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#ffffff',
                        overflow: 'hidden',
                    }}
                >
                    <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 2.25, pb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Box
                                sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '7px',
                                    bgcolor: '#f1f5f9',
                                    color: '#0f172a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <PaymentsOutlinedIcon sx={{ fontSize: '1.1rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                    Bảng tổng hợp dòng tiền thanh toán
                                </Typography>
                                <Typography variant="caption" color="#64748b">
                                    (Vé nhập − vé trả) × giá sau hoa hồng + chi phí phát sinh
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>

                    <Stack divider={<Divider sx={{ borderColor: '#f1f5f9' }} />}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={ledgerRowSx} gap={2}>
                            <Box>
                                <Typography variant="body2" fontWeight={700} color="#334155">Vé nhập thực tế</Typography>
                                <Typography variant="caption" color="#64748b" sx={{ display: 'block' }}>
                                    {actualImportQty.toLocaleString('vi-VN')} vé × {formatSettlementMoney(reconciledUnitPrice)} đ
                                </Typography>
                            </Box>
                            <Typography fontWeight={700} color="#0f172a" sx={{ whiteSpace: 'nowrap' }}>
                                {formatSettlementMoney(importTicketMoney)} VNĐ
                            </Typography>
                        </Stack>

                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={ledgerRowSx} gap={2}>
                            <Box>
                                <Typography variant="body2" fontWeight={700} color="#334155">Trừ vé trả thực tế</Typography>
                                <Typography variant="caption" color="#64748b" sx={{ display: 'block' }}>
                                    {actualReturnQty.toLocaleString('vi-VN')} vé × {formatSettlementMoney(reconciledUnitPrice)} đ
                                </Typography>
                            </Box>
                            <Typography fontWeight={700} color="#475569" sx={{ whiteSpace: 'nowrap' }}>
                                {returnTicketMoney === 0 ? '0 VNĐ' : `−${formatSettlementMoney(returnTicketMoney)} VNĐ`}
                            </Typography>
                        </Stack>

                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ ...ledgerRowSx, bgcolor: '#eff6ff' }} gap={2}>
                            <Box>
                                <Typography variant="body2" fontWeight={800} color="#1e40af">Tiền vé ròng</Typography>
                                <Typography variant="caption" color="#3b82f6" sx={{ display: 'block' }}>
                                    {netQty.toLocaleString('vi-VN')} vé ròng × {formatSettlementMoney(reconciledUnitPrice)} đ
                                </Typography>
                            </Box>
                            <Typography fontWeight={900} color="#1d4ed8" sx={{ whiteSpace: 'nowrap' }}>
                                {formatSettlementMoney(ticketNetVal)} VNĐ
                            </Typography>
                        </Stack>

                        {settlementAdjustments.length > 0 ? (
                            settlementAdjustments.map((row) => (
                                <Stack
                                    key={row.id}
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    sx={ledgerRowSx}
                                    gap={2}
                                >
                                    <Box>
                                        <Typography variant="body2" fontWeight={700} color="#475569">
                                            {row.customName || row.reasonLabel || ADJUSTMENT_REASON_LABELS[row.reasonCode] || row.reasonCode}
                                        </Typography>
                                        <Typography variant="caption" color="#94a3b8" sx={{ display: 'block' }}>
                                            {cleanAdjustmentNote(row.note) || 'Chi phí phát sinh'}
                                        </Typography>
                                    </Box>
                                    <Typography
                                        fontWeight={800}
                                        color={Number(row.amount) > 0 ? '#dc2626' : Number(row.amount) < 0 ? '#15803d' : '#475569'}
                                        sx={{ whiteSpace: 'nowrap' }}
                                    >
                                        {Number(row.amount) > 0 ? '+' : ''}{formatSettlementMoney(row.amount)} VNĐ
                                    </Typography>
                                </Stack>
                            ))
                        ) : (
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={ledgerRowSx}>
                                <Box>
                                    <Typography variant="body2" fontWeight={700} color="#334155">Chi phí phát sinh</Typography>
                                    <Typography variant="caption" color="#94a3b8" sx={{ display: 'block' }}>
                                        Không phát sinh phí vận chuyển, phạt hoặc điều chỉnh khác
                                    </Typography>
                                </Box>
                                <Typography fontWeight={700} color="#94a3b8">0 VNĐ</Typography>
                            </Stack>
                        )}

                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ ...ledgerRowSx, bgcolor: payableAmount < 0 ? '#fff1f2' : '#f0fdf4' }} gap={2}>
                            <Box>
                                <Typography variant="body2" fontWeight={800} color={payableAmount < 0 ? '#991b1b' : '#166534'}>
                                    {payableAmount < 0 ? 'Nhà cung cấp hoàn / ghi có' : 'Số tiền phải trả nhà cung cấp'}
                                </Typography>
                                <Typography variant="caption" color={payableAmount < 0 ? '#be123c' : '#16a34a'} sx={{ display: 'block' }}>
                                    Tiền vé ròng + chi phí phát sinh
                                </Typography>
                            </Box>
                            <Typography fontWeight={900} color={payableAmount < 0 ? '#be123c' : '#15803d'} sx={{ fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                                {formatSettlementMoney(Math.abs(payableAmount))} VNĐ
                            </Typography>
                        </Stack>

                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ ...ledgerRowSx, bgcolor: '#f8fafc' }} gap={2}>
                            <Box>
                                <Typography variant="body2" fontWeight={700} color="#475569">Tạm tính hệ thống</Typography>
                                <Typography variant="caption" color="#64748b" sx={{ display: 'block' }}>
                                    ({systemImportQty.toLocaleString('vi-VN')} nhập − {systemReturnQty.toLocaleString('vi-VN')} trả) × {formatSettlementMoney(reconciledUnitPrice)} đ
                                </Typography>
                            </Box>
                            <Stack alignItems="flex-end" spacing={0.5}>
                                <Typography fontWeight={700} color="#475569" sx={{ whiteSpace: 'nowrap' }}>
                                    {formatSettlementMoney(initialEstimatedVal)} VNĐ
                                </Typography>
                                <AdminStatusBadge
                                    label={
                                        vsInitialDiff === 0
                                            ? 'Khớp số phải trả'
                                            : `${vsInitialDiff > 0 ? '+' : '−'}${formatSettlementMoney(Math.abs(vsInitialDiff))} VNĐ`
                                    }
                                    modifier={vsInitialDiff === 0 ? 'admin-status-badge--success' : 'admin-status-badge--pending'}
                                />
                            </Stack>
                        </Stack>
                    </Stack>
                </Paper>
            </Stack>
        );
    }

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
                            Chênh lệch (NCC so với HT)
                        </Typography>
                        <Typography variant="caption" color="#64748b">
                            {settlement.supplierName || 'NCC'} · {settlement.supplierSettlementCode || `#${settlement.id}`}
                            {' — '}bảng kê đối chiếu số lượng và quy đổi giá vốn
                        </Typography>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <AdminStatusBadge
                        label={
                            fullyMatched
                                ? 'Khớp toàn bộ dữ liệu'
                                : qtyMatched && !valueMatched
                                  ? 'Khớp số lượng · lệch giá trị / hoa hồng'
                                  : `Phát hiện ${discrepancyItems.length || (importQtyDiff !== 0 ? 1 : 0) + (returnQtyDiff !== 0 ? 1 : 0) + (unitPriceDiff !== 0 ? 1 : 0)} chênh lệch`
                        }
                        modifier={fullyMatched ? 'admin-status-badge--success' : 'admin-status-badge--pending'}
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
                                <AdminStatusBadge
                                    key={`${item.type}-${item.direction}`}
                                    label={`${getDiscrepancyItemLabel(item)}${resolved ? ' · đã xử lý' : ''}`}
                                    modifier={getDiscrepancyItemBadgeModifier(resolved, item.direction)}
                                />
                            );
                        })}
                    </Stack>
                </Box>
            )}

            {/* SECTION A: SỐ LIỆU ĐÃ ĐỐI CHIẾU */}
            <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                <Stack spacing={0.75} sx={{ mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                        <Typography variant="caption" fontWeight={800} color="#334155" sx={{ ...sectionTitleSx, mb: 0 }}>
                            A. Đối chiếu nhập / trả với nhà cung cấp
                        </Typography>
                        <Typography variant="caption" color="#64748b" sx={{ flexShrink: 0, fontWeight: 600 }}>
                            Đơn vị: VNĐ sau hoa hồng
                        </Typography>
                    </Stack>
                    <Typography variant="caption" color="#64748b" sx={{ display: 'block', lineHeight: 1.5 }}>
                        <strong>Hệ thống</strong>: Số lượng và giá trị vé hợp lệ đã ghi nhận trong phần mềm (không bao gồm vé sự cố / hủy). · <strong>Thực tế NCC</strong>: Số lượng và giá trị do đại lý khai báo đối soát với nhà cung cấp. · <strong>Chênh lệch (NCC so với HT)</strong>: Dương (+) là hệ thống ghi thiếu so với NCC, Âm (−) là hệ thống ghi thừa so với NCC.
                    </Typography>
                </Stack>

                {voidedExplainsImportGap && (
                    <Box
                        sx={{
                            mb: 2,
                            p: 1.5,
                            borderRadius: '12px',
                            bgcolor: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1.25,
                        }}
                    >
                        <CheckCircleOutlinedIcon sx={{ color: '#16a34a', fontSize: '1.25rem', mt: 0.2, flexShrink: 0 }} />
                        <Box>
                            <Typography variant="subtitle2" fontWeight={800} color="#15803d" sx={{ fontSize: '0.875rem' }}>
                                Chênh lệch nhập +{inventoryTotals.voided.toLocaleString('vi-VN')} vé được giải trình bởi {inventoryTotals.voided.toLocaleString('vi-VN')} vé hủy trong kho
                            </Typography>
                            <Typography variant="caption" color="#166534" sx={{ display: 'block', mt: 0.25, lineHeight: 1.5 }}>
                                Hệ thống tự động loại trừ vé hủy ra khỏi số nhập hợp lệ. Công thức kiểm tra: <strong>{systemImportQty.toLocaleString('vi-VN')} vé hợp lệ + {inventoryTotals.voided.toLocaleString('vi-VN')} vé hủy = {actualImportQty.toLocaleString('vi-VN')} vé</strong> (Khớp hoàn toàn với số thực tế NCC giao).
                            </Typography>
                        </Box>
                    </Box>
                )}

                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: '14px',
                                border: '1px solid',
                                borderColor: importQtyDiff > 0 ? '#fecaca' : importQtyDiff < 0 ? '#fde68a' : importValDiff !== 0 ? '#fed7aa' : '#bbf7d0',
                                bgcolor: importQtyDiff > 0 ? '#fef8f8' : importQtyDiff < 0 ? '#fffdf5' : importValDiff !== 0 ? '#fffbf5' : '#f9fefb',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.75 }} gap={1}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Box
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '8px',
                                                bgcolor: '#eff6ff',
                                                color: '#2563eb',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Inventory2OutlinedIcon sx={{ fontSize: '1.2rem' }} />
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                            Nhập vé
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent="flex-end">
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

                                <MetricCompareRow
                                    label="Số lượng vé"
                                    subtext="Vé hợp lệ đã nhập"
                                    systemVal={`${systemImportQty.toLocaleString('vi-VN')} vé`}
                                    actualVal={`${actualImportQty.toLocaleString('vi-VN')} vé`}
                                    diffVal={
                                        importQtyDiff === 0
                                            ? '0 vé (Khớp)'
                                            : `${importQtyDiff > 0 ? '+' : ''}${importQtyDiff.toLocaleString('vi-VN')} vé`
                                    }
                                    isDiff={importQtyDiff !== 0}
                                    diffType={importQtyDiff > 0 ? 'error' : importQtyDiff < 0 ? 'warning' : 'success'}
                                />

                                <MetricCompareRow
                                    label="Giá trị sau hoa hồng"
                                    subtext={`${formatSettlementMoney(baselineUnitPrice)} đ/vé`}
                                    systemVal={`${formatSettlementMoney(afterHhSystemImportVal)} đ`}
                                    actualVal={`${formatSettlementMoney(actualImportVal)} đ`}
                                    diffVal={
                                        importValDiff === 0
                                            ? '0 đ (Khớp)'
                                            : `${importValDiff > 0 ? '+' : ''}${formatSettlementMoney(importValDiff)} đ`
                                    }
                                    isDiff={importValDiff !== 0}
                                    diffType={importValDiff > 0 ? 'error' : importValDiff < 0 ? 'warning' : 'success'}
                                />
                            </Box>

                            {(importQtyDiff !== 0 || importValDiff !== 0) && (
                                <Box
                                    sx={{
                                        mt: 1.5,
                                        p: 1.25,
                                        borderRadius: '10px',
                                        bgcolor: importQtyDiff > 0 ? '#fef2f2' : '#fffbeb',
                                        border: `1px solid ${importQtyDiff > 0 ? '#fecaca' : '#fde68a'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <InfoOutlinedIcon sx={{ color: importQtyDiff > 0 ? '#dc2626' : '#d97706', fontSize: '1.15rem', flexShrink: 0 }} />
                                    <Typography variant="caption" fontWeight={700} color={importQtyDiff > 0 ? '#991b1b' : '#92400e'} sx={{ lineHeight: 1.45 }}>
                                        {importQtyDiff < 0
                                            ? `Hệ thống ghi thừa ${Math.abs(importQtyDiff).toLocaleString('vi-VN')} vé so với NCC.`
                                            : `Hệ thống ghi thiếu ${importQtyDiff.toLocaleString('vi-VN')} vé so với NCC.`}
                                        {' '}Chênh tiền sau hoa hồng: {formatSignedCashflow(importValDiff, formatSettlementMoney)} VNĐ.
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: '14px',
                                border: '1px solid',
                                borderColor: isReturnInputsLocked
                                    ? '#fed7aa'
                                    : returnQtyDiff > 0
                                      ? '#bfdbfe'
                                      : returnQtyDiff < 0
                                        ? '#fde68a'
                                        : returnValDiff !== 0
                                          ? '#fed7aa'
                                          : '#bbf7d0',
                                bgcolor: isReturnInputsLocked
                                    ? '#fffbf5'
                                    : returnQtyDiff > 0
                                      ? '#f8fbff'
                                      : returnQtyDiff < 0
                                        ? '#fffdf5'
                                        : returnValDiff !== 0
                                          ? '#fffbf5'
                                          : '#f9fefb',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.75 }} gap={1}>
                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                        <Box
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '8px',
                                                bgcolor: '#fff7ed',
                                                color: '#ea580c',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            {isReturnInputsLocked ? (
                                                <LockOutlinedIcon sx={{ fontSize: '1.2rem' }} />
                                            ) : (
                                                <AssignmentReturnOutlinedIcon sx={{ fontSize: '1.2rem' }} />
                                            )}
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                            Trả vé
                                        </Typography>
                                    </Stack>

                                    {isReturnInputsLocked ? (
                                        <AdminStatusBadge
                                            label={
                                                returnLockDetails.overdue || returnLockDetails.allCancelled
                                                    ? 'Khóa sổ · Quá hạn trả'
                                                    : 'Khóa sổ · Chưa bàn giao'
                                            }
                                            modifier="admin-status-badge--pending"
                                        />
                                    ) : (
                                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                                            {isReturnForfeited && (
                                                <AdminStatusBadge
                                                    label="Đại lý chịu"
                                                    modifier="admin-status-badge--pending"
                                                />
                                            )}
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
                                    )}
                                </Stack>

                                <Box>
                                    <MetricCompareRow
                                        label="Số lượng vé"
                                        subtext="Vé ế hoàn trả NCC"
                                        systemVal={`${systemReturnQty.toLocaleString('vi-VN')} vé`}
                                        actualVal={`${actualReturnQty.toLocaleString('vi-VN')} vé`}
                                        diffVal={
                                            isReturnInputsLocked
                                                ? '0 vé (Đã khóa)'
                                                : returnQtyDiff === 0
                                                  ? '0 vé (Khớp)'
                                                  : `${returnQtyDiff > 0 ? '+' : ''}${returnQtyDiff.toLocaleString('vi-VN')} vé`
                                        }
                                        isDiff={!isReturnInputsLocked && returnQtyDiff !== 0}
                                        diffType={isReturnInputsLocked ? 'neutral' : returnQtyDiff > 0 ? 'info' : returnQtyDiff < 0 ? 'warning' : 'success'}
                                    />

                                    <MetricCompareRow
                                        label="Giá trị sau hoa hồng"
                                        subtext={`${formatSettlementMoney(baselineUnitPrice)} đ/vé`}
                                        systemVal={`${formatSettlementMoney(afterHhSystemReturnVal)} đ`}
                                        actualVal={`${formatSettlementMoney(actualReturnVal)} đ`}
                                        diffVal={
                                            isReturnInputsLocked
                                                ? '0 đ (Đã khóa)'
                                                : returnValDiff === 0
                                                  ? '0 đ (Khớp)'
                                                  : `${returnValDiff > 0 ? '+' : ''}${formatSettlementMoney(returnValDiff)} đ`
                                        }
                                        isDiff={!isReturnInputsLocked && returnValDiff !== 0}
                                        diffType={isReturnInputsLocked ? 'neutral' : returnValDiff > 0 ? 'info' : returnValDiff < 0 ? 'warning' : 'success'}
                                    />
                                </Box>
                            </Box>

                            {isReturnInputsLocked && (
                                <Box
                                    sx={{
                                        mt: 1.5,
                                        p: 1.25,
                                        borderRadius: '10px',
                                        bgcolor: '#ffffff',
                                        border: '1px solid #fed7aa',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.25,
                                    }}
                                >
                                    <LockOutlinedIcon sx={{ color: '#ea580c', fontSize: '1.2rem', flexShrink: 0 }} />
                                    <Typography variant="caption" fontWeight={700} color="#9a3412" sx={{ lineHeight: 1.45 }}>
                                        {returnLockDetails.summaryMessage
                                            || returnLockDetails.emptyStateMessage
                                            || 'Đã quá giờ trả vé. Các vé còn tồn kho không được trả và đại lý phải chịu khoản này.'}
                                    </Typography>
                                </Box>
                            )}

                            {!isReturnInputsLocked && (returnQtyDiff !== 0 || returnValDiff !== 0) && (
                                <Box
                                    sx={{
                                        mt: 1.5,
                                        p: 1.25,
                                        borderRadius: '10px',
                                        bgcolor: returnQtyDiff > 0 ? '#eff6ff' : '#fffbeb',
                                        border: `1px solid ${returnQtyDiff > 0 ? '#bfdbfe' : '#fde68a'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <InfoOutlinedIcon sx={{ color: returnQtyDiff > 0 ? '#2563eb' : '#d97706', fontSize: '1.15rem', flexShrink: 0 }} />
                                    <Typography variant="caption" fontWeight={700} color={returnQtyDiff > 0 ? '#1e40af' : '#92400e'}>
                                        {returnQtyDiff < 0
                                            ? `Thiếu trả: thực tế ít hơn hệ thống ${Math.abs(returnQtyDiff).toLocaleString('vi-VN')} vé.`
                                            : `Thừa trả: thực tế nhiều hơn hệ thống ${returnQtyDiff.toLocaleString('vi-VN')} vé.`}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Grid>
                </Grid>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 1.5, borderTop: '1px solid #f1f5f9' }}>
                    <AdminStatusBadge
                        label={`${importBatches.length} phiếu nhập · Hệ thống: ${systemImportQty.toLocaleString('vi-VN')} vé`}
                        modifier="admin-status-badge--active"
                    />
                    <AdminStatusBadge
                        label={`${returnBatches.length} phiếu trả · ${handedOverReturnQty.toLocaleString('vi-VN')} vé đã bàn giao`}
                        modifier="admin-status-badge--pending"
                    />
                    <AdminStatusBadge
                        label={`Nhập ròng NCC: ${actualImportQty.toLocaleString('vi-VN')} − ${actualReturnQty.toLocaleString('vi-VN')} = ${netQty.toLocaleString('vi-VN')} vé`}
                        modifier="admin-status-badge--draft"
                    />
                </Stack>
            </Paper>

            <Box sx={{ mb: 2.5 }}>
                <AllStationsTable inventoryByStation={inventoryByStation} />
            </Box>

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
                                    <Typography variant="caption" color="#94a3b8" sx={{ display: 'block' }}>
                                        (Giá nhập sau HH × SL nhập HT) − tiền vé ế hoàn HT
                                    </Typography>
                                    <Typography variant="caption" color="#64748b" sx={{ display: 'block' }}>
                                        {formatSettlementMoney(afterHhSystemImportVal)} − {formatSettlementMoney(afterHhSystemReturnVal)}
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
                                        <AdminStatusBadge
                                            label={
                                                paymentDiff === 0
                                                    ? 'Khớp 0 VNĐ'
                                                    : `${paymentDiff > 0 ? 'Dư / giảm chi' : 'Chi vượt'} ${formatSignedCashflow(paymentDiff, formatSettlementMoney)} VNĐ`
                                            }
                                            modifier={
                                                paymentDiff === 0
                                                    ? 'admin-status-badge--success'
                                                    : paymentDiff > 0
                                                      ? 'admin-status-badge--success'
                                                      : 'admin-status-badge--inactive'
                                            }
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
