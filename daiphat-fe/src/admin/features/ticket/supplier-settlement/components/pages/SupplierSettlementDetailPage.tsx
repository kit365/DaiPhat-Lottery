"use client";

import { useRouteParams } from "@/hooks/useRouteParams";
import { useState } from 'react';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { Box, Button, Card, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { SpinnerLoading } from '../../../../../components/ui/SpinnerLoading';
import { ROUTES } from '../../../../../constants/routes';
import { useSupplierSettlementOverview } from '../../hooks/useSupplierSettlement';
import {
    getSupplierSettlementStatusLabel,
    getSupplierSettlementStatusModifier,
} from '../../utils/settlementLabels';
import { SettlementConsolidatedDetails } from '../sections/SettlementConsolidatedDetails';
import { SettlementOverviewSummary } from '../sections/SettlementOverviewSummary';
import { SettlementInspectionDialog } from '../sections/SettlementInspectionDialog';

export const SupplierSettlementDetailPage = () => {
    const { id } = useRouteParams();
    const { data: overview, isLoading, isError, refetch } = useSupplierSettlementOverview(id);
    const [isInspectionOpen, setIsInspectionOpen] = useState(false);

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

    return (
        <Box sx={{ width: '100%', pb: 5 }}>
            <PageHeader
                title="Chi tiết đối soát nhà cung cấp"
                breadcrumbItems={[
                    { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                    { label: 'Đối soát NCC', to: ROUTES.ADMIN.SUPPLIER_SETTLEMENT.LIST },
                    { label: settlement.supplierName || `#${settlement.id}` },
                ]}
            />

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
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                    spacing={2}
                    sx={{ pb: 2.5, borderBottom: '1px solid #f1f5f9' }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
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
                                <span
                                    className="admin-status-badge"
                                    style={{
                                        backgroundColor: 'var(--palette-error-lighter)',
                                        color: 'var(--palette-error-dark)',
                                    }}
                                >
                                    Quá hạn trả vé
                                </span>
                            )}
                            <span className={`admin-status-badge ${getSupplierSettlementStatusModifier(settlement.status)}`}>
                                {statusLabel}
                            </span>
                        </Stack>
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
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
                            flexShrink: 0,
                            alignSelf: { xs: 'stretch', md: 'center' },
                            ml: { md: 'auto' },
                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                            '&:hover': {
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                            },
                        }}
                    >
                        Tiến hành kiểm tra
                    </Button>
                </Stack>

                <SettlementOverviewSummary settlement={settlement} />
            </Card>

            <Box sx={{ width: '100%' }}>
                <SettlementConsolidatedDetails
                    inventoryRows={overview.inventoryByStation || []}
                    importBatches={overview.importBatches || []}
                    returnBatches={overview.returnBatches || []}
                />
            </Box>

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
