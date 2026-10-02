"use client";

import { useMemo, useState } from 'react';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import {
    Alert,
    Box,
    Button,
    Collapse,
    Divider,
    Grid,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';
import type {
    ResolveImportDiscrepancyPayload,
    ResolveReturnDiscrepancyPayload,
    ResolveUnitPriceDiscrepancyPayload,
    SettlementDiscrepancyItem,
    SettlementOverviewImportBatch,
    SettlementOverviewReturnBatch,
    SettlementStationInventory,
    SettlementStationPricing,
    SupplierSettlement,
    SupplierSettlementAdjustment,
    SupplierSettlementKpis,
} from '../../types/supplierSettlement.type';
import { formatSettlementMoney, scaleSettlementMoney } from '../../utils/settlementCashflow';
import {
    getQtyDiffBadgeModifier,
    getReturnMatchingLockDetails,
    resolveLiveSystemImportQuantity,
    resolveLiveSystemReturnQuantity,
    weightedStationNetUnitPrice,
} from '../../utils/settlementLabels';
import { ImportDiscrepancyPanel } from './ImportDiscrepancyPanel';
import { MissingReturnTicketsPanel } from './MissingReturnTicketsPanel';
import { SettlementReconciliationTabs } from './SettlementReconciliationTabs';
import { UnitPriceDiscrepancyPanel } from './UnitPriceDiscrepancyPanel';

interface Props {
    settlement: SupplierSettlement;
    kpis?: SupplierSettlementKpis | null;
    importBatches: SettlementOverviewImportBatch[];
    returnBatches: SettlementOverviewReturnBatch[];
    stationPricing: SettlementStationPricing[];
    inventoryByStation: SettlementStationInventory[];
    adjustments: SupplierSettlementAdjustment[];
    returnCutOffContext?: any;
    needsImport: boolean;
    needsReturn: boolean;
    needsUnitPrice: boolean;
    hasUnitPriceDiscrepancy: boolean;
    importItem?: SettlementDiscrepancyItem;
    returnItem?: SettlementDiscrepancyItem;
    unitPriceItem?: SettlementDiscrepancyItem;
    returnShortfall: boolean;
    returnExcess: boolean;
    showReturnLockBanner: boolean;
    returnLockDetails: ReturnType<typeof getReturnMatchingLockDetails>;
    importTicketsQuery: any;
    missingReturnQuery: any;
    importDraft: ResolveImportDiscrepancyPayload | null;
    returnDraft: ResolveReturnDiscrepancyPayload | null;
    unitPriceDraft: ResolveUnitPriceDiscrepancyPayload | null;
    onSetImportDraft: (val: ResolveImportDiscrepancyPayload | null) => void;
    onSetReturnDraft: (val: ResolveReturnDiscrepancyPayload | null) => void;
    onSetUnitPriceDraft: (val: ResolveUnitPriceDiscrepancyPayload | null) => void;
    onImportDirtyChange: (isDirty: boolean) => void;
    onBackToMatching: () => void;
    onAdvanceToCompletion: () => void;
    remainingDiscrepancies: string[];
    allDiscrepanciesProcessed: boolean;
    remainingAmount?: number;
}

export const SettlementDiscrepancyResolutionSection = ({
    settlement,
    kpis,
    importBatches,
    returnBatches,
    stationPricing,
    inventoryByStation,
    adjustments,
    returnCutOffContext,
    needsImport,
    needsReturn,
    needsUnitPrice,
    hasUnitPriceDiscrepancy,
    importItem,
    returnItem,
    unitPriceItem,
    returnShortfall,
    returnExcess,
    showReturnLockBanner,
    returnLockDetails,
    importTicketsQuery,
    missingReturnQuery,
    importDraft,
    returnDraft,
    unitPriceDraft,
    onSetImportDraft,
    onSetReturnDraft,
    onSetUnitPriceDraft,
    onImportDirtyChange,
    onBackToMatching,
    onAdvanceToCompletion,
    remainingDiscrepancies,
    allDiscrepanciesProcessed,
    remainingAmount,
}: Props) => {
    const [showTabs, setShowTabs] = useState(false);

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

    const isReturnInputsLocked = returnLockDetails.inputsLocked;

    // Build dynamic numbering for sections
    let currentSectionIndex = 1;
    const section1Number = currentSectionIndex++;
    const priceSectionNumber = hasUnitPriceDiscrepancy ? currentSectionIndex++ : null;
    const importSectionNumber = needsImport ? currentSectionIndex++ : null;
    const returnSectionNumber = needsReturn ? currentSectionIndex++ : null;
    const finalizeSectionNumber = currentSectionIndex;

    const detectedCount = (importQtyDiff !== 0 ? 1 : 0) + (returnQtyDiff !== 0 ? 1 : 0) + (hasUnitPriceDiscrepancy ? 1 : 0);
    const resolvedDraftCount = (importDraft ? 1 : 0) + (returnDraft ? 1 : 0) + (unitPriceDraft ? 1 : 0);

    return (
        <Box sx={{ width: '100%', pt: 0.5 }}>
            {/* Header / Intro banner (Consistent with Section banner of Image 1) */}
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
                        bgcolor: '#fff7ed',
                        color: '#ea580c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid #fed7aa',
                    }}
                >
                    <RuleOutlinedIcon sx={{ fontSize: '1.5rem' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ fontSize: '1.1rem', lineHeight: 1.3 }}>
                        Xử lý chênh lệch hệ thống / thực tế
                    </Typography>
                    <Typography variant="body2" color="#64748b" sx={{ mt: 0.25, fontSize: '0.85rem' }}>
                        Rà soát và giải trình các khoản chênh lệch vé nhập, vé trả và đơn giá đã phát hiện trong bước đối chiếu.
                        Dữ liệu xử lý được giữ tạm trước khi chuyển sang bước Hoàn tất.
                    </Typography>
                </Box>
            </Stack>

            <Divider sx={{ mb: 2.5, borderColor: '#f1f5f9' }} />

            <Stack spacing={2.5}>
                {/* ═══ MỤC 1: TỔNG QUAN CHÊNH LỆCH PHÁT HIỆN ═══ */}
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
                                <CompareArrowsOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ lineHeight: 1.3 }}>
                                    {section1Number}. Tổng quan chênh lệch phát hiện
                                </Typography>
                                <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.8rem' }}>
                                    So sánh các hạng mục chênh lệch giữa Hệ thống và Thực tế từ bước đối chiếu
                                </Typography>
                            </Box>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <AdminStatusBadge
                                label={
                                    allDiscrepanciesProcessed
                                        ? `Đã tạm xử lý ${resolvedDraftCount}/${detectedCount} chênh lệch`
                                        : `Phát hiện ${detectedCount} mục chênh lệch`
                                }
                                modifier={allDiscrepanciesProcessed ? 'admin-status-badge--success' : 'admin-status-badge--pending'}
                            />
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<ArrowBackOutlinedIcon sx={{ fontSize: '0.95rem' }} />}
                                onClick={onBackToMatching}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    borderRadius: '8px',
                                    borderColor: '#cbd5e1',
                                    color: '#334155',
                                    bgcolor: '#ffffff',
                                    '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                                }}
                            >
                                Quay lại chỉnh số liệu đối chiếu
                            </Button>
                        </Stack>
                    </Stack>

                    {/* 3 cards so sánh chênh lệch chuẩn hóa theo Section 1 của Ảnh 1 */}
                    <Grid container spacing={2}>
                        {/* Cột 1: Nhập vé */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    border: '1px solid',
                                    borderColor: importQtyDiff === 0 ? '#bbf7d0' : importDraft ? '#bfdbfe' : '#fed7aa',
                                    bgcolor: '#ffffff',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Box>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Inventory2OutlinedIcon sx={{ color: '#2563eb', fontSize: '1.15rem' }} />
                                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                                Số liệu Nhập vé
                                            </Typography>
                                        </Stack>
                                        <AdminStatusBadge
                                            label={
                                                importQtyDiff === 0
                                                    ? 'Khớp hệ thống'
                                                    : importDraft
                                                      ? 'Đã tạm xử lý'
                                                      : 'Cần xử lý'
                                            }
                                            modifier={
                                                importQtyDiff === 0
                                                    ? 'admin-status-badge--success'
                                                    : importDraft
                                                      ? 'admin-status-badge--active'
                                                      : 'admin-status-badge--pending'
                                            }
                                        />
                                    </Stack>

                                    {/* Hộp dữ liệu hệ thống */}
                                    <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0', mb: 1.5 }}>
                                        <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', mb: 0.75 }}>
                                            Hệ thống ghi nhận:
                                        </Typography>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Box>
                                                <Typography variant="caption" color="#64748b" display="block">Số lượng</Typography>
                                                <Typography variant="body2" fontWeight={800} color="#0f172a">
                                                    {systemImportQty.toLocaleString('vi-VN')} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>vé</span>
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography variant="caption" color="#64748b" display="block">Giá trị nhập</Typography>
                                                <Typography variant="body2" fontWeight={800} color="#166534">
                                                    {formatSettlementMoney(storedSystemImportVal)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>VNĐ</span>
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Box>

                                    {/* Banner chênh lệch */}
                                    <Box
                                        sx={{
                                            p: 1.25,
                                            borderRadius: '10px',
                                            bgcolor: importQtyDiff === 0 ? '#f0fdf4' : '#fffbeb',
                                            border: `1px solid ${importQtyDiff === 0 ? '#bbf7d0' : '#fde68a'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            mb: 1.5,
                                        }}
                                    >
                                        <Typography variant="caption" fontWeight={800} color={importQtyDiff === 0 ? '#166534' : '#b45309'} sx={{ textTransform: 'uppercase' }}>
                                            Chênh lệch nhập:
                                        </Typography>
                                        <Typography variant="body2" fontWeight={800} color={importQtyDiff === 0 ? '#15803d' : '#b45309'}>
                                            {importQtyDiff === 0
                                                ? '0 vé (Khớp)'
                                                : `${importQtyDiff > 0 ? `Thiếu ${importQtyDiff}` : `Thừa ${Math.abs(importQtyDiff)}`} vé`}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ pt: 1, borderTop: '1px solid #f1f5f9' }}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="caption" color="#64748b">Thực tế NCC:</Typography>
                                        <Typography variant="caption" fontWeight={700} color="#0f172a">
                                            {actualImportQty.toLocaleString('vi-VN')} vé ({formatSettlementMoney(actualImportVal)} VNĐ)
                                        </Typography>
                                    </Stack>
                                </Box>
                            </Box>
                        </Grid>

                        {/* Cột 2: Trả vé */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    border: '1px solid',
                                    borderColor: isReturnInputsLocked ? '#fde68a' : returnQtyDiff === 0 ? '#bbf7d0' : returnDraft ? '#bfdbfe' : '#fed7aa',
                                    bgcolor: '#ffffff',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Box>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <AssignmentReturnOutlinedIcon sx={{ color: '#ea580c', fontSize: '1.15rem' }} />
                                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                                Số liệu Trả vé
                                            </Typography>
                                        </Stack>
                                        <AdminStatusBadge
                                            label={
                                                isReturnInputsLocked
                                                    ? 'Khóa sổ'
                                                    : returnQtyDiff === 0
                                                      ? 'Khớp hệ thống'
                                                      : returnDraft
                                                        ? 'Đã tạm xử lý'
                                                        : 'Cần xử lý'
                                            }
                                            modifier={
                                                isReturnInputsLocked
                                                    ? 'admin-status-badge--pending'
                                                    : returnQtyDiff === 0
                                                      ? 'admin-status-badge--success'
                                                      : returnDraft
                                                        ? 'admin-status-badge--active'
                                                        : 'admin-status-badge--pending'
                                            }
                                        />
                                    </Stack>

                                    {/* Hộp dữ liệu hệ thống */}
                                    <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0', mb: 1.5 }}>
                                        <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', mb: 0.75 }}>
                                            Hệ thống ghi nhận:
                                        </Typography>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Box>
                                                <Typography variant="caption" color="#64748b" display="block">Số lượng</Typography>
                                                <Typography variant="body2" fontWeight={800} color="#0f172a">
                                                    {systemReturnQty.toLocaleString('vi-VN')} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>vé</span>
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography variant="caption" color="#64748b" display="block">Tổng giá trị trả</Typography>
                                                <Typography variant="body2" fontWeight={800} color="#166534">
                                                    {formatSettlementMoney(storedSystemReturnVal)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>VNĐ</span>
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Box>

                                    {/* Banner chênh lệch */}
                                    <Box
                                        sx={{
                                            p: 1.25,
                                            borderRadius: '10px',
                                            bgcolor: isReturnInputsLocked ? '#fffbeb' : returnQtyDiff === 0 ? '#f0fdf4' : '#fffbeb',
                                            border: `1px solid ${isReturnInputsLocked ? '#fde68a' : returnQtyDiff === 0 ? '#bbf7d0' : '#fde68a'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            mb: 1.5,
                                        }}
                                    >
                                        <Typography variant="caption" fontWeight={800} color={isReturnInputsLocked ? '#b45309' : returnQtyDiff === 0 ? '#166534' : '#b45309'} sx={{ textTransform: 'uppercase' }}>
                                            Chênh lệch trả:
                                        </Typography>
                                        <Typography variant="body2" fontWeight={800} color={isReturnInputsLocked ? '#b45309' : returnQtyDiff === 0 ? '#15803d' : '#b45309'}>
                                            {isReturnInputsLocked
                                                ? 'Đã khóa sổ trả'
                                                : returnQtyDiff === 0
                                                  ? '0 vé (Khớp)'
                                                  : `${returnQtyDiff > 0 ? `Thừa +${returnQtyDiff}` : `Thiếu ${returnQtyDiff}`} vé`}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ pt: 1, borderTop: '1px solid #f1f5f9' }}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="caption" color="#64748b">Thực tế trả:</Typography>
                                        <Typography variant="caption" fontWeight={700} color="#0f172a">
                                            {actualReturnQty.toLocaleString('vi-VN')} vé ({formatSettlementMoney(actualReturnVal)} VNĐ)
                                        </Typography>
                                    </Stack>
                                </Box>
                            </Box>
                        </Grid>

                        {/* Cột 3: Đơn giá & hoa hồng */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    border: '1px solid',
                                    borderColor: !hasUnitPriceDiscrepancy ? '#bbf7d0' : unitPriceDraft ? '#bfdbfe' : '#fed7aa',
                                    bgcolor: '#ffffff',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Box>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <LocalOfferOutlinedIcon sx={{ color: '#0284c7', fontSize: '1.15rem' }} />
                                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                                Đơn giá & Hoa hồng
                                            </Typography>
                                        </Stack>
                                        <AdminStatusBadge
                                            label={
                                                !hasUnitPriceDiscrepancy
                                                    ? 'Khớp giá & hoa hồng'
                                                    : unitPriceDraft
                                                      ? 'Đã tạm xử lý'
                                                      : 'Cần xử lý'
                                            }
                                            modifier={
                                                !hasUnitPriceDiscrepancy
                                                    ? 'admin-status-badge--success'
                                                    : unitPriceDraft
                                                      ? 'admin-status-badge--active'
                                                      : 'admin-status-badge--pending'
                                            }
                                        />
                                    </Stack>

                                    {/* Hộp dữ liệu hệ thống */}
                                    <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0', mb: 1.5 }}>
                                        <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', mb: 0.75 }}>
                                            Hệ thống ghi nhận:
                                        </Typography>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Box>
                                                <Typography variant="caption" color="#64748b" display="block">Giá sau HH bình quân</Typography>
                                                <Typography variant="body2" fontWeight={800} color="#1d4ed8">
                                                    {formatSettlementMoney(baselineUnitPrice)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>đ/vé</span>
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography variant="caption" color="#64748b" display="block">Giá đối chiếu</Typography>
                                                <Typography variant="body2" fontWeight={800} color={unitPriceDiff !== 0 ? '#b45309' : '#0f172a'}>
                                                    {formatSettlementMoney(reconciledUnitPrice)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>đ/vé</span>
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Box>

                                    {/* Banner chênh lệch */}
                                    <Box
                                        sx={{
                                            p: 1.25,
                                            borderRadius: '10px',
                                            bgcolor: !hasUnitPriceDiscrepancy ? '#f0fdf4' : '#fffbeb',
                                            border: `1px solid ${!hasUnitPriceDiscrepancy ? '#bbf7d0' : '#fde68a'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            mb: 1.5,
                                        }}
                                    >
                                        <Typography variant="caption" fontWeight={800} color={!hasUnitPriceDiscrepancy ? '#166534' : '#b45309'} sx={{ textTransform: 'uppercase' }}>
                                            Chênh lệch giá:
                                        </Typography>
                                        <Typography variant="body2" fontWeight={800} color={!hasUnitPriceDiscrepancy ? '#15803d' : '#b45309'}>
                                            {!hasUnitPriceDiscrepancy
                                                ? '0 đ (Đã khớp)'
                                                : `${unitPriceDiff > 0 ? `+${formatSettlementMoney(unitPriceDiff)}` : formatSettlementMoney(unitPriceDiff)} đ/vé`}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ pt: 1, borderTop: '1px solid #f1f5f9' }}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="caption" color="#64748b">Số đài áp dụng:</Typography>
                                        <Typography variant="caption" fontWeight={700} color="#0f172a">
                                            {stationPricing.length} nhà đài
                                        </Typography>
                                    </Stack>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Nút bấm tinh gọn: Xem chi tiết tồn kho & đợt nhập/trả nếu cần */}
                    <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #f1f5f9' }}>
                        <Button
                            variant="text"
                            size="small"
                            onClick={() => setShowTabs((prev) => !prev)}
                            startIcon={<FormatListBulletedOutlinedIcon sx={{ fontSize: '1.1rem' }} />}
                            endIcon={
                                <ExpandMoreOutlinedIcon
                                    sx={{
                                        transform: showTabs ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s ease',
                                    }}
                                />
                            }
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.825rem',
                                color: '#334155',
                                '&:hover': { bgcolor: '#f1f5f9' },
                            }}
                        >
                            {showTabs
                                ? 'Thu gọn chi tiết tồn kho & các đợt nhập/trả'
                                : 'Tra cứu chi tiết đợt nhập, đợt trả & tồn kho các đài (nếu cần kiểm tra sâu)'}
                        </Button>

                        <Collapse in={showTabs} timeout="auto" unmountOnExit>
                            <Box sx={{ mt: 2, pt: 1 }}>
                                <SettlementReconciliationTabs
                                    inventoryByStation={inventoryByStation}
                                    importBatches={importBatches}
                                    returnBatches={returnBatches}
                                    remainingPayableAmount={remainingAmount}
                                    settlement={settlement}
                                    hideAllStationsTab
                                />
                            </Box>
                        </Collapse>
                    </Box>
                </Paper>

                {/* ═══ MỤC 2: XỬ LÝ CHÊNH LỆCH ĐƠN GIÁ & HOA HỒNG (Nếu có) ═══ */}
                {hasUnitPriceDiscrepancy && (
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
                                        {priceSectionNumber}. Xử lý chênh lệch đơn giá & hoa hồng
                                    </Typography>
                                    <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.8rem' }}>
                                        Xác nhận giá vốn sau hoa hồng hoặc ghi nhận điều chỉnh tiền phải trả nhà cung cấp
                                    </Typography>
                                </Box>
                            </Stack>
                            <AdminStatusBadge
                                label={unitPriceDraft ? 'Đã tạm xử lý' : 'Chưa xử lý'}
                                modifier={unitPriceDraft ? 'admin-status-badge--success' : 'admin-status-badge--pending'}
                            />
                        </Stack>

                        <UnitPriceDiscrepancyPanel
                            settlement={settlement}
                            afterCommissionUnitPrice={afterHhUnitPrice}
                            direction={unitPriceItem?.direction || 'NEGATIVE'}
                            difference={Number(unitPriceItem?.difference ?? 0)}
                            resolved={Boolean(settlement.unitPriceDiscrepancyResolved || unitPriceDraft)}
                            draftOnly={Boolean(unitPriceDraft && !settlement.unitPriceDiscrepancyResolved)}
                            submitting={false}
                            onBackToEdit={() => {
                                onSetUnitPriceDraft(null);
                            }}
                            onResolve={(payload) => {
                                onSetUnitPriceDraft(payload);
                            }}
                        />
                    </Paper>
                )}

                {/* ═══ MỤC 3: XỬ LÝ CHÊNH LỆCH SỐ LƯỢNG VÉ NHẬP (Nếu có) ═══ */}
                {needsImport && (
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
                                    <Inventory2OutlinedIcon sx={{ fontSize: '1.25rem' }} />
                                </Box>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ lineHeight: 1.3 }}>
                                        {importSectionNumber}. Xử lý chênh lệch số lượng vé nhập
                                    </Typography>
                                    <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.8rem' }}>
                                        {importItem?.direction === 'NEGATIVE'
                                            ? 'Chọn các vé hệ thống đã ghi nhận thừa và giải trình nguyên nhân'
                                            : 'Bổ sung thông tin vé nhận thực tế còn thiếu so với hệ thống'}
                                    </Typography>
                                </Box>
                            </Stack>
                            <AdminStatusBadge
                                label={importDraft ? 'Đã tạm xử lý' : 'Chưa xử lý'}
                                modifier={importDraft ? 'admin-status-badge--success' : 'admin-status-badge--pending'}
                            />
                        </Stack>

                        <ImportDiscrepancyPanel
                            serials={importTicketsQuery.data || []}
                            inventoryByStation={inventoryByStation}
                            importBatches={importBatches}
                            supplierId={settlement.lotterySupplierId}
                            settlementReceiptUrl={settlement.supplierSettlementReceiptUrl}
                            drawDate={settlement.periodFrom}
                            returnCutOffContext={returnCutOffContext}
                            reconciliationWindowStartAt={settlement.reconciliationWindowStartAt}
                            inReconciliationWindow={settlement.inReconciliationWindow}
                            direction={importItem?.direction || 'NEGATIVE'}
                            difference={Number(importItem?.difference ?? 0)}
                            loading={importTicketsQuery.isLoading}
                            submitting={false}
                            collapsed={Boolean(importDraft)}
                            onBackToEdit={() => {
                                onSetImportDraft(null);
                            }}
                            onResolve={(payload) => {
                                onSetImportDraft(payload);
                                onImportDirtyChange(false);
                            }}
                            onDirtyChange={onImportDirtyChange}
                        />
                    </Paper>
                )}

                {/* ═══ MỤC 4: XỬ LÝ CHÊNH LỆCH SỐ LƯỢNG VÉ TRẢ (Nếu có) ═══ */}
                {needsReturn && (
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
                                    <AssignmentReturnOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                                </Box>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ lineHeight: 1.3 }}>
                                        {returnSectionNumber}. Xử lý chênh lệch số lượng vé trả
                                    </Typography>
                                    <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.8rem' }}>
                                        Rà soát các vé thiếu trả hoặc kiểm tra tình trạng khóa sổ các đợt trả vé
                                    </Typography>
                                </Box>
                            </Stack>
                            <AdminStatusBadge
                                label={
                                    isReturnInputsLocked
                                        ? 'Khóa sổ'
                                        : returnDraft
                                          ? 'Đã tạm xử lý'
                                          : 'Chưa xử lý'
                                }
                                modifier={
                                    isReturnInputsLocked
                                        ? 'admin-status-badge--pending'
                                        : returnDraft
                                          ? 'admin-status-badge--success'
                                          : 'admin-status-badge--pending'
                                }
                            />
                        </Stack>

                        {showReturnLockBanner && (
                            <Alert
                                severity={returnLockDetails.overdue || returnLockDetails.allCancelled ? 'error' : 'warning'}
                                icon={<WarningAmberOutlinedIcon />}
                                sx={{ mb: 2, borderRadius: '12px', fontWeight: 600 }}
                            >
                                {returnLockDetails.summaryMessage || 'Số liệu trả vé đang bị khóa và chỉ xem theo hệ thống.'}
                            </Alert>
                        )}

                        {returnShortfall && (
                            <Box sx={{ opacity: isReturnInputsLocked ? 0.72 : 1 }}>
                                <MissingReturnTicketsPanel
                                    serials={missingReturnQuery.data || []}
                                    difference={Number(returnItem?.difference ?? 0)}
                                    loading={missingReturnQuery.isLoading}
                                    submitting={false}
                                    disabled={isReturnInputsLocked}
                                    collapsed={Boolean(returnDraft)}
                                    onBackToEdit={() => {
                                        onSetReturnDraft(null);
                                    }}
                                    onResolve={(payload) => {
                                        onSetReturnDraft(payload);
                                    }}
                                />
                            </Box>
                        )}

                        {returnExcess && (
                            <Alert severity="warning" sx={{ borderRadius: '12px' }}>
                                Số lượng vé trả thực tế đang lớn hơn số lượng hệ thống. Hệ thống không xử lý thừa trả —
                                hãy quay lại chỉnh số liệu đối chiếu và nhập số lượng trả bằng hoặc ít hơn hệ thống.
                            </Alert>
                        )}

                        {!returnShortfall && !returnExcess && (
                            <Alert severity="warning" sx={{ borderRadius: '12px' }}>
                                Có chênh lệch số lượng trả nhưng chưa xác định chiều thiếu hay thừa. Hãy kiểm tra lại số liệu đối chiếu.
                            </Alert>
                        )}
                    </Paper>
                )}

                {/* ═══ MỤC CUỐI: XÁC NHẬN XỬ LÝ & CHUYỂN BƯỚC (Chuẩn action card của Hình 4) ═══ */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: '16px',
                        borderColor: allDiscrepanciesProcessed ? '#bbf7d0' : '#fed7aa',
                        bgcolor: allDiscrepanciesProcessed ? '#f0fdf4' : '#fffbeb',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'stretch', md: 'center' }}
                        justifyContent="space-between"
                    >
                        <Box sx={{ flex: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                {allDiscrepanciesProcessed ? (
                                    <CheckCircleOutlinedIcon sx={{ color: '#16a34a' }} />
                                ) : (
                                    <WarningAmberOutlinedIcon sx={{ color: '#d97706' }} />
                                )}
                                <Typography
                                    variant="subtitle1"
                                    fontWeight={800}
                                    color={allDiscrepanciesProcessed ? '#166534' : '#92400e'}
                                >
                                    {finalizeSectionNumber}. Xác nhận & Hoàn tất xử lý chênh lệch
                                </Typography>
                            </Stack>

                            {!allDiscrepanciesProcessed ? (
                                <Box>
                                    <Typography variant="body2" color="#b45309" sx={{ lineHeight: 1.55 }}>
                                        Vui lòng xử lý tất cả chênh lệch trước khi chuyển sang bước tiếp theo. Còn lại:
                                    </Typography>
                                    <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#92400e', mt: 0.5 }}>
                                        {remainingDiscrepancies.map((item) => (
                                            <Box component="li" key={item}>
                                                <Typography variant="body2" color="#92400e" fontWeight={600}>
                                                    {item}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            ) : (
                                <Typography variant="body2" color="#15803d" sx={{ lineHeight: 1.55 }}>
                                    Tất cả chênh lệch đã được xử lý tạm thời. Nhấn nút <strong>Chuyển sang Hoàn tất xử lý</strong> để xem bản chốt quyết toán cuối cùng.
                                </Typography>
                            )}
                        </Box>

                        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} flexShrink={0}>
                            <Button
                                variant="outlined"
                                startIcon={<ArrowBackOutlinedIcon />}
                                onClick={onBackToMatching}
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
                                Quay lại đối chiếu
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleOutlinedIcon />}
                                disabled={!allDiscrepanciesProcessed}
                                onClick={onAdvanceToCompletion}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 800,
                                    borderRadius: '10px',
                                    whiteSpace: 'nowrap',
                                    px: 2.5,
                                    py: 1,
                                    bgcolor: '#16a34a',
                                    '&:hover': { bgcolor: '#15803d' },
                                }}
                            >
                                Chuyển sang Hoàn tất xử lý
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>
            </Stack>
        </Box>
    );
};
