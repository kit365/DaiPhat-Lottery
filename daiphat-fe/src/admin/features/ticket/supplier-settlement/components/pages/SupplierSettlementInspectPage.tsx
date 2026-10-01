"use client";

import { useEffect, useMemo, useState } from 'react';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
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
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useSearchParams } from 'next/navigation';
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
    useFinalizeSettlementProcessing,
    useImportResolvableTickets,
    useMissingReturnTickets,
    useSupplierSettlementOverview,
    useUpdateSettlementPaymentEvidence,
} from '../../hooks/useSupplierSettlement';
import type {
    ResolveImportDiscrepancyPayload,
    ResolveReturnDiscrepancyPayload,
    ResolveUnitPriceDiscrepancyPayload,
    SettlementPaymentMethod,
    SupplierSettlementReconciliationPhase,
} from '../../types/supplierSettlement.type';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';
import {
    getDetectedDiscrepancyItems,
    getReconciliationPhaseLabel,
    getReconciliationPhaseBadgeModifier,
    getReturnMatchingLockDetails,
    isReturnBatchOverdue,
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

const formatPaymentAmount = (value?: number | null) =>
    Math.abs(Number(value || 0)).toLocaleString('vi-VN');

const parsePaymentAmount = (value: string) => {
    const normalized = value.replace(/[^0-9]/g, '');
    return normalized ? Number(normalized) : null;
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
    const searchParams = useSearchParams();
    const requestedReview = searchParams.get('review') === '1';
    const { data: overview, isLoading, isError, refetch } = useSupplierSettlementOverview(id);

    const settlement = overview?.settlement;
    const importBatches = overview?.importBatches || [];
    const returnBatches = overview?.returnBatches || [];
    const returnCutOffContext = useMemo(() => {
        const batch = returnBatches.find((item) => item.status && item.status !== 'CANCELLED') || returnBatches[0];
        return {
            drawDate: batch?.drawDate || settlement?.periodFrom,
            returnCutOffTime: batch?.returnCutOffTime || settlement?.supplierReturnCutOffTime,
            returnCutOffAt: batch?.returnCutOffAt,
            inspectionExpired: batch?.inspectionExpired,
        };
    }, [returnBatches, settlement?.periodFrom, settlement?.supplierReturnCutOffTime]);
    const drawDate = importBatches.find((batch) => batch.drawDate)?.drawDate || settlement?.periodFrom;
    const inventoryByStation = overview?.inventoryByStation || [];
    const stationPricing = overview?.stationPricing || [];
    const afterCommissionUnitPrice = weightedStationNetUnitPrice(stationPricing);
    const [clockTick, setClockTick] = useState(0);
    useEffect(() => {
        const timer = window.setInterval(() => setClockTick((value) => value + 1), 30_000);
        return () => window.clearInterval(timer);
    }, []);

    const returnLockDetails = useMemo(
        () =>
            getReturnMatchingLockDetails(returnBatches, {
                isReturnExpired: settlement?.isReturnExpired,
                periodTo: settlement?.periodTo,
                periodFrom: settlement?.periodFrom,
            }),
        [returnBatches, settlement?.isReturnExpired, settlement?.periodTo, settlement?.periodFrom, clockTick]
    );

    const phase = settlement?.reconciliationPhase || 'MATCHING';
    const detectedItems = getDetectedDiscrepancyItems(settlement, { afterCommissionUnitPrice });
    const importItem = detectedItems.find((item) => item.type === 'IMPORT_QUANTITY');
    const returnItem = detectedItems.find((item) => item.type === 'RETURN_QUANTITY');
    const unitPriceItem = detectedItems.find((item) => item.type === 'IMPORT_UNIT_PRICE');
    const hasUnitPriceDiscrepancy =
        Boolean(unitPriceItem)
        || Boolean(
            Array.isArray(settlement?.discrepancyTypes)
            && settlement.discrepancyTypes.includes('IMPORT_UNIT_PRICE')
        );
    const needsUnitPrice =
        !settlement?.unitPriceDiscrepancyResolved
        && hasUnitPriceDiscrepancy;
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
    const [importDraft, setImportDraft] = useState<ResolveImportDiscrepancyPayload | null>(null);
    const [returnDraft, setReturnDraft] = useState<ResolveReturnDiscrepancyPayload | null>(null);
    const [unitPriceDraft, setUnitPriceDraft] = useState<ResolveUnitPriceDiscrepancyPayload | null>(null);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<SettlementPaymentMethod>('OFFLINE');
    const [cashPaidAmount, setCashPaidAmount] = useState('');

    const confirmMatching = useConfirmSettlementMatching(id);
    const finalizeProcessing = useFinalizeSettlementProcessing(id);
    const complete = useCompleteSettlementReconciliation(id);
    const updatePaymentEvidence = useUpdateSettlementPaymentEvidence(id);
    const downloadReport = useDownloadSettlementReconciliationReport(id);

    const paymentWindowReached = settlement?.reconciliationWindowStartAt
        ? !dayjs().isBefore(dayjs(settlement.reconciliationWindowStartAt))
        : settlement?.inReconciliationWindow === true;
    const returnCutOffReached = isReturnBatchOverdue(
        returnCutOffContext,
        undefined,
        settlement?.periodFrom
    );
    const canLoadImportTickets = needsImport
        && (importItem?.direction !== 'NEGATIVE' || (paymentWindowReached && returnCutOffReached));
    const importTicketsQuery = useImportResolvableTickets(id, canLoadImportTickets);
    const missingReturnQuery = useMissingReturnTickets(id, needsReturn && returnShortfall);

    const hasLocalDraft = Boolean(importDraft || returnDraft || unitPriceDraft);
    const hasPendingUiSections =
        (needsImport && !importDraft)
        || (needsReturn && !returnDraft)
        || (needsUnitPrice && !unitPriceDraft);
    const localProcessingReady = hasPendingDiscrepancies && hasLocalDraft && !hasPendingUiSections;
    const remainingDiscrepancies = [
        needsImport && !importDraft
            ? 'Chênh lệch số lượng vé nhập'
            : null,
        needsReturn && !returnDraft
            ? 'Chênh lệch số lượng vé trả'
            : null,
        needsUnitPrice && !unitPriceDraft
            ? 'Chênh lệch giá nhập'
            : null,
    ].filter((item): item is string => Boolean(item));
    // The completion action is available only after every discrepancy that was
    // detected in the reconciliation has either been persisted as resolved or
    // confirmed in the current (still local) draft. Keep this separate from
    // `hasPendingDiscrepancies`: a settlement may have detected discrepancies
    // that were already resolved on a previous request.
    const allDiscrepanciesProcessed = remainingDiscrepancies.length === 0;

    useEffect(() => {
        if (settlement?.status === 'WAITING_FOR_PAYMENT' || settlement?.status === 'COMPLETED') {
            setImportDraft(null);
            setReturnDraft(null);
            setUnitPriceDraft(null);
            setIsImportDirty(false);
        }
    }, [settlement?.status]);

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

    const rawActiveStep = isEditingMatching
        ? 0
        : localProcessingReady && !reviewingDiscrepancy
            ? 2
        : reviewingDiscrepancy && phase !== 'MATCHING' && phase !== 'COMPLETED'
            ? 1
            : phaseStepIndex(phase);
    const hasDiscrepancyMilestone = detectedItems.length > 0 || hasPendingDiscrepancies;
    const activeStep = hasDiscrepancyMilestone ? rawActiveStep : Math.min(rawActiveStep, 1);
    const isCompletionStep = rawActiveStep === 2;
    const remainingAmount = settlement.remainingAmount ?? 0;
    const paymentEvidenceUrls = Array.isArray(settlement.paymentEvidenceUrls)
        ? settlement.paymentEvidenceUrls.filter(Boolean)
        : [];
    const paid = settlement.status === 'COMPLETED';
    const waitingForPayment = settlement.status === 'WAITING_FOR_PAYMENT';
    const isReadOnlyReview = requestedReview && (waitingForPayment || paid);
    const finalizedPaymentAmount = Math.abs(Number(
        settlement.finalSettlementValue
        ?? settlement.recalculatedTotalPaidAmount
        ?? settlement.actualPaidAmount
        ?? 0
    ));
    const cashPaymentAmount = parsePaymentAmount(cashPaidAmount);
    const canRematch = phase !== 'MATCHING' && phase !== 'COMPLETED' && !paid && !waitingForPayment;
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
                {isReadOnlyReview && (
                    <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
                        Đây là chế độ xem lại tiến hành đối soát. Kỳ đối soát đã chuyển sang{' '}
                        {waitingForPayment ? 'Chờ thanh toán' : 'Đã thanh toán'} nên toàn bộ thông tin chỉ được xem, không thể chỉnh sửa hoặc xử lý lại.
                    </Alert>
                )}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
                    <AdminStatusBadge
                        label={getReconciliationPhaseLabel(phase, settlement.reconciliationPhaseLabel)}
                        modifier={getReconciliationPhaseBadgeModifier(phase)}
                    />
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap"
                        sx={{ px: 1.5, py: 0.75, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #dbeafe' }}>
                        <Typography variant="body2" fontWeight={800} color="#0f172a">{settlement.supplierName}</Typography>
                        <Typography variant="body2" color="#94a3b8">·</Typography>
                        <Typography variant="body2" fontWeight={700} color="#334155">
                            {settlement.supplierSettlementCode || `#${settlement.id}`}
                        </Typography>
                        <Typography variant="body2" color="#94a3b8">·</Typography>
                        <Typography variant="body2" fontWeight={700} color="#1d4ed8">
                            Lịch quay: {formatDate(drawDate)}
                        </Typography>
                    </Stack>
                </Stack>

                <Stepper activeStep={activeStep} sx={{ mb: 3, '& .MuiStepLabel-label': { fontWeight: 700, fontSize: '0.85rem' } }}>
                    <Step><StepLabel>Đối chiếu số liệu</StepLabel></Step>
                    {hasDiscrepancyMilestone && <Step><StepLabel>Xử lý chênh lệch</StepLabel></Step>}
                    <Step><StepLabel>Hoàn tất xử lý</StepLabel></Step>
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
                                if (getReturnMatchingLockDetails(returnBatches, {
                                    isReturnExpired: settlement.isReturnExpired,
                                    periodTo: settlement.periodTo,
                                    periodFrom: settlement.periodFrom,
                                }).beforeStart) {
                                    AppToast.warning(returnLockDetails.summaryMessage || 'Chưa đến giờ bắt đầu xử lý phiếu trả vé.');
                                    return;
                                }
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
                        {isCompletionStep && paid && (
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
                            mode={isCompletionStep ? 'completion_min' : 'discrepancy_summary'}
                            draftResolution={{
                                import: Boolean(importDraft),
                                return: Boolean(returnDraft),
                                unitPrice: Boolean(unitPriceDraft),
                            }}
                            onEditMatching={() => {
                                if (isImportDirty || hasLocalDraft) {
                                    setConfirmBackDialogOpen(true);
                                } else {
                                    setIsEditingMatching(true);
                                }
                            }}
                        />

                        {!isCompletionStep && (
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

                {showPostMatchingContent && !waitingForPayment && !paid && (
                    hasPendingDiscrepancies
                    || hasUnitPriceDiscrepancy
                ) && (
                    <Paper
                        elevation={0}
                        sx={{
                            mb: 3,
                            borderRadius: '16px',
                            border: '1px solid #dbe4f0',
                            bgcolor: '#ffffff',
                            overflow: 'hidden',
                            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                        }}
                    >
                        <Stack
                            direction="row"
                            spacing={1.25}
                            alignItems="flex-start"
                            sx={{ px: { xs: 2, md: 2.5 }, py: 2, bgcolor: '#fffaf5', borderBottom: '1px solid #fed7aa' }}
                        >
                            <Box
                                sx={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: '10px',
                                    bgcolor: '#fff7ed',
                                    color: '#ea580c',
                                    display: 'grid',
                                    placeItems: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <RuleOutlinedIcon sx={{ fontSize: '1.35rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ lineHeight: 1.3 }}>
                                    Xử lý chênh lệch
                                </Typography>
                            </Box>
                        </Stack>

                        <Box sx={{ p: { xs: 2, md: 2.5 } }}>
                            {hasUnitPriceDiscrepancy && (
                                <Box sx={{ mb: 2 }}>
                                    <UnitPriceDiscrepancyPanel
                                        settlement={settlement}
                                        afterCommissionUnitPrice={afterCommissionUnitPrice}
                                        direction={unitPriceItem?.direction || 'NEGATIVE'}
                                        difference={Number(unitPriceItem?.difference ?? 0)}
                                        resolved={Boolean(settlement.unitPriceDiscrepancyResolved || unitPriceDraft)}
                                        draftOnly={Boolean(unitPriceDraft && !settlement.unitPriceDiscrepancyResolved)}
                                        submitting={false}
                                        onBackToEdit={() => {
                                            setUnitPriceDraft(null);
                                            setReviewingDiscrepancy(true);
                                        }}
                                        onResolve={(payload) => {
                                            setUnitPriceDraft(payload);
                                            setReviewingDiscrepancy(false);
                                            AppToast.success('Đã giữ tạm thông tin xử lý giá.');
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
                                        setImportDraft(null);
                                        setReviewingDiscrepancy(true);
                                    }}
                                    onResolve={(payload) => {
                                        setImportDraft(payload);
                                        setIsImportDirty(false);
                                        setReviewingDiscrepancy(false);
                                        AppToast.success('Đã giữ tạm thông tin xử lý vé nhập.');
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
                                    submitting={false}
                                    disabled={returnLockDetails.inputsLocked}
                                    collapsed={Boolean(returnDraft)}
                                    onBackToEdit={() => {
                                        setReturnDraft(null);
                                        setReviewingDiscrepancy(true);
                                    }}
                                    onResolve={(payload) => {
                                        if (returnLockDetails.inputsLocked) {
                                            AppToast.warning(returnLockDetails.summaryMessage || 'Phiếu trả chưa sẵn sàng.');
                                            return;
                                        }
                                        setReturnDraft(payload);
                                        setReviewingDiscrepancy(false);
                                        AppToast.success('Đã giữ tạm thông tin xử lý vé trả.');
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
                    </Paper>
                )}

                {showPostMatchingContent && !waitingForPayment && !paid && hasDiscrepancyMilestone && (
                    <Paper
                        variant="outlined"
                        sx={{ p: { xs: 2, md: 2.5 }, mb: 2.5, borderRadius: '16px', borderColor: '#bbf7d0', bgcolor: '#f0fdf4' }}
                    >
                        <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            spacing={2}
                            alignItems={{ xs: 'stretch', md: 'center' }}
                            justifyContent="space-between"
                        >
                            <Box sx={{ flex: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                    <CheckCircleOutlinedIcon sx={{ color: '#16a34a' }} />
                                    <Typography variant="subtitle1" fontWeight={800} color="#166534">
                                        Xử lý hoàn tất
                                    </Typography>
                                </Stack>
                                {remainingDiscrepancies.length > 0 ? (
                                    <Box>
                                        <Typography variant="body2" color="#b45309" sx={{ lineHeight: 1.55, mb: 0.75 }}>
                                            Vui lòng xử lý tất cả chênh lệch trước khi hoàn tất. Còn lại:
                                        </Typography>
                                        <Box component="ul" sx={{ m: 0, pl: 2.25, color: '#92400e' }}>
                                            {remainingDiscrepancies.map((item) => (
                                                <Box component="li" key={item}>
                                                    <Typography variant="body2" color="#92400e">{item}</Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="#15803d" sx={{ lineHeight: 1.55 }}>
                                        Tất cả chênh lệch đã được xác nhận. Bấm Xử lý hoàn tất để lưu và chuyển kỳ đối soát sang Chờ thanh toán.
                                    </Typography>
                                )}
                            </Box>
                            <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.25} flexShrink={0}>
                                {isCompletionStep && (
                                    <Button
                                        variant="outlined"
                                        startIcon={<ArrowBackOutlinedIcon />}
                                        disabled={finalizeProcessing.isPending}
                                        onClick={() => {
                                            if (remainingDiscrepancies.length > 0) {
                                                setReviewingDiscrepancy(true);
                                                return;
                                            }
                                            if (isImportDirty || hasLocalDraft) {
                                                setConfirmBackDialogOpen(true);
                                            } else {
                                                setIsEditingMatching(true);
                                            }
                                        }}
                                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
                                    >
                                        Quay lại
                                    </Button>
                                )}
                                <Button
                                    variant="contained"
                                    color="success"
                                    startIcon={finalizeProcessing.isPending ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlinedIcon />}
                                    disabled={!allDiscrepanciesProcessed || finalizeProcessing.isPending}
                                    onClick={() => {
                                        finalizeProcessing.mutate(
                                            {
                                                importResolution: importDraft || undefined,
                                                returnResolution: returnDraft || undefined,
                                                unitPriceResolution: unitPriceDraft || undefined,
                                            },
                                            {
                                                onSuccess: () => {
                                                    setReviewingDiscrepancy(false);
                                                    AppToast.success('Đã hoàn tất xử lý và chuyển sang chờ thanh toán.');
                                                },
                                                onError: (err: any) =>
                                                    AppToast.error(err?.response?.data?.message || 'Hoàn tất xử lý thất bại.'),
                                            }
                                        );
                                    }}
                                    sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '10px', whiteSpace: 'nowrap' }}
                                >
                                    {finalizeProcessing.isPending ? 'Đang lưu...' : 'Xử lý hoàn tất'}
                                </Button>
                            </Stack>
                        </Stack>
                    </Paper>
                )}

                {showPostMatchingContent && isCompletionStep && (waitingForPayment || paid) && (
                    <>
                        <Stack
                            direction="row"
                            spacing={1.5}
                            justifyContent="flex-end"
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ mb: 1 }}
                        >
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
                            {waitingForPayment && !isReadOnlyReview && (
                                <Button
                                    variant="contained"
                                    color="success"
                                    onClick={() => {
                                        setPaymentMethod('OFFLINE');
                                        setCashPaidAmount(formatPaymentAmount(finalizedPaymentAmount));
                                        setPaymentDialogOpen(true);
                                    }}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 800,
                                        borderRadius: '10px',
                                        bgcolor: '#16a34a',
                                        '&:hover': { bgcolor: '#15803d' },
                                    }}
                                >
                                    Tiến hành thanh toán
                                </Button>
                            )}
                        </Stack>
                    </>
                )}
            </Paper>

            <Dialog
                open={paymentDialogOpen}
                onClose={() => !complete.isPending && setPaymentDialogOpen(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Tiến hành thanh toán</DialogTitle>
                <DialogContent dividers sx={{ bgcolor: '#f8fafc' }}>
                    <SettlementReconciliationSummaryCard
                        settlement={settlement}
                        kpis={overview?.kpis}
                        adjustments={overview?.adjustments || []}
                        stationPricing={stationPricing}
                        inventoryByStation={inventoryByStation}
                        importBatches={importBatches}
                        returnBatches={returnBatches}
                        mode="completion_min"
                    />

                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: '14px', bgcolor: '#ffffff' }}>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                            Phương thức thanh toán
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                            Số tiền cần thanh toán: <strong>{formatPaymentAmount(finalizedPaymentAmount)} VNĐ</strong>
                        </Typography>
                        <ToggleButtonGroup
                            exclusive
                            value={paymentMethod}
                            onChange={(_, value: SettlementPaymentMethod | null) => {
                                if (value) setPaymentMethod(value);
                            }}
                            size="small"
                            sx={{ mb: 2, '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 700, px: 2 } }}
                        >
                            <ToggleButton value="OFFLINE">Tiền mặt</ToggleButton>
                            <ToggleButton value="ONLINE">Chuyển khoản</ToggleButton>
                        </ToggleButtonGroup>

                        {paymentMethod === 'OFFLINE' ? (
                            <TextField
                                fullWidth
                                label="Số tiền đã trả cho nhà cung cấp"
                                value={cashPaidAmount}
                                onChange={(event) => setCashPaidAmount(formatPaymentAmount(parsePaymentAmount(event.target.value)))}
                                inputProps={{ inputMode: 'numeric' }}
                                helperText={`Cần khớp số tiền phải trả: ${formatPaymentAmount(finalizedPaymentAmount)} VNĐ`}
                            />
                        ) : (
                            <Box sx={{ mt: 0.5 }}>
                                <SettlementPaymentEvidencePanel
                                    urls={paymentEvidenceUrls}
                                    saving={updatePaymentEvidence.isPending}
                                    onZoomImage={setZoomImage}
                                    onChange={async (nextUrls) => {
                                        await updatePaymentEvidence.mutateAsync(nextUrls);
                                    }}
                                />
                            </Box>
                        )}
                    </Paper>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button
                        disabled={complete.isPending}
                        onClick={() => setPaymentDialogOpen(false)}
                        sx={{ textTransform: 'none', fontWeight: 700, color: '#475569' }}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        disabled={
                            complete.isPending
                            || updatePaymentEvidence.isPending
                            || (paymentMethod === 'OFFLINE' && cashPaymentAmount !== finalizedPaymentAmount)
                            || (paymentMethod === 'ONLINE' && paymentEvidenceUrls.length === 0)
                        }
                        onClick={() => setPaymentConfirmOpen(true)}
                        sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '9px' }}
                    >
                        Xác nhận thanh toán
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={paymentConfirmOpen} onClose={() => !complete.isPending && setPaymentConfirmOpen(false)}>
                <DialogTitle sx={{ fontWeight: 800 }}>Xác nhận thanh toán</DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn có chắc chắn đã thanh toán {formatPaymentAmount(finalizedPaymentAmount)} VNĐ cho nhà cung cấp bằng{' '}
                        {paymentMethod === 'OFFLINE' ? 'tiền mặt' : 'chuyển khoản'} không?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        disabled={complete.isPending}
                        onClick={() => setPaymentConfirmOpen(false)}
                        sx={{ textTransform: 'none', fontWeight: 700, color: '#475569' }}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        disabled={complete.isPending}
                        onClick={() => {
                            complete.mutate(
                                {
                                    paymentMethod,
                                    paidAmount: paymentMethod === 'OFFLINE' ? cashPaymentAmount ?? undefined : undefined,
                                },
                                {
                                    onSuccess: (res) => {
                                        const result = res.data;
                                        if (result?.completed) {
                                            setPaymentConfirmOpen(false);
                                            setPaymentDialogOpen(false);
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
                                }
                            );
                        }}
                        sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '8px' }}
                    >
                        {complete.isPending ? 'Đang xác nhận...' : 'Đồng ý thanh toán'}
                    </Button>
                </DialogActions>
            </Dialog>


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
                            setImportDraft(null);
                            setReturnDraft(null);
                            setUnitPriceDraft(null);
                            setIsImportDirty(false);
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
