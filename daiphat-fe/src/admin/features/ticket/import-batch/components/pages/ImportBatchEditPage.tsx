"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import {
    Alert,
    Box,
    Chip,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    ThemeProvider,
    Tooltip,
    Typography,
    createTheme,
    useTheme,
    InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { SpinnerLoading } from '../../../../../components/ui/SpinnerLoading';
import { CollapsibleCard } from '../../../../../components/ui/CollapsibleCard';
import { Button } from '../../../../../components/ui/Button';
import { ImagePreview } from '../../../../../components/ui/ImagePreview';
import { AdminDatePicker } from '../../../../../components/ui/AdminDatePicker';
import { AdminStatusBadge } from '../../../../../components/ui/AdminStatusBadge';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import {
    useEligibleImportBatchStations,
    useImportBatchDetail,
    useImportBatchTimePolicy,
    usePauseImportBatchLine,
    useResumeImportBatchLine,
    useUpdateImportBatch,
} from '../../hooks/useImportBatch';
import { useImportBatchIntakeGate } from '../../hooks/useImportBatchIntakeGate';
import { attachTicketListImages, exportImportBatchFile } from '../../services/importBatchService';
import { ImportBatchLineImportHost } from '../../../inventory/components/sections/ImportBatchLineImportHost';
import { useImportBatchEditDraft } from '../../hooks/useImportBatchEditDraft';
import { useActiveSuppliers } from '../../../../supplier';
import { useStations } from '../../../../station/hooks/useStation';
import {
    updateImportBatchSchema,
    type UpdateImportBatchFormValues,
    type UpdateImportBatchLineFormValues,
} from '../../schemas/importBatch.schema';
import { ImportBatchEditConfirmDialog } from '../sections/ImportBatchEditConfirmDialog';
import { ImportBatchReduceDeclaredQuantityDialog } from '../sections/ImportBatchReduceDeclaredQuantityDialog';
import {
    ImportBatchLineDeclareQuantityReductionDialog,
    type LineDeclareQuantityReductionConfirmResult,
} from '../sections/ImportBatchLineDeclareQuantityReductionDialog';
import { ImportBatchDeclaredQuantityProgress } from '../sections/ImportBatchDeclaredQuantityProgress';
import { ImportBatchLineRow } from '../sections/ImportBatchLineRow';
import { ImportBatchTicketListImagesField } from '../sections/ImportBatchTicketListImagesField';
import { getImportBatchStatusBadgeClass, getImportBatchStatusLabel, getImportModeLabel } from '../../utils/batchTypeLabels';
import { formatImportBatchHeaderCode } from '../../utils/importBatchCode';
import {
    batchUsesSharedInvoice,
    canChangeImportBatchSupplier,
    canAdjustPausedImportBatchLineDeclareQuantity,
    canEditImportBatchLineCost,
    canEditImportBatchLineDeclareQuantity,
    canPauseImportBatchLine,
    canRemoveImportBatchLine,
    canResumeImportBatchLine,
    hasImportedImportBatchLines,
    importBatchRequiresInvoiceEvidence,
    IMPORT_BATCH_SUPPLIER_LOCKED_MESSAGE,
} from '../../utils/importBatchHeaderEdit';
import { resolveImportModeLock } from '../../utils/importBatchDrawDate';
import {
    declaredQuantitiesMatch,
    sumImportBatchLineDeclaredQuantity,
} from '../../utils/importBatchDeclaredQuantity';
import {
    canReduceDeclareQuantity,
    IMPORT_BATCH_DECLARE_QUANTITY_REDUCTION_IMPORTED_ONLY_MESSAGE,
    IMPORT_BATCH_DECLARE_QUANTITY_REDUCTION_WARNING,
    requiresDeclareQuantityReduction,
} from '../../utils/importBatchDeclareQuantityReduction';
import {
    getDraftLineIndicesForQuantityAdjustment,
    IMPORT_BATCH_DECLARE_QUANTITY_LINE_ADJUSTMENT_HELPER,
    IMPORT_BATCH_DECLARE_QUANTITY_LINE_ADJUSTMENT_WARNING,
    requiresLineQuantityAdjustment,
} from '../../utils/importBatchDeclareQuantityAdjustment';
import { formatViInteger, parseNonNegativeIntegerInput } from '../../../../supplier';
import { computeImportBatchTotals } from '../../utils/importBatchTotals';
import { formatVnd } from '../../utils/importCostCalculator';
import { computeImportBatchRowLimit, IMPORT_BATCH_ROW_LIMIT_MESSAGE } from '../../utils/importBatchRowLimit';
import {
    buildFormValuesFromBatch,
    discardStaleImportBatchBrowserDrafts,
    hasUnsavedImportBatchEditDraft,
    mergeImportBatchEditDraftWithServer,
    readLocalImportBatchEditDraft,
} from '../../utils/importBatchEditDraft';
import {
    clearTicketLineFormDraft,
    getPendingFilledSerialCount,
} from '../../../inventory/utils/ticketLineFormDraftStorage';
import {
    buildImportBatchEditBaseline,
    computeImportBatchEditChanges,
    type ImportBatchEditChangeSummary,
} from '../../utils/importBatchEditChanges';
import { findFirstIncompleteLine, hasTicketImportEligibleLines, isImportBatchEditable } from '../../utils/importBatchProgress';
import { hasInvoiceEvidence } from '../../utils/invoiceEvidence';
import type { ImportBatch, ImportBatchEligibleStation, UpdateImportBatchPayload } from '../../types/importBatch.type';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { confirmAction, confirmDelete } from '../../../../../utils/swal';

const emptyLine = (): UpdateImportBatchLineFormValues => ({
    lotteryStationId: 0,
    declareQuantity: 1,
    importCost: 0,
    resolvedBatchType: undefined,
    removed: false,
});

export const ImportBatchEditPage = () => {
    const { id } = useRouteParams();
    const router = useAdminRouter();
    const outerTheme = useTheme();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingValues, setPendingValues] = useState<UpdateImportBatchFormValues | null>(null);
    const [changeSummary, setChangeSummary] = useState<ImportBatchEditChangeSummary | null>(null);
    const [reductionDialogOpen, setReductionDialogOpen] = useState(false);
    const [pendingReductionTarget, setPendingReductionTarget] = useState<number | null>(null);
    const [pendingReductionExcess, setPendingReductionExcess] = useState(0);
    const [isReductionSubmitting, setIsReductionSubmitting] = useState(false);
    const [removedTicketIds, setRemovedTicketIds] = useState<number[]>([]);
    const [lineReductionDialogOpen, setLineReductionDialogOpen] = useState(false);
    const [isLineReductionSubmitting, setIsLineReductionSubmitting] = useState(false);
    const [pendingLineReduction, setPendingLineReduction] = useState<{
        index: number;
        lineId: number;
        stationName: string;
        oldDeclare: number;
        newDeclare: number;
        serverImported: number;
        draftSerialCount: number;
    } | null>(null);
    const [lineQuantityAdjustmentHighlightIndices, setLineQuantityAdjustmentHighlightIndices] =
        useState<Set<number>>(new Set());
    const [scrollToAdjustmentLineIndex, setScrollToAdjustmentLineIndex] = useState<number | null>(null);
    const previousTotalDeclareQuantityRef = useRef<number>(0);
    const previousLineDeclareRef = useRef<Record<number, number>>({});
    const baselineRef = useRef<UpdateImportBatchFormValues | null>(null);

    const { data: batch, isLoading: isBatchLoading, isError: isBatchError, refetch: refetchBatch } = useImportBatchDetail(id);
    const { data: timePolicy } = useImportBatchTimePolicy();
    const { mutateAsync: updateAsync, isPending } = useUpdateImportBatch(id);
    const { mutateAsync: pauseLineAsync, isPending: isPausePending } = usePauseImportBatchLine();
    const { mutateAsync: resumeLineAsync, isPending: isResumePending } = useResumeImportBatchLine();
    const { data: activeSuppliers = [], isLoading: isLoadingSuppliers } = useActiveSuppliers();
    const { evaluate: evaluateIntake } = useImportBatchIntakeGate();
    const { data: providersRes } = useStations({ limit: 1000 });
    const providers = useMemo(
        () => (providersRes as { data?: { recordList?: Array<{ id?: number; _id?: number; name?: string }> } })?.data?.recordList ?? [],
        [providersRes]
    );
    const formInitializedForBatchIdRef = useRef<string | null>(null);
    const [initializedBatchId, setInitializedBatchId] = useState<string | null>(null);
    const [highlightedRowIndices, setHighlightedRowIndices] = useState<Set<number>>(new Set());
    const [importLineId, setImportLineId] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        getValues,
        setError,
        clearErrors,
        formState: { errors, isSubmitted },
    } = useForm<UpdateImportBatchFormValues>({
        resolver: zodResolver(updateImportBatchSchema) as unknown as Resolver<UpdateImportBatchFormValues>,
        mode: 'onChange',
        reValidateMode: 'onChange',
        defaultValues: {
            supplierId: 0,
            drawDate: '',
            importMode: 'IN_DAY',
            totalDeclareQuantity: 0,
            invoiceEvidenceUrl: '',
            ticketListImageUrls: [],
            lines: [],
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
    const drawDate = useWatch({ control, name: 'drawDate' });
    const importMode = useWatch({ control, name: 'importMode' });
    const supplierId = useWatch({ control, name: 'supplierId' });
    const totalDeclareQuantity = useWatch({ control, name: 'totalDeclareQuantity' });
    const invoiceEvidenceUrl = useWatch({ control, name: 'invoiceEvidenceUrl' });
    const ticketListImageUrls = useWatch({ control, name: 'ticketListImageUrls' }) ?? [];
    const lines = useWatch({ control, name: 'lines' }) ?? [];

    const importModeForStations = useMemo(() => {
        const lock = resolveImportModeLock(drawDate);
        if (lock.locked) {
            return lock.mode;
        }
        return importMode ?? batch?.importMode ?? 'IN_DAY';
    }, [drawDate, importMode, batch?.importMode]);

    const { data: stationsResult, isLoading: isLoadingStations } = useEligibleImportBatchStations(
        drawDate,
        importModeForStations,
        batch?.id
    );
    const eligibleStations = stationsResult?.eligible ?? [];
    const blockedStations = stationsResult?.blocked ?? [];

    const importModeLock = useMemo(() => resolveImportModeLock(drawDate), [drawDate]);

    const resolvedImportMode = importModeLock.locked ? importModeLock.mode : importMode;
    const showSharedReceipt = batchUsesSharedInvoice(resolvedImportMode);
    const [isSaving, setIsSaving] = useState(false);
    const hasImportedLines = hasImportedImportBatchLines(batch);
    const canEditSupplier = canChangeImportBatchSupplier(batch);

    const activeLines = useMemo(() => lines.filter((line) => !line.removed), [lines]);
    const requiresInvoice = importBatchRequiresInvoiceEvidence(
        activeLines.map((line) => ({
            batchType: line.resolvedBatchType,
        })) as any[],
        resolvedImportMode
    );

    const eligibleStationIds = useMemo(
        () => new Set(eligibleStations.map((s) => s.lotteryStationId)),
        [eligibleStations]
    );

    const eligibleStationIdsKey = useMemo(
        () =>
            eligibleStations
                .map((s) => s.lotteryStationId)
                .sort((a, b) => a - b)
                .join(','),
        [eligibleStations]
    );

    const providerStationNameById = useMemo(() => {
        const map = new Map<number, string>();
        providers.forEach((provider) => {
            const stationId = Number(provider.id ?? provider._id);
            if (stationId > 0 && provider.name) {
                map.set(stationId, provider.name);
            }
        });
        return map;
    }, [providers]);

    const resolveStationName = useCallback(
        (stationId: number) =>
            providerStationNameById.get(stationId) ?? `Đài #${stationId}`,
        [providerStationNameById]
    );

    const resolveSupplierName = useCallback(
        (supplierIdValue: number) => {
            if (!supplierIdValue) {
                return '—';
            }
            const supplier = activeSuppliers.find((item) => item.id === supplierIdValue);
            return supplier?.name ?? batch?.supplierName ?? `NCC #${supplierIdValue}`;
        },
        [activeSuppliers, batch?.supplierName]
    );

    const displayEligibleStations = useMemo(() => {
        const stationMap = new Map<number, ImportBatchEligibleStation>(
            eligibleStations.map((station) => [station.lotteryStationId, station])
        );

        activeLines.forEach((line) => {
            const stationId = line.lotteryStationId;
            if (!stationId || stationId < 1 || stationMap.has(stationId)) {
                return;
            }

            stationMap.set(stationId, {
                lotteryStationId: stationId,
                name:
                    line.stationName ??
                    providerStationNameById.get(stationId) ??
                    `Đài #${stationId}`,
                resolvedBatchType: line.resolvedBatchType ?? 'NEW',
            });
        });

        return Array.from(stationMap.values());
    }, [activeLines, eligibleStations, providerStationNameById]);

    const formSnapshot = useMemo(
        () => ({
            supplierId,
            drawDate,
            importMode,
            totalDeclareQuantity,
            invoiceEvidenceUrl,
            ticketListImageUrls,
            lines,
        }),
        [supplierId, drawDate, importMode, totalDeclareQuantity, invoiceEvidenceUrl, ticketListImageUrls, lines]
    );

    const { clearDraft } = useImportBatchEditDraft({
        batchId: id,
        enabled: !!batch && isImportBatchEditable(batch) && initializedBatchId === id,
        getValues,
        formSnapshot,
    });

    const { isAtRowLimit, canAddRow } = useMemo(
        () => computeImportBatchRowLimit(eligibleStations, lines),
        [eligibleStations, lines]
    );

    const totals = computeImportBatchTotals(
        activeLines.map((line) => ({
            lotteryStationId: line.lotteryStationId ?? 0,
            declareQuantity: line.declareQuantity ?? 0,
            importCost: line.importCost ?? 0,
        }))
    );
    const linesDeclaredQuantity = sumImportBatchLineDeclaredQuantity(activeLines);
    const quantitiesMatch = declaredQuantitiesMatch(totalDeclareQuantity ?? 0, lines);

    useEffect(() => {
        setValue('totalDeclareQuantity', linesDeclaredQuantity, {
            shouldValidate: true,
            shouldDirty: true,
        });
    }, [linesDeclaredQuantity, setValue]);
    const lineQuantityAdjustmentActive = lineQuantityAdjustmentHighlightIndices.size > 0;

    useEffect(() => {
        if (!lineQuantityAdjustmentActive) {
            return;
        }

        if (quantitiesMatch) {
            setLineQuantityAdjustmentHighlightIndices(new Set());
            setScrollToAdjustmentLineIndex(null);
        }
    }, [lineQuantityAdjustmentActive, quantitiesMatch]);

    useEffect(() => {
        if (scrollToAdjustmentLineIndex == null) {
            return;
        }

        const timer = window.setTimeout(() => setScrollToAdjustmentLineIndex(null), 600);
        return () => window.clearTimeout(timer);
    }, [scrollToAdjustmentLineIndex]);

    const showStatusColumn = lines.some((line) => !line.removed && !!line.status);
    const showProgressColumn = lines.some(
        (line) => !line.removed && (line.totalQuantity ?? 0) > 0
    );

    const selectedStationIdsByRow = useMemo(
        () =>
            lines.map((_, rowIndex) =>
                lines
                    .map((line, index) =>
                        index !== rowIndex && !line.removed ? (line.lotteryStationId ?? 0) : 0
                    )
                    .filter((stationId) => stationId > 0)
            ),
        [lines]
    );

    const localTheme = useMemo(
        () =>
            createTheme(outerTheme, {
                components: {
                    MuiCard: {
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none !important',
                                backdropFilter: 'none !important',
                                backgroundColor: 'var(--palette-background-paper) !important',
                                boxShadow: 'var(--customShadows-card)',
                                borderRadius: 'var(--shape-borderRadius-lg)',
                                color: 'var(--palette-text-primary)',
                            },
                        },
                    },
                    MuiInputLabel: {
                        styleOverrides: {
                            root: { fontSize: '0.875rem' },
                        },
                    },
                    MuiOutlinedInput: {
                        styleOverrides: {
                            root: { fontSize: '1rem' },
                        },
                    },
                },
            }),
        [outerTheme]
    );

    useEffect(() => {
        setInitializedBatchId(null);
        formInitializedForBatchIdRef.current = null;
        baselineRef.current = null;
        setHighlightedRowIndices(new Set());
    }, [id]);

    useEffect(() => {
        if (!batch?.id) {
            return;
        }
        const supplier = activeSuppliers.find((item) => item.id === batch.supplierId);
        discardStaleImportBatchBrowserDrafts(batch, {
            returnCutOffTime: supplier?.returnCutOffTime,
            returnBufferMinutes: timePolicy?.returnBufferMinutes ?? 45,
        });
    }, [batch, activeSuppliers, timePolicy?.returnBufferMinutes]);

    useEffect(() => {
        if (!batch || !isImportBatchEditable(batch) || !id) {
            return;
        }
        if (formInitializedForBatchIdRef.current === id) {
            return;
        }

        const resolveStationForBaseline = (stationId: number) =>
            providerStationNameById.get(stationId) ?? `Đài #${stationId}`;

        baselineRef.current = buildImportBatchEditBaseline(batch, resolveStationForBaseline);

        const localDraft = readLocalImportBatchEditDraft(id);
        const values = localDraft
            ? mergeImportBatchEditDraftWithServer(
                  localDraft.values,
                  batch,
                  resolveStationForBaseline
              )
            : buildFormValuesFromBatch(batch, resolveStationForBaseline);

        const enrichedValues: UpdateImportBatchFormValues = {
            ...values,
            lines: values.lines.map((line) => ({
                ...line,
                stationName:
                    line.stationName ??
                    (line.lotteryStationId
                        ? providerStationNameById.get(line.lotteryStationId)
                        : undefined),
            })),
        };

        reset(enrichedValues, { keepDirty: false, keepTouched: false, keepErrors: false });
        previousTotalDeclareQuantityRef.current = enrichedValues.totalDeclareQuantity ?? 0;
        previousLineDeclareRef.current = Object.fromEntries(
            (enrichedValues.lines ?? [])
                .filter((line) => line.id != null)
                .map((line) => [line.id!, line.declareQuantity ?? 0])
        );
        formInitializedForBatchIdRef.current = id;
        setInitializedBatchId(id);

        if (localDraft) {
            toast.info('Đã khôi phục bản nháp chỉnh sửa chưa lưu.');
        }
    }, [batch, id, providerStationNameById, reset]);

    useEffect(() => {
        if (!id || initializedBatchId !== id) {
            return;
        }

        const currentLines = getValues('lines');
        const indicesToHighlight = currentLines
            .map((line, index) => (line.restoredFromCreate ? index : -1))
            .filter((index) => index >= 0);

        if (indicesToHighlight.length === 0) {
            return;
        }

        setHighlightedRowIndices(new Set(indicesToHighlight));

        indicesToHighlight.forEach((index) => {
            setValue(`lines.${index}.restoredFromCreate`, undefined, {
                shouldDirty: false,
                shouldValidate: false,
            });
        });

        const fadeTimer = window.setTimeout(() => {
            setHighlightedRowIndices(new Set());
        }, 2000);

        return () => window.clearTimeout(fadeTimer);
    }, [getValues, id, initializedBatchId, setValue]);

    useEffect(() => {
        if (!id || initializedBatchId !== id || providerStationNameById.size === 0) {
            return;
        }

        const currentLines = getValues('lines');
        currentLines.forEach((line, index) => {
            if (!line.lotteryStationId || line.lotteryStationId < 1 || line.stationName) {
                return;
            }
            const stationName = providerStationNameById.get(line.lotteryStationId);
            if (!stationName) {
                return;
            }
            setValue(`lines.${index}.stationName`, stationName, {
                shouldDirty: false,
                shouldValidate: false,
            });
        });
    }, [getValues, id, initializedBatchId, providerStationNameById, setValue]);

    useEffect(() => {
        if (!id || initializedBatchId !== id || isLoadingStations) {
            return;
        }

        const currentLines = getValues('lines');
        currentLines.forEach((line, index) => {
            if (line.removed || line.id || !line.lotteryStationId) {
                return;
            }
            if (eligibleStationIds.has(line.lotteryStationId)) {
                return;
            }
            setValue(`lines.${index}.lotteryStationId`, 0, {
                shouldValidate: false,
                shouldDirty: true,
            });
            setValue(`lines.${index}.resolvedBatchType`, undefined, {
                shouldValidate: false,
                shouldDirty: true,
            });
            setValue(`lines.${index}.stationName`, undefined, {
                shouldValidate: false,
                shouldDirty: true,
            });
        });
    }, [
        eligibleStationIdsKey,
        eligibleStationIds,
        getValues,
        id,
        initializedBatchId,
        isLoadingStations,
        setValue,
    ]);

    useEffect(() => {
        if (!id || initializedBatchId !== id || isLoadingStations) {
            return;
        }

        const currentLines = getValues('lines');
        currentLines.forEach((line, index) => {
            if (line.removed || !line.lotteryStationId || line.lotteryStationId < 1) {
                return;
            }

            const station = eligibleStations.find(
                (entry) => entry.lotteryStationId === line.lotteryStationId
            );
            if (!station) {
                return;
            }

            if (!line.resolvedBatchType) {
                setValue(`lines.${index}.resolvedBatchType`, station.resolvedBatchType, {
                    shouldDirty: false,
                    shouldValidate: false,
                });
            }
            if (!line.stationName) {
                setValue(`lines.${index}.stationName`, station.name, {
                    shouldDirty: false,
                    shouldValidate: false,
                });
            }
        });
    }, [
        eligibleStationIdsKey,
        eligibleStations,
        getValues,
        id,
        initializedBatchId,
        isLoadingStations,
        setValue,
    ]);

    const buildLinesPayload = (
        data: UpdateImportBatchFormValues
    ): UpdateImportBatchPayload['lines'] =>
        data.lines.map((line) => {
            const formStationId =
                line.lotteryStationId && line.lotteryStationId > 0 ? line.lotteryStationId : null;
            const serverStationId =
                line.id != null
                    ? batch?.lines?.find((serverLine) => serverLine.id === line.id)?.lotteryStationId
                    : undefined;
            const lotteryStationId = formStationId ?? serverStationId ?? line.lotteryStationId!;

            return {
                id: line.id,
                lotteryStationId,
                declareQuantity: line.declareQuantity!,
                importCost: line.importCost!,
                removed: line.removed || undefined,
            };
        });

    const buildUpdatePayload = (data: UpdateImportBatchFormValues): UpdateImportBatchPayload => {
        const payload: UpdateImportBatchPayload = {
            supplierId: canEditSupplier ? data.supplierId : (batch!.supplierId ?? data.supplierId),
            totalDeclareQuantity: data.totalDeclareQuantity,
            ticketListImageUrls: data.ticketListImageUrls ?? [],
            lines: buildLinesPayload(data),
        };

        if (removedTicketIds.length > 0) {
            payload.removedTicketIds = removedTicketIds;
        }

        // Invoice evidence is view-only on edit — never send a replacement URL.
        return payload;
    };

    const handleTotalDeclareQuantityBlur = (newValue: number) => {
        if (!batch) {
            return;
        }

        clearErrors('totalDeclareQuantity');

        const totalImportedQuantity = batch.totalImportedQuantity ?? 0;
        const currentLines = getValues('lines') ?? [];
        const linesSum = sumImportBatchLineDeclaredQuantity(currentLines);

        if (requiresDeclareQuantityReduction(newValue, totalImportedQuantity)) {
            const reductionCheck = canReduceDeclareQuantity(batch, newValue);
            if (!reductionCheck.allowed) {
                setError('totalDeclareQuantity', {
                    type: 'manual',
                    message: IMPORT_BATCH_DECLARE_QUANTITY_REDUCTION_IMPORTED_ONLY_MESSAGE,
                });
                return;
            }

            setValue('totalDeclareQuantity', previousTotalDeclareQuantityRef.current, {
                shouldValidate: true,
            });
            setLineQuantityAdjustmentHighlightIndices(new Set());
            setScrollToAdjustmentLineIndex(null);
            setPendingReductionTarget(newValue);
            setPendingReductionExcess(reductionCheck.excess);
            setReductionDialogOpen(true);
            toast.warning(IMPORT_BATCH_DECLARE_QUANTITY_REDUCTION_WARNING);
            return;
        }

        previousTotalDeclareQuantityRef.current = newValue;

        if (requiresLineQuantityAdjustment(newValue, linesSum, totalImportedQuantity)) {
            const draftIndices = getDraftLineIndicesForQuantityAdjustment(currentLines);
            if (draftIndices.length > 0) {
                setLineQuantityAdjustmentHighlightIndices(new Set(draftIndices));
                setScrollToAdjustmentLineIndex(draftIndices[0] ?? null);
                toast.warning(IMPORT_BATCH_DECLARE_QUANTITY_LINE_ADJUSTMENT_WARNING);
                return;
            }
        }

        setLineQuantityAdjustmentHighlightIndices(new Set());
        setScrollToAdjustmentLineIndex(null);
        if (removedTicketIds.length > 0) {
            setRemovedTicketIds([]);
        }
    };

    const handleReductionConfirm = async (selectedTicketIds: number[]) => {
        if (!batch || pendingReductionTarget == null) {
            return;
        }

        const currentValues = getValues();
        const reductionPayload: UpdateImportBatchPayload = {
            ...buildUpdatePayload({
                ...currentValues,
                totalDeclareQuantity: pendingReductionTarget,
            }),
            totalDeclareQuantity: pendingReductionTarget,
            removedTicketIds: selectedTicketIds,
        };

        try {
            setIsReductionSubmitting(true);
            const res = await updateAsync(reductionPayload);

            if (res.success) {
                setValue('totalDeclareQuantity', pendingReductionTarget, { shouldValidate: true });
                previousTotalDeclareQuantityRef.current = pendingReductionTarget;
                setRemovedTicketIds([]);
                setReductionDialogOpen(false);
                setPendingReductionTarget(null);
                setPendingReductionExcess(0);
                formInitializedForBatchIdRef.current = null;
                await refetchBatch();
                toast.success(res.message || 'Đã cập nhật số lượng khai báo và xóa vé thừa.');
            } else {
                toast.error(res.message || 'Không thể giảm số lượng khai báo.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể giảm số lượng khai báo.');
        } finally {
            setIsReductionSubmitting(false);
        }
    };

    const handleReductionDialogClose = () => {
        if (isReductionSubmitting) {
            return;
        }
        setReductionDialogOpen(false);
        setPendingReductionTarget(null);
        setPendingReductionExcess(0);
    };

    const handleOpenPausedDeclareQuantityAdjustment = (index: number) => {
        const line = getValues(`lines.${index}`);
        if (!batch?.id || !line?.id || line.status !== 'PAUSED') {
            return;
        }

        const oldDeclare =
            previousLineDeclareRef.current[line.id] ?? line.declareQuantity ?? 0;
        const serverImported = line.totalQuantity ?? 0;
        const draftSerialCount = getPendingFilledSerialCount(batch.id, line.id);

        setPendingLineReduction({
            index,
            lineId: line.id,
            stationName:
                line.stationName ||
                (line.lotteryStationId ? `Đài #${line.lotteryStationId}` : `Dòng #${line.id}`),
            oldDeclare,
            newDeclare: oldDeclare,
            serverImported,
            draftSerialCount,
        });
        setLineReductionDialogOpen(true);
    };

    const handleLineReductionDialogClose = () => {
        if (isLineReductionSubmitting) {
            return;
        }
        setLineReductionDialogOpen(false);
        setPendingLineReduction(null);
    };

    const handleLineReductionConfirm = async (
        result: LineDeclareQuantityReductionConfirmResult
    ) => {
        if (!batch || !pendingLineReduction) {
            return;
        }

        const currentValues = getValues();
        const nextLines = (currentValues.lines ?? []).map((line) => {
            if (!line.id || line.removed) {
                return line;
            }
            const nextDeclare = result.lineDeclares[line.id];
            if (nextDeclare == null) {
                return line;
            }
            return { ...line, declareQuantity: nextDeclare };
        });

        const nextValues: UpdateImportBatchFormValues = {
            ...currentValues,
            totalDeclareQuantity: result.totalDeclareQuantity,
            lines: nextLines,
        };

        const payload: UpdateImportBatchPayload = {
            ...buildUpdatePayload(nextValues),
            totalDeclareQuantity: result.totalDeclareQuantity,
            removedTicketIds: result.removedTicketIds,
            adjustPausedDeclareQuantity: true,
            confirmPausedLineImported: result.confirmPausedLineImported || undefined,
        };

        try {
            setIsLineReductionSubmitting(true);
            const res = await updateAsync(payload);

            if (res.success) {
                reset(nextValues, { keepDirty: false, keepTouched: false, keepErrors: false });
                previousTotalDeclareQuantityRef.current = result.totalDeclareQuantity;
                previousLineDeclareRef.current = {
                    ...previousLineDeclareRef.current,
                    ...result.lineDeclares,
                };
                clearTicketLineFormDraft(batch.id, pendingLineReduction.lineId);
                setRemovedTicketIds([]);
                setLineReductionDialogOpen(false);
                setPendingLineReduction(null);
                formInitializedForBatchIdRef.current = null;
                await refetchBatch();
                toast.success(
                    result.confirmPausedLineImported
                        ? res.message ||
                              'Đã xác nhận dòng tạm dừng thành Đã nhập đủ.'
                        : res.message || 'Đã điều chỉnh số lượng khai báo dòng tạm dừng.'
                );
            } else {
                toast.error(res.message || 'Không thể điều chỉnh số lượng khai báo dòng.');
            }
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || 'Không thể điều chỉnh số lượng khai báo dòng.'
            );
        } finally {
            setIsLineReductionSubmitting(false);
        }
    };

    const submitUpdate = async (data: UpdateImportBatchFormValues) => {
        if (!batch) {
            return;
        }

        if (!canEditSupplier && data.supplierId !== batch.supplierId) {
            toast.error(IMPORT_BATCH_SUPPLIER_LOCKED_MESSAGE);
            return;
        }

        if (showSharedReceipt && requiresInvoice && !hasInvoiceEvidence(data.invoiceEvidenceUrl)) {
            toast.error('Phiếu nhập thiếu ảnh biên lai. Không thể lưu khi ảnh biên lai bắt buộc.');
            return;
        }

        try {
            setIsSaving(true);
            const res = await updateAsync(buildUpdatePayload(data));

            if (res.success) {
                clearDraft();
                setRemovedTicketIds([]);
                toast.success(res.message || 'Cập nhật phiếu nhập lô thành công.');
                // Stay on detail URL: re-hydrate form from server (no separate edit screen).
                formInitializedForBatchIdRef.current = null;
                setInitializedBatchId(null);
                await refetchBatch();
            } else {
                toast.error(res.message || 'Cập nhật phiếu nhập lô thất bại.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Cập nhật phiếu nhập lô thất bại.');
        } finally {
            setIsSaving(false);
            setConfirmOpen(false);
            setPendingValues(null);
            setChangeSummary(null);
        }
    };

    const onSubmit = (data: UpdateImportBatchFormValues) => {
        if (!batch || !baselineRef.current) {
            return;
        }

        const submitImportMode = importModeLock.locked ? importModeLock.mode : data.importMode;
        const submitShowSharedReceipt = batchUsesSharedInvoice(submitImportMode);
        const submitActiveLines = data.lines.filter((line) => !line.removed);
        const submitRequiresInvoice = importBatchRequiresInvoiceEvidence(
            submitActiveLines.map((line) => ({
                batchType: line.resolvedBatchType,
            })) as any[],
            submitImportMode
        );

        if (submitShowSharedReceipt && submitRequiresInvoice && !hasInvoiceEvidence(data.invoiceEvidenceUrl)) {
            toast.error('Phiếu nhập thiếu ảnh biên lai. Không thể lưu khi ảnh biên lai bắt buộc.');
            return;
        }

        const summary = computeImportBatchEditChanges({
            baseline: baselineRef.current,
            current: data,
            showSharedReceipt: false,
            resolveSupplierName,
            resolveStationName,
        });

        if (!summary.hasAnyChanges) {
            toast.info('Không có thay đổi nào để lưu.');
            return;
        }

        setPendingValues(data);
        setChangeSummary(summary);
        setConfirmOpen(true);
    };

    const handleCancel = () => {
        clearDraft();
        formInitializedForBatchIdRef.current = null;
        setInitializedBatchId(null);
        void refetchBatch().then(() => {
            toast.info('Đã hủy thay đổi nháp.');
        });
    };

    const handleExport = async () => {
        if (!batch) {
            return;
        }
        try {
            await exportImportBatchFile(batch.id);
        } catch {
            toast.error('Không xuất được tệp cho phiếu nhập này.');
        }
    };

    const handleRemoveLine = (index: number) => {
        const line = lines[index];
        if (line?.status === 'IMPORTED') {
            toast.error('Không thể xóa dòng phiếu đã nhập đủ.');
            return;
        }
        if (line?.status === 'IMPORTING') {
            toast.error('Không thể xóa dòng đang nhập. Vui lòng tạm dừng nhập trước khi xóa.');
            return;
        }
        if (!canRemoveImportBatchLine(line?.status) && line?.id) {
            toast.error('Không thể xóa dòng phiếu ở trạng thái hiện tại.');
            return;
        }

        const stationLabel = line?.stationName || (line?.lotteryStationId ? `Đài #${line.lotteryStationId}` : 'dòng này');
        confirmDelete(
            `Dòng phiếu ${stationLabel} sẽ bị đánh dấu xóa. Thay đổi chỉ được áp dụng khi bạn lưu phiếu nhập lô.`,
            () => {
                if (line?.id) {
                    setValue(`lines.${index}.removed`, true, { shouldValidate: true, shouldDirty: true });
                } else {
                    remove(index);
                }
            }
        );
    };

    const handlePauseLine = (index: number) => {
        const line = lines[index];
        if (!batch?.id || !line?.id || !canPauseImportBatchLine(line.status)) {
            return;
        }

        const stationLabel = line.stationName || (line.lotteryStationId ? `Đài #${line.lotteryStationId}` : 'dòng này');
        confirmAction(
            'Xác nhận tạm dừng nhập?',
            `Dòng phiếu ${stationLabel} sẽ chuyển sang trạng thái Tạm dừng nhập. Bạn có thể tiếp tục nhập sau khi nhấn Tiếp tục.`,
            async () => {
                try {
                    const res = await pauseLineAsync({ batchId: batch.id, lineId: line.id! });
                    setValue(`lines.${index}.status`, 'PAUSED', { shouldDirty: false, shouldValidate: true });
                    toast.success(res.message || 'Đã tạm dừng nhập dòng phiếu.');
                    await refetchBatch();
                } catch (err: any) {
                    toast.error(err?.response?.data?.message || 'Không thể tạm dừng nhập dòng phiếu.');
                }
            },
            'warning'
        );
    };

    const handleResumeLine = (index: number) => {
        const line = lines[index];
        if (!batch?.id || !line?.id || !canResumeImportBatchLine(line.status)) {
            return;
        }

        const stationLabel = line.stationName || (line.lotteryStationId ? `Đài #${line.lotteryStationId}` : 'dòng này');
        confirmAction(
            'Xác nhận tiếp tục nhập?',
            `Dòng phiếu ${stationLabel} sẽ chuyển lại trạng thái Đang nhập để tiếp tục quá trình nhập vé.`,
            async () => {
                try {
                    const res = await resumeLineAsync({ batchId: batch.id, lineId: line.id! });
                    setValue(`lines.${index}.status`, 'IMPORTING', { shouldDirty: false, shouldValidate: true });
                    toast.success(res.message || 'Đã tiếp tục nhập dòng phiếu.');
                    await refetchBatch();
                } catch (err: any) {
                    toast.error(err?.response?.data?.message || 'Không thể tiếp tục nhập dòng phiếu.');
                }
            },
            'info'
        );
    };

    if (isBatchLoading || isLoadingSuppliers) {
        return (
            <ThemeProvider theme={localTheme}>
                <Box className="admin-page">
                    <PageHeader
                        title={`Phiếu nhập lô #${id}`}
                        breadcrumbItems={[
                            { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                            { label: `#${id}` },
                        ]}
                    />
                    <SpinnerLoading />
                </Box>
            </ThemeProvider>
        );
    }

    if (!batch && isBatchError) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    Không thể tải phiếu nhập lô. Vui lòng thử lại.
                </Alert>
                <Button variant="contained" className="btn-primary-admin" onClick={() => refetchBatch()}>
                    Thử lại
                </Button>
            </Box>
        );
    }

    if (!batch) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Không tìm thấy phiếu nhập lô.</Typography>
            </Box>
        );
    }

    if (!isImportBatchEditable(batch)) {
        return (
            <Box sx={{ maxWidth: 720, mx: 'auto', p: 3 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Phiếu nhập lô này không còn ở trạng thái cho phép chỉnh sửa.
                </Alert>
                <Button
                    variant="contained"
                    className="btn-primary-admin"
                    onClick={() => router.replace(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id))}
                >
                    Xem chi tiết phiếu
                </Button>
            </Box>
        );
    }

    const batchCodeLabel = formatImportBatchHeaderCode(batch.batchCode, batch.id);
    const intakeGate = useMemo(() => {
        if (!batch.supplierId || !batch.drawDate) {
            return null;
        }
        const supplier = activeSuppliers.find((entry) => entry.id === batch.supplierId);
        return evaluateIntake(supplier, batch.drawDate);
    }, [activeSuppliers, batch, evaluateIntake]);
    const showImportTicketsButton = hasTicketImportEligibleLines(batch);
    const importTicketsBlocked = !!intakeGate?.blocked || !!intakeGate?.notYetAllowed;

    return (
        <ThemeProvider theme={localTheme}>
            <Box className="admin-page">
                <PageHeader
                    title={`Phiếu nhập lô ${batchCodeLabel}`}
                    breadcrumbItems={[
                        { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                        { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                        { label: batchCodeLabel },
                    ]}
                    titleExtra={
                        <AdminStatusBadge
                            label={getImportBatchStatusLabel(batch.status)}
                            modifier={getImportBatchStatusBadgeClass(batch.status)}
                        />
                    }
                    action={
                        <Stack direction="row" spacing={1}>
                            <Button
                                variant="text"
                                startIcon={<FileDownloadOutlinedIcon />}
                                onClick={() => {
                                    void handleExport();
                                }}
                            >
                                Xuất tệp
                            </Button>
                            {showImportTicketsButton && (
                                <CanAccess permission={PERMISSIONS.TICKET.CREATE}>
                                    <Tooltip
                                        title={
                                            importTicketsBlocked
                                                ? intakeGate?.tooltipTitle ?? 'Không thể nhập vé lúc này.'
                                                : ''
                                        }
                                    >
                                        <span>
                                            <Button
                                                variant="contained"
                                                disabled={importTicketsBlocked}
                                                startIcon={<ConfirmationNumberOutlinedIcon />}
                                                onClick={() => {
                                                    const firstLine = findFirstIncompleteLine(batch);
                                                    if (firstLine?.id != null) {
                                                        setImportLineId(String(firstLine.id));
                                                    }
                                                }}
                                            >
                                                Nhập vé vào phiếu
                                            </Button>
                                        </span>
                                    </Tooltip>
                                </CanAccess>
                            )}
                        </Stack>
                    }
                />

                {id && hasUnsavedImportBatchEditDraft(id) && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Phiếu nhập lô đang được chỉnh sửa và chưa được lưu. Nội dung nháp cục bộ đã
                        được khôi phục tự động.
                    </Alert>
                )}

                {intakeGate?.blocked && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {intakeGate.message}
                    </Alert>
                )}

                {intakeGate?.notYetAllowed && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {intakeGate.message}
                    </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                    <Stack spacing={3}>

                        {/* ── Card 1: Thông tin phiếu nhập lô & Chứng từ ── */}
                        <Paper
                            variant="outlined"
                            sx={{
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                            }}
                        >
                            {/* Card header */}
                            <Box
                                sx={{
                                    px: 3,
                                    py: 2,
                                    borderBottom: '1px solid #f1f5f9',
                                    bgcolor: '#f8fafc',
                                }}
                            >
                                <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                    Thông tin phiếu nhập lô
                                </Typography>
                            </Box>

                            {/* Card body */}
                            <Box sx={{ p: { xs: 2.5, md: 3 } }}>
                                <Grid container spacing={2.5}>
                                    {/* Input 1: Nhà cung cấp */}
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Controller
                                            name="supplierId"
                                            control={control}
                                            render={({ field }) => (
                                                <FormControl
                                                    fullWidth
                                                    size="small"
                                                    error={isSubmitted && !!errors.supplierId}
                                                >
                                                    <InputLabel>Nhà cung cấp *</InputLabel>
                                                    <Select
                                                        {...field}
                                                        label="Nhà cung cấp *"
                                                        value={field.value || ''}
                                                        disabled={!canEditSupplier || isLoadingSuppliers}
                                                        sx={{ borderRadius: '10px', bgcolor: '#ffffff' }}
                                                    >
                                                        {activeSuppliers.map((supplier) => (
                                                            <MenuItem key={supplier.id} value={supplier.id}>
                                                                {supplier.name} ({supplier.code})
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                    {(isSubmitted && errors.supplierId) || !canEditSupplier ? (
                                                        <Typography
                                                            variant="caption"
                                                            color={
                                                                isSubmitted && errors.supplierId
                                                                    ? 'error'
                                                                    : 'text.secondary'
                                                            }
                                                            sx={{ mt: 0.5, display: 'block' }}
                                                        >
                                                            {isSubmitted && errors.supplierId
                                                                ? errors.supplierId.message
                                                                : !canEditSupplier
                                                                  ? IMPORT_BATCH_SUPPLIER_LOCKED_MESSAGE
                                                                  : undefined}
                                                        </Typography>
                                                    ) : null}
                                                </FormControl>
                                            )}
                                        />
                                    </Grid>

                                    {/* Input 2: Ngày quay */}
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Controller
                                            name="drawDate"
                                            control={control}
                                            render={({ field }) => (
                                                <AdminDatePicker
                                                    label="Ngày quay *"
                                                    value={field.value || ''}
                                                    onChange={field.onChange}
                                                    disabled
                                                    helperText="Ngày quay không thể thay đổi sau khi tạo phiếu nhập lô."
                                                />
                                            )}
                                        />
                                    </Grid>

                                    {/* Section Divider: Chứng từ & Biên lai đính kèm */}
                                    <Grid size={{ xs: 12 }}>
                                        <Box sx={{ mt: 1, pt: 2.5, borderTop: '1px solid #f1f5f9' }}>
                                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 0.25 }}>
                                                Chứng từ & Biên lai đối soát NCC
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                                Đính kèm biên lai xác nhận và bảng kê chi tiết danh sách vé nhập từ nhà cung cấp
                                            </Typography>

                                            <Grid container spacing={2.5}>
                                                {/* Cột 1: Biên lai phiếu nhập NCC */}
                                                {showSharedReceipt && (
                                                    <Grid size={{ xs: 12, md: 6 }}>
                                                        <Paper
                                                            variant="outlined"
                                                            sx={{
                                                                p: 2,
                                                                borderRadius: '12px',
                                                                borderColor: '#e2e8f0',
                                                                bgcolor: '#f8fafc',
                                                                height: '100%',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                            }}
                                                        >
                                                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                                                                <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                                    Biên lai phiếu nhập NCC
                                                                </Typography>
                                                                <Chip
                                                                    size="small"
                                                                    label={typeof invoiceEvidenceUrl === 'string' && invoiceEvidenceUrl.trim() ? 'Đã đính kèm' : 'Chưa có'}
                                                                    sx={{
                                                                        height: 20,
                                                                        fontSize: '0.675rem',
                                                                        fontWeight: 700,
                                                                        bgcolor: typeof invoiceEvidenceUrl === 'string' && invoiceEvidenceUrl.trim() ? '#dcfce7' : '#fee2e2',
                                                                        color: typeof invoiceEvidenceUrl === 'string' && invoiceEvidenceUrl.trim() ? '#15803d' : '#b91c1c',
                                                                    }}
                                                                />
                                                            </Stack>
                                                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                                                                Ảnh biên lai chỉ được xem trên màn hình chỉnh sửa. Không thể thay thế hoặc tải ảnh mới.
                                                            </Typography>

                                                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {typeof invoiceEvidenceUrl === 'string' && invoiceEvidenceUrl.trim() ? (
                                                                    <ImagePreview
                                                                        src={invoiceEvidenceUrl}
                                                                        alt="Ảnh biên lai"
                                                                        dialogTitle="Ảnh biên lai"
                                                                        infoItems={[
                                                                            {
                                                                                label: 'Mã phiếu',
                                                                                value: formatImportBatchHeaderCode(
                                                                                    batch?.batchCode,
                                                                                    batch?.id
                                                                                ),
                                                                            },
                                                                            {
                                                                                label: 'Ngày quay',
                                                                                value: batch?.drawDate
                                                                                    ? dayjs(batch.drawDate).format('DD/MM/YYYY')
                                                                                    : '—',
                                                                            },
                                                                            {
                                                                                label: 'Nhà cung cấp',
                                                                                value: batch?.supplierName || '—',
                                                                            },
                                                                            {
                                                                                label: 'Loại nhập',
                                                                                value: getImportModeLabel(resolvedImportMode),
                                                                            },
                                                                        ]}
                                                                        thumbnailSx={{
                                                                            maxWidth: 240,
                                                                            maxHeight: 140,
                                                                            borderRadius: '8px',
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <Alert severity="warning" sx={{ width: '100%', borderRadius: '8px' }}>
                                                                        Phiếu nhập chưa có ảnh biên lai.
                                                                    </Alert>
                                                                )}
                                                            </Box>
                                                        </Paper>
                                                    </Grid>
                                                )}

                                                {/* Cột 2: Danh sách vé nhập lô */}
                                                <Grid size={{ xs: 12, md: showSharedReceipt ? 6 : 12 }}>
                                                    <Paper
                                                        variant="outlined"
                                                        sx={{
                                                            p: 2,
                                                            borderRadius: '12px',
                                                            borderColor: '#e2e8f0',
                                                            bgcolor: '#f8fafc',
                                                            height: '100%',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                        }}
                                                    >
                                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                                                            <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                                Ảnh / Tệp danh sách vé nhập
                                                            </Typography>
                                                            <Chip
                                                                size="small"
                                                                label="Tùy chọn"
                                                                sx={{ height: 20, fontSize: '0.675rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#64748b' }}
                                                            />
                                                        </Stack>
                                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                                                            Ảnh hoặc tệp bảng kê chi tiết các cuốn/dãy vé (PDF, Excel, CSV)
                                                        </Typography>

                                                        <Box sx={{ flex: 1 }}>
                                                            <Controller
                                                                name="ticketListImageUrls"
                                                                control={control}
                                                                render={({ field }) => (
                                                                    <ImportBatchTicketListImagesField
                                                                        value={field.value ?? []}
                                                                        onChange={(urls) => {
                                                                            field.onChange(urls);
                                                                            if (!batch?.id) {
                                                                                return;
                                                                            }
                                                                            void attachTicketListImages(batch.id, urls).catch((err: unknown) => {
                                                                                toast.error(
                                                                                    (err as { response?: { data?: { message?: string } } })
                                                                                        ?.response?.data?.message ||
                                                                                        'Không lưu được ảnh danh sách vé nhập.'
                                                                                );
                                                                            });
                                                                        }}
                                                                        compact
                                                                    />
                                                                )}
                                                            />
                                                        </Box>
                                                    </Paper>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Paper>

                        {/* ── Card 2: Danh sách nhà đài & Phân bổ số lượng ── */}
                        <Paper
                            variant="outlined"
                            sx={{
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                            }}
                        >
                            {/* Card header */}
                            <Box
                                sx={{
                                    px: 3,
                                    py: 2,
                                    borderBottom: '1px solid #f1f5f9',
                                    bgcolor: '#f8fafc',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 2,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                        Phân bổ số lượng nhập theo từng nhà đài
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Chọn nhà đài và phân bổ số lượng vé nhập tương ứng cho kỳ quay
                                    </Typography>
                                </Box>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => {
                                        if (canAddRow) {
                                            append(emptyLine());
                                        }
                                    }}
                                    disabled={!canAddRow || isLoadingStations}
                                    sx={{
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        fontSize: '0.8125rem',
                                    }}
                                >
                                    Thêm nhà đài
                                </Button>
                            </Box>

                            {/* Row limit warning */}
                            {isAtRowLimit && (
                                <Box sx={{ px: 3, pt: 2 }}>
                                    <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                                        {IMPORT_BATCH_ROW_LIMIT_MESSAGE}
                                    </Alert>
                                </Box>
                            )}

                            {/* Line quantity adjustment warning */}
                            {lineQuantityAdjustmentActive && (
                                <Box sx={{ px: 3, pt: 2 }}>
                                    <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                                        {IMPORT_BATCH_DECLARE_QUANTITY_LINE_ADJUSTMENT_WARNING}
                                    </Alert>
                                </Box>
                            )}

                            {/* Summary KPI Cards Strip */}
                            <Box sx={{ px: 3, py: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                                Số nhà đài phân bổ
                                            </Typography>
                                            <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ fontSize: '1.1rem', mt: 0.25 }}>
                                                {lines.filter((l) => !l.removed && (l.lotteryStationId ?? 0) > 0).length} / {lines.filter((l) => !l.removed).length} đài
                                            </Typography>
                                        </Box>
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                                Tổng số lượng vé phân bổ
                                            </Typography>
                                            <Typography variant="h6" fontWeight={800} color="#0284c7" sx={{ fontSize: '1.1rem', mt: 0.25 }}>
                                                {totals.totalQty.toLocaleString('vi-VN')}{' '}
                                                <Typography component="span" variant="body2" color="text.secondary" fontWeight={600}>
                                                    vé
                                                </Typography>
                                            </Typography>
                                        </Box>
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                                Tổng giá trị lô vé nhập
                                            </Typography>
                                            <Typography variant="h6" fontWeight={800} color="#16a34a" sx={{ fontSize: '1.1rem', mt: 0.25 }}>
                                                {formatVnd(totals.totalCost)}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* Blocked stations info */}
                            {blockedStations.length > 0 && (
                                <Box sx={{ px: 3, pt: 2 }}>
                                    <Alert severity="info" sx={{ borderRadius: '10px' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                            Một số nhà đài đã có phiếu nhập nháp:
                                        </Typography>
                                        {blockedStations.map((station) => (
                                            <Typography
                                                key={station.lotteryStationId}
                                                variant="body2"
                                            >
                                                {station.name}
                                                {station.existingDraftBatchId
                                                    ? ` — phiếu #${station.existingDraftBatchId}`
                                                    : ''}
                                            </Typography>
                                        ))}
                                    </Alert>
                                </Box>
                            )}

                            {/* Table */}
                            <Box sx={{ px: 0 }}>
                                <TableContainer>
                                    <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                                        <TableHead>
                                            <TableRow
                                                sx={{
                                                    '& .MuiTableCell-head': {
                                                        fontWeight: 700,
                                                        fontSize: '0.8125rem',
                                                        color: '#64748b',
                                                        bgcolor: '#f8fafc',
                                                        borderBottom: '1px solid #e2e8f0',
                                                        py: 1.25,
                                                        px: 2,
                                                    },
                                                }}
                                            >
                                                <TableCell sx={{ width: showStatusColumn || showProgressColumn ? '20%' : '28%' }}>Nhà đài</TableCell>
                                                <TableCell sx={{ width: 110, whiteSpace: 'nowrap' }}>
                                                    Ngày quay
                                                </TableCell>
                                                <TableCell align="center" sx={{ width: 140, whiteSpace: 'nowrap' }}>Loại lô</TableCell>
                                                {showStatusColumn && (
                                                    <TableCell sx={{ width: 120, whiteSpace: 'nowrap' }}>Trạng thái dòng</TableCell>
                                                )}
                                                {showProgressColumn && (
                                                    <TableCell sx={{ width: 108, whiteSpace: 'nowrap' }}>Tiến độ nhập</TableCell>
                                                )}
                                                <TableCell sx={{ width: 120 }}>SL phân bổ</TableCell>
                                                <TableCell align="center" sx={{ width: 130 }}>Giá vốn</TableCell>
                                                <TableCell align="right" sx={{ width: 130, whiteSpace: 'nowrap' }}>
                                                    Tổng giá vốn
                                                </TableCell>
                                                <TableCell align="center" width={260} />
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {fields.map((field, index) => {
                                                if (lines[index]?.removed) {
                                                    return null;
                                                }

                                                const line = lines[index];
                                                const isReadOnly =
                                                    line?.readOnly ||
                                                    !canEditImportBatchLineCost(line?.status);
                                                const declareQuantityReadOnly =
                                                    isReadOnly ||
                                                    !canEditImportBatchLineDeclareQuantity(line?.status);
                                                const canRemove =
                                                    !line?.id ||
                                                    canRemoveImportBatchLine(line?.status);
                                                const canPause =
                                                    !!line?.id && canPauseImportBatchLine(line?.status);
                                                const canResume =
                                                    !!line?.id && canResumeImportBatchLine(line?.status);
                                                const canAdjustDeclare =
                                                    !!line?.id &&
                                                    canAdjustPausedImportBatchLineDeclareQuantity(
                                                        line?.status
                                                    );

                                                return (
                                                    <ImportBatchLineRow
                                                        key={field.id}
                                                        index={index}
                                                        control={control}
                                                        setValue={setValue}
                                                        drawDate={drawDate}
                                                        eligibleStations={displayEligibleStations}
                                                        declareQuantity={line?.declareQuantity ?? 0}
                                                        importCost={line?.importCost ?? 0}
                                                        lotteryStationId={line?.lotteryStationId ?? 0}
                                                        resolvedBatchType={line?.resolvedBatchType}
                                                        selectedStationIdsInOtherRows={
                                                            selectedStationIdsByRow[index] ?? []
                                                        }
                                                        canRemove={canRemove}
                                                        onRemove={() => handleRemoveLine(index)}
                                                        canPause={canPause}
                                                        onPause={() => handlePauseLine(index)}
                                                        pausePending={isPausePending}
                                                        canResume={canResume}
                                                        onResume={() => handleResumeLine(index)}
                                                        resumePending={isResumePending}
                                                        canAdjustDeclareQuantity={canAdjustDeclare}
                                                        onAdjustDeclareQuantity={() =>
                                                            handleOpenPausedDeclareQuantityAdjustment(
                                                                index
                                                            )
                                                        }
                                                        readOnly={isReadOnly}
                                                        declareQuantityReadOnly={declareQuantityReadOnly}
                                                        lineStatus={line?.status}
                                                        stationLocked={!!line?.id}
                                                        stationName={line?.stationName}
                                                        importedQuantity={line?.totalQuantity ?? 0}
                                                        showStatusColumn={showStatusColumn}
                                                        showProgressColumn={showProgressColumn}
                                                        showErrors={isSubmitted}
                                                        highlighted={highlightedRowIndices.has(index)}
                                                        declareQuantityHighlighted={lineQuantityAdjustmentHighlightIndices.has(
                                                            index
                                                        )}
                                                        declareQuantityAdjustmentHelper={
                                                            lineQuantityAdjustmentHighlightIndices.has(index)
                                                                ? IMPORT_BATCH_DECLARE_QUANTITY_LINE_ADJUSTMENT_HELPER
                                                                : undefined
                                                        }
                                                        shouldScrollDeclareQuantityIntoView={
                                                            scrollToAdjustmentLineIndex === index
                                                        }
                                                    />
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>

                            {errors.lines?.message && (
                                <Box sx={{ px: 3, py: 1 }}>
                                    <Typography variant="caption" color="error">
                                        {errors.lines.message}
                                    </Typography>
                                </Box>
                            )}
                        </Paper>

                        {/* Action Buttons */}
                        <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                loading={isPending || isSaving}
                                disabled={!supplierId || isLoadingStations || !quantitiesMatch || isSaving}
                                label="Lưu thay đổi"
                                loadingLabel="Đang xử lý..."
                                sx={{
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    px: 3,
                                    py: 1,
                                    bgcolor: '#2563eb',
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                            />
                            <Button
                                variant="outlined"
                                onClick={handleCancel}
                                sx={{
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    px: 3,
                                    py: 1,
                                    borderColor: '#cbd5e1',
                                    color: '#475569',
                                    '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                                }}
                            >
                                Hủy thay đổi
                            </Button>
                        </Stack>
                    </Stack>
                </form>

                <ImportBatchEditConfirmDialog
                    open={confirmOpen}
                    summary={changeSummary}
                    isPending={isPending || isSaving}
                    onClose={() => {
                        if (!isPending) {
                            setConfirmOpen(false);
                            setPendingValues(null);
                            setChangeSummary(null);
                        }
                    }}
                    onConfirm={() => {
                        if (pendingValues) {
                            void submitUpdate(pendingValues);
                        }
                    }}
                />

                {batch && pendingReductionTarget != null && (
                    <ImportBatchReduceDeclaredQuantityDialog
                        open={reductionDialogOpen}
                        batchId={batch.id}
                        targetTotalDeclareQuantity={pendingReductionTarget}
                        excessToRemove={pendingReductionExcess}
                        isSubmitting={isReductionSubmitting}
                        onClose={handleReductionDialogClose}
                        onConfirm={(ticketIds) => {
                            void handleReductionConfirm(ticketIds);
                        }}
                    />
                )}

                {batch && pendingLineReduction && (
                    <ImportBatchLineDeclareQuantityReductionDialog
                        open={lineReductionDialogOpen}
                        batchId={batch.id}
                        lineId={pendingLineReduction.lineId}
                        stationName={pendingLineReduction.stationName}
                        oldDeclare={pendingLineReduction.oldDeclare}
                        newDeclare={pendingLineReduction.newDeclare}
                        serverImported={pendingLineReduction.serverImported}
                        draftSerialCount={pendingLineReduction.draftSerialCount}
                        currentTotalDeclareQuantity={totalDeclareQuantity ?? 0}
                        lines={(lines ?? [])
                            .filter((line) => !line.removed && line.id)
                            .map((line) => ({
                                id: line.id!,
                                stationName:
                                    line.stationName ||
                                    (line.lotteryStationId
                                        ? `Đài #${line.lotteryStationId}`
                                        : `Dòng #${line.id}`),
                                status: line.status,
                                declareQuantity: line.declareQuantity ?? 0,
                                totalQuantity: line.totalQuantity ?? 0,
                                removed: line.removed,
                            }))}
                        isSubmitting={isLineReductionSubmitting}
                        onClose={handleLineReductionDialogClose}
                        onConfirm={(result) => {
                            void handleLineReductionConfirm(result);
                        }}
                    />
                )}

                <ImportBatchLineImportHost
                    batchId={batch.id}
                    lineId={importLineId}
                    onClose={() => setImportLineId(null)}
                    onSuccess={() => {
                        setImportLineId(null);
                        void refetchBatch();
                    }}
                />
            </Box>
        </ThemeProvider>
    );
};
