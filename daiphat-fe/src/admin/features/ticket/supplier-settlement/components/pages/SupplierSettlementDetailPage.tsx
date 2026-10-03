"use client";

import { useMemo, useState } from 'react';
import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import {
    Alert,
    Box,
    Button as MuiButton,
    Card,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from '@mui/material';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { SpinnerLoading } from '../../../../../components/ui/SpinnerLoading';
import { AdminStatusBadge } from '../../../../../components/ui/AdminStatusBadge';
import { Button } from '../../../../../components/ui/Button';
import { ROUTES } from '../../../../../constants/routes';
import {
    useDownloadSettlementReconciliationReport,
    useSupplierSettlementOverview,
} from '../../hooks/useSupplierSettlement';
import {
    getSupplierSettlementStatusLabel,
    getSupplierSettlementStatusModifier,
    isReturnBatchHandedOver,
} from '../../utils/settlementLabels';
import { getReturnBatchStatusLabel } from '../../../return-batch/utils/returnBatchLabels';
import { ExpiredReturnSettlementBanner } from '../sections/ExpiredReturnSettlementBanner';
import { PendingReturnBatchBanner, resolveReturnBatchPath } from '../sections/PendingReturnBatchBanner';
import { ReconciliationWindowNoticeBanner } from '../sections/ReconciliationWindowNoticeBanner';
import { SettlementConsolidatedDetails } from '../sections/SettlementConsolidatedDetails';

import { AdminKpiCard, AdminKpiCardsGrid } from '@/admin/components/ui/AdminKpiCard';

const cardSx = {
    p: 3,
    borderRadius: 'var(--shape-borderRadius-lg)',
    boxShadow: 'var(--customShadows-card)',
} as const;

export const SupplierSettlementDetailPage = () => {
    const router = useAdminRouter();
    const { id } = useRouteParams();
    const { data: overview, isLoading, isFetching, isError, refetch } = useSupplierSettlementOverview(id);
    const downloadReport = useDownloadSettlementReconciliationReport(id);

    const [pendingReturnConfirmOpen, setPendingReturnConfirmOpen] = useState(false);

    const settlement = overview?.settlement;
    const isExpired = Boolean(settlement?.isReturnExpired);
    const canStartReconciliation =
        settlement?.status !== 'COMPLETED' &&
        settlement?.reconciliationPhase !== 'COMPLETED' &&
        Boolean(settlement?.inReconciliationWindow);

    const pendingReturnBatches = useMemo(
        () =>
            (overview?.returnBatches || []).filter(
                (batch) =>
                    Boolean(batch?.status) &&
                    batch.status !== 'CANCELLED' &&
                    !isReturnBatchHandedOver(batch.status)
            ),
        [overview?.returnBatches]
    );
    // After the cutoff the return is read-only and handover cannot be completed.
    // The expired-return notice already explains how its amount is settled.
    const hasPendingReturnBatches = !isExpired && pendingReturnBatches.length > 0;
    const returnBatches = overview?.returnBatches || [];
    const isSettlementFinalized = settlement?.status === 'WAITING_FOR_PAYMENT' || settlement?.status === 'COMPLETED';
    // Import/return-line metadata is only considered complete after the return ticket
    // has been processed. Keep the detail card visible, but surface a lock state so
    // operators do not mistake an empty/incomplete response for missing data.
    const relatedDetailsLocked =
        !returnBatches.length || hasPendingReturnBatches || isExpired;

    const goToInspect = () => {
        router.push(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.INSPECT(id || ''));
    };

    const goToReadOnlyInspect = () => {
        if (!isSettlementFinalized) {
            return;
        }
        router.push(`${ROUTES.ADMIN.SUPPLIER_SETTLEMENT.INSPECT(id || '')}?review=1`);
    };

    const handleStartReconciliation = () => {
        if (!settlement) {
            return;
        }
        if (!canStartReconciliation) {
            const startLabel = settlement.reconciliationWindowStartAt
                ? dayjs(settlement.reconciliationWindowStartAt).format('HH:mm DD/MM/YYYY')
                : 'khung giờ mở đối soát';
            toast.warning(`Chưa đến thời gian mở đối soát (dự kiến mở lúc ${startLabel}).`);
            return;
        }
        if (hasPendingReturnBatches) {
            setPendingReturnConfirmOpen(true);
            return;
        }
        goToInspect();
    };

    const expiredCount = isExpired ? 1 : 0;
    const totalExpiredSum = isExpired ? (settlement.expiredReturnValue || settlement.totalReturnValue || 0) : 0;
    const expiredItems = isExpired ? [settlement] : [];

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
    const periodLabel = periodFrom === periodTo || !periodTo || periodTo === '—' ? periodFrom : `${periodFrom} — ${periodTo}`;
    const primaryPendingBatch = pendingReturnBatches[0];

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
                        Kỳ đối soát {periodLabel}
                        {settlement.transactionId ? ` · Mã sổ cái #${settlement.transactionId}` : ''}
                    </Typography>
                }
                breadcrumbItems={breadcrumbItems}
                action={
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                        <Button
                            variant="outlined"
                            startIcon={<RefreshOutlinedIcon />}
                            loading={isFetching}
                            onClick={async () => {
                                const result = await refetch();
                                if (result.isError) {
                                    toast.error('Không thể tải lại dữ liệu đối soát.');
                                    return;
                                }
                                toast.success('Đã cập nhật dữ liệu mới nhất.');
                            }}
                        >
                            Tải lại dữ liệu
                        </Button>
                        {isSettlementFinalized ? (
                            <>
                                <Button
                                    variant="outlined"
                                    startIcon={<PictureAsPdfOutlinedIcon />}
                                    loading={downloadReport.isPending}
                                    onClick={() =>
                                        downloadReport.mutate(
                                            `bao-cao-doi-soat-${settlement.supplierSettlementCode || settlement.id}.pdf`,
                                            {
                                                onError: (err: any) =>
                                                    toast.error(err?.response?.data?.message || err?.message || 'Xuất tệp PDF thất bại.'),
                                            }
                                        )
                                    }
                                >
                                    Xuất tệp PDF
                                </Button>
                                <Button
                                    variant="contained"
                                    className="btn-primary-admin"
                                    startIcon={<VisibilityOutlinedIcon />}
                                    onClick={goToReadOnlyInspect}
                                >
                                    Xem lại tiến hành đối soát
                                </Button>
                            </>
                        ) : settlement?.reconciliationPhase !== 'COMPLETED' ? (
                            <Button
                                variant="contained"
                                className="btn-primary-admin"
                                disabled={!canStartReconciliation}
                                onClick={handleStartReconciliation}
                            >
                                Tiến hành kiểm tra
                            </Button>
                        ) : null}
                    </Stack>
                }
            />

            {settlement?.status !== 'COMPLETED' &&
                settlement?.reconciliationPhase !== 'COMPLETED' &&
                settlement?.inReconciliationWindow === false && (
                    <ReconciliationWindowNoticeBanner
                        reconciliationWindowStartAt={settlement.reconciliationWindowStartAt}
                        settlementBufferMinutes={settlement.settlementBufferMinutes}
                        variant="detail"
                    />
                )}

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

            {hasPendingReturnBatches && (
                <PendingReturnBatchBanner pendingBatches={pendingReturnBatches} />
            )}

            <Card elevation={0} sx={cardSx}>
                <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, mb: 2 }}>
                    Tổng quan giá trị
                </Typography>
                <AdminKpiCardsGrid columns={{ xs: 1, sm: 2, md: 3, lg: 3 }}>
                    <AdminKpiCard
                        label="Ngày quay"
                        value={settlement.periodFrom ? dayjs(settlement.periodFrom).format('DD/MM/YYYY') : '—'}
                        icon={<CalendarTodayOutlinedIcon />}
                        tone="cyan"
                    />
                    <AdminKpiCard
                        label="Vé nhập hệ thống"
                        value={`${Number(overview.kpis?.totalImportedTickets || settlement.systemImportQuantity || 0).toLocaleString('vi-VN')} vé`}
                        icon={<ConfirmationNumberOutlinedIcon />}
                        tone="blue"
                    />
                    <AdminKpiCard
                        label="Vé trả đã ghi nhận"
                        value={`${Number(overview.kpis?.totalPreparedForReturnTickets || settlement.systemReturnQuantity || 0).toLocaleString('vi-VN')} vé`}
                        icon={<AssignmentReturnOutlinedIcon />}
                        tone="amber"
                    />
                </AdminKpiCardsGrid>
            </Card>

            <SettlementConsolidatedDetails
                inventoryRows={overview.inventoryByStation || []}
                importBatches={overview.importBatches || []}
                returnBatches={overview.returnBatches || []}
                returnDetailsLocked={relatedDetailsLocked}
                returnLockMessage={
                    isExpired
                        ? 'Phiếu trả đã quá hạn hoặc đã bị hủy. Thông tin vẫn được hiển thị để đối chiếu nhưng không còn khả dụng để thao tác.'
                        : hasPendingReturnBatches
                            ? 'Phiếu trả chưa được kiểm tra hoặc bàn giao hoàn tất. Thông tin hiện tại vẫn được hiển thị và sẽ được cập nhật sau khi xử lý xong.'
                            : 'Chưa có phiếu trả được xử lý cho kỳ này. Dữ liệu phiếu nhập và số lượng hiện tại vẫn được giữ để đối chiếu.'
                }
            />

            <Dialog
                open={pendingReturnConfirmOpen}
                onClose={() => setPendingReturnConfirmOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: '14px' } }}
            >
                <DialogTitle sx={{ fontWeight: 800, pr: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssignmentReturnOutlinedIcon color="warning" />
                    Phiếu trả chưa hoàn tất
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 1.5, borderRadius: '10px' }}>
                        {pendingReturnBatches.length === 1
                            ? `Phiếu ${primaryPendingBatch?.batchCode || `#${primaryPendingBatch?.id}`} đang ở trạng thái ${getReturnBatchStatusLabel(primaryPendingBatch?.status as any, primaryPendingBatch?.statusLabel)}.`
                            : `Có ${pendingReturnBatches.length} phiếu trả trong kỳ chưa hoàn tất kiểm tra hoặc bàn giao NCC.`}
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                        Nên xử lý phiếu trả trước để số liệu đối soát chính xác hơn. Bạn có thể mở phiếu trả ngay, hoặc vẫn tiếp tục vào màn hình đối soát.
                    </Typography>
                    {pendingReturnBatches.length > 1 && (
                        <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                            {pendingReturnBatches.map((batch) => (
                                <Typography key={batch.id} variant="caption" sx={{ fontWeight: 600 }}>
                                    · {batch.batchCode || `#${batch.id}`} —{' '}
                                    {getReturnBatchStatusLabel(batch.status as any, batch.statusLabel)}
                                </Typography>
                            ))}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexWrap: 'wrap' }}>
                    <MuiButton
                        variant="text"
                        color="inherit"
                        onClick={() => setPendingReturnConfirmOpen(false)}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Đóng
                    </MuiButton>
                    <MuiButton
                        variant="outlined"
                        color="warning"
                        onClick={() => {
                            setPendingReturnConfirmOpen(false);
                            if (primaryPendingBatch) {
                                router.push(resolveReturnBatchPath(primaryPendingBatch));
                            }
                        }}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                        Xem phiếu trả
                    </MuiButton>
                    <MuiButton
                        variant="contained"
                        onClick={() => {
                            setPendingReturnConfirmOpen(false);
                            goToInspect();
                        }}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                        Tiếp tục đối soát
                    </MuiButton>
                </DialogActions>
            </Dialog>
        </div>
    );
};
