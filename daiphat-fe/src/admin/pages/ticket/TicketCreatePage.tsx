import {
    Alert,
    Autocomplete,
    Box,
    Paper,
    Stack,
    TextField,
    ThemeProvider,
    Typography,
    createTheme,
    useTheme,
} from '@mui/material';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Title } from '../../components/ui/Title';
import { LoadingButton } from '../../components/ui/LoadingButton';
import { prefixAdmin, ROUTES } from '../../constants/routes';
import { useBulkCreateTickets, useImportedTicketsByLine } from './hooks/useTicket';
import { useTicketEntryAutosave } from './hooks/useTicketEntryAutosave';
import { useTicketEntryResume } from './hooks/useTicketEntryResume';
import { toast } from 'react-toastify';
import { useForm, useFieldArray, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { buildCreateTicketSchema, CreateTicketFormValues } from '../../schemas/ticket.schema';
import { useProviders } from '../provider/hooks/useProvider';
import { useRegions } from '../region/hooks/useRegion';
import { useDraftImportBatches, useImportBatchDetail } from '../import-batch/hooks/useImportBatch';
import { getImportBatchCancelledAlertMessage, getImportBatchLineCancelledAlertMessage } from '../import-batch/utils/batchTypeLabels';
import {
    findFirstIncompleteLine,
    isImportBatchEditable,
    isLineCancelled,
} from './utils/importBatchProgress';
import { formatImportBatchSelectLabel } from '../import-batch/utils/importBatchCode';
import { ImportBatchSelectionCard } from './components/ImportBatchSelectionCard';
import { ImportBatchLineImportTabs } from './components/ImportBatchLineImportTabs';
import type { ImportBatch } from '../../api/importBatch.api';
import {
    applyDuplicateNumberFieldErrors,
    applyQuotaOverflowFieldErrors,
    applySectionRelationshipFieldErrors,
    applySerialDuplicateFieldErrors,
    clearDuplicateNumberFieldErrors,
    clearSerialDuplicateFieldErrors,
    countFilledSerials,
    findDuplicateNumberSectionIndices,
    findDuplicateSerialPaths,
    findFirstSerialErrorPath,
    findQuotaOverflowSerialPaths,
    findSectionRelationshipIssues,
    findSerialPathsForApiFailure,
    isDuplicateNumbersApiError,
    isQuotaExceededApiError,
    isSerialDuplicateApiError,
    QUOTA_UNDER_DECLARE_MESSAGE,
    scrollAndFocusNumberField,
    scrollToNumberField,
    scrollToSerialField,
} from './utils/ticketSerialValidation';
import {
    getTicketNumberLengthMessage,
    isTicketNumberLengthApiError,
    isTicketNumberLengthValid,
    resolveRegionLengthRules,
} from './utils/ticketNumberValidation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type LineFormDraft = {
    ticketSections: CreateTicketFormValues['ticketSections'];
};

const emptySerial = () => ({ serialNumber: '', ticketImg: undefined as string | undefined });

const defaultSection = () => ({
    numbers: '',
    serials: [emptySerial()],
});

const defaultLineDraft = (): LineFormDraft => ({
    ticketSections: [defaultSection()],
});

export const TicketCreatePage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const importBatchIdParam = searchParams.get('importBatchId');
    const importBatchLineIdParam = searchParams.get('importBatchLineId');
    const isBatchPreSelected = !!importBatchIdParam;

    const { data: draftBatches = [], isLoading: isLoadingDrafts } = useDraftImportBatches(true);
    const [selectedBatchId, setSelectedBatchId] = useStateFromParam(importBatchIdParam);
    const {
        data: importBatchDetail,
        isLoading: isLoadingBatch,
        isFetching: isFetchingBatch,
    } = useImportBatchDetail(selectedBatchId || undefined);

    const resolvedBatch = useMemo(() => {
        if (!selectedBatchId) {
            return null;
        }
        if (importBatchDetail && String(importBatchDetail.id) === String(selectedBatchId)) {
            return importBatchDetail;
        }
        return draftBatches.find((batch) => String(batch.id) === String(selectedBatchId)) ?? null;
    }, [draftBatches, importBatchDetail, selectedBatchId]);

    const isBatchLoading =
        !!selectedBatchId &&
        (isLoadingBatch || isFetchingBatch) &&
        (!importBatchDetail || String(importBatchDetail.id) !== String(selectedBatchId));

    const initialLineAppliedRef = useRef(false);
    const lastInitializedBatchIdRef = useRef<string | null>(null);
    const [lineFormDrafts, setLineFormDrafts] = useState<Record<string, LineFormDraft>>({});

    const { data: providersRes } = useProviders({ size: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];
    const { data: regionsRes } = useRegions();
    const regions = regionsRes?.data || [];

    const resolveRulesForStation = useCallback(
        (stationId?: string | number) => {
            const provider = providers.find(
                (p: any) => String(p.id || p._id) === String(stationId)
            );
            const region = regions.find((r: any) => r.code === provider?.region);
            return resolveRegionLengthRules(region);
        },
        [providers, regions]
    );

    const batchLines = resolvedBatch?.lines ?? [];
    const defaultActionableLine = resolvedBatch ? findFirstIncompleteLine(resolvedBatch) : undefined;
    const bootstrapLineId =
        importBatchLineIdParam || (defaultActionableLine ? String(defaultActionableLine.id) : '');
    const bootstrapLine = batchLines.find((line) => String(line.id) === bootstrapLineId);
    const numberLengthRulesRef = useRef(resolveRulesForStation(bootstrapLine?.lotteryStationId));

    const dynamicTicketResolver = useCallback(
        async (values: CreateTicketFormValues, context: unknown, options: unknown) =>
            zodResolver(buildCreateTicketSchema(numberLengthRulesRef.current))(
                values,
                context as never,
                options as never
            ),
        []
    );

    const {
        control,
        handleSubmit,
        reset,
        watch,
        getValues,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm<CreateTicketFormValues>({
        resolver: dynamicTicketResolver,
        mode: 'onTouched',
        reValidateMode: 'onChange',
        defaultValues: {
            importBatchId: importBatchIdParam || '',
            importBatchLineId: importBatchLineIdParam || '',
            stationId: '',
            ticketSections: [defaultSection()],
            drawDate: '',
        },
    });

    const {
        fields: sectionFields,
        append: appendSection,
        remove: removeSection,
    } = useFieldArray({ control, name: 'ticketSections' });

    const watchedLineId = watch('importBatchLineId');
    const watchedStationId = watch('stationId');
    const watchedTicketSections = watch('ticketSections');

    const {
        buildLineFormDraft,
        isLoadingDrafts: isLoadingTicketEntryDrafts,
        isSaving: isDraftSaving,
        lastSavedAt: draftLastSavedAt,
        saveError: draftSaveError,
        flushSave,
        clearDraft,
    } = useTicketEntryAutosave({
        importBatchId: resolvedBatch?.id,
        importBatchLineId: watchedLineId,
        ticketSections: watchedTicketSections,
        enabled: !!resolvedBatch && isImportBatchEditable(resolvedBatch),
    });

    const selectedLine = useMemo(() => {
        if (!watchedLineId) {
            return batchLines.length === 1 ? batchLines[0] : undefined;
        }
        return batchLines.find((line) => String(line.id) === String(watchedLineId));
    }, [batchLines, watchedLineId]);

    const numberLengthRules = useMemo(
        () => resolveRulesForStation(watchedStationId || selectedLine?.lotteryStationId),
        [resolveRulesForStation, selectedLine?.lotteryStationId, watchedStationId]
    );

    useEffect(() => {
        numberLengthRulesRef.current = numberLengthRules;
    }, [numberLengthRules]);

    const remainingSerialQuota = useMemo(() => {
        if (!selectedLine) {
            return undefined;
        }
        const imported = selectedLine.totalQuantity ?? 0;
        const declared = selectedLine.declareQuantity ?? 0;
        return Math.max(0, declared - imported);
    }, [selectedLine]);

    const { mutateAsync: bulkCreateAsync, isPending } = useBulkCreateTickets();
    const {
        data: importedTickets = [],
        isLoading: isLoadingImportedTickets,
        isFetching: isFetchingImportedTickets,
    } = useImportedTicketsByLine(watchedLineId);

    const { resumeFocusTarget, notifyLineFormReady } = useTicketEntryResume({
        ticketSections: watchedTicketSections,
        enabled: !!resolvedBatch && isImportBatchEditable(resolvedBatch),
    });

    const resolveStationName = useCallback(
        (stationId?: number | string) => {
            if (!stationId) return '—';
            return (
                providers.find((p: any) => String(p.id || p._id) === String(stationId))?.name ??
                `Đài #${stationId}`
            );
        },
        [providers]
    );

    useEffect(() => {
        if (importBatchIdParam) {
            return;
        }
        if (!importBatchLineIdParam || draftBatches.length === 0) {
            return;
        }
        const owningBatch = draftBatches.find((batch) =>
            batch.lines?.some((line) => String(line.id) === importBatchLineIdParam)
        );
        if (owningBatch) {
            setSelectedBatchId(String(owningBatch.id));
        }
    }, [draftBatches, importBatchIdParam, importBatchLineIdParam]);

    const syncBatchToUrl = useCallback(
        (batchId: string, lineId?: string) => {
            const params = new URLSearchParams();
            if (batchId) {
                params.set('importBatchId', batchId);
            }
            if (lineId) {
                params.set('importBatchLineId', lineId);
            }
            setSearchParams(params, { replace: true });
        },
        [setSearchParams]
    );

    const applyLineToForm = useCallback(
        (lineId: string, drafts: Record<string, LineFormDraft>) => {
            if (!resolvedBatch) {
                return null;
            }
            const line = batchLines.find((item) => String(item.id) === lineId);
            if (!line) {
                return null;
            }
            const draft = drafts[lineId] ?? defaultLineDraft();
            const ticketSections =
                draft.ticketSections.length > 0 ? draft.ticketSections : [defaultSection()];
            reset({
                importBatchId: String(resolvedBatch.id),
                importBatchLineId: lineId,
                stationId: String(line.lotteryStationId),
                ticketSections,
                drawDate: resolvedBatch.drawDate,
            });
            return ticketSections;
        },
        [batchLines, reset, resolvedBatch]
    );

    const buildDraftsMapFromServer = useCallback(() => {
        const map: Record<string, LineFormDraft> = {};
        for (const line of batchLines) {
            const lineId = String(line.id);
            const draft = buildLineFormDraft(lineId);
            if (draft) {
                map[lineId] = draft;
            }
        }
        return map;
    }, [batchLines, buildLineFormDraft]);

    useEffect(() => {
        if (!resolvedBatch || batchLines.length === 0 || isLoadingTicketEntryDrafts) {
            return;
        }

        const batchId = String(resolvedBatch.id);
        if (lastInitializedBatchIdRef.current === batchId && initialLineAppliedRef.current) {
            return;
        }

        const paramLine = importBatchLineIdParam
            ? batchLines.find((item) => String(item.id) === importBatchLineIdParam)
            : undefined;
        const line =
            paramLine && !isLineCancelled(paramLine)
                ? paramLine
                : findFirstIncompleteLine(resolvedBatch);
        const lineId = line ? String(line.id) : '';

        const serverDraftsMap = buildDraftsMapFromServer();

        lastInitializedBatchIdRef.current = batchId;
        initialLineAppliedRef.current = true;
        setLineFormDrafts(serverDraftsMap);

        if (lineId) {
            const restoredSections = applyLineToForm(lineId, serverDraftsMap);
            syncBatchToUrl(batchId, lineId);
            if (restoredSections) {
                notifyLineFormReady(lineId, restoredSections);
            }
        }
    }, [
        resolvedBatch?.id,
        batchLines.length,
        importBatchLineIdParam,
        applyLineToForm,
        syncBatchToUrl,
        isLoadingTicketEntryDrafts,
        buildDraftsMapFromServer,
        notifyLineFormReady,
    ]);

    const handleTabChange = async (lineId: string) => {
        await flushSave();
        const currentLineId = watch('importBatchLineId');
        let nextDrafts = lineFormDrafts;
        if (currentLineId) {
            nextDrafts = {
                ...lineFormDrafts,
                [currentLineId]: {
                    ticketSections: watch('ticketSections'),
                },
            };
            setLineFormDrafts(nextDrafts);
        }
        const restoredSections = applyLineToForm(lineId, nextDrafts);
        if (restoredSections) {
            notifyLineFormReady(lineId, restoredSections);
        }
        if (selectedBatchId) {
            syncBatchToUrl(selectedBatchId, lineId);
        }
    };

    const handleBatchChange = (batch: ImportBatch | null) => {
        initialLineAppliedRef.current = false;
        lastInitializedBatchIdRef.current = null;
        setLineFormDrafts({});

        if (!batch) {
            setSelectedBatchId('');
            syncBatchToUrl('');
            reset({
                importBatchId: '',
                importBatchLineId: '',
                stationId: '',
                ticketSections: [defaultSection()],
                drawDate: '',
            });
            return;
        }

        const batchId = String(batch.id);
        setSelectedBatchId(batchId);
        syncBatchToUrl(batchId);
    };

    const refreshDuplicateFieldState = useCallback(() => {
        const sections = getValues('ticketSections');
        const duplicatePaths = findDuplicateSerialPaths(sections);
        const duplicateNumberIndices = findDuplicateNumberSectionIndices(sections);

        const allPaths = sections.flatMap((section, sectionIndex) =>
            (section.serials ?? []).map((_, serialIndex) => ({ sectionIndex, serialIndex }))
        );
        const nonDuplicatePaths = allPaths.filter(
            (path) =>
                !duplicatePaths.some(
                    (dup) =>
                        dup.sectionIndex === path.sectionIndex && dup.serialIndex === path.serialIndex
                )
        );
        clearSerialDuplicateFieldErrors(nonDuplicatePaths, clearErrors);

        const nonDuplicateNumberIndices = sections
            .map((_, sectionIndex) => sectionIndex)
            .filter((sectionIndex) => !duplicateNumberIndices.includes(sectionIndex));
        clearDuplicateNumberFieldErrors(nonDuplicateNumberIndices, clearErrors);

        if (duplicatePaths.length > 0) {
            applySerialDuplicateFieldErrors(duplicatePaths, setError);
        }
        if (duplicateNumberIndices.length > 0) {
            applyDuplicateNumberFieldErrors(duplicateNumberIndices, setError);
        }
    }, [clearErrors, getValues, setError]);

    const handleNumbersFieldChange = useCallback(
        (sectionIndex: number) => {
            const sections = getValues('ticketSections');
            const value = sections[sectionIndex]?.numbers ?? '';
            if (isTicketNumberLengthValid(value, numberLengthRulesRef.current)) {
                clearErrors(`ticketSections.${sectionIndex}.numbers`);
            }
            refreshDuplicateFieldState();
        },
        [clearErrors, getValues, refreshDuplicateFieldState]
    );

    const handleSerialFieldChange = useCallback(
        (_sectionIndex: number, _serialIndex: number) => {
            refreshDuplicateFieldState();
        },
        [refreshDuplicateFieldState]
    );

    const handleRemoveSerial = useCallback(
        (_sectionIndex: number, _serialIndex: number) => {
            queueMicrotask(() => {
                refreshDuplicateFieldState();
            });
        },
        [refreshDuplicateFieldState]
    );

    const handleAppendSection = useCallback(() => {
        const newIndex = getValues('ticketSections').length;
        appendSection(defaultSection());
        scrollAndFocusNumberField(newIndex);
    }, [appendSection, getValues]);

    const handleRemoveSection = useCallback(
        (index: number) => {
            removeSection(index);
            queueMicrotask(() => {
                refreshDuplicateFieldState();
            });
        },
        [refreshDuplicateFieldState, removeSection]
    );

    const handleInvalidSubmit = useCallback((formErrors: FieldErrors<CreateTicketFormValues>) => {
        const sections = formErrors.ticketSections;
        if (sections && Array.isArray(sections)) {
            for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
                const sectionError = sections[sectionIndex];
                if (sectionError && typeof sectionError === 'object' && 'numbers' in sectionError) {
                    scrollToNumberField(sectionIndex);
                    return;
                }
            }
        }

        const firstPath = findFirstSerialErrorPath(formErrors);
        if (firstPath) {
            scrollToSerialField(firstPath.sectionIndex, firstPath.serialIndex);
        }
    }, []);

    const onSubmit = async (data: CreateTicketFormValues) => {
        if (!selectedLine || !resolvedBatch) {
            toast.error('Vui lòng chọn nhà đài trong phiếu nhập lô');
            return;
        }

        if (isLineCancelled(selectedLine)) {
            toast.error(getImportBatchLineCancelledAlertMessage(selectedLine.cancelReason));
            return;
        }

        const imported = selectedLine.totalQuantity ?? 0;
        const declared = selectedLine.declareQuantity ?? 0;
        if (declared > 0 && imported >= declared) {
            toast.info('Đài này đã nhập đủ số lượng khai báo');
            return;
        }

        const duplicatePaths = findDuplicateSerialPaths(data.ticketSections);
        if (duplicatePaths.length > 0) {
            applySerialDuplicateFieldErrors(duplicatePaths, setError);
            scrollToSerialField(duplicatePaths[0].sectionIndex, duplicatePaths[0].serialIndex);
            return;
        }

        const duplicateNumberIndices = findDuplicateNumberSectionIndices(data.ticketSections);
        if (duplicateNumberIndices.length > 0) {
            applyDuplicateNumberFieldErrors(duplicateNumberIndices, setError);
            scrollToNumberField(duplicateNumberIndices[0]);
            return;
        }

        const relationshipIssues = findSectionRelationshipIssues(data.ticketSections);
        if (relationshipIssues.length > 0) {
            applySectionRelationshipFieldErrors(relationshipIssues, setError);
            const firstIssue = relationshipIssues[0];
            if (firstIssue.type === 'serial_without_ticket' || firstIssue.type === 'empty_ticket') {
                scrollToNumberField(firstIssue.sectionIndex);
            } else {
                scrollToSerialField(firstIssue.sectionIndex, 0);
            }
            return;
        }

        const filledSerials = countFilledSerials(data.ticketSections);
        const remaining = Math.max(0, declared - imported);
        if (filledSerials > remaining) {
            const overflowPaths = findQuotaOverflowSerialPaths(data.ticketSections, remaining);
            applyQuotaOverflowFieldErrors(overflowPaths, setError);
            if (overflowPaths.length > 0) {
                scrollToSerialField(overflowPaths[0].sectionIndex, overflowPaths[0].serialIndex);
            }
            return;
        }

        if (filledSerials > 0 && filledSerials < remaining) {
            toast.info(
                `${QUOTA_UNDER_DECLARE_MESSAGE} (đang nhập ${filledSerials}, còn thiếu ${remaining - filledSerials} vé).`
            );
        }

        const payload = {
            importBatchLineId: Number(data.importBatchLineId),
            stationId: Number(data.stationId),
            drawDate: data.drawDate || resolvedBatch.drawDate,
            tickets: data.ticketSections
                .map((section) => ({
                    numbers: section.numbers.trim(),
                    serials: section.serials
                        .filter((serial) => serial.serialNumber.trim())
                        .map((serial) => ({
                            serialNumber: serial.serialNumber.trim(),
                            ticketImg:
                                typeof serial.ticketImg === 'string' && serial.ticketImg.trim()
                                    ? serial.ticketImg.trim()
                                    : undefined,
                        })),
                }))
                .filter((ticket) => ticket.numbers && ticket.serials.length > 0),
        };

        if (filledSerials === 0 || payload.tickets.length === 0) {
            toast.error('Vui lòng nhập ít nhất một dãy số kèm số sê-ri.');
            return;
        }

        try {
            const res: any = await bulkCreateAsync({ data: payload, skipGlobalErrorToast: true });
            if (res.success) {
                toast.success('Nhập vé số thành công!');
                const lineId = String(selectedLine.id);
                await clearDraft(lineId);
                const clearedDraft = defaultLineDraft();
                setLineFormDrafts((prev) => ({
                    ...prev,
                    [lineId]: clearedDraft,
                }));
                reset({
                    importBatchId: String(resolvedBatch.id),
                    importBatchLineId: lineId,
                    stationId: String(selectedLine.lotteryStationId),
                    ticketSections: clearedDraft.ticketSections,
                    drawDate: resolvedBatch.drawDate,
                });
            } else {
                toast.error(res.message || 'Nhập vé số thất bại');
            }
        } catch (err: any) {
            if (isTicketNumberLengthApiError(err)) {
                const message =
                    err?.response?.data?.message || getTicketNumberLengthMessage(numberLengthRules);
                const sections = getValues('ticketSections');
                sections.forEach((_, sectionIndex) => {
                    setError(`ticketSections.${sectionIndex}.numbers`, {
                        type: 'length',
                        message,
                    });
                });
                scrollToNumberField(0);
                return;
            }
            if (isDuplicateNumbersApiError(err)) {
                const sections = getValues('ticketSections');
                const indices = findDuplicateNumberSectionIndices(sections);
                applyDuplicateNumberFieldErrors(indices, setError);
                if (indices.length > 0) {
                    scrollToNumberField(indices[0]);
                }
                return;
            }
            if (isSerialDuplicateApiError(err)) {
                const sections = getValues('ticketSections');
                const paths = findSerialPathsForApiFailure(sections);
                applySerialDuplicateFieldErrors(paths, setError);
                if (paths.length > 0) {
                    scrollToSerialField(paths[0].sectionIndex, paths[0].serialIndex);
                }
                return;
            }
            if (isQuotaExceededApiError(err)) {
                const sections = getValues('ticketSections');
                const overflowPaths = findQuotaOverflowSerialPaths(
                    sections,
                    Math.max(0, declared - imported)
                );
                applyQuotaOverflowFieldErrors(overflowPaths, setError);
                if (overflowPaths.length > 0) {
                    scrollToSerialField(overflowPaths[0].sectionIndex, overflowPaths[0].serialIndex);
                } else {
                    toast.error(
                        err?.response?.data?.message ||
                            'Số lượng vé nhập vượt quá số lượng khai báo của dòng phiếu.'
                    );
                }
                return;
            }
            toast.error(err?.response?.data?.message || err?.message || 'Đã xảy ra lỗi khi nhập vé số');
        }
    };

    const isLoading = isBatchLoading || (!isBatchPreSelected && isLoadingDrafts);

    const outerTheme = useTheme();
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

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Nhập vé số" />
                    <Breadcrumb
                        items={[
                            { label: 'Dashboard', to: '/' },
                            { label: 'Kho vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Nhập vé' },
                        ]}
                    />
                </div>
            </div>

            <ThemeProvider theme={localTheme}>
                <Stack spacing={3} sx={{ maxWidth: 960, mx: 'auto', pb: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                            Phiếu nhập lô
                        </Typography>

                        {!isBatchPreSelected && (
                            <Autocomplete
                                sx={{ mb: 2 }}
                                options={draftBatches}
                                loading={isLoadingDrafts}
                                value={
                                    selectedBatchId
                                        ? draftBatches.find(
                                              (batch) => String(batch.id) === String(selectedBatchId)
                                          ) ?? null
                                        : null
                                }
                                onChange={(_e, batch) => handleBatchChange(batch)}
                                getOptionLabel={formatImportBatchSelectLabel}
                                isOptionEqualToValue={(a, b) => a.id === b.id}
                                noOptionsText="Không có phiếu nhập lô ở trạng thái Nháp"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Chọn phiếu nhập lô"
                                        placeholder="Chọn phiếu nhập lô trước khi nhập vé"
                                        error={!!errors.importBatchId}
                                        helperText={
                                            errors.importBatchId?.message ||
                                            'Chỉ hiển thị các phiếu nhập lô đang ở trạng thái Nháp.'
                                        }
                                    />
                                )}
                            />
                        )}

                        <ImportBatchSelectionCard
                            batch={resolvedBatch}
                            isLoading={isBatchLoading}
                            selectedBatchId={selectedBatchId}
                            resolveStationName={resolveStationName}
                        />

                        {resolvedBatch && resolvedBatch.status === 'CANCELLED' && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {getImportBatchCancelledAlertMessage(resolvedBatch.cancelReason)}
                            </Alert>
                        )}

                        {resolvedBatch &&
                            !isImportBatchEditable(resolvedBatch) &&
                            resolvedBatch.status !== 'CANCELLED' && (
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    Phiếu nhập lô này không còn ở trạng thái cho phép nhập. Không thể nhập thêm vé.
                                </Alert>
                            )}
                    </Paper>

                        {resolvedBatch && selectedLine && isLineCancelled(selectedLine) && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {getImportBatchLineCancelledAlertMessage(selectedLine.cancelReason)}
                            </Alert>
                        )}

                        {resolvedBatch && batchLines.length > 0 && (
                        <ImportBatchLineImportTabs
                            lines={batchLines}
                            activeLineId={watchedLineId}
                            batchStatus={resolvedBatch.status}
                            drawDate={resolvedBatch.drawDate}
                            resolveStationName={resolveStationName}
                            onTabChange={handleTabChange}
                            onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)}
                            isSubmitting={isPending}
                            control={control}
                            errors={errors}
                            sectionFields={sectionFields}
                            onAppendSection={handleAppendSection}
                            removeSection={handleRemoveSection}
                            onSerialFieldChange={handleSerialFieldChange}
                            onRemoveSerial={handleRemoveSerial}
                            onNumbersFieldChange={handleNumbersFieldChange}
                            numberLengthRules={numberLengthRules}
                            remainingSerialQuota={remainingSerialQuota}
                            draftSaveStatus={{
                                isSaving: isDraftSaving,
                                lastSavedAt: draftLastSavedAt,
                                saveError: draftSaveError,
                            }}
                            importedTickets={importedTickets}
                            isLoadingImportedTickets={
                                isLoadingImportedTickets || isFetchingImportedTickets
                            }
                            importBatchLineId={watchedLineId}
                            canManageImportedTickets={
                                !!resolvedBatch && isImportBatchEditable(resolvedBatch)
                            }
                            resumeFocusTarget={resumeFocusTarget}
                        />
                    )}

                    {!resolvedBatch && !isLoading && (
                        <Alert severity="info">
                            Chọn phiếu nhập lô để bắt đầu nhập vé số. Nếu chưa có phiếu, hãy{' '}
                            <Typography
                                component="span"
                                sx={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                                onClick={() => navigate(ROUTES.ADMIN.IMPORT_BATCH.CREATE)}
                            >
                                khai báo phiếu nhập lô
                            </Typography>{' '}
                            trước.
                        </Alert>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <LoadingButton
                            type="button"
                            variant="outlined"
                            label="Quay lại"
                            onClick={() => navigate(ROUTES.ADMIN.TICKETS.LIST)}
                            sx={{ minHeight: '2.75rem' }}
                        />
                    </Box>
                </Stack>
            </ThemeProvider>
        </>
    );
};

function useStateFromParam(param: string | null) {
    const [value, setValue] = useState(param || '');
    useEffect(() => {
        if (param) setValue(param);
    }, [param]);
    return [value, setValue] as const;
}
