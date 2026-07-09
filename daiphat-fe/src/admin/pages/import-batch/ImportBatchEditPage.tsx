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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Title } from '../../components/ui/Title';
import { CollapsibleCard } from '../../components/ui/CollapsibleCard';
import { LoadingButton } from '../../components/ui/LoadingButton';
import { UploadSingleFile } from '../../components/upload/UploadSingleFile';
import { uploadAdminImage } from '../../api/upload.api';
import { prefixAdmin, ROUTES } from '../../constants/routes';
import {
    useEligibleImportBatchStations,
    useImportBatchDetail,
    useImportBatchTimePolicy,
    useUpdateImportBatch,
} from './hooks/useImportBatch';
import { useImportBatchEditDraft } from './hooks/useImportBatchEditDraft';
import { useActiveSuppliers } from '../supplier/hooks/useSupplier';
import { useProviders } from '../provider/hooks/useProvider';
import {
    updateImportBatchSchema,
    type UpdateImportBatchFormValues,
    type UpdateImportBatchLineFormValues,
} from './schemas/importBatch.schema';
import { ImportBatchEditConfirmDialog } from './components/ImportBatchEditConfirmDialog';
import { ImportBatchLineRow } from './components/ImportBatchLineRow';
import { getImportBatchStatusLabel, getImportModeLabel } from './utils/batchTypeLabels';
import { formatImportBatchHeaderCode } from './utils/importBatchCode';
import {
    batchUsesSharedInvoice,
    canChangeImportBatchDrawDate,
    canChangeImportBatchSupplier,
    canRemoveImportBatchLine,
    countRemovableLinesForDrawDateChange,
    hasImportedImportBatchLines,
    importBatchRequiresInvoiceEvidence,
    IMPORT_BATCH_SUPPLIER_LOCKED_MESSAGE,
} from './utils/importBatchHeaderEdit';
import {
    getDrawDateInputBounds,
    resolveImportModeLock,
} from './utils/importBatchDrawDate';
import { computeImportBatchTotals } from './utils/importBatchTotals';
import { computeImportBatchRowLimit, IMPORT_BATCH_ROW_LIMIT_MESSAGE } from './utils/importBatchRowLimit';
import {
    buildFormValuesFromBatch,
    mergeImportBatchEditDraftWithServer,
    readLocalImportBatchEditDraft,
} from './utils/importBatchEditDraft';
import {
    buildImportBatchEditBaseline,
    computeImportBatchEditChanges,
    type ImportBatchEditChangeSummary,
} from './utils/importBatchEditChanges';
import { isImportBatchEditable } from '../ticket/utils/importBatchProgress';
import type { ImportBatch, ImportBatchEligibleStation, UpdateImportBatchPayload } from '../../api/importBatch.api';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

const emptyLine = (): UpdateImportBatchLineFormValues => ({
    lotteryStationId: 0,
    declareQuantity: 1,
    importCost: 10000,
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
    const baselineRef = useRef<UpdateImportBatchFormValues | null>(null);

    const { data: batch, isLoading: isBatchLoading } = useImportBatchDetail(id);
    const { mutateAsync: updateAsync, isPending } = useUpdateImportBatch(id);
    const { data: activeSuppliers = [], isLoading: isLoadingSuppliers } = useActiveSuppliers();
    const { data: providersRes } = useProviders({ size: 1000 });
    const providers = useMemo(
        () => (providersRes as { data?: { recordList?: Array<{ id?: number; _id?: number; name?: string }> } })?.data?.recordList ?? [],
        [providersRes]
    );
    const { data: timePolicy } = useImportBatchTimePolicy();
    const formInitializedForBatchIdRef = useRef<string | null>(null);
    const importModeSyncedForDrawDateRef = useRef<string | null>(null);
    const [initializedBatchId, setInitializedBatchId] = useState<string | null>(null);
    const [highlightedRowIndices, setHighlightedRowIndices] = useState<Set<number>>(new Set());

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        getValues,
        formState: { errors, isSubmitted },
    } = useForm<UpdateImportBatchFormValues>({
        resolver: zodResolver(updateImportBatchSchema),
        mode: 'onChange',
        reValidateMode: 'onChange',
        defaultValues: {
            supplierId: 0,
            drawDate: '',
            importMode: 'IN_DAY',
            invoiceEvidenceUrl: '',
            lines: [],
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
    const drawDate = useWatch({ control, name: 'drawDate' });
    const importMode = useWatch({ control, name: 'importMode' });
    const supplierId = useWatch({ control, name: 'supplierId' });
    const invoiceEvidenceUrl = useWatch({ control, name: 'invoiceEvidenceUrl' });
    const lines = useWatch({ control, name: 'lines' }) ?? [];

    const importModeForStations = useMemo(() => {
        const lock = resolveImportModeLock(
            drawDate,
            [],
            timePolicy?.importBatchCutoffTime,
            !!drawDate
        );
        if (lock.locked) {
            return lock.mode;
        }
        return importMode ?? batch?.importMode ?? 'IN_DAY';
    }, [drawDate, importMode, batch?.importMode, timePolicy?.importBatchCutoffTime]);

    const { data: stationsResult, isLoading: isLoadingStations } = useEligibleImportBatchStations(
        drawDate,
        importModeForStations,
        batch?.id
    );
    const eligibleStations = stationsResult?.eligible ?? [];
    const blockedStations = stationsResult?.blocked ?? [];

    const importModeLock = useMemo(
        () =>
            resolveImportModeLock(
                drawDate,
                eligibleStations,
                timePolicy?.importBatchCutoffTime,
                !isLoadingStations
            ),
        [drawDate, eligibleStations, timePolicy?.importBatchCutoffTime, isLoadingStations]
    );

    const resolvedImportMode = importModeLock.locked ? importModeLock.mode : importMode;
    const showSharedReceipt = batchUsesSharedInvoice(resolvedImportMode);
    const uploadReceipt = useCallback(async (file: File) => uploadAdminImage(file), []);
    const drawDateBounds = getDrawDateInputBounds();
    const canEditDrawDate = canChangeImportBatchDrawDate(batch);
    const hasImportedLines = hasImportedImportBatchLines(batch);
    const canEditSupplier = canChangeImportBatchSupplier(batch);
    const removableLineCount = countRemovableLinesForDrawDateChange(batch?.lines);

    const activeLines = useMemo(() => lines.filter((line) => !line.removed), [lines]);
    const requiresInvoice = importBatchRequiresInvoiceEvidence(
        activeLines.map((line) => ({
            batchType: line.resolvedBatchType,
        })) as { batchType?: string }[],
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
            invoiceEvidenceUrl,
            lines,
        }),
        [supplierId, drawDate, importMode, invoiceEvidenceUrl, lines]
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

    const showStatusColumn = lines.some((line) => !line.removed && !!line.status);
    const showProgressColumn = lines.some(
        (line) => !line.removed && (line.totalQuantity ?? 0) > 0
    );

    const selectedStationIdsByRow = useMemo(
        () =>
            lines.map((_, rowIndex) =>
                lines
                    .map((line, index) =>
                        index !== rowIndex && !line.removed ? line.lotteryStationId : 0
                    )
                    .filter((stationId) => Number(stationId) > 0)
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
                            },
                        },
                    },
                },
            }),
        [outerTheme]
    );

    useEffect(() => {
        setInitializedBatchId(null);
        formInitializedForBatchIdRef.current = null;
        importModeSyncedForDrawDateRef.current = null;
        baselineRef.current = null;
        setHighlightedRowIndices(new Set());
    }, [id]);

    useEffect(() => {
        if (!drawDate || !importModeLock.locked) {
            return;
        }
        if (importModeSyncedForDrawDateRef.current === drawDate) {
            return;
        }
        if (importMode !== importModeLock.mode) {
            setValue('importMode', importModeLock.mode, { shouldValidate: false, shouldDirty: true });
        }
        importModeSyncedForDrawDateRef.current = drawDate;
    }, [drawDate, importMode, importModeLock, setValue]);

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
        formInitializedForBatchIdRef.current = id;
        setInitializedBatchId(id);
        importModeSyncedForDrawDateRef.current = enrichedValues.drawDate ?? null;

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
        data: UpdateImportBatchFormValues,
        drawDateChanged: boolean
    ): UpdateImportBatchPayload['lines'] => {
        const sourceLines = drawDateChanged
            ? data.lines.filter((line) => {
                  if (line.removed) {
                      return false;
                  }
                  if (!line.id) {
                      return true;
                  }
                  return line.status === 'IMPORTED';
              })
            : data.lines;

        return sourceLines.map((line) => ({
            id: line.id,
            lotteryStationId: line.lotteryStationId,
            declareQuantity: line.declareQuantity,
            importCost: line.importCost,
            removed: line.removed || undefined,
        }));
    };

    const buildUpdatePayload = (data: UpdateImportBatchFormValues): UpdateImportBatchPayload => {
        const drawDateChanged = !!batch && data.drawDate !== batch.drawDate;
        const payload: UpdateImportBatchPayload = {
            supplierId: canEditSupplier ? data.supplierId : (batch.supplierId ?? data.supplierId),
            drawDate: drawDateChanged ? data.drawDate : undefined,
            lines: buildLinesPayload(data, drawDateChanged),
        };

        if (showSharedReceipt) {
            payload.invoiceEvidenceUrl = data.invoiceEvidenceUrl?.trim() || '';
        }

        return payload;
    };

    const submitUpdate = async (data: UpdateImportBatchFormValues) => {
        if (!batch) {
            return;
        }

        const drawDateChanged = data.drawDate !== batch.drawDate;
        if (drawDateChanged && hasImportedLines) {
            toast.error('Không thể đổi ngày quay vì phiếu nhập lô đã có dòng đã nhập đủ.');
            return;
        }

        if (!canEditSupplier && data.supplierId !== batch.supplierId) {
            toast.error(IMPORT_BATCH_SUPPLIER_LOCKED_MESSAGE);
            return;
        }

        if (showSharedReceipt && requiresInvoice && !data.invoiceEvidenceUrl?.trim()) {
            toast.error('Vui lòng tải lên ảnh biên lai.');
            return;
        }

        try {
            const res = await updateAsync(buildUpdatePayload(data));

            if (res.success) {
                clearDraft();
                toast.success(res.message || 'Cập nhật phiếu nhập lô thành công.');
                navigate(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id));
            } else {
                toast.error(res.message || 'Cập nhật phiếu nhập lô thất bại.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Cập nhật phiếu nhập lô thất bại.');
        } finally {
            setConfirmOpen(false);
            setPendingValues(null);
            setChangeSummary(null);
        }
    };

    const onSubmit = (data: UpdateImportBatchFormValues) => {
        if (!batch || !baselineRef.current) {
            return;
        }

        const drawDateChanged = data.drawDate !== batch.drawDate;
        if (drawDateChanged && hasImportedLines) {
            toast.error('Không thể đổi ngày quay vì phiếu nhập lô đã có dòng đã nhập đủ.');
            return;
        }

        const submitImportMode = importModeLock.locked ? importModeLock.mode : data.importMode;
        const submitShowSharedReceipt = batchUsesSharedInvoice(submitImportMode);
        const submitActiveLines = data.lines.filter((line) => !line.removed);
        const submitRequiresInvoice = importBatchRequiresInvoiceEvidence(
            submitActiveLines.map((line) => ({
                batchType: line.resolvedBatchType,
            })) as { batchType?: string }[],
            submitImportMode
        );

        if (submitShowSharedReceipt && submitRequiresInvoice && !data.invoiceEvidenceUrl?.trim()) {
            toast.error('Vui lòng tải lên ảnh biên lai.');
            return;
        }

        const summary = computeImportBatchEditChanges({
            baseline: baselineRef.current,
            current: data,
            showSharedReceipt: submitShowSharedReceipt,
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
        if (!canRemoveImportBatchLine(line?.status) && line?.id) {
            toast.error('Không thể xóa dòng phiếu ở trạng thái hiện tại.');
            return;
        }

        if (line?.id) {
            setValue(`lines.${index}.removed`, true, { shouldValidate: true, shouldDirty: true });
        } else {
            remove(index);
        }
    };

    if (isBatchLoading || isLoadingSuppliers) {
        return null;
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
                    onClick={() => navigate(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id))}
                >
                    Xem chi tiết phiếu
                </Button>
            </Box>
        );
    }

    return (
        <ThemeProvider theme={localTheme}>
            <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
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

                <form onSubmit={handleSubmit(onSubmit)}>
                    <CollapsibleCard
                        title="Thông tin phiếu nhập lô"
                        expanded
                        onToggle={() => undefined}
                        collapsible={false}
                    >
                        <Stack spacing={3}>
                            {hasImportedLines && (
                                <Alert severity="info">
                                    Phiếu nhập lô đã có dòng đã nhập đủ. Ngày quay và nhà cung cấp
                                    không thể thay đổi, nhưng bạn vẫn có thể cập nhật ảnh biên lai
                                    và các dòng phiếu.
                                </Alert>
                            )}

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
                                            disabled={!canEditDrawDate}
                                            InputLabelProps={{ shrink: true }}
                                            inputProps={{
                                                min: drawDateBounds.min,
                                                max: drawDateBounds.max,
                                            }}
                                            error={isSubmitted && !!errors.drawDate}
                                            helperText={
                                                (isSubmitted && errors.drawDate?.message) ||
                                                (!canEditDrawDate
                                                    ? 'Không thể đổi ngày quay khi đã có dòng đã nhập đủ.'
                                                    : undefined)
                                            }
                                            sx={{ maxWidth: { sm: 280 } }}
                                        />
                                    )}
                                />

                                <TextField
                                    label="Loại nhập"
                                    value={getImportModeLabel(resolvedImportMode)}
                                    fullWidth
                                    disabled
                                    helperText={
                                        importModeLock.locked && drawDate !== batch.drawDate
                                            ? importModeLock.reason
                                            : 'Tự động xác định theo ngày quay.'
                                    }
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

                            {drawDate !== batch.drawDate && removableLineCount > 0 && (
                                <Alert severity="warning">
                                    Sau khi đổi ngày quay, {removableLineCount} dòng phiếu ở trạng
                                    thái Nháp/Đang nhập/Đã hủy sẽ bị xóa và loại nhập sẽ được tính
                                    lại tự động.
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
                                            <TableCell sx={{ width: 148 }}>Loại lô</TableCell>
                                            {showStatusColumn && (
                                                <TableCell sx={{ width: 120 }}>Trạng thái dòng</TableCell>
                                            )}
                                            {showProgressColumn && (
                                                <TableCell sx={{ width: 108 }}>Tiến độ nhập</TableCell>
                                            )}
                                            <TableCell sx={{ width: 88 }}>Số lượng khai báo</TableCell>
                                            <TableCell sx={{ width: 148 }}>Giá vốn</TableCell>
                                            <TableCell align="right" sx={{ width: 108 }}>
                                                Tổng giá vốn
                                            </TableCell>
                                            <TableCell align="center" width={48} />
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
                                                line?.status === 'IMPORTED' ||
                                                line?.status === 'CANCELLED';
                                            const canRemove =
                                                !line?.id ||
                                                canRemoveImportBatchLine(line?.status);

                                            return (
                                                <ImportBatchLineRow
                                                    key={field.id}
                                                    index={index}
                                                    control={control}
                                                    setValue={setValue}
                                                    drawDate={drawDate}
                                                    eligibleStations={displayEligibleStations}
                                                    declareQuantity={line?.declareQuantity ?? 0}
                                                    importCost={line?.importCost ?? 10000}
                                                    lotteryStationId={line?.lotteryStationId ?? 0}
                                                    resolvedBatchType={line?.resolvedBatchType}
                                                    selectedStationIdsInOtherRows={
                                                        selectedStationIdsByRow[index] ?? []
                                                    }
                                                    canRemove={canRemove}
                                                    onRemove={() => handleRemoveLine(index)}
                                                    readOnly={isReadOnly}
                                                    lineStatus={line?.status}
                                                    stationLocked={!!line?.id}
                                                    stationName={line?.stationName}
                                                    importedQuantity={line?.totalQuantity ?? 0}
                                                    showStatusColumn={showStatusColumn}
                                                    showProgressColumn={showProgressColumn}
                                                    showErrors={isSubmitted}
                                                    highlighted={highlightedRowIndices.has(index)}
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
                                    <strong>Tổng số lượng khai báo:</strong>{' '}
                                    {totals.totalQty.toLocaleString('vi-VN')} vé
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Tổng giá trị lô vé nhập:</strong>{' '}
                                    {totals.totalCost.toLocaleString('vi-VN')} VNĐ
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
                                Thêm dòng
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
                                        {invoiceEvidenceUrl
                                            ? 'Ảnh biên lai hiện tại sẽ được thay thế khi bạn tải lên ảnh mới.'
                                            : 'Tải lên ảnh biên lai cho phiếu nhập lô này.'}
                                    </Typography>
                                    <Controller
                                        name="invoiceEvidenceUrl"
                                        control={control}
                                        render={({ field }) => (
                                            <UploadSingleFile
                                                value={field.value}
                                                onChange={field.onChange}
                                                customUpload={uploadReceipt}
                                                error={
                                                    isSubmitted
                                                        ? errors.invoiceEvidenceUrl?.message
                                                        : undefined
                                                }
                                            />
                                        )}
                                    />
                                </Box>
                            )}

                            <Stack direction="row" spacing={2}>
                                <LoadingButton
                                    type="submit"
                                    variant="contained"
                                    loading={isPending}
                                    disabled={!supplierId || isLoadingStations}
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
                    isPending={isPending}
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
            </Box>
        </ThemeProvider>
    );
};
