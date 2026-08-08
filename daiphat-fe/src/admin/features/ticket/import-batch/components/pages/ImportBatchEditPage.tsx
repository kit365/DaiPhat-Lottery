"use client";

import {
    Alert,
    Box,
    Button,
    Chip,
    FormControl,
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
    Typography,
    createTheme,
    useTheme,
    InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { CollapsibleCard } from '../../../../../components/ui/CollapsibleCard';
import { LoadingButton } from '../../../../../components/ui/LoadingButton';
import { ImagePreview } from '../../../../../components/ui/ImagePreview';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import {
    useEligibleImportBatchStations,
    useImportBatchDetail,
    usePauseImportBatchLine,
    useResumeImportBatchLine,
    useUpdateImportBatch,
} from '../../hooks/useImportBatch';
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
import { getImportBatchStatusLabel, getImportModeLabel } from '../../utils/batchTypeLabels';
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
import { isImportBatchEditable } from '../../utils/importBatchProgress';
import { hasInvoiceEvidence } from '../../utils/invoiceEvidence';
import LoadingScreen from '../../../../../components/ui/LoadingScreen';
import type { ImportBatch, ImportBatchEligibleStation, UpdateImportBatchPayload } from '../../types/importBatch.type';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from '@/components/router-compat';
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
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
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
    const { mutateAsync: updateAsync, isPending } = useUpdateImportBatch(id);
    const { mutateAsync: pauseLineAsync, isPending: isPausePending } = usePauseImportBatchLine();
    const { mutateAsync: resumeLineAsync, isPending: isResumePending } = useResumeImportBatchLine();
    const { data: activeSuppliers = [], isLoading: isLoadingSuppliers } = useActiveSuppliers();
    const { data: providersRes } = useStations({ limit: 1000 });
    const providers = useMemo(
        () => (providersRes as { data?: { recordList?: Array<{ id?: number; _id?: number; name?: string }> } })?.data?.recordList ?? [],
        [providersRes]
    );
    const formInitializedForBatchIdRef = useRef<string | null>(null);
    const [initializedBatchId, setInitializedBatchId] = useState<string | null>(null);
    const [highlightedRowIndices, setHighlightedRowIndices] = useState<Set<number>>(new Set());

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
            lines: [],
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
    const drawDate = useWatch({ control, name: 'drawDate' });
    const importMode = useWatch({ control, name: 'importMode' });
    const supplierId = useWatch({ control, name: 'supplierId' });
    const totalDeclareQuantity = useWatch({ control, name: 'totalDeclareQuantity' });
    const invoiceEvidenceUrl = useWatch({ control, name: 'invoiceEvidenceUrl' });
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
            lines,
        }),
        [supplierId, drawDate, importMode, totalDeclareQuantity, invoiceEvidenceUrl, lines]
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
                navigate(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id));
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
        navigate(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch!.id));
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
        return <LoadingScreen />;
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
                    onClick={() => navigate(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id))}
                >
                    Xem chi tiết phiếu
                </Button>
            </Box>
        );
    }

    return (
        <ThemeProvider theme={localTheme}>
            <Box className="admin-page">
                <Breadcrumb
                    items={[
                        { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                        { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                        {
                            label: formatImportBatchHeaderCode(batch.batchCode, batch.id),
                            to: ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id),
                        },
                        { label: 'Chỉnh sửa' },
                    ]}
                />
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                    <Title
                        title={`Chỉnh sửa phiếu ${formatImportBatchHeaderCode(batch.batchCode, batch.id)}`}
                    />
                    <Chip label={getImportBatchStatusLabel(batch.status)} size="small" />
                </Stack>

                {id && hasUnsavedImportBatchEditDraft(id) && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Phiếu nhập lô đang được chỉnh sửa và chưa được lưu. Nội dung nháp cục bộ đã
                        được khôi phục tự động.
                    </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                    <CollapsibleCard
                        title="Thông tin phiếu nhập lô"
                        expanded
                        onToggle={() => undefined}
                        collapsible={false}
                    >
                        <Stack spacing={3}>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <Controller
                                    name="drawDate"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Ngày quay"
                                            type="date"
                                            fullWidth
                                            disabled
                                            InputLabelProps={{ shrink: true }}
                                            helperText="Ngày quay không thể thay đổi sau khi tạo phiếu nhập lô."
                                            sx={{ maxWidth: { sm: 280 } }}
                                        />
                                    )}
                                />

                                <TextField
                                    label="Loại nhập"
                                    value={getImportModeLabel(resolvedImportMode)}
                                    fullWidth
                                    disabled
                                    helperText="Tự động xác định theo ngày quay."
                                    sx={{ maxWidth: { sm: 360 } }}
                                />

                                <Controller
                                    name="supplierId"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl
                                            fullWidth
                                            sx={{ maxWidth: { sm: 360 } }}
                                            error={isSubmitted && !!errors.supplierId}
                                        >
                                            <InputLabel>Nhà cung cấp</InputLabel>
                                            <Select
                                                {...field}
                                                label="Nhà cung cấp"
                                                value={field.value || ''}
                                                disabled={!canEditSupplier || isLoadingSuppliers}
                                            >
                                                {activeSuppliers.map((supplier) => (
                                                    <MenuItem key={supplier.id} value={supplier.id}>
                                                        {supplier.name} ({supplier.code})
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            {(isSubmitted && errors.supplierId) ||
                                            !canEditSupplier ? (
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
                            </Stack>

                            <Controller
                                name="totalDeclareQuantity"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        name={field.name}
                                        value={formatViInteger(field.value)}
                                        label="Tổng số lượng khai báo (Tự động tính từ danh sách đài)"
                                        fullWidth
                                        disabled
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message || 'Tự động tổng hợp từ số lượng khai báo của các nhà đài trong danh sách bên dưới.'}
                                        InputProps={{
                                            readOnly: true,
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <Typography variant="body2" color="text.secondary">
                                                        vé
                                                    </Typography>
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            maxWidth: { sm: 360 },
                                            '& .MuiInputBase-input.Mui-disabled': {
                                                WebkitTextFillColor: '#0F172A',
                                                fontWeight: 700,
                                                bgcolor: '#F8FAFC',
                                            },
                                        }}
                                    />
                                )}
                            />

                            <ImportBatchDeclaredQuantityProgress
                                totalDeclareQuantity={totalDeclareQuantity ?? 0}
                                linesSum={linesDeclaredQuantity}
                                showError={isSubmitted || lineQuantityAdjustmentActive}
                            />

                            {lineQuantityAdjustmentActive && (
                                <Alert severity="warning">
                                    {IMPORT_BATCH_DECLARE_QUANTITY_LINE_ADJUSTMENT_WARNING}
                                </Alert>
                            )}

                            {blockedStations.length > 0 && (
                                <Alert severity="info">
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
                            )}

                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ width: '22%' }}>Nhà đài</TableCell>
                                            <TableCell sx={{ width: 100, whiteSpace: 'nowrap' }}>
                                                Ngày quay
                                            </TableCell>
                                            <TableCell align="center" sx={{ width: 148 }}>Loại lô</TableCell>
                                            {showStatusColumn && (
                                                <TableCell sx={{ width: 120 }}>Trạng thái dòng</TableCell>
                                            )}
                                            {showProgressColumn && (
                                                <TableCell sx={{ width: 108 }}>Tiến độ nhập</TableCell>
                                            )}
                                            <TableCell sx={{ width: 112 }}>Số lượng khai báo</TableCell>
                                            <TableCell align="center" sx={{ width: 148 }}>Giá vốn</TableCell>
                                            <TableCell align="right" sx={{ width: 108 }}>
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

                            {errors.lines?.message && (
                                <Typography variant="caption" color="error">
                                    {errors.lines.message}
                                </Typography>
                            )}

                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: 'var(--palette-background-neutral)',
                                    display: 'flex',
                                    gap: 4,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Typography variant="body2">
                                    <strong>Tổng giá trị lô vé nhập:</strong>{' '}
                                    {formatVnd(totals.totalCost)}
                                </Typography>
                            </Box>

                            <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={() => {
                                    if (canAddRow) {
                                        append(emptyLine());
                                    }
                                }}
                                disabled={!canAddRow || isLoadingStations}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                Thêm đài
                            </Button>

                            {isAtRowLimit && (
                                <Alert severity="warning">{IMPORT_BATCH_ROW_LIMIT_MESSAGE}</Alert>
                            )}

                            {showSharedReceipt && (
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                        Ảnh biên lai (dùng chung cho tất cả nhà đài)
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 1.5 }}
                                    >
                                        Ảnh biên lai chỉ được xem trên màn hình chỉnh sửa. Không thể
                                        thay thế hoặc tải ảnh mới.
                                    </Typography>
                                    {typeof invoiceEvidenceUrl === 'string' &&
                                    invoiceEvidenceUrl.trim() ? (
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
                                                maxHeight: 180,
                                                borderRadius: 1,
                                            }}
                                        />
                                    ) : (
                                        <Alert severity="warning">
                                            Phiếu nhập chưa có ảnh biên lai.
                                        </Alert>
                                    )}
                                </Box>
                            )}

                            <Stack direction="row" spacing={2}>
                                <LoadingButton
                                    type="submit"
                                    variant="contained"
                                    loading={isPending || isSaving}
                                    disabled={!supplierId || isLoadingStations || !quantitiesMatch || isSaving}
                                    label="Lưu thay đổi"
                                    loadingLabel="Đang xử lý..."
                                />
                                <Button variant="outlined" onClick={handleCancel}>
                                    Hủy
                                </Button>
                            </Stack>
                        </Stack>
                    </CollapsibleCard>
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
            </Box>
        </ThemeProvider>
    );
};
