"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import { useState } from 'react';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { Avatar, Box, Button, Card, Chip, Dialog, DialogContent, DialogTitle, Grid, IconButton, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { SpinnerLoading } from '../../../../../components/ui/SpinnerLoading';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { useSupplierSettlementOverview } from '../../hooks/useSupplierSettlement';
import {
    getSupplierSettlementStatusLabel,
    getSupplierSettlementStatusModifier,
} from '../../utils/settlementLabels';
import { SettlementConsolidatedDetails } from '../sections/SettlementConsolidatedDetails';
import { SettlementInspectionDialog } from '../sections/SettlementInspectionDialog';
import { SettlementKpiCards } from '../sections/SettlementKpiCards';

export const SupplierSettlementDetailPage = () => {
    const router = useAdminRouter();
    const { id } = useRouteParams();
    const { data: overview, isLoading, isError, refetch } = useSupplierSettlementOverview(id);
    const [isInspectionOpen, setIsInspectionOpen] = useState(false);
    const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);

    if (isLoading) {
        return (
            <Box sx={{ width: '100%', pb: 5 }}>
                <PageHeader
                    title="Chi tiết đối soát nhà cung cấp"
                    breadcrumbItems={[
                        { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                        { label: 'Đối soát NCC', to: ROUTES.ADMIN.SUPPLIER_SETTLEMENT.LIST },
                        { label: `#${id}` },
                    ]}
                />
                <SpinnerLoading />
            </Box>
        );
    }

    if (isError || !overview?.settlement) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <Typography color="text.secondary">Không tìm thấy kỳ đối soát.</Typography>
            </Box>
        );
    }

    const settlement = overview.settlement;
    const statusLabel = getSupplierSettlementStatusLabel(settlement.status, settlement.statusLabel);
    const periodFrom = settlement.periodFrom
        ? dayjs(settlement.periodFrom).format('DD/MM/YYYY')
        : '—';
    const periodTo = settlement.periodTo ? dayjs(settlement.periodTo).format('DD/MM/YYYY') : '—';
    const supplierInitial = (settlement.supplierName || 'S').charAt(0).toUpperCase();
    const hasCompletedReturnInspection = (overview.returnBatches || []).some(
        (batch) => batch.status === 'PENDING_HANDOVER' || batch.status === 'HANDED_OVER'
    );

    return (
        <Box sx={{ width: '100%', pb: 5 }}>
            {/* Page Header with Circular Back Button */}
            <PageHeader
                title="Chi tiết đối soát nhà cung cấp"
                breadcrumbItems={[
                    { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                    { label: 'Đối soát NCC', to: ROUTES.ADMIN.SUPPLIER_SETTLEMENT.LIST },
                    { label: settlement.supplierName || `#${settlement.id}` },
                ]}
                titleExtra={
                    <IconButton
                        onClick={() => router.push(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.LIST)}
                        size="small"
                        sx={{
                            bgcolor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.06)',
                            width: 34,
                            height: 34,
                            '&:hover': {
                                bgcolor: '#f1f5f9',
                                borderColor: '#94a3b8',
                                color: '#0f172a',
                                transform: 'translateX(-2px)',
                            },
                            transition: 'all 0.15s ease',
                        }}
                        title="Quay lại danh sách đối soát NCC"
                    >
                        <ArrowBackOutlinedIcon fontSize="small" />
                    </IconButton>
                }
            />

            {/* Top Executive Header Card: Consolidated Info & 100% Balanced Financial Grid */}
            <Card
                elevation={0}
                sx={{
                    p: 3,
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#fff',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                    mb: 3,
                    width: '100%',
                }}
            >
                {/* Supplier & Period Header */}
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ md: 'center' }}
                    spacing={2}
                    sx={{ pb: 2.5, borderBottom: '1px solid #f1f5f9' }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                            sx={{
                                width: 50,
                                height: 50,
                                bgcolor: '#f1f5f9',
                                color: '#0284c7',
                                fontWeight: 800,
                                fontSize: '1.3rem',
                                border: '1px solid #cbd5e1',
                            }}
                        >
                            {supplierInitial}
                        </Avatar>
                        <Box>
                            <Stack direction="row" spacing={1.25} alignItems="center">
                                <Typography variant="h6" fontWeight={800} color="#0f172a">
                                    {settlement.supplierName || '—'}
                                </Typography>
                                {settlement.supplierCode && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontFamily: 'monospace',
                                            color: '#64748b',
                                            bgcolor: '#f8fafc',
                                            px: 1,
                                            py: 0.25,
                                            borderRadius: '6px',
                                            border: '1px solid #e2e8f0',
                                            fontWeight: 700,
                                            fontSize: '0.725rem',
                                        }}
                                    >
                                        {settlement.supplierCode}
                                    </Typography>
                                )}
                            </Stack>
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <CalendarTodayOutlinedIcon sx={{ fontSize: '0.9rem', color: '#64748b' }} />
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                        Kỳ đối soát: <strong style={{ color: '#0f172a' }}>{periodFrom} — {periodTo}</strong>
                                    </Typography>
                                </Stack>
                                {settlement.transactionId && (
                                    <Typography variant="caption" color="text.secondary">
                                        • Mã sổ cái: <strong>#{settlement.transactionId}</strong>
                                    </Typography>
                                )}
                            </Stack>
                        </Box>
                    </Stack>

                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<FactCheckOutlinedIcon />}
                            onClick={() => setIsInspectionOpen(true)}
                            sx={{
                                borderRadius: '10px',
                                textTransform: 'none',
                                fontWeight: 700,
                                px: 2,
                                py: 0.9,
                                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                                '&:hover': {
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                                },
                            }}
                        >
                            Tiến hành kiểm tra
                        </Button>
                        {settlement.isReturnExpired && (
                            <span className="admin-status-badge admin-status-badge--cancelled">
                                Quá hạn trả vé
                            </span>
                        )}
                        <span className={`admin-status-badge ${getSupplierSettlementStatusModifier(settlement.status)}`}>
                            {statusLabel}
                        </span>
                    </Stack>
                </Stack>

                {/* 100% Balanced Financial Metric Grid (Dynamic 3 or 4 Columns based on isReturnExpired) */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: settlement.isReturnExpired ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                            md: settlement.isReturnExpired ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
                        },
                        gap: 2,
                        pt: 2.5,
                        width: '100%',
                    }}
                >
                    {/* 1. Tổng giá trị nhập */}
                    <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary" display="block">
                            Tổng giá trị nhập
                        </Typography>
                        <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                            {formatImportCost(settlement.totalImportValue)} VNĐ
                        </Typography>
                    </Box>

                    {/* 2. Tổng giá trị trả (Ẩn khi quá hạn trả vé - isReturnExpired = true) */}
                    {!settlement.isReturnExpired && (
                        <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <Typography variant="caption" fontWeight={600} color="text.secondary" display="block">
                                Tổng giá trị trả
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                                {formatImportCost(settlement.totalReturnValue)} VNĐ
                            </Typography>
                        </Box>
                    )}

                    {/* 3. Giá trị quá hạn trả (Hiển thị khi isReturnExpired = TRUE) */}
                    {settlement.isReturnExpired && (
                        <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
                            <Typography variant="caption" fontWeight={700} color="#991b1b" display="block">
                                Giá trị quá hạn trả
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#dc2626" sx={{ mt: 0.5 }}>
                                {formatImportCost(settlement.expiredReturnValue ?? 0)} VNĐ
                            </Typography>
                            <Typography variant="caption" color="#b91c1c" sx={{ fontSize: '0.68rem', display: 'block', mt: 0.25 }}>
                                Vé chưa kịp bàn giao NCC
                            </Typography>
                        </Box>
                    )}

                    {/* 4. Đã thanh toán */}
                    <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary" display="block">
                            Đã thanh toán
                        </Typography>
                        <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                            {formatImportCost(settlement.totalPaidAmount)} VNĐ
                        </Typography>
                    </Box>

                    {/* 5. Còn phải trả (Ẩn khi quá hạn trả vé - isReturnExpired = true) */}
                    {!settlement.isReturnExpired && (
                        <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <Typography variant="caption" fontWeight={700} color="#166534" display="block">
                                Còn phải trả
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#15803d" sx={{ mt: 0.5 }}>
                                {formatImportCost(settlement.remainingAmount)} VNĐ
                            </Typography>
                            {(!settlement.totalReturnValue || settlement.totalReturnValue === 0) && (
                                <Typography variant="caption" color="#166534" sx={{ fontSize: '0.68rem', display: 'block', mt: 0.25 }}>
                                    Sẽ tính sau khi hoàn tất kiểm tra phiếu trả
                                </Typography>
                            )}
                        </Box>
                    )}
                </Box>
            </Card>

            {/* Inventory Quantity KPI Grid (100% Balanced 4-Card Row) */}
            <Box sx={{ mb: 3, width: '100%' }}>
                <Typography variant="subtitle1" fontWeight={700} color="#0f172a" sx={{ mb: 1.5 }}>
                    Thống kê vé & Trạng thái tồn kho
                </Typography>
                <SettlementKpiCards kpis={overview.kpis} />
            </Box>

            {/* Consolidated Details Tabbed Table */}
            <Box sx={{ width: '100%' }}>
                <Typography variant="subtitle1" fontWeight={700} color="#0f172a" sx={{ mb: 1.5 }}>
                    Chi tiết dữ liệu đối soát
                </Typography>
                <SettlementConsolidatedDetails
                    inventoryRows={overview.inventoryByStation || []}
                    importBatches={overview.importBatches || []}
                    returnBatches={overview.returnBatches || []}
                />
            </Box>

            {/* Modal Dialog Tiến hành kiểm tra đối soát */}
            <SettlementInspectionDialog
                open={isInspectionOpen}
                onClose={() => setIsInspectionOpen(false)}
                settlement={settlement}
                kpis={overview.kpis}
                importBatches={overview.importBatches || []}
                returnBatches={overview.returnBatches || []}
                inventoryByStation={overview.inventoryByStation || []}
                onRefresh={() => void refetch()}
            />
        </Box>
    );
};
