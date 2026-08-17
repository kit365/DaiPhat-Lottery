"use client";

import { useMemo } from 'react';
import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import { Box, Card, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { SpinnerLoading } from '../../../../../components/ui/SpinnerLoading';
import { AdminStatusBadge } from '../../../../../components/ui/AdminStatusBadge';
import { Button } from '../../../../../components/ui/Button';
import { ROUTES } from '../../../../../constants/routes';
import { useSupplierSettlementList, useSupplierSettlementOverview } from '../../hooks/useSupplierSettlement';
import {
    getSupplierSettlementStatusLabel,
    getSupplierSettlementStatusModifier,
} from '../../utils/settlementLabels';
import { ExpiredReturnSettlementBanner } from '../sections/ExpiredReturnSettlementBanner';
import { SettlementConsolidatedDetails } from '../sections/SettlementConsolidatedDetails';
import { SettlementKpiCards } from '../sections/SettlementKpiCards';
import { SettlementOverviewSummary } from '../sections/SettlementOverviewSummary';

const cardSx = {
    p: 3,
    borderRadius: 'var(--shape-borderRadius-lg)',
    boxShadow: 'var(--customShadows-card)',
} as const;

export const SupplierSettlementDetailPage = () => {
    const router = useAdminRouter();
    const { id } = useRouteParams();
    const { data: overview, isLoading, isError } = useSupplierSettlementOverview(id);
    const { allSettlements } = useSupplierSettlementList();

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

    const breadcrumbItems = [
        { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
        { label: 'Đối soát NCC', to: ROUTES.ADMIN.SUPPLIER_SETTLEMENT.LIST },
        { label: settlement?.supplierName || `#${id}` },
    ];

    if (isLoading) {
        return (
            <div className="admin-list-page">
                <PageHeader title="Chi tiết đối soát nhà cung cấp" breadcrumbItems={breadcrumbItems} />
                <SpinnerLoading />
            </div>
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

    return (
        <div className="admin-list-page">
            <PageHeader
                disableBottomMargin
                title={settlement.supplierName || 'Chi tiết đối soát nhà cung cấp'}
                titleExtra={
                    <>
                        {settlement.supplierCode ? (
                            <Typography
                                variant="caption"
                                sx={{
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                    color: 'var(--palette-text-secondary)',
                                    bgcolor: 'var(--palette-background-neutral)',
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                }}
                            >
                                {settlement.supplierCode}
                            </Typography>
                        ) : null}
                        {settlement.isReturnExpired ? (
                            <AdminStatusBadge label="Quá hạn trả vé" modifier="admin-status-badge--inactive" />
                        ) : null}
                        <AdminStatusBadge
                            label={statusLabel}
                            modifier={getSupplierSettlementStatusModifier(settlement.status)}
                        />
                    </>
                }
                description={
                    <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)' }}>
                        Kỳ đối soát {periodFrom} — {periodTo}
                        {settlement.transactionId ? ` · Mã sổ cái #${settlement.transactionId}` : ''}
                    </Typography>
                }
                breadcrumbItems={breadcrumbItems}
                action={
                    <Button
                        variant="contained"
                        className="btn-primary-admin"
                        onClick={() => router.push(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.INSPECT(id || ''))}
                    >
                        Tiến hành kiểm tra
                    </Button>
                }
            />

            {(isExpired || expiredCount > 0) && (
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
            )}

            <Card elevation={0} sx={cardSx}>
                <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, mb: 1 }}>
                    Tổng quan giá trị
                </Typography>
                <SettlementOverviewSummary settlement={settlement} />
            </Card>

            <Box>
                <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, mb: 1.5 }}>
                    Thống kê vé &amp; trạng thái tồn kho
                </Typography>
                <SettlementKpiCards
                    kpis={overview.kpis}
                    hasHandedOver={overview.returnBatches?.some(
                        (rb) => rb.status === 'HANDED_OVER' || rb.status === 'COMPLETED'
                    )}
                    isExpired={overview.kpis.isReturnExpired}
                />
            </Box>

            <SettlementConsolidatedDetails
                inventoryRows={overview.inventoryByStation || []}
                importBatches={overview.importBatches || []}
                returnBatches={overview.returnBatches || []}
            />
        </div>
    );
};
