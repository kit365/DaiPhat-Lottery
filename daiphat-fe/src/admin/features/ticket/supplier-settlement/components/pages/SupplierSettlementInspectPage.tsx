"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    DialogActions,
    IconButton,
    Paper,
    Stack,
    Step,
    StepLabel,
    Stepper,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { useRouteParams } from '@/hooks/useRouteParams';
import { AppToast } from '../../../../../../utils/toast.util';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { ROUTES } from '../../../../../constants/routes';
import { clearMatchingActualsDraft } from '../../utils/clearMatchingActualsDraft';
import {
    useCompleteSettlementReconciliation,
    useConfirmSettlementMatching,
    useDownloadSettlementReconciliationReport,
    useImportResolvableTickets,
    useMissingReturnTickets,
    useRecalculateSettlementReconciliation,
    useResolveImportDiscrepancy,
    useResolveReturnDiscrepancy,
    useResolveUnitPriceDiscrepancy,
    useSupplierSettlementOverview,
    useUpdateSettlementPaymentEvidence,
} from '../../hooks/useSupplierSettlement';
import type { SupplierSettlementReconciliationPhase } from '../../types/supplierSettlement.type';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';
import {
    getDetectedDiscrepancyItems,
    getReconciliationPhaseLabel,
    getReconciliationPhaseBadgeModifier,
    getReturnMatchingLockDetails,
    weightedStationNetUnitPrice,
} from '../../utils/settlementLabels';
import { ImportDiscrepancyPanel } from '../sections/ImportDiscrepancyPanel';
import { UnitPriceDiscrepancyPanel } from '../sections/UnitPriceDiscrepancyPanel';
import { MatchingActualsForm } from '../sections/MatchingActualsForm';
import { MissingReturnTicketsPanel } from '../sections/MissingReturnTicketsPanel';
import { SettlementPaymentEvidencePanel } from '../sections/SettlementPaymentEvidencePanel';
import { SettlementReconciliationSummaryCard } from '../sections/SettlementReconciliationSummaryCard';
import { SettlementReconciliationTabs } from '../sections/SettlementReconciliationTabs';
import { ReconciliationWindowNoticeBanner } from '../sections/ReconciliationWindowNoticeBanner';

const formatDate = (dStr?: string) => {
    if (!dStr) return '';
    return dayjs(dStr).format('DD/MM/YYYY');
};

const phaseStepIndex = (phase?: SupplierSettlementReconciliationPhase | null) => {
    if (!phase || phase === 'MATCHING') return 0;
    if (
        phase === 'DISCREPANCY_DETECTED'
        || phase === 'RESOLVING_IMPORT_DISCREPANCY'
        || phase === 'RESOLVING_RETURN_DISCREPANCY'
    ) {
        return 1;
    }
    return 2;
};

export const SupplierSettlementInspectPage = () => {
    const router = useAdminRouter();
    const { id } = useRouteParams();
    const { data: overview, isLoading, isError, refetch } = useSupplierSettlementOverview(id);

    const settlement = overview?.settlement;
    const importBatches = overview?.importBatches || [];
    const returnBatches = overview?.returnBatches || [];
    const inventoryByStation = overview?.inventoryByStation || [];
    const stationPricing = overview?.stationPricing || [];
    const afterCommissionUnitPrice = weightedStationNetUnitPrice(stationPricing);

    const returnLockDetails = useMemo(
        () =>
            getReturnMatchingLockDetails(returnBatches, {
                isReturnExpired: settlement?.isReturnExpired,
                periodTo: settlement?.periodTo,
                periodFrom: settlement?.periodFrom,
            }),
        [returnBatches, settlement?.isReturnExpired, settlement?.periodTo, settlement?.periodFrom]
    );

    const phase = settlement?.reconciliationPhase || 'MATCHING';
    const detectedItems = getDetectedDiscrepancyItems(settlement, { afterCommissionUnitPrice });
    const importItem = detectedItems.find((item) => item.type === 'IMPORT_QUANTITY');
    const returnItem = detectedItems.find((item) => item.type === 'RETURN_QUANTITY');
    const unitPriceItem = detectedItems.find((item) => item.type === 'IMPORT_UNIT_PRICE');
    const needsUnitPrice =
        !settlement?.unitPriceDiscrepancyResolved
        && (
            Boolean(unitPriceItem)
            || Boolean(
                Array.isArray(settlement?.discrepancyTypes)
                && settlement.discrepancyTypes.includes('IMPORT_UNIT_PRICE')
            )
        );
    const needsImport =
        Boolean(importItem) && !settlement?.importDiscrepancyResolved;
    const needsReturn =
        Boolean(returnItem) && !settlement?.returnDiscrepancyResolved;
    const hasPendingDiscrepancies = needsUnitPrice || needsImport || needsReturn;
    const returnShortfall = returnItem?.direction === 'NEGATIVE';
    const returnExcess = returnItem?.direction === 'POSITIVE';
    const showReturnLockBanner = needsReturn && returnShortfall && returnLockDetails.inputsLocked;

    const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);
    /** Local UI: revisit matching form without marking settlement completed. */
    const [isEditingMatching, setIsEditingMatching] = useState(false);
    /** Local UI: return from Hoàn tất to bước xử lý chênh lệch. */
    const [reviewingDiscrepancy, setReviewingDiscrepancy] = useState(false);
    const [isImportDirty, setIsImportDirty] = useState(false);
    const [confirmBackDialogOpen, setConfirmBackDialogOpen] = useState(false);

    const confirmMatching = useConfirmSettlementMatching(id);
    const resolveImport = useResolveImportDiscrepancy(id);
    const resolveReturn = useResolveReturnDiscrepancy(id);
    const resolveUnitPrice = useResolveUnitPriceDiscrepancy(id);
    const recalculate = useRecalculateSettlementReconciliation(id);
    const complete = useCompleteSettlementReconciliation(id);
    const updatePaymentEvidence = useUpdateSettlementPaymentEvidence(id);
    const downloadReport = useDownloadSettlementReconciliationReport(id);
    const autoRecalcAttemptedRef = useRef(false);

    const importTicketsQuery = useImportResolvableTickets(id, needsImport);
    const missingReturnQuery = useMissingReturnTickets(id, needsReturn && returnShortfall);

    useEffect(() => {
        if (phase !== 'READY_FOR_RECALCULATION' || reviewingDiscrepancy || isEditingMatching) {
            if (phase !== 'READY_FOR_RECALCULATION') {
                autoRecalcAttemptedRef.current = false;
            }
            return;
        }
        if (autoRecalcAttemptedRef.current || recalculate.isPending) {
            return;
        }
        autoRecalcAttemptedRef.current = true;
        recalculate.mutate(undefined, {
            onSuccess: () => {
                setReviewingDiscrepancy(false);
            },
            onError: (err: any) => {
                AppToast.error(err?.response?.data?.message || 'Tính lại thất bại.');
            },
        });
    }, [phase, reviewingDiscrepancy, isEditingMatching, recalculate.isPending, recalculate.mutate]);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={360}>
                <CircularProgress />
            </Box>
        );
    }

    if (isError || !settlement) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={360}>
                <Typography color="text.secondary">Không tìm thấy thông tin đối soát.</Typography>
            </Box>
        );
    }

    const activeStep = isEditingMatching
        ? 0
        : reviewingDiscrepancy && phase !== 'MATCHING' && phase !== 'COMPLETED'
          ? 1
          : phaseStepIndex(phase);
    const remainingAmount = settlement.remainingAmount ?? 0;
    const paymentEvidenceUrls = Array.isArray(settlement.paymentEvidenceUrls)
        ? settlement.paymentEvidenceUrls.filter(Boolean)
        : [];
    const paid = settlement.status === 'COMPLETED';
    const canRematch = phase !== 'MATCHING' && phase !== 'COMPLETED' && !paid;
    const showMatchingForm = phase === 'MATCHING' || isEditingMatching;
    const showPostMatchingContent = phase !== 'MATCHING' && !isEditingMatching;
    const reconciliationLocked = settlement.inReconciliationWindow === false
        && !paid
        && phase !== 'COMPLETED';

    return (
        <Box sx={{ width: '100%', pb: 5 }}>
            <div className="mb-[calc(4*var(--spacing))] flex items-start justify-end gap-[calc(2*var(--spacing))]">
                <div className="mr-auto">
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <IconButton
                            onClick={() => router.push(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id || ''))}
                            size="small"
                            sx={{
                                bgcolor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                color: '#334155',
                                width: 36,
                                height: 36,
                            }}
                            title="Quay lại chi tiết đối soát"
                        >
                            <ArrowBackOutlinedIcon fontSize="small" />
                        </IconButton>
                        <Title title="Kiểm tra & Đối soát thông tin Nhập - Trả vé số" />
                    </Stack>
                    <Breadcrumb
                        items={[
                            { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                            { label: 'Đối soát NCC', to: ROUTES.ADMIN.SUPPLIER_SETTLEMENT.LIST },
                            { label: 'Chi tiết', to: ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id || '') },
                            { label: 'Kiểm tra đối soát' },
                        ]}
                    />
                </div>
            </div>

            {reconciliationLocked && (
                <ReconciliationWindowNoticeBanner
                    reconciliationWindowStartAt={settlement.reconciliationWindowStartAt}
                    settlementBufferMinutes={settlement.settlementBufferMinutes}
                    variant="inspect"
                />
            )}

            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                }}
            >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
                    <AdminStatusBadge
                        label={getReconciliationPhaseLabel(phase, settlement.reconciliationPhaseLabel)}
                        modifier={getReconciliationPhaseBadgeModifier(phase)}
                    />
                    <Typography variant="body2" color="text.secondary">
                        {settlement.supplierName} · {settlement.supplierSettlementCode || `#${settlement.id}`} ·{' '}
                        {formatDate(settlement.periodFrom)} — {formatDate(settlement.periodTo)}
                    </Typography>
                </Stack>

                <Stepper activeStep={activeStep} sx={{ mb: 3, '& .MuiStepLabel-label': { fontWeight: 700, fontSize: '0.85rem' } }}>
                    <Step><StepLabel>Đối chiếu số liệu</StepLabel></Step>
                    <Step><StepLabel>Xử lý chênh lệch</StepLabel></Step>
                    <Step><StepLabel>Hoàn tất</StepLabel></Step>
                </Stepper>


                {showMatchingForm && (
                    <Box sx={{ mb: 3, pointerEvents: reconciliationLocked ? 'none' : 'auto', opacity: reconciliationLocked ? 0.55 : 1 }}>
                        {isEditingMatching && phase !== 'MATCHING' && (
                            <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
                                Bạn đang chỉnh lại số liệu đã nhập. Sau khi xác nhận, hệ thống sẽ đối chiếu lại và làm mới kết quả chênh lệch.
                                Kỳ đối soát chưa được hoàn tất.
                            </Alert>
                        )}
                        <MatchingActualsForm
                            key={`matching-form-${settlement.id}-${settlement.matchingConfirmedAt ?? 'draft'}-${isEditingMatching ? 'edit' : 'new'}`}
                            settlement={settlement}
                            importBatches={importBatches}
                            returnBatches={returnBatches}
                            adjustments={overview?.adjustments || []}
                            stationPricing={stationPricing}
                            inventoryByStation={inventoryByStation}
                            isSubmitting={confirmMatching.isPending}
                            onCancelEdit={isEditingMatching && phase !== 'MATCHING' ? () => setIsEditingMatching(false) : undefined}
                            onReceiptUploaded={() => {
                                void refetch();
                            }}
                            onStationsUpdated={() => {
                                void refetch();
                            }}
                            onZoomImage={setZoomImage}
                            onConfirm={async (payload) => {
                                try {
                                    await confirmMatching.mutateAsync(payload);
                                    setIsEditingMatching(false);
                                    setReviewingDiscrepancy(false);
                                    AppToast.success('Đã xác nhận đối chiếu số liệu.');
                                } catch (err: any) {
                                    AppToast.error(
                                        err?.response?.data?.message || err?.message || 'Đối chiếu thất bại.'
                                    );
                                    throw err;
                                }
                            }}
                        />
                    </Box>
                )}

                {showPostMatchingContent && (
                    <Box sx={{ mb: 3 }}>
                        {activeStep === 2 && paid && (
                            <Alert severity="success" icon={<CheckCircleOutlinedIcon />} sx={{ mb: 2.5, borderRadius: '12px' }}>
                                Kỳ đối soát đã thanh toán. Số liệu dưới đây là bản chốt của kỳ.
                            </Alert>
                        )}
                        <SettlementReconciliationSummaryCard
                            settlement={settlement}
                            kpis={overview?.kpis}
                            adjustments={overview?.adjustments || []}
                            stationPricing={stationPricing}
                            inventoryByStation={inventoryByStation}
                            importBatches={importBatches}
                            returnBatches={returnBatches}
                            canRematch={canRematch}
                            mode={activeStep === 2 ? 'completion_min' : 'discrepancy_summary'}
                            onEditMatching={() => {
                                if (isImportDirty) {
                                    setConfirmBackDialogOpen(true);
                                } else {
                                    setIsEditingMatching(true);
                                }
                            }}
                        />

                        {activeStep !== 2 && (
                            <SettlementReconciliationTabs
                                inventoryByStation={inventoryByStation}
                                importBatches={importBatches}
                                returnBatches={returnBatches}
                                remainingPayableAmount={remainingAmount}
                                settlement={settlement}
                                hideAllStationsTab
                            />
                        )}
                    </Box>
                )}

                {showPostMatchingContent && hasPendingDiscrepancies && (
                    <Box sx={{ mb: 3 }}>
                        <Stack spacing={0.5} sx={{ mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                Xử lý chênh lệch
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Chỉ hiển thị các loại chênh lệch phát hiện từ bước Đối chiếu hệ thống / thực tế.
                                Xử lý từng loại độc lập; khi xác nhận xử lý xong loại cuối cùng, hệ thống tính lại số tiền và chuyển sang hoàn tất.
                            </Typography>
                        </Stack>

                        {needsUnitPrice && (
                            <Box sx={{ mb: 2 }}>
                                <UnitPriceDiscrepancyPanel
                                    settlement={settlement}
                                    afterCommissionUnitPrice={afterCommissionUnitPrice}
                                    direction={unitPriceItem?.direction || 'NEGATIVE'}
                                    difference={Number(unitPriceItem?.difference ?? 0)}
                                    submitting={resolveUnitPrice.isPending}
                                    onResolve={(payload) => {
                                        resolveUnitPrice.mutate(payload, {
                                            onSuccess: () => AppToast.success('Đã ghi nhận chênh lệch giá nhập.'),
                                            onError: (err: any) =>
                                                AppToast.error(err?.response?.data?.message || 'Xử lý giá thất bại.'),
                                        });
                                    }}
                                />
                            </Box>
                        )}

                        {needsImport && (
                            <Box sx={{ mb: 2 }}>
                                <ImportDiscrepancyPanel
                                    serials={importTicketsQuery.data || []}
                                    inventoryByStation={inventoryByStation}
                                    importBatches={importBatches}
                                    settlementReceiptUrl={settlement.supplierSettlementReceiptUrl}
                                    drawDate={settlement.periodFrom}
                                    direction={importItem?.direction || 'NEGATIVE'}
                                    difference={Number(importItem?.difference ?? 0)}
                                    loading={importTicketsQuery.isLoading}
                                    submitting={resolveImport.isPending}
                                    onResolve={(payload) => {
                                        resolveImport.mutate(payload, {
                                            onSuccess: () => AppToast.success('Đã cập nhật xử lý chênh lệch nhập.'),
                                            onError: (err: any) =>
                                                AppToast.error(err?.response?.data?.message || 'Xử lý nhập thất bại.'),
                                        });
                                    }}
                                    onDirtyChange={setIsImportDirty}
                                />
                            </Box>
                        )}

                        {showReturnLockBanner && (
                            <Alert
                                severity={returnLockDetails.overdue || returnLockDetails.allCancelled ? 'error' : 'warning'}
                                icon={<WarningAmberOutlinedIcon />}
                                sx={{ mb: 2, borderRadius: '12px', fontWeight: 600 }}
                            >
                                {returnLockDetails.overdue || returnLockDetails.allCancelled ? (
                                    <>
                                        {returnLockDetails.summaryMessage} Không thể xử lý chênh lệch trả khi phiếu đã quá hạn / hủy.
                                    </>
                                ) : returnLockDetails.blockers.length <= 1 ? (
                                    <>
                                        {returnLockDetails.summaryMessage || returnLockDetails.blockers[0]?.message}
                                    </>
                                ) : (
                                    <Box component="div">
                                        <Typography variant="body2" fontWeight={700} sx={{ mb: 0.75 }}>
                                            {returnLockDetails.summaryMessage}
                                        </Typography>
                                        <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
                                            {returnLockDetails.blockers.map((blocker) => (
                                                <Box component="li" key={`${blocker.batchCode}-${blocker.status}`} sx={{ mb: 0.35 }}>
                                                    <Typography variant="body2">{blocker.message}</Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </Alert>
                        )}

                        {needsReturn && returnShortfall && (
                            <Box sx={{ mb: 2, opacity: returnLockDetails.inputsLocked ? 0.72 : 1 }}>
                                <MissingReturnTicketsPanel
                                    serials={missingReturnQuery.data || []}
                                    difference={Number(returnItem?.difference ?? 0)}
                                    loading={missingReturnQuery.isLoading}
                                    submitting={resolveReturn.isPending}
                                    disabled={returnLockDetails.inputsLocked}
                                    onResolve={(payload) => {
                                        if (returnLockDetails.inputsLocked) {
                                            AppToast.warning(returnLockDetails.summaryMessage || 'Phiếu trả chưa sẵn sàng.');
                                            return;
                                        }
                                        resolveReturn.mutate(payload, {
                                            onSuccess: () => AppToast.success('Đã cập nhật xử lý vé trả thiếu.'),
                                            onError: (err: any) =>
                                                AppToast.error(err?.response?.data?.message || 'Xử lý trả thất bại.'),
                                        });
                                    }}
                                />
                            </Box>
                        )}

                        {needsReturn && returnExcess && (
                            <Alert severity="warning" sx={{ mb: 2, borderRadius: '12px' }}>
                                Số lượng vé trả thực tế đang lớn hơn số lượng hệ thống. Hệ thống không xử lý thừa trả —
                                hãy chỉnh lại đối chiếu số liệu và nhập số lượng trả bằng hoặc ít hơn số lượng hệ thống.
                            </Alert>
                        )}

                        {needsReturn && !returnShortfall && !returnExcess && (
                            <Alert severity="warning" sx={{ borderRadius: '12px' }}>
                                Có chênh lệch số lượng trả nhưng chưa xác định thiếu hay thừa. Hãy chỉnh lại số liệu đối chiếu.
                            </Alert>
                        )}
                    </Box>
                )}

                {showPostMatchingContent && reviewingDiscrepancy && !hasPendingDiscrepancies && phase !== 'COMPLETED' && (
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            mb: 3,
                            borderRadius: '14px',
                            borderColor: '#bbf7d0',
                            bgcolor: '#f0fdf4',
                        }}
                    >
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                            justifyContent="space-between"
                        >
                            <Box>
                                <Typography variant="subtitle2" fontWeight={800} color="#166534">
                                    Đã xử lý hết chênh lệch
                                </Typography>
                                <Typography variant="body2" color="#15803d">
                                    Bấm Tiếp theo để hệ thống tính lại số tiền (nếu cần) và quay lại màn hoàn tất.
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                endIcon={<ArrowForwardOutlinedIcon />}
                                disabled={recalculate.isPending}
                                onClick={() =>
                                    recalculate.mutate(undefined, {
                                        onSuccess: () => {
                                            setReviewingDiscrepancy(false);
                                            AppToast.success('Đã tính lại số tiền đối soát.');
                                        },
                                        onError: (err: any) =>
                                            AppToast.error(err?.response?.data?.message || 'Tính lại thất bại.'),
                                    })
                                }
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 800,
                                    borderRadius: '10px',
                                    bgcolor: '#16a34a',
                                    '&:hover': { bgcolor: '#15803d' },
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {recalculate.isPending ? 'Đang tính lại...' : 'Tiếp theo'}
                            </Button>
                        </Stack>
                    </Paper>
                )}

                {showPostMatchingContent && activeStep === 2 && phase === 'READY_FOR_RECALCULATION' && (
                    <Alert
                        severity={recalculate.isPending ? 'info' : 'warning'}
                        icon={recalculate.isPending ? <CircularProgress size={18} /> : <WarningAmberOutlinedIcon />}
                        sx={{ mb: 2.5, borderRadius: '12px' }}
                        action={
                            recalculate.isPending ? undefined : (
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={() =>
                                        recalculate.mutate(undefined, {
                                            onSuccess: () => setReviewingDiscrepancy(false),
                                            onError: (err: any) =>
                                                AppToast.error(err?.response?.data?.message || 'Tính lại thất bại.'),
                                        })
                                    }
                                    sx={{ fontWeight: 800, textTransform: 'none' }}
                                >
                                    Thử lại
                                </Button>
                            )
                        }
                    >
                        {recalculate.isPending
                            ? 'Đang tính lại số tiền đối soát để chuyển sang hoàn tất...'
                            : 'Chưa tính lại được số tiền đối soát. Bấm Thử lại để tiếp tục.'}
                    </Alert>
                )}

                {showPostMatchingContent && activeStep === 2 && (
                    <>
                        <SettlementPaymentEvidencePanel
                            urls={paymentEvidenceUrls}
                            readOnly={paid}
                            saving={updatePaymentEvidence.isPending}
                            onZoomImage={setZoomImage}
                            onChange={async (nextUrls) => {
                                await updatePaymentEvidence.mutateAsync(nextUrls);
                            }}
                        />
                        <Stack
                            direction="row"
                            spacing={1.5}
                            justifyContent="flex-end"
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ mb: 1 }}
                        >
                            {!paid && (
                                <Button
                                    variant="outlined"
                                    startIcon={<ArrowBackOutlinedIcon />}
                                    onClick={() => setReviewingDiscrepancy(true)}
                                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', color: '#475569', borderColor: '#cbd5e1' }}
                                >
                                    Quay lại xử lý chênh lệch
                                </Button>
                            )}
                            <Button
                                variant="outlined"
                                startIcon={downloadReport.isPending ? <CircularProgress size={16} /> : <PictureAsPdfOutlinedIcon />}
                                disabled={downloadReport.isPending}
                                onClick={() =>
                                    downloadReport.mutate(
                                        `bao-cao-doi-soat-${settlement.supplierSettlementCode || settlement.id}.pdf`,
                                        {
                                            onError: (err: any) =>
                                                AppToast.error(err?.message || err?.response?.data?.message || 'Tải PDF thất bại.'),
                                        }
                                    )
                                }
                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
                            >
                                {downloadReport.isPending ? 'Đang tạo PDF...' : 'Tải báo cáo PDF'}
                            </Button>
                            {!paid && (
                                <Button
                                    variant="contained"
                                    color="success"
                                    disabled={
                                        paymentEvidenceUrls.length === 0
                                        || complete.isPending
                                        || phase === 'READY_FOR_RECALCULATION'
                                    }
                                    onClick={() => {
                                        complete.mutate(undefined, {
                                            onSuccess: (res) => {
                                                const result = res.data;
                                                if (result?.completed) {
                                                    AppToast.success(result.message || 'Đã xác nhận thanh toán.');
                                                    if (id != null) {
                                                        void clearMatchingActualsDraft(id);
                                                    }
                                                } else {
                                                    AppToast.error(result?.message || res.message || 'Chưa thể xác nhận thanh toán.');
                                                }
                                            },
                                            onError: (err: any) =>
                                                AppToast.error(err?.response?.data?.message || 'Xác nhận thanh toán thất bại.'),
                                        });
                                    }}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 800,
                                        borderRadius: '10px',
                                        bgcolor: '#16a34a',
                                        '&:hover': { bgcolor: '#15803d' },
                                    }}
                                >
                                    {complete.isPending ? 'Đang xác nhận...' : 'Xác nhận đã thanh toán'}
                                </Button>
                            )}
                        </Stack>
                    </>
                )}
            </Paper>


            <Dialog open={Boolean(zoomImage)} onClose={() => setZoomImage(null)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography fontWeight={800}>{zoomImage?.title || 'Xem ảnh biên lai'}</Typography>
                    <IconButton onClick={() => setZoomImage(null)}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent>
                    {zoomImage?.url && (
                        <Box component="img" src={zoomImage.url} alt="" sx={{ width: '100%', borderRadius: '12px' }} />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={confirmBackDialogOpen} onClose={() => setConfirmBackDialogOpen(false)}>
                <DialogTitle sx={{ fontWeight: 800 }}>Xác nhận quay lại</DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn đang có thông tin xử lý chênh lệch chưa được lưu. Nếu quay lại chỉnh số liệu đối chiếu, các dữ liệu vừa nhập này sẽ bị mất. Bạn có chắc chắn muốn quay lại?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmBackDialogOpen(false)} sx={{ fontWeight: 700, textTransform: 'none', color: '#475569' }}>
                        Hủy
                    </Button>
                    <Button 
                        variant="contained" 
                        color="error" 
                        sx={{ fontWeight: 800, textTransform: 'none', borderRadius: '8px' }}
                        onClick={() => {
                            setConfirmBackDialogOpen(false);
                            setIsEditingMatching(true);
                        }}
                    >
                        Quay lại và xóa dữ liệu
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
