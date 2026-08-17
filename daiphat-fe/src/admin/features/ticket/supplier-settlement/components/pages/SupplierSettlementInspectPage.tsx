"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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
import { Button as LoadingButton } from '../../../../../components/ui/Button';
import { Title } from '../../../../../components/ui/Title';
import { ROUTES } from '../../../../../constants/routes';
import { formatSettlementMoney, formatSignedCashflow, toAgencyCashflow } from '../../utils/settlementCashflow';
import { clearMatchingActualsDraft } from '../../utils/clearMatchingActualsDraft';
import {
    useCompleteSettlementReconciliation,
    useConfirmSettlementMatching,
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
import { ExcessReturnTicketsPanel } from '../sections/ExcessReturnTicketsPanel';
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

    const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    /** Local UI: revisit matching form without marking settlement completed. */
    const [isEditingMatching, setIsEditingMatching] = useState(false);
    /** Local UI: return from Hoàn tất to bước xử lý chênh lệch. */
    const [reviewingDiscrepancy, setReviewingDiscrepancy] = useState(false);

    const confirmMatching = useConfirmSettlementMatching(id);
    const resolveImport = useResolveImportDiscrepancy(id);
    const resolveReturn = useResolveReturnDiscrepancy(id);
    const resolveUnitPrice = useResolveUnitPriceDiscrepancy(id);
    const recalculate = useRecalculateSettlementReconciliation(id);
    const complete = useCompleteSettlementReconciliation(id);
    const updatePaymentEvidence = useUpdateSettlementPaymentEvidence(id);
    const autoRecalcAttemptedRef = useRef(false);

    const importTicketsQuery = useImportResolvableTickets(id, needsImport || (needsReturn && returnExcess));
    const missingReturnQuery = useMissingReturnTickets(id, needsReturn && returnShortfall);

    const remainingDiff = useMemo(() => {
        if (settlement?.actualPaidAmount == null || settlement?.finalSettlementValue == null) {
            return null;
        }
        return Math.abs(Number(settlement.actualPaidAmount) - Number(settlement.finalSettlementValue));
    }, [settlement?.actualPaidAmount, settlement?.finalSettlementValue]);

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
    const canRematch = phase !== 'MATCHING' && phase !== 'COMPLETED' && settlement.status !== 'CLOSED';
    const showMatchingForm = phase === 'MATCHING' || isEditingMatching;
    const showPostMatchingContent = phase !== 'MATCHING' && !isEditingMatching;
    const reconciliationLocked = settlement.inReconciliationWindow === false
        && settlement.status !== 'CLOSED'
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
                        {activeStep === 2 && phase === 'COMPLETED' && (
                            <Alert severity="success" icon={<CheckCircleOutlinedIcon />} sx={{ mb: 2.5, borderRadius: '12px' }}>
                                Kỳ đối soát đã hoàn tất (CLOSED). Số liệu dưới đây là bản chốt của kỳ.
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
                            onEditMatching={() => setIsEditingMatching(true)}
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
                                />
                            </Box>
                        )}

                        {needsReturn && returnLockDetails.inputsLocked && (
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
                            <Box sx={{ mb: 2, opacity: returnLockDetails.inputsLocked ? 0.72 : 1 }}>
                                <ExcessReturnTicketsPanel
                                    serials={importTicketsQuery.data || []}
                                    difference={Number(returnItem?.difference ?? 0)}
                                    loading={importTicketsQuery.isLoading}
                                    submitting={resolveReturn.isPending}
                                    disabled={returnLockDetails.inputsLocked}
                                    onResolve={(payload) => {
                                        if (returnLockDetails.inputsLocked) {
                                            AppToast.warning(returnLockDetails.summaryMessage || 'Phiếu trả chưa sẵn sàng.');
                                            return;
                                        }
                                        resolveReturn.mutate(payload, {
                                            onSuccess: () => AppToast.success('Đã ghi nhận vé bổ sung trả.'),
                                            onError: (err: any) =>
                                                AppToast.error(err?.response?.data?.message || 'Xử lý trả thừa thất bại.'),
                                        });
                                    }}
                                />
                            </Box>
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
                    <SettlementPaymentEvidencePanel
                        urls={paymentEvidenceUrls}
                        readOnly={phase === 'COMPLETED'}
                        saving={updatePaymentEvidence.isPending}
                        onZoomImage={setZoomImage}
                        onChange={async (nextUrls) => {
                            await updatePaymentEvidence.mutateAsync(nextUrls);
                        }}
                    />
                )}

                {showPostMatchingContent && activeStep === 2 && (
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px', mb: 3, borderColor: '#e2e8f0', bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <CalculateOutlinedIcon sx={{ color: '#2563eb', fontSize: '1.4rem' }} />
                            <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                {phase === 'COMPLETED' ? 'Xác nhận hoàn tất' : 'Xác nhận hoàn tất đối soát'}
                            </Typography>
                        </Stack>

                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: remainingDiff != null && phase !== 'READY_FOR_RECALCULATION' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' },
                            gap: 2,
                            mb: 2.5
                        }}>
                            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {Number(settlement.finalSettlementValue ?? 0) < 0 ? 'NCC hoàn / ghi có (sau đối soát)' : 'Chênh lệch sau đối soát'}
                                </Typography>
                                <Typography variant="h6" fontWeight={800} color="#0f172a">
                                    {Number(settlement.finalSettlementValue ?? 0) < 0 ? `+${formatSettlementMoney(Math.abs(Number(settlement.finalSettlementValue ?? 0)))}` : formatSettlementMoney(Number(settlement.finalSettlementValue ?? 0))} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>VNĐ</span>
                                </Typography>
                            </Box>
                            
                            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#eff6ff', border: '1px solid #dbeafe' }}>
                                <Typography variant="caption" color="#1d4ed8" fontWeight={600} display="block" sx={{ mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {Number(settlement.actualPaidAmount ?? 0) < 0 ? 'Số tiền NCC hoàn / ghi có thực tế' : 'Số tiền cần trả thực tế'}
                                </Typography>
                                <Typography variant="h6" fontWeight={800} color="#1e40af">
                                    {settlement.actualPaidAmount != null
                                        ? `${formatSettlementMoney(Math.abs(Number(settlement.actualPaidAmount)))}`
                                        : '—'}
                                    {settlement.actualPaidAmount != null && <span style={{ fontSize: '0.85rem', fontWeight: 600 }}> VNĐ</span>}
                                </Typography>
                            </Box>

                            {remainingDiff != null && phase !== 'READY_FOR_RECALCULATION' && (
                                <Box sx={{ p: 2, borderRadius: '12px', bgcolor: remainingDiff === 0 ? '#f0fdf4' : '#fef2f2', border: '1px solid', borderColor: remainingDiff === 0 ? '#bbf7d0' : '#fecaca' }}>
                                    <Typography variant="caption" color={remainingDiff === 0 ? '#166534' : '#991b1b'} fontWeight={600} display="block" sx={{ mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Chênh lệch còn lại
                                    </Typography>
                                    <Typography variant="h6" fontWeight={800} color={remainingDiff === 0 ? '#15803d' : '#dc2626'}>
                                        {formatSettlementMoney(remainingDiff)} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>VNĐ</span>
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        {phase === 'PAYMENT_DISCREPANCY' && (
                            <Alert severity="error" icon={<WarningAmberOutlinedIcon />} sx={{ mb: 2.5, borderRadius: '10px', fontWeight: 600 }}>
                                Số tiền cần trả thực tế không khớp Chênh lệch sau đối soát. Không thể hoàn tất đối soát
                                cho đến khi hai số này trùng khớp hoặc được rà soát theo quy trình chênh lệch thanh toán.
                            </Alert>
                        )}

                        {phase !== 'COMPLETED' && paymentEvidenceUrls.length === 0 && (
                            <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '10px' }}>
                                Cần tải ảnh đã thanh toán thành công cho nhà cung cấp trước khi xác nhận hoàn tất.
                            </Alert>
                        )}

                        <Stack direction="row" spacing={1.5} justifyContent="flex-end" flexWrap="wrap">
                            {phase !== 'COMPLETED' && (
                                <>
                                    <Button
                                        variant="outlined"
                                        startIcon={<ArrowBackOutlinedIcon />}
                                        onClick={() => setReviewingDiscrepancy(true)}
                                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', color: '#475569', borderColor: '#cbd5e1' }}
                                    >
                                        Quay lại xử lý chênh lệch
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        disabled={
                                            (phase !== 'RECALCULATED' && phase !== 'PAYMENT_DISCREPANCY')
                                            || remainingDiff == null
                                            || remainingDiff !== 0
                                            || paymentEvidenceUrls.length === 0
                                            || (
                                                (phase === 'PAYMENT_DISCREPANCY'
                                                    || (overview?.adjustments || []).some((a) => a.groupType === 'SETTLEMENT'))
                                                && !String(settlement.supplierSettlementReceiptUrl || '').trim()
                                            )
                                        }
                                        onClick={() => setConfirmOpen(true)}
                                        sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '10px', bgcolor: '#16a34a', boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)', '&:hover': { bgcolor: '#15803d' } }}
                                    >
                                        Xác nhận hoàn tất đối soát
                                    </Button>
                                </>
                            )}
                        </Stack>
                    </Paper>
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

            <Dialog
                open={confirmOpen}
                onClose={() => !complete.isPending && setConfirmOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: '16px' } }}
            >
                <DialogTitle sx={{ py: 2.5, px: 3, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.05rem' }}>
                            Xác nhận hoàn tất đối soát
                        </Typography>
                        <IconButton size="small" disabled={complete.isPending} onClick={() => setConfirmOpen(false)}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 2.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
                        Hệ thống so sánh Chênh lệch sau đối soát (tính tự động) với Số tiền cần trả thực tế. Chỉ khi hai số khớp và đã có ảnh thanh toán NCC mới hoàn tất đối soát.
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc' }}>
                        <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Mã đối soát</Typography>
                                <Typography variant="body2" fontWeight={700}>
                                    {settlement.supplierSettlementCode || `#${settlement.id}`}
                                </Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Tạm tính ban đầu</Typography>
                                <Typography variant="body2" fontWeight={700}>
                                    {formatSettlementMoney(Number(settlement.initialEstimatedSettlementValue ?? 0))} VNĐ
                                </Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">{Number(settlement.finalSettlementValue ?? 0) < 0 ? 'NCC hoàn / ghi có' : 'Chênh lệch sau đối soát'}</Typography>
                                <Typography variant="body2" fontWeight={700}>
                                    {Number(settlement.finalSettlementValue ?? 0) < 0 ? `+${formatSettlementMoney(Math.abs(Number(settlement.finalSettlementValue ?? 0)))}` : formatSettlementMoney(Number(settlement.finalSettlementValue ?? 0))} VNĐ
                                </Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Tác động dòng tiền đại lý</Typography>
                                <Typography variant="body2" fontWeight={700}>
                                    {settlement.settlementDifferenceAmount != null
                                        ? `${formatSignedCashflow(toAgencyCashflow(Number(settlement.settlementDifferenceAmount)), formatSettlementMoney)} VNĐ`
                                        : '—'}
                                </Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">{Number(settlement.actualPaidAmount ?? 0) < 0 ? 'Số tiền NCC hoàn / ghi có thực tế' : 'Số tiền cần trả thực tế'}</Typography>
                                <Typography variant="body2" fontWeight={700}>
                                    {formatSettlementMoney(Math.abs(Number(settlement.actualPaidAmount ?? 0)))} VNĐ
                                </Typography>
                            </Stack>
                        </Stack>
                    </Paper>
                    <Alert
                        severity="warning"
                        icon={<WarningAmberOutlinedIcon />}
                        sx={{ mt: 2, borderRadius: '10px', bgcolor: '#FEF3C7', color: '#78350F' }}
                    >
                        Hành động không thể hoàn tác.
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        disabled={complete.isPending}
                        onClick={() => setConfirmOpen(false)}
                    >
                        Hủy
                    </Button>
                    <LoadingButton
                        variant="contained"
                        loading={complete.isPending}
                        label="Xác nhận hoàn tất"
                        loadingLabel="Đang xử lý..."
                        onClick={() => {
                            complete.mutate(undefined, {
                                onSuccess: (res) => {
                                    const result = res?.data;
                                    if (result?.completed) {
                                        AppToast.success(result.message || 'Đã hoàn tất đối soát.');
                                        setConfirmOpen(false);
                                        if (id != null) {
                                            void clearMatchingActualsDraft(id);
                                        }
                                    } else {
                                        AppToast.error(result?.message || 'Còn chênh lệch thanh toán.');
                                        setConfirmOpen(false);
                                    }
                                },
                                onError: (err: any) =>
                                    AppToast.error(err?.response?.data?.message || 'Hoàn tất thất bại.'),
                            });
                        }}
                    />
                </DialogActions>
            </Dialog>
        </Box>
    );
};
