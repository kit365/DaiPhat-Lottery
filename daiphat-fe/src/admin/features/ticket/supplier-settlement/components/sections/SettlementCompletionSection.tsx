"use client";

import { useMemo, useState, useRef } from 'react';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ZoomInOutlinedIcon from '@mui/icons-material/ZoomInOutlined';
import {
    Alert,
    Box,
    Button,
    ButtonBase,
    CircularProgress,
    Collapse,
    Divider,
    Grid,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableFooter,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';
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
    scaleSettlementMoney,
    toAgencyCashflow,
} from '../../utils/settlementCashflow';
import {
    getDetectedDiscrepancyItems,
    getDiscrepancyItemLabel,
    getReturnMatchingLockDetails,
    resolveLiveSystemImportQuantity,
    resolveLiveSystemReturnQuantity,
    weightedStationNetUnitPrice,
} from '../../utils/settlementLabels';

interface Props {
    settlement: SupplierSettlement;
    kpis?: SupplierSettlementKpis | null;
    importBatches: SettlementOverviewImportBatch[];
    returnBatches: SettlementOverviewReturnBatch[];
    stationPricing: SettlementStationPricing[];
    inventoryByStation: SettlementStationInventory[];
    adjustments: SupplierSettlementAdjustment[];
    hasDiscrepancyMilestone: boolean;
    waitingForPayment: boolean;
    paid: boolean;
    isReadOnlyReview: boolean;
    draftResolution?: {
        import?: boolean;
        return?: boolean;
        unitPrice?: boolean;
    };
    onBackToDiscrepancy?: () => void;
    onBackToMatching?: () => void;
    onFinalize: () => void;
    isFinalizing: boolean;
    onOpenPaymentDialog: () => void;
    onDownloadReport: () => void;
    isDownloadingReport: boolean;
    onZoomImage?: (payload: { url: string; title: string }) => void;
}

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

const isLikelyImage = (url?: string | null): boolean => {
    if (!url) return false;
    const clean = url.split('?')[0].toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp)$/i.test(clean) || url.startsWith('data:image/');
};

export const SettlementCompletionSection = ({
    settlement,
    kpis,
    importBatches,
    returnBatches,
    stationPricing,
    inventoryByStation,
    adjustments,
    hasDiscrepancyMilestone,
    waitingForPayment,
    paid,
    isReadOnlyReview,
    draftResolution,
    onBackToDiscrepancy,
    onBackToMatching,
    onFinalize,
    isFinalizing,
    onOpenPaymentDialog,
    onDownloadReport,
    isDownloadingReport,
    onZoomImage,
}: Props) => {
    const [selectedCashflowDetail, setSelectedCashflowDetail] = useState<'initial' | 'variance' | 'final' | null>(null);
    const [selectedImportBatchIndex, setSelectedImportBatchIndex] = useState(0);
    const [selectedImportEvidenceTab, setSelectedImportEvidenceTab] = useState<'receipt' | 'tickets'>('receipt');

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

    const importQtyDiff = actualImportQty - systemImportQty;
    const returnQtyDiff = actualReturnQty - systemReturnQty;

    const netQty = actualImportQty - actualReturnQty;
    const importTicketMoney = scaleSettlementMoney(reconciledUnitPrice * actualImportQty);
    const returnTicketMoney = scaleSettlementMoney(reconciledUnitPrice * actualReturnQty);
    const ticketNetVal = scaleSettlementMoney(reconciledUnitPrice * netQty);

    const settlementAdjustments = adjustments.filter((row) => row.groupType === 'SETTLEMENT');
    const importAdjustments = adjustments.filter((row) => row.groupType === 'IMPORT');
    const returnAdjustments = adjustments.filter((row) => row.groupType === 'RETURN');
    const additionalCostTotal = settlementAdjustments.reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const initialEstimatedVal =
        settlement.initialEstimatedSettlementValue != null
            ? Number(settlement.initialEstimatedSettlementValue)
            : scaleSettlementMoney(baselineUnitPrice * (systemImportQty - systemReturnQty));

    const finalVal =
        settlement.finalSettlementValue != null
            ? Number(settlement.finalSettlementValue)
            : ticketNetVal + additionalCostTotal;

    const payableAmount = finalVal;
    const vsInitialDiff = scaleSettlementMoney(payableAmount - initialEstimatedVal);
    const differenceAmount = toAgencyCashflow(vsInitialDiff);

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
    const importItem = discrepancyItems.find((item) => item.type === 'IMPORT_QUANTITY');
    const returnItem = discrepancyItems.find((item) => item.type === 'RETURN_QUANTITY');
    const unitPriceItem = discrepancyItems.find((item) => item.type === 'IMPORT_UNIT_PRICE');
    const types = settlement.discrepancyTypes || [];

    const hadImport = Boolean(importItem) || Boolean(settlement.importDiscrepancyResolved) || importAdjustments.length > 0 || types.includes('IMPORT_QUANTITY');
    const hadReturn = Boolean(returnItem) || Boolean(settlement.returnDiscrepancyResolved) || returnAdjustments.length > 0 || types.includes('RETURN_QUANTITY');
    const hadUnitPrice = Boolean(unitPriceItem) || types.includes('IMPORT_UNIT_PRICE');

    const resolutionRows = [
        {
            key: 'import',
            title: 'Chênh lệch nhập vé',
            skipped: !hadImport,
            resolved: Boolean(settlement.importDiscrepancyResolved || draftResolution?.import) || !hadImport,
            detail: !hadImport
                ? 'Không phát hiện lệch số lượng nhập.'
                : draftResolution?.import
                  ? 'Đã xác nhận xử lý tạm chênh lệch vé nhập.'
                  : settlement.importDiscrepancyResolved
                    ? 'Đã xử lý hoàn tất trên hệ thống.'
                    : 'Chưa xử lý xong chênh lệch nhập.',
        },
        {
            key: 'return',
            title: 'Chênh lệch trả vé',
            skipped: !hadReturn,
            resolved: Boolean(settlement.returnDiscrepancyResolved || draftResolution?.return) || !hadReturn,
            detail: !hadReturn
                ? 'Không phát hiện lệch số lượng trả.'
                : draftResolution?.return
                  ? 'Đã xác nhận xử lý tạm chênh lệch vé trả.'
                  : settlement.returnDiscrepancyResolved
                    ? 'Đã xử lý hoàn tất trên hệ thống.'
                    : 'Chưa xử lý xong chênh lệch trả.',
        },
        {
            key: 'price',
            title: 'Chênh lệch đơn giá nhập & hoa hồng',
            skipped: !hadUnitPrice,
            resolved: Boolean(settlement.unitPriceDiscrepancyResolved || draftResolution?.unitPrice) || !hadUnitPrice,
            detail: !hadUnitPrice
                ? 'Đơn giá và hoa hồng khớp hoàn toàn.'
                : draftResolution?.unitPrice
                  ? 'Đã xác nhận tạm điều chỉnh đơn giá nhập.'
                  : settlement.unitPriceDiscrepancyResolved
                    ? 'Đã ghi nhận điều chỉnh đơn giá.'
                    : 'Chưa xử lý chênh lệch giá.',
        },
    ];

    // Cashflow detail content matching MatchingActualsForm
    const cashflowDetail = useMemo(() => {
        if (!selectedCashflowDetail) return null;
        if (selectedCashflowDetail === 'initial') {
            return {
                title: 'Chi tiết Tạm tính ban đầu',
                description: 'Giá trị tạm tính theo số lượng hệ thống và giá vốn sau hoa hồng',
                color: '#1d4ed8',
                background: '#eff6ff',
                border: '#bfdbfe',
                totalLabel: 'Tổng tạm tính ban đầu',
                totalAmount: initialEstimatedVal,
                rows: [
                    {
                        label: 'Vé nhập hệ thống',
                        formula: `${systemImportQty.toLocaleString('vi-VN')} vé × ${formatSettlementMoney(baselineUnitPrice)} đ/vé`,
                        amount: scaleSettlementMoney(systemImportQty * baselineUnitPrice),
                    },
                    {
                        label: 'Vé trả hệ thống',
                        formula: `−${systemReturnQty.toLocaleString('vi-VN')} vé × ${formatSettlementMoney(baselineUnitPrice)} đ/vé`,
                        amount: -scaleSettlementMoney(systemReturnQty * baselineUnitPrice),
                    },
                ],
            };
        }
        if (selectedCashflowDetail === 'variance') {
            return {
                title: 'Chi tiết Biến động đối soát (Δ)',
                description: 'Tổng chênh lệch giữa số liệu thực tế so với hệ thống ban đầu',
                color: differenceAmount < 0 ? '#be123c' : '#15803d',
                background: differenceAmount < 0 ? '#fff1f2' : '#f0fdf4',
                border: differenceAmount < 0 ? '#fecdd3' : '#bbf7d0',
                totalLabel: 'Tổng biến động (Δ)',
                totalAmount: vsInitialDiff,
                rows: [
                    {
                        label: 'Chênh lệch số lượng nhập',
                        formula: `${importQtyDiff > 0 ? `+${importQtyDiff}` : importQtyDiff} vé × ${formatSettlementMoney(reconciledUnitPrice)} đ`,
                        amount: scaleSettlementMoney(importQtyDiff * reconciledUnitPrice),
                    },
                    {
                        label: 'Chênh lệch số lượng trả',
                        formula: `${returnQtyDiff > 0 ? `+${returnQtyDiff}` : returnQtyDiff} vé × ${formatSettlementMoney(reconciledUnitPrice)} đ`,
                        amount: -scaleSettlementMoney(returnQtyDiff * reconciledUnitPrice),
                    },
                    ...(unitPriceDiff !== 0 ? [{
                        label: 'Chênh lệch đơn giá sau HH',
                        formula: `${unitPriceDiff > 0 ? `+${formatSettlementMoney(unitPriceDiff)}` : formatSettlementMoney(unitPriceDiff)} đ × ${netQty.toLocaleString('vi-VN')} vé ròng`,
                        amount: scaleSettlementMoney(unitPriceDiff * netQty),
                    }] : []),
                    ...(additionalCostTotal !== 0 ? [{
                        label: 'Chi phí phát sinh ngoài kỳ',
                        formula: `${settlementAdjustments.length} khoản chi phí / chiết khấu`,
                        amount: additionalCostTotal,
                    }] : []),
                ],
            };
        }
        // 'final'
        return {
            title: 'Chi tiết Bảng quyết toán tiền',
            description: 'Bản đồ dòng tiền quyết toán cuối cùng cần thanh toán cho nhà cung cấp',
            color: '#166534',
            background: '#f0fdf4',
            border: '#bbf7d0',
            totalLabel: 'Quyết toán sau đối soát',
            totalAmount: payableAmount,
            rows: [
                {
                    label: 'Vé nhập thực tế',
                    formula: `${actualImportQty.toLocaleString('vi-VN')} vé × ${formatSettlementMoney(reconciledUnitPrice)} đ/vé`,
                    amount: importTicketMoney,
                },
                {
                    label: 'Trừ vé trả thực tế',
                    formula: `−${actualReturnQty.toLocaleString('vi-VN')} vé × ${formatSettlementMoney(reconciledUnitPrice)} đ/vé`,
                    amount: -returnTicketMoney,
                },
                {
                    label: 'Tiền vé ròng sau HH',
                    formula: `${netQty.toLocaleString('vi-VN')} vé ròng × ${formatSettlementMoney(reconciledUnitPrice)} đ/vé`,
                    amount: ticketNetVal,
                },
                ...(additionalCostTotal !== 0 ? [{
                    label: 'Chi phí phát sinh ngoài kỳ',
                    formula: `${settlementAdjustments.length} khoản chi phí`,
                    amount: additionalCostTotal,
                }] : []),
            ],
        };
    }, [
        selectedCashflowDetail,
        initialEstimatedVal,
        systemImportQty,
        systemReturnQty,
        baselineUnitPrice,
        differenceAmount,
        vsInitialDiff,
        importQtyDiff,
        returnQtyDiff,
        reconciledUnitPrice,
        unitPriceDiff,
        netQty,
        additionalCostTotal,
        settlementAdjustments.length,
        payableAmount,
        actualImportQty,
        actualReturnQty,
        importTicketMoney,
        returnTicketMoney,
        ticketNetVal,
    ]);

    // Import Batches evidence preview
    const activeImportBatch = importBatches[selectedImportBatchIndex] || importBatches[0];
    const activeInvoiceUrl = activeImportBatch?.invoiceEvidenceUrl || activeImportBatch?.receiptImageUrl || activeImportBatch?.evidenceUrl;
    const activeTicketListUrls = activeImportBatch?.ticketListImageUrls || [];
    const nccReceiptUrl = settlement.supplierSettlementReceiptUrl;

    return (
        <Box sx={{ width: '100%', pt: 0.5 }}>
            {/* Header / Intro banner */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                sx={{ mb: 2.5 }}
            >
                <Box
                    sx={{
                        width: 42,
                        height: 42,
                        borderRadius: '12px',
                        bgcolor: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid #bfdbfe',
                    }}
                >
                    <FactCheckOutlinedIcon sx={{ fontSize: '1.5rem' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ fontSize: '1.1rem', lineHeight: 1.3 }}>
                        Tổng kết số liệu & Quyết toán hoàn tất
                    </Typography>
                    <Typography variant="body2" color="#64748b" sx={{ mt: 0.25, fontSize: '0.85rem' }}>
                        Bản chốt số liệu đối soát sau khi đã rà soát và xử lý chênh lệch. Kiểm tra bảng quyết toán tiền và xác nhận hoàn tất kỳ đối soát.
                    </Typography>
                </Box>
            </Stack>

            {paid && (
                <Alert severity="success" icon={<CheckCircleOutlinedIcon />} sx={{ mb: 2.5, borderRadius: '12px', fontWeight: 600 }}>
                    Kỳ đối soát đã thanh toán. Số liệu dưới đây là bản chốt quyết toán của kỳ.
                </Alert>
            )}

            <Divider sx={{ mb: 2.5, borderColor: '#f1f5f9' }} />

            <Stack spacing={2.5}>
                {/* ═══ MỤC 1: SỐ LIỆU TỔNG KẾT NHẬP & TRẢ VÉ (Tương ứng Mục 1 Hình 1) ═══ */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: '16px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent="space-between"
                        sx={{ mb: 2.5 }}
                    >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '10px',
                                    bgcolor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'grid',
                                    placeItems: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <Inventory2OutlinedIcon sx={{ fontSize: '1.25rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ lineHeight: 1.3 }}>
                                    1. Số liệu tổng kết Nhập & Trả vé
                                </Typography>
                                <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.8rem' }}>
                                    Số lượng vé thực tế chốt sau đối soát và vé ròng làm căn cứ thanh toán
                                </Typography>
                            </Box>
                        </Stack>
                        <AdminStatusBadge
                            label={importQtyDiff === 0 && returnQtyDiff === 0 ? 'Khớp toàn bộ số lượng' : 'Đã xác nhận điều chỉnh'}
                            modifier={importQtyDiff === 0 && returnQtyDiff === 0 ? 'admin-status-badge--success' : 'admin-status-badge--active'}
                        />
                    </Stack>

                    {/* 4 Cards thống kê chỉ số cốt lõi */}
                    <Grid container spacing={2} sx={{ mb: incidentTotal > 0 ? 2 : 0 }}>
                        {/* Card 1: Vé nhập */}
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box
                                sx={{
                                    p: 2,
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
                                    <Typography fontWeight={900} color="#0f172a" sx={{ fontSize: '1.35rem', lineHeight: 1.2 }}>
                                        {actualImportQty.toLocaleString('vi-VN')}{' '}
                                        <Typography component="span" variant="body2" color="#64748b" fontWeight={600}>vé</Typography>
                                    </Typography>
                                    <Typography variant="caption" color="#64748b" sx={{ display: 'block', mt: 0.5 }}>
                                        Hệ thống: <strong>{systemImportQty.toLocaleString('vi-VN')} vé</strong>
                                    </Typography>
                                </Box>
                                <Box sx={{ mt: 1.5 }}>
                                    <AdminStatusBadge
                                        label={importQtyDiff === 0 ? 'Khớp hệ thống' : `Lệch ${importQtyDiff > 0 ? `+${importQtyDiff}` : importQtyDiff} vé`}
                                        modifier={importQtyDiff === 0 ? 'admin-status-badge--success' : 'admin-status-badge--active'}
                                    />
                                </Box>
                            </Box>
                        </Grid>

                        {/* Card 2: Vé trả */}
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box
                                sx={{
                                    p: 2,
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
                                    <Typography fontWeight={900} color="#0f172a" sx={{ fontSize: '1.35rem', lineHeight: 1.2 }}>
                                        {actualReturnQty.toLocaleString('vi-VN')}{' '}
                                        <Typography component="span" variant="body2" color="#64748b" fontWeight={600}>vé</Typography>
                                    </Typography>
                                    <Typography variant="caption" color="#64748b" sx={{ display: 'block', mt: 0.5 }}>
                                        Hệ thống: <strong>{systemReturnQty.toLocaleString('vi-VN')} vé</strong>
                                    </Typography>
                                </Box>
                                <Box sx={{ mt: 1.5 }}>
                                    <AdminStatusBadge
                                        label={returnQtyDiff === 0 ? 'Khớp hệ thống' : `Lệch ${returnQtyDiff > 0 ? `+${returnQtyDiff}` : returnQtyDiff} vé`}
                                        modifier={returnQtyDiff === 0 ? 'admin-status-badge--success' : 'admin-status-badge--active'}
                                    />
                                </Box>
                            </Box>
                        </Grid>

                        {/* Card 3: Vé ròng */}
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box
                                sx={{
                                    p: 2,
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
                                        Nhập {actualImportQty.toLocaleString('vi-VN')} − Trả {actualReturnQty.toLocaleString('vi-VN')}
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

                        {/* Card 4: Số tiền phải trả */}
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Box
                                sx={{
                                    p: 2,
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
                                        {formatSettlementMoney(Math.abs(payableAmount))}{' '}
                                        <Typography component="span" variant="body2" fontWeight={700}>VNĐ</Typography>
                                    </Typography>
                                    <Typography variant="caption" color={payableAmount < 0 ? '#be123c' : '#16a34a'} sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                                        {vsInitialDiff === 0
                                            ? 'Khớp tạm tính ban đầu'
                                            : `${vsInitialDiff > 0 ? 'Tăng' : 'Giảm'} ${formatSettlementMoney(Math.abs(vsInitialDiff))} VNĐ`}
                                    </Typography>
                                </Box>
                                <Box sx={{ mt: 1.5 }}>
                                    <AdminStatusBadge
                                        label={vsInitialDiff === 0 ? 'Đã chốt số liệu' : 'Đã điều chỉnh'}
                                        modifier={vsInitialDiff === 0 ? 'admin-status-badge--success' : 'admin-status-badge--pending'}
                                    />
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Vé sự cố nếu có */}
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
                                    <Typography component="span" fontWeight={800} color="#7c2d12">
                                        {incidentTotal.toLocaleString('vi-VN')} vé
                                    </Typography>
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

                {/* ═══ MỤC 2: BẢNG GIÁ VÉ THEO TỪNG NHÀ ĐÀI (Tương ứng Mục 2 Hình 2) ═══ */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: '16px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent="space-between"
                        sx={{ mb: 2 }}
                    >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '10px',
                                    bgcolor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'grid',
                                    placeItems: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <LocalOfferOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ lineHeight: 1.3 }}>
                                    2. Giá vé theo từng nhà đài
                                </Typography>
                                <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.8rem' }}>
                                    Đơn giá nhập, hoa hồng và giá sau hoa hồng từng nhà đài làm căn cứ quyết toán kỳ này
                                </Typography>
                            </Box>
                        </Stack>
                        <AdminStatusBadge
                            label={`Giá sau HH bình quân: ${formatSettlementMoney(reconciledUnitPrice)} đ/vé`}
                            modifier="admin-status-badge--active"
                        />
                    </Stack>

                    <TableContainer sx={{ borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.75rem', py: 1.25 } }}>
                                    <TableCell>NHÀ ĐÀI</TableCell>
                                    <TableCell align="right">SL NHẬP</TableCell>
                                    <TableCell align="right">GIÁ NHẬP</TableCell>
                                    <TableCell align="right">HOA HỒNG</TableCell>
                                    <TableCell align="right">SAU HH</TableCell>
                                    <TableCell align="right">THÀNH TIỀN</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {stationPricing.map((row) => {
                                    const qty = Number(row.importedQuantity || 0);
                                    const lineAmount = scaleSettlementMoney(Number(row.netUnitPrice || 0) * qty);
                                    const rate = Number(row.actualCommissionRate != null ? row.actualCommissionRate : row.commissionRate || 0);
                                    return (
                                        <TableRow key={row.lotteryStationId} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                                            <TableCell sx={{ fontWeight: 700, py: 1.25 }}>
                                                {row.lotteryStationName || `Đài #${row.lotteryStationId}`}
                                            </TableCell>
                                            <TableCell align="right" sx={{ py: 1.25, fontWeight: 600 }}>
                                                {qty.toLocaleString('vi-VN')}
                                            </TableCell>
                                            <TableCell align="right" sx={{ py: 1.25 }}>
                                                {formatSettlementMoney(row.importCost || settlement.actualTicketImportPrice || settlement.systemTicketImportPrice || 10000)}
                                            </TableCell>
                                            <TableCell align="right" sx={{ py: 1.25, fontWeight: 700, color: '#2563eb' }}>
                                                {(rate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, py: 1.25, color: '#0f172a' }}>
                                                {formatSettlementMoney(row.netUnitPrice)} VNĐ
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, py: 1.25, color: '#166534' }}>
                                                {formatSettlementMoney(lineAmount)} VNĐ
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                            <TableFooter>
                                <TableRow sx={{ bgcolor: '#f8fafc', '& td': { fontWeight: 900, py: 1.25, color: '#0f172a' } }}>
                                    <TableCell>TỔNG CỘNG</TableCell>
                                    <TableCell align="right">
                                        {actualImportQty.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right">—</TableCell>
                                    <TableCell align="right">—</TableCell>
                                    <TableCell align="right">
                                        {formatSettlementMoney(reconciledUnitPrice)} VNĐ
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: '#166534' }}>
                                        {formatSettlementMoney(importTicketMoney)} VNĐ
                                    </TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </TableContainer>
                </Paper>

                {/* ═══ MỤC 3: KẾT QUẢ XỬ LÝ CHÊNH LỆCH & ĐIỀU CHỈNH NGOÀI KỲ (Tương ứng Mục 3 Hình 2) ═══ */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: '16px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent="space-between"
                        sx={{ mb: 2 }}
                    >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '10px',
                                    bgcolor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'grid',
                                    placeItems: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <ReceiptLongOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ lineHeight: 1.3 }}>
                                    3. Kết quả xử lý chênh lệch & Điều chỉnh ngoài kỳ
                                </Typography>
                                <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.8rem' }}>
                                    Chi tiết các khoản xử lý chênh lệch và chi phí phát sinh nếu có
                                </Typography>
                            </Box>
                        </Stack>
                        <AdminStatusBadge
                            label={resolutionRows.every((r) => r.resolved) ? 'Đã xử lý đầy đủ' : 'Còn chênh lệch'}
                            modifier={resolutionRows.every((r) => r.resolved) ? 'admin-status-badge--success' : 'admin-status-badge--pending'}
                        />
                    </Stack>

                    {/* Danh sách 3 hạng mục chênh lệch */}
                    <Stack spacing={1} sx={{ mb: 2 }}>
                        {resolutionRows.map((row) => (
                            <Stack
                                key={row.key}
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                gap={2}
                                sx={{
                                    px: 2,
                                    py: 1.25,
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
                                            ? 'admin-status-badge--active'
                                            : row.resolved
                                              ? 'admin-status-badge--success'
                                              : 'admin-status-badge--pending'
                                    }
                                />
                            </Stack>
                        ))}
                    </Stack>

                    {/* Các khoản chi phí ngoài kỳ / điều chỉnh */}
                    <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #f1f5f9' }}>
                        <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', mb: 1 }}>
                            Khoản chi phí & Điều chỉnh ngoài kỳ:
                        </Typography>
                        {settlementAdjustments.length > 0 ? (
                            <Stack spacing={0.75}>
                                {settlementAdjustments.map((row) => (
                                    <Stack
                                        key={row.id}
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        sx={{
                                            p: 1.25,
                                            px: 1.75,
                                            borderRadius: '8px',
                                            bgcolor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                {row.customName || row.reasonLabel || ADJUSTMENT_REASON_LABELS[row.reasonCode] || row.reasonCode}
                                            </Typography>
                                            <Typography variant="caption" color="#64748b">
                                                {cleanAdjustmentNote(row.note) || 'Chi phí phát sinh'}
                                            </Typography>
                                        </Box>
                                        <Typography
                                            fontWeight={800}
                                            color={Number(row.amount) > 0 ? '#dc2626' : Number(row.amount) < 0 ? '#15803d' : '#475569'}
                                        >
                                            {Number(row.amount) > 0 ? '+' : ''}{formatSettlementMoney(row.amount)} VNĐ
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        ) : (
                            <Box sx={{ p: 2, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                                <Typography variant="caption" color="#64748b" fontWeight={600}>
                                    Không có khoản chi phí phát sinh ngoài kỳ
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Paper>

                {/* ═══ MỤC 4: TỔNG KẾT QUYẾT TOÁN & KHỚP THANH TOÁN (Chuẩn Mục 4 Hình 2 & 3) ═══ */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: '16px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent="space-between"
                        sx={{ mb: 2 }}
                    >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '10px',
                                    bgcolor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'grid',
                                    placeItems: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <PaymentsOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ lineHeight: 1.3 }}>
                                    4. Tổng kết quyết toán & Khớp thanh toán
                                </Typography>
                                <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.8rem' }}>
                                    Bản đồ đối soát 3 bước và xác nhận số tiền thanh toán thực tế
                                </Typography>
                            </Box>
                        </Stack>
                        <AdminStatusBadge
                            label={paid ? 'Đã thanh toán' : waitingForPayment ? 'Chờ thanh toán' : 'Đã khớp toàn bộ số liệu'}
                            modifier={paid ? 'admin-status-badge--success' : waitingForPayment ? 'admin-status-badge--pending' : 'admin-status-badge--success'}
                        />
                    </Stack>

                    {/* Banner Thông báo khớp hoàn toàn */}
                    <Box
                        sx={{
                            mb: 2.5,
                            p: 1.75,
                            borderRadius: '12px',
                            bgcolor: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                        }}
                    >
                        <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="space-between" flexWrap="wrap">
                            <Stack direction="row" spacing={1.2} alignItems="center">
                                <CheckCircleOutlinedIcon sx={{ color: '#16a34a', fontSize: '1.35rem' }} />
                                <Box>
                                    <Typography variant="caption" fontWeight={800} color="#166534" sx={{ textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block' }}>
                                        Số liệu đối soát đã chốt hoàn tất
                                    </Typography>
                                    <Typography variant="caption" color="#16a34a" sx={{ fontSize: '0.75rem' }}>
                                        Số lượng vé nhập, trả và đơn giá đã được xác nhận làm căn cứ thanh toán
                                    </Typography>
                                </Box>
                            </Stack>
                            <AdminStatusBadge label="Khớp 100%" modifier="admin-status-badge--success" />
                        </Stack>
                    </Box>

                    {/* BỘ 3 THẺ QUYẾT TOÁN ĐỐI SOÁT (CHUẨN 100% THEO HÌNH 2 & 3) */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        {/* 1. TẠM TÍNH BAN ĐẦU */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <ButtonBase
                                onClick={() => setSelectedCashflowDetail((cur) => cur === 'initial' ? null : 'initial')}
                                sx={{
                                    p: 2,
                                    width: '100%',
                                    textAlign: 'left',
                                    alignItems: 'stretch',
                                    borderRadius: '14px',
                                    bgcolor: '#f8fafc',
                                    border: selectedCashflowDetail === 'initial' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                    boxShadow: selectedCashflowDetail === 'initial' ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.16s ease',
                                    '&:hover': { borderColor: '#2563eb' },
                                }}
                            >
                                <Box>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                                        <Typography variant="caption" fontWeight={800} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '0.75rem' }}>
                                            1. Tạm tính ban đầu
                                        </Typography>
                                        <AdminStatusBadge label="Dữ liệu gốc" modifier="admin-status-badge--draft" />
                                    </Stack>
                                    <Typography variant="h5" fontWeight={900} color="#0f172a" sx={{ fontSize: '1.35rem', mb: 1.5 }}>
                                        {formatSettlementMoney(initialEstimatedVal)}{' '}
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>VNĐ</span>
                                    </Typography>
                                </Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1.25, borderTop: '1px solid #e2e8f0' }}>
                                    <Typography variant="caption" color="#475569" fontWeight={700}>Xem cách tính</Typography>
                                    <ExpandMoreOutlinedIcon
                                        sx={{
                                            fontSize: 20,
                                            color: '#64748b',
                                            transform: selectedCashflowDetail === 'initial' ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.16s ease',
                                        }}
                                    />
                                </Stack>
                            </ButtonBase>
                        </Grid>

                        {/* 2. BIẾN ĐỘNG VÉ (Δ) */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <ButtonBase
                                onClick={() => setSelectedCashflowDetail((cur) => cur === 'variance' ? null : 'variance')}
                                sx={{
                                    p: 2,
                                    width: '100%',
                                    textAlign: 'left',
                                    alignItems: 'stretch',
                                    borderRadius: '14px',
                                    bgcolor: vsInitialDiff === 0 ? '#f0fdf4' : '#fffbeb',
                                    border: selectedCashflowDetail === 'variance' ? '2px solid #2563eb' : `1px solid ${vsInitialDiff === 0 ? '#bbf7d0' : '#fde68a'}`,
                                    boxShadow: selectedCashflowDetail === 'variance' ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.16s ease',
                                    '&:hover': { borderColor: '#2563eb' },
                                }}
                            >
                                <Box>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                                        <Typography variant="caption" fontWeight={800} color={vsInitialDiff === 0 ? '#166534' : '#b45309'} sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '0.75rem' }}>
                                            2. Biến động vé (Δ)
                                        </Typography>
                                        <AdminStatusBadge
                                            label={vsInitialDiff === 0 ? 'Khớp vé' : 'Biến động'}
                                            modifier={vsInitialDiff === 0 ? 'admin-status-badge--success' : 'admin-status-badge--pending'}
                                        />
                                    </Stack>
                                    <Typography variant="h5" fontWeight={900} color={vsInitialDiff === 0 ? '#15803d' : '#b45309'} sx={{ fontSize: '1.35rem', mb: 1.5 }}>
                                        {vsInitialDiff > 0 ? `+${formatSettlementMoney(vsInitialDiff)}` : formatSettlementMoney(vsInitialDiff)}{' '}
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>VNĐ</span>
                                    </Typography>
                                </Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1.25, borderTop: `1px solid ${vsInitialDiff === 0 ? '#bbf7d0' : '#fde68a'}` }}>
                                    <Typography variant="caption" color={vsInitialDiff === 0 ? '#166534' : '#b45309'} fontWeight={700}>Xem nguồn biến động</Typography>
                                    <ExpandMoreOutlinedIcon
                                        sx={{
                                            fontSize: 20,
                                            color: vsInitialDiff === 0 ? '#166534' : '#b45309',
                                            transform: selectedCashflowDetail === 'variance' ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.16s ease',
                                        }}
                                    />
                                </Stack>
                            </ButtonBase>
                        </Grid>

                        {/* 3. QUYẾT TOÁN SAU ĐỐI SOÁT */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <ButtonBase
                                onClick={() => setSelectedCashflowDetail((cur) => cur === 'final' ? null : 'final')}
                                sx={{
                                    p: 2,
                                    width: '100%',
                                    textAlign: 'left',
                                    alignItems: 'stretch',
                                    borderRadius: '14px',
                                    bgcolor: '#eff6ff',
                                    border: selectedCashflowDetail === 'final' ? '2px solid #2563eb' : '1px solid #93c5fd',
                                    boxShadow: selectedCashflowDetail === 'final' ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.16s ease',
                                    '&:hover': { borderColor: '#2563eb' },
                                }}
                            >
                                <Box>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                                        <Typography variant="caption" fontWeight={800} color="#1e40af" sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '0.75rem' }}>
                                            3. Quyết toán sau đối soát
                                        </Typography>
                                        <AdminStatusBadge label="Số tiền chốt" modifier="admin-status-badge--active" />
                                    </Stack>
                                    <Typography variant="h5" fontWeight={900} color="#1d4ed8" sx={{ fontSize: '1.35rem', mb: 1.5 }}>
                                        {formatSettlementMoney(Math.abs(payableAmount))}{' '}
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6' }}>VNĐ</span>
                                    </Typography>
                                </Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1.25, borderTop: '1px solid #bfdbfe' }}>
                                    <Typography variant="caption" color="#1d4ed8" fontWeight={700}>Xem bảng quyết toán</Typography>
                                    <ExpandMoreOutlinedIcon
                                        sx={{
                                            fontSize: 20,
                                            color: '#2563eb',
                                            transform: selectedCashflowDetail === 'final' ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.16s ease',
                                        }}
                                    />
                                </Stack>
                            </ButtonBase>
                        </Grid>

                        {/* Panel mở rộng chi tiết công thức dòng tiền */}
                        <Grid size={{ xs: 12 }}>
                            <Collapse in={cashflowDetail != null} timeout="auto" unmountOnExit>
                                {cashflowDetail && (
                                    <Box
                                        sx={{
                                            mt: 0.25,
                                            borderRadius: '14px',
                                            border: `1px solid ${cashflowDetail.border}`,
                                            bgcolor: '#ffffff',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <Stack
                                            direction={{ xs: 'column', sm: 'row' }}
                                            justifyContent="space-between"
                                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                                            gap={1}
                                            sx={{ px: 2, py: 1.5, bgcolor: cashflowDetail.background }}
                                        >
                                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                                <InfoOutlinedIcon sx={{ fontSize: 19, color: cashflowDetail.color, mt: 0.15 }} />
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={800} color={cashflowDetail.color}>
                                                        {cashflowDetail.title}
                                                    </Typography>
                                                    <Typography variant="caption" color="#64748b" sx={{ lineHeight: 1.5 }}>
                                                        {cashflowDetail.description}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <Typography variant="caption" color="#64748b" fontWeight={600}>
                                                Bấm lại thẻ để thu gọn
                                            </Typography>
                                        </Stack>

                                        <TableContainer sx={{ overflowX: 'auto' }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                                        <TableCell sx={{ color: '#475569', fontWeight: 800, fontSize: '0.75rem' }}>Khoản tiền</TableCell>
                                                        <TableCell sx={{ color: '#475569', fontWeight: 800, fontSize: '0.75rem' }}>Số liệu / Cách tính</TableCell>
                                                        <TableCell align="right" sx={{ color: '#475569', fontWeight: 800, fontSize: '0.75rem' }}>Tác động</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {cashflowDetail.rows.map((row, idx) => (
                                                        <TableRow key={`${row.label}-${idx}`}>
                                                            <TableCell sx={{ py: 1.25, fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                                                                {row.label}
                                                            </TableCell>
                                                            <TableCell sx={{ py: 1.25, fontSize: '0.78rem', color: '#64748b' }}>
                                                                {row.formula}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ py: 1.25, fontWeight: 800, fontSize: '0.8rem', color: row.amount < 0 ? '#15803d' : '#0f172a' }}>
                                                                {formatSignedCashflow(row.amount, formatSettlementMoney)} VNĐ
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow sx={{ bgcolor: cashflowDetail.background }}>
                                                        <TableCell colSpan={2} sx={{ py: 1.25 }}>
                                                            <Typography variant="subtitle2" fontWeight={900} color={cashflowDetail.color}>
                                                                {cashflowDetail.totalLabel}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ py: 1.25 }}>
                                                            <Typography variant="subtitle2" fontWeight={900} color={cashflowDetail.color}>
                                                                {formatSettlementMoney(Math.abs(cashflowDetail.totalAmount))} VNĐ
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                )}
                            </Collapse>
                        </Grid>
                    </Grid>

                    {/* Dòng so sánh Số tiền cần trả thực tế vs Chênh lệch thực trả */}
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    border: '1px solid #e2e8f0',
                                    bgcolor: '#f8fafc',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Typography variant="caption" fontWeight={800} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', mb: 1 }}>
                                    Số tiền cần trả thực tế (Quyết toán NCC)
                                </Typography>
                                <Typography variant="h5" fontWeight={900} color="#166534" sx={{ fontSize: '1.45rem', my: 1 }}>
                                    {formatSettlementMoney(Math.abs(payableAmount))}{' '}
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>VNĐ</span>
                                </Typography>
                                <Typography variant="caption" color="#64748b">
                                    Đã bao gồm tiền vé ròng và các khoản điều chỉnh ngoài kỳ đã duyệt
                                </Typography>
                            </Box>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    bgcolor: '#f0fdf4',
                                    border: '1px solid #bbf7d0',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" fontWeight={800} color="#166534" sx={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                        Chênh lệch thực trả / Đối soát
                                    </Typography>
                                    <AdminStatusBadge label="Khớp 100%" modifier="admin-status-badge--success" />
                                </Stack>
                                <Typography variant="h5" fontWeight={900} color="#15803d" sx={{ fontSize: '1.45rem', my: 1 }}>
                                    0 <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>VNĐ</span>
                                </Typography>
                                <Typography variant="caption" color="#16a34a">
                                    = Số tiền cần trả thực tế khớp hoàn toàn với quyết toán sau đối soát (0 VNĐ)
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>

                {/* ═══ MỤC 5: CHỨNG TỪ & BIÊN LAI ĐỐI SOÁT (Chuẩn Mục 5 Hình 3 & 4) ═══ */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: '16px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent="space-between"
                        sx={{ mb: 2 }}
                    >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '10px',
                                    bgcolor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'grid',
                                    placeItems: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <DescriptionOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ lineHeight: 1.3 }}>
                                    5. Chứng từ & Biên lai đối soát
                                </Typography>
                                <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.8rem' }}>
                                    Chứng từ phiếu nhập lô và biên lai đối soát từ nhà cung cấp
                                </Typography>
                            </Box>
                        </Stack>
                        <AdminStatusBadge label="Đã đính kèm chứng từ" modifier="admin-status-badge--success" />
                    </Stack>

                    <Grid container spacing={2}>
                        {/* Cột 1: Chứng từ phiếu nhập */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box sx={{ p: 2, borderRadius: '14px', border: '1px solid #e2e8f0', bgcolor: '#ffffff', height: '100%' }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                        Chứng từ phiếu nhập lô ({importBatches.length})
                                    </Typography>
                                    <AdminStatusBadge label={`Đủ chứng từ (${importBatches.length}/${importBatches.length})`} modifier="admin-status-badge--success" />
                                </Stack>

                                {importBatches.length > 1 && (
                                    <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, overflowX: 'auto', pb: 0.5 }}>
                                        {importBatches.map((b, idx) => (
                                            <ButtonBase
                                                key={b.id}
                                                onClick={() => setSelectedImportBatchIndex(idx)}
                                                sx={{
                                                    px: 1.5,
                                                    py: 0.5,
                                                    borderRadius: '8px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    bgcolor: selectedImportBatchIndex === idx ? '#2563eb' : '#f1f5f9',
                                                    color: selectedImportBatchIndex === idx ? '#ffffff' : '#334155',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                Phiếu {idx + 1} ({b.batchCode || `#${b.id}`})
                                            </ButtonBase>
                                        ))}
                                    </Stack>
                                )}

                                {/* Sub-tabs: Biên lai phiếu nhập vs Danh sách vé */}
                                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                                    <ButtonBase
                                        onClick={() => setSelectedImportEvidenceTab('receipt')}
                                        sx={{
                                            px: 1.5,
                                            py: 0.4,
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            bgcolor: selectedImportEvidenceTab === 'receipt' ? '#eff6ff' : 'transparent',
                                            color: selectedImportEvidenceTab === 'receipt' ? '#2563eb' : '#64748b',
                                            border: `1px solid ${selectedImportEvidenceTab === 'receipt' ? '#bfdbfe' : '#e2e8f0'}`,
                                        }}
                                    >
                                        Biên lai phiếu nhập
                                    </ButtonBase>
                                    <ButtonBase
                                        onClick={() => setSelectedImportEvidenceTab('tickets')}
                                        sx={{
                                            px: 1.5,
                                            py: 0.4,
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            bgcolor: selectedImportEvidenceTab === 'tickets' ? '#eff6ff' : 'transparent',
                                            color: selectedImportEvidenceTab === 'tickets' ? '#2563eb' : '#64748b',
                                            border: `1px solid ${selectedImportEvidenceTab === 'tickets' ? '#bfdbfe' : '#e2e8f0'}`,
                                        }}
                                    >
                                        Danh sách vé ({activeTicketListUrls.length})
                                    </ButtonBase>
                                </Stack>

                                {/* File preview card */}
                                {selectedImportEvidenceTab === 'receipt' ? (
                                    activeInvoiceUrl ? (
                                        <Box
                                            sx={{
                                                p: 2,
                                                borderRadius: '12px',
                                                border: '1px solid #e2e8f0',
                                                bgcolor: '#f8fafc',
                                                textAlign: 'center',
                                                position: 'relative',
                                            }}
                                        >
                                            {isLikelyImage(activeInvoiceUrl) ? (
                                                <Box
                                                    component="img"
                                                    src={activeInvoiceUrl}
                                                    alt="Biên lai nhập"
                                                    sx={{ maxHeight: 180, maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', cursor: 'pointer' }}
                                                    onClick={() => onZoomImage?.({ url: activeInvoiceUrl, title: 'Biên lai phiếu nhập' })}
                                                />
                                            ) : (
                                                <Box sx={{ py: 3 }}>
                                                    <InsertDriveFileOutlinedIcon sx={{ fontSize: 48, color: '#3b82f6', mb: 1 }} />
                                                    <Typography variant="body2" fontWeight={700} color="#0f172a">Tệp chứng từ phiếu nhập</Typography>
                                                </Box>
                                            )}
                                            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1.5 }}>
                                                <Button
                                                    size="small"
                                                    startIcon={<ZoomInOutlinedIcon />}
                                                    onClick={() => onZoomImage?.({ url: activeInvoiceUrl, title: 'Biên lai phiếu nhập' })}
                                                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                                                >
                                                    Xem tệp
                                                </Button>
                                            </Stack>
                                        </Box>
                                    ) : (
                                        <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: '10px' }}>
                                            <Typography variant="caption" color="#94a3b8">Chưa đính kèm biên lai cho đợt này</Typography>
                                        </Box>
                                    )
                                ) : (
                                    activeTicketListUrls.length > 0 ? (
                                        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', p: 1 }}>
                                            {activeTicketListUrls.map((url, idx) => (
                                                <Box
                                                    key={idx}
                                                    sx={{
                                                        p: 1,
                                                        borderRadius: '10px',
                                                        border: '1px solid #e2e8f0',
                                                        bgcolor: '#f8fafc',
                                                        textAlign: 'center',
                                                        flexShrink: 0,
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() => onZoomImage?.({ url, title: `Ảnh danh sách vé #${idx + 1}` })}
                                                >
                                                    <Box component="img" src={url} alt={`Danh sách vé ${idx + 1}`} sx={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '6px' }} />
                                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>Ảnh #{idx + 1}</Typography>
                                                </Box>
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: '10px' }}>
                                            <Typography variant="caption" color="#94a3b8">Chưa có ảnh danh sách vé</Typography>
                                        </Box>
                                    )
                                )}
                            </Box>
                        </Grid>

                        {/* Cột 2: Biên lai đối soát từ NCC */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box sx={{ p: 2, borderRadius: '14px', border: '1px solid #e2e8f0', bgcolor: '#ffffff', height: '100%' }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                        Biên lai đối soát từ NCC
                                    </Typography>
                                    <AdminStatusBadge label={nccReceiptUrl ? 'Đã đính kèm' : 'Chưa đính kèm'} modifier={nccReceiptUrl ? 'admin-status-badge--success' : 'admin-status-badge--draft'} />
                                </Stack>

                                {nccReceiptUrl ? (
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                            bgcolor: '#f8fafc',
                                            textAlign: 'center',
                                        }}
                                    >
                                        {isLikelyImage(nccReceiptUrl) ? (
                                            <Box
                                                component="img"
                                                src={nccReceiptUrl}
                                                alt="Biên lai đối soát NCC"
                                                sx={{ maxHeight: 180, maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', cursor: 'pointer' }}
                                                onClick={() => onZoomImage?.({ url: nccReceiptUrl, title: 'Biên lai đối soát từ NCC' })}
                                            />
                                        ) : (
                                            <Box sx={{ py: 3 }}>
                                                <InsertDriveFileOutlinedIcon sx={{ fontSize: 48, color: '#ea580c', mb: 1 }} />
                                                <Typography variant="body2" fontWeight={700} color="#0f172a">Bảng kê đối soát NCC</Typography>
                                            </Box>
                                        )}
                                        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1.5 }}>
                                            <Button
                                                size="small"
                                                startIcon={<ZoomInOutlinedIcon />}
                                                onClick={() => onZoomImage?.({ url: nccReceiptUrl, title: 'Biên lai đối soát từ NCC' })}
                                                sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                                            >
                                                Xem tệp
                                            </Button>
                                        </Stack>
                                    </Box>
                                ) : (
                                    <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: '10px' }}>
                                        <Typography variant="caption" color="#94a3b8">Không có biên lai đối soát NCC</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>

                {/* ═══ THANH HÀNH ĐỘNG CUỐI TRANG (Chuẩn Thanh hành động Hình 4) ═══ */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: '16px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'stretch', sm: 'center' }}
                        justifyContent="space-between"
                    >
                        <Box>
                            <Typography variant="body2" color="#64748b" fontWeight={600}>
                                {paid
                                    ? 'Kỳ đối soát đã hoàn tất và thanh toán toàn bộ.'
                                    : waitingForPayment
                                      ? 'Kỳ đối soát đang ở trạng thái Chờ thanh toán.'
                                      : 'Đã hoàn tất rà soát số liệu và xử lý chênh lệch.'}
                            </Typography>
                        </Box>

                        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} flexShrink={0}>
                            {/* Trạng thái xem trước khi finalize */}
                            {!waitingForPayment && !paid && (
                                <>
                                    <Button
                                        variant="outlined"
                                        startIcon={<ArrowBackOutlinedIcon />}
                                        disabled={isFinalizing}
                                        onClick={hasDiscrepancyMilestone ? onBackToDiscrepancy : onBackToMatching}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            borderRadius: '10px',
                                            color: '#334155',
                                            borderColor: '#cbd5e1',
                                            bgcolor: '#ffffff',
                                            '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                                        }}
                                    >
                                        {hasDiscrepancyMilestone ? 'Quay lại xử lý chênh lệch' : 'Quay lại đối chiếu'}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={isFinalizing ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlinedIcon />}
                                        disabled={isFinalizing}
                                        onClick={onFinalize}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 800,
                                            borderRadius: '10px',
                                            whiteSpace: 'nowrap',
                                            px: 3,
                                            py: 1,
                                            bgcolor: '#16a34a',
                                            '&:hover': { bgcolor: '#15803d' },
                                        }}
                                    >
                                        {isFinalizing ? 'Đang lưu...' : 'Xử lý hoàn tất'}
                                    </Button>
                                </>
                            )}

                            {/* Trạng thái đã finalize: Tải PDF & Tiến hành thanh toán */}
                            {(waitingForPayment || paid) && (
                                <>
                                    <Button
                                        variant="outlined"
                                        startIcon={isDownloadingReport ? <CircularProgress size={16} /> : <PictureAsPdfOutlinedIcon />}
                                        disabled={isDownloadingReport}
                                        onClick={onDownloadReport}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            borderRadius: '10px',
                                            color: '#334155',
                                            borderColor: '#cbd5e1',
                                            bgcolor: '#ffffff',
                                            '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                                        }}
                                    >
                                        {isDownloadingReport ? 'Đang tạo PDF...' : 'Tải báo cáo PDF'}
                                    </Button>
                                    {waitingForPayment && !isReadOnlyReview && (
                                        <Button
                                            variant="contained"
                                            color="success"
                                            onClick={onOpenPaymentDialog}
                                            sx={{
                                                textTransform: 'none',
                                                fontWeight: 800,
                                                borderRadius: '10px',
                                                whiteSpace: 'nowrap',
                                                px: 3,
                                                py: 1,
                                                bgcolor: '#16a34a',
                                                '&:hover': { bgcolor: '#15803d' },
                                            }}
                                        >
                                            Tiến hành thanh toán
                                        </Button>
                                    )}
                                </>
                            )}
                        </Stack>
                    </Stack>
                </Paper>
            </Stack>
        </Box>
    );
};
