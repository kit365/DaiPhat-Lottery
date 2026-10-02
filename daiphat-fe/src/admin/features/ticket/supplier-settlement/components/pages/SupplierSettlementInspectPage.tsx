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
    Grid,
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
import { MatchingActualsForm } from '../sections/MatchingActualsForm';
import { SettlementPaymentEvidencePanel } from '../sections/SettlementPaymentEvidencePanel';
import { ReconciliationWindowNoticeBanner } from '../sections/ReconciliationWindowNoticeBanner';
import { SettlementDiscrepancyResolutionSection } from '../sections/SettlementDiscrepancyResolutionSection';
import { SettlementCompletionSection } from '../sections/SettlementCompletionSection';

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
    /** Local UI: explicitly advance to completion step only after user clicks button. */
    const [advancedToCompletion, setAdvancedToCompletion] = useState(false);
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
        : (phaseStepIndex(phase) === 2 || (localProcessingReady && advancedToCompletion)) && !reviewingDiscrepancy
            ? 2
        : phaseStepIndex(phase) >= 1 || reviewingDiscrepancy
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
                                    setAdvancedToCompletion(false);
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

                {showPostMatchingContent && !isCompletionStep && (
                    <SettlementDiscrepancyResolutionSection
                        settlement={settlement}
                        kpis={overview?.kpis}
                        importBatches={importBatches}
                        returnBatches={returnBatches}
                        stationPricing={stationPricing}
                        inventoryByStation={inventoryByStation}
                        adjustments={overview?.adjustments || []}
                        returnCutOffContext={returnCutOffContext}
                        needsImport={needsImport}
                        needsReturn={needsReturn}
                        needsUnitPrice={needsUnitPrice}
                        hasUnitPriceDiscrepancy={hasUnitPriceDiscrepancy}
                        importItem={importItem}
                        returnItem={returnItem}
                        unitPriceItem={unitPriceItem}
                        returnShortfall={returnShortfall}
                        returnExcess={returnExcess}
                        showReturnLockBanner={showReturnLockBanner}
                        returnLockDetails={returnLockDetails}
                        importTicketsQuery={importTicketsQuery}
                        missingReturnQuery={missingReturnQuery}
                        importDraft={importDraft}
                        returnDraft={returnDraft}
                        unitPriceDraft={unitPriceDraft}
                        onSetImportDraft={setImportDraft}
                        onSetReturnDraft={setReturnDraft}
                        onSetUnitPriceDraft={setUnitPriceDraft}
                        onImportDirtyChange={setIsImportDirty}
                        onBackToMatching={() => {
                            if (isImportDirty || hasLocalDraft) {
                                setConfirmBackDialogOpen(true);
                            } else {
                                setIsEditingMatching(true);
                            }
                        }}
                        onAdvanceToCompletion={() => {
                            setAdvancedToCompletion(true);
                            setReviewingDiscrepancy(false);
                        }}
                        remainingDiscrepancies={remainingDiscrepancies}
                        allDiscrepanciesProcessed={allDiscrepanciesProcessed}
                        remainingAmount={remainingAmount}
                    />
                )}

                {showPostMatchingContent && isCompletionStep && (
                    <SettlementCompletionSection
                        settlement={settlement}
                        kpis={overview?.kpis}
                        importBatches={importBatches}
                        returnBatches={returnBatches}
                        stationPricing={stationPricing}
                        inventoryByStation={inventoryByStation}
                        adjustments={overview?.adjustments || []}
                        hasDiscrepancyMilestone={hasDiscrepancyMilestone}
                        waitingForPayment={waitingForPayment}
                        paid={paid}
                        isReadOnlyReview={isReadOnlyReview}
                        draftResolution={{
                            import: Boolean(importDraft),
                            return: Boolean(returnDraft),
                            unitPrice: Boolean(unitPriceDraft),
                        }}
                        onBackToDiscrepancy={() => {
                            setAdvancedToCompletion(false);
                            setReviewingDiscrepancy(true);
                        }}
                        onBackToMatching={() => {
                            if (isImportDirty || hasLocalDraft) {
                                setConfirmBackDialogOpen(true);
                            } else {
                                setIsEditingMatching(true);
                                setAdvancedToCompletion(false);
                                setReviewingDiscrepancy(false);
                            }
                        }}
                        onFinalize={() => {
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
                        isFinalizing={finalizeProcessing.isPending}
                        onOpenPaymentDialog={() => {
                            setPaymentMethod('OFFLINE');
                            setCashPaidAmount(formatPaymentAmount(finalizedPaymentAmount));
                            setPaymentDialogOpen(true);
                        }}
                        onDownloadReport={() => {
                            downloadReport.mutate(
                                `bao-cao-doi-soat-${settlement.supplierSettlementCode || settlement.id}.pdf`,
                                {
                                    onError: (err: any) =>
                                        AppToast.error(err?.message || err?.response?.data?.message || 'Tải PDF thất bại.'),
                                }
                            );
                        }}
                        isDownloadingReport={downloadReport.isPending}
                        onZoomImage={setZoomImage}
                    />
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
                    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: '12px', bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
                        <Typography variant="caption" fontWeight={800} color="#64748b" sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', mb: 1 }}>
                            Thông tin quyết toán kỳ đối soát
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Typography variant="caption" color="#64748b" display="block">Nhà cung cấp:</Typography>
                                <Typography variant="body2" fontWeight={700} color="#0f172a">{settlement.supplierName}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Typography variant="caption" color="#64748b" display="block">Lịch quay thưởng:</Typography>
                                <Typography variant="body2" fontWeight={700} color="#0f172a">{formatDate(drawDate)}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Typography variant="caption" color="#64748b" display="block">Số tiền quyết toán:</Typography>
                                <Typography variant="body2" fontWeight={900} color="#166534">
                                    {formatPaymentAmount(finalizedPaymentAmount)} VNĐ
                                </Typography>
                            </Grid>
                        </Grid>
                    </Paper>

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
                            setAdvancedToCompletion(false);
                            setReviewingDiscrepancy(false);
                        }}
                    >
                        Quay lại và xóa dữ liệu
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
