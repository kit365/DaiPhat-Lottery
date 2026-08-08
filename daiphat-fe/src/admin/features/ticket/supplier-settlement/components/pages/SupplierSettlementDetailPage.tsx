import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { Avatar, Box, Button, Card, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Grid, IconButton, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useParams } from '@/components/router-compat';
import { AppToast } from '../../../../../../utils/toast.util';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { useSupplierSettlementList, useSupplierSettlementOverview } from '../../hooks/useSupplierSettlement';
import {
    getSupplierSettlementStatusLabel,
    getSupplierSettlementStatusModifier,
} from '../../utils/settlementLabels';
import { ExpiredReturnSettlementBanner } from '../sections/ExpiredReturnSettlementBanner';
import { SettlementConsolidatedDetails } from '../sections/SettlementConsolidatedDetails';
import { SettlementInspectionDialog } from '../sections/SettlementInspectionDialog';
import { SettlementKpiCards } from '../sections/SettlementKpiCards';

export const SupplierSettlementDetailPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { data: overview, isLoading, isError, refetch } = useSupplierSettlementOverview(id);
    const { allSettlements } = useSupplierSettlementList();
    const [isInspectionOpen, setIsInspectionOpen] = useState(false);
    const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);

    const settlement = overview?.settlement;
    const isExpired = Boolean(settlement?.isReturnExpired);

    const expiredItems = useMemo(
        () => (allSettlements.length > 0 ? allSettlements.filter((s: any) => s.isReturnExpired) : []),
        [allSettlements]
    );
    const expiredCount = expiredItems.length;
    const totalExpiredSum = useMemo(
        () => expiredItems.reduce((acc: number, curr: any) => acc + (curr.expiredReturnValue || curr.totalReturnValue || 0), 0),
        [expiredItems]
    );



    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <CircularProgress />
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
            <div className="mb-[calc(4*var(--spacing))] flex items-start justify-end gap-[calc(2*var(--spacing))]">
                <div className="mr-auto">
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <IconButton
                            onClick={() => navigate(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.LIST)}
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
                        <Title title="Chi tiết đối soát nhà cung cấp" />
                    </Stack>
                    <Breadcrumb
                        items={[
                            { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                            { label: 'Đối soát NCC', to: ROUTES.ADMIN.SUPPLIER_SETTLEMENT.LIST },
                            { label: settlement.supplierSettlementCode || settlement.supplierName || `#${settlement.id}` },
                        ]}
                    />
                </div>
            </div>

            {/* Expired Return Batch Alert Banner (Executive Card Style - Image 2) */}
            {(isExpired || expiredCount > 0) && (
                <Box sx={{ mb: 3 }}>
                    <ExpiredReturnSettlementBanner
                        expiredCount={expiredCount > 0 ? expiredCount : 1}
                        totalExpiredValue={
                            totalExpiredSum > 0
                                ? totalExpiredSum
                                : (settlement.expiredReturnValue || settlement.totalReturnValue || 0)
                        }
                        expiredItems={expiredItems.length > 0 ? expiredItems : [settlement]}
                        currentSettlementId={Number(id)}
                    />
                </Box>
            )}

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
                            <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
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
                                {settlement.isReturnExpired && (
                                    <span className="admin-status-badge admin-status-badge--cancelled">
                                        Quá hạn trả vé
                                    </span>
                                )}
                                <span className={`admin-status-badge ${getSupplierSettlementStatusModifier(settlement.status)}`}>
                                    {statusLabel}
                                </span>
                            </Stack>
                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <CalendarTodayOutlinedIcon sx={{ fontSize: '0.9rem', color: '#64748b' }} />
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                        Kỳ đối soát: <strong style={{ color: '#0f172a' }}>{periodFrom} — {periodTo}</strong>
                                    </Typography>
                                </Stack>
                                <Typography variant="caption" color="text.secondary">
                                    • Mã đối soát:{' '}
                                    <strong style={{ color: '#2563eb' }}>
                                        {settlement.supplierSettlementCode || `#${settlement.id}`}
                                    </strong>
                                </Typography>
                                {settlement.transactionId && (
                                    <Typography variant="caption" color="text.secondary">
                                        • Mã sổ cái: <strong>#{settlement.transactionId}</strong>
                                    </Typography>
                                )}
                            </Stack>
                        </Box>
                    </Stack>

                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ ml: { xs: 0, md: 'auto' } }}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<FactCheckOutlinedIcon />}
                            onClick={() => navigate(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.INSPECT(id || ''))}
                            sx={{
                                borderRadius: '10px',
                                textTransform: 'none',
                                fontWeight: 700,
                                px: 2.25,
                                py: 0.9,
                                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                                '&:hover': {
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                                },
                            }}
                        >
                            Tiến hành kiểm tra
                        </Button>
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

                    {/* 5. Còn phải trả NCC (Ẩn khi quá hạn trả vé - isReturnExpired = true) */}
                    {!settlement.isReturnExpired && (
                        <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <Typography variant="caption" fontWeight={700} color="#166534" display="block">
                                Còn phải trả NCC
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
