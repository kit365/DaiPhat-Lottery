"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { FieldErrors, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useRegions } from '../../../region/hooks/useRegion';
import { useStations } from '../../../station/hooks/useStation';
import { QUERY_KEYS as IMPORT_BATCH_QUERY_KEYS } from '../../import-batch/constants/queryKeys';
import { useImportBatchDetail, useImportBatchLineEntryTickets } from '../../import-batch/hooks/useImportBatch';
import type { ImportBatchLine } from '../../import-batch/types/importBatch.type';
import {
    getImportBatchLineCancelledAlertMessage,
    IMPORT_BATCH_LINE_PAUSED_ENTRY_MESSAGE,
} from '../../import-batch/utils/batchTypeLabels';
import { isLineCancelled, isLinePaused } from '../../import-batch/utils/importBatchProgress';
import { buildCreateTicketSchema, CreateTicketFormValues } from '../schemas/ticket.schema';
import {
    clearTicketLineFormDraft,
    defaultTicketLineFormDraft,
    readTicketLineFormDraft,
    writeTicketLineFormDraft,
    type TicketLineFormDraft,
} from '../utils/ticketLineFormDraftStorage';
import {
    countPendingFilledSerials,
    extractPendingDraftSections,
    mergePersistedAndDraftSections,
} from '../utils/ticketLineFormHydration';
import {
    applySectionQuantityFieldErrors,
    canAppendTicketSection,
    countTotalQuotaSlots,
    ensureSectionsQuantity,
    findSectionQuantityOverflowIssues,
} from '../utils/ticketSectionQuantity';
import {
    applyDuplicateNumberFieldErrors,
    applyMissingSerialImageFieldErrors,
    applyQuotaOverflowFieldErrors,
    applySectionRelationshipFieldErrors,
    applySerialDuplicateFieldErrors,
    clearDuplicateNumberFieldErrors,
    clearSerialDuplicateFieldErrors,
    findDuplicateNumberSectionIndices,
    findDuplicateSerialPaths,
    findFirstSerialErrorPath,
    findMissingSerialImagePaths,
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
    scrollToSerialImageField,
} from '../utils/ticketSerialValidation';
import {
    getTicketNumberLengthMessage,
    isTicketNumberLengthApiError,
    isTicketNumberLengthValid,
    resolveRegionLengthRules,
} from '../utils/ticketNumberValidation';
import { useBulkCreateTickets } from './useTicket';
import {
    IMPORT_LINE_DB_AUTOSAVE_DEBOUNCE_MS,
    IMPORT_LINE_DB_AUTOSAVE_SERIAL_THRESHOLD,
    IMPORT_LINE_DRAFT_AUTOSAVE_MS,
} from '../constants/importBatchLineImport.constants';
import { buildImportBatchLineSubmitPayload } from '../utils/importBatchLineImportSubmit';

type LineFormDraft = TicketLineFormDraft;

const defaultSection = () => defaultTicketLineFormDraft().ticketSections[0];
const defaultLineDraft = (): LineFormDraft => defaultTicketLineFormDraft();

type UseImportBatchLineImportFormOptions = {
    batchId: string | null;
    activeLineId: string | null;
    enabled?: boolean;
    onSuccess?: () => void;
};

export const useImportBatchLineImportForm = ({
    batchId,
    activeLineId,
    enabled = true,
    onSuccess,
}: UseImportBatchLineImportFormOptions) => {
    const queryClient = useQueryClient();
    const hydratedEntryKeyRef = useRef<string | null>(null);
    const draftPersistReadyRef = useRef(false);
    const isApplyingLineRef = useRef(false);
    const autoSaveTimerRef = useRef<number | undefined>(undefined);
    const isAutoSavingRef = useRef(false);

    const { data: importBatchDetail, isLoading: isBatchLoading } = useImportBatchDetail(
        enabled ? batchId || undefined : undefined
    );

    const resolvedBatch =
        importBatchDetail && batchId && String(importBatchDetail.id) === String(batchId)
            ? importBatchDetail
            : null;
    const batchLines = resolvedBatch?.lines ?? [];

    const { data: providersRes } = useStations({ limit: 1000 });
    const providers = (providersRes as { data?: { recordList?: Array<{ id?: number; _id?: number; name?: string; region?: string }> } })?.data?.recordList || [];
    const { data: regionsRes } = useRegions();
    const regions = regionsRes?.data || [];

    const activeLine = useMemo(() => {
        if (!activeLineId) {
            return null;
        }
        return batchLines.find((line) => String(line.id) === String(activeLineId)) ?? null;
    }, [activeLineId, batchLines]);

    const resolveRulesForStation = useCallback(
        (stationId?: string | number) => {
            const provider = providers.find((p) => String(p.id || p._id) === String(stationId));
            const region = regions.find((r: { code?: string }) => r.code === provider?.region);
            return resolveRegionLengthRules(region);
        },
        [providers, regions]
    );

    const numberLengthRulesRef = useRef(resolveRulesForStation(activeLine?.lotteryStationId));

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
            importBatchId: batchId || '',
            importBatchLineId: activeLineId || '',
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
        data: entryTicketsData,
        isFetching: isFetchingEntryTickets,
        refetch: refetchEntryTickets,
    } = useImportBatchLineEntryTickets(
        enabled ? batchId || undefined : undefined,
        enabled ? activeLineId || undefined : undefined
    );

    const selectedLine = useMemo(() => {
        const lineId = watchedLineId || activeLineId;
        if (!lineId) {
            return null;
        }
        return batchLines.find((line) => String(line.id) === String(lineId)) ?? null;
    }, [activeLineId, batchLines, watchedLineId]);

    const numberLengthRules = useMemo(
        () => resolveRulesForStation(watchedStationId || selectedLine?.lotteryStationId),
        [resolveRulesForStation, selectedLine?.lotteryStationId, watchedStationId]
    );

    useEffect(() => {
        numberLengthRulesRef.current = numberLengthRules;
    }, [numberLengthRules]);

    const { mutateAsync: bulkCreateAsync, isPending } = useBulkCreateTickets();

    const persistDraftToLocal = useCallback(() => {
        if (!batchId || !activeLineId || !draftPersistReadyRef.current || isApplyingLineRef.current) {
            return;
        }

        const pendingSections = extractPendingDraftSections(getValues('ticketSections'));
        if (pendingSections == null) {
            return;
        }

        writeTicketLineFormDraft(batchId, activeLineId, {
            ticketSections: pendingSections,
        });
    }, [activeLineId, batchId, getValues]);

    const refreshFormAfterPersist = useCallback(
        async (lineId: string, line: ImportBatchLine, filledSerials: number, remainingBefore: number) => {
            if (!resolvedBatch) {
                return;
            }

            clearTicketLineFormDraft(resolvedBatch.id, lineId);
            hydratedEntryKeyRef.current = null;

            await queryClient.invalidateQueries({
                queryKey: [IMPORT_BATCH_QUERY_KEYS.IMPORT_BATCH_DETAIL],
            });
            await queryClient.invalidateQueries({
                queryKey: [IMPORT_BATCH_QUERY_KEYS.IMPORT_BATCH_LIST],
            });
            await queryClient.invalidateQueries({
                queryKey: [
                    IMPORT_BATCH_QUERY_KEYS.IMPORT_BATCH_LINE_ENTRY_TICKETS,
                    String(resolvedBatch.id),
                    lineId,
                ],
            });

            const refreshed = await refetchEntryTickets();
            const tickets = refreshed.data?.tickets ?? [];
            const remainingAfter = Math.max(0, remainingBefore - filledSerials);
            const mergedSections = ensureSectionsQuantity(
                mergePersistedAndDraftSections(tickets, defaultLineDraft(), {
                    appendEditableSlot: remainingAfter > 0,
                })
            );

            isApplyingLineRef.current = true;
            draftPersistReadyRef.current = false;
            reset({
                importBatchId: String(resolvedBatch.id),
                importBatchLineId: lineId,
                stationId: String(line.lotteryStationId),
                ticketSections: mergedSections,
                drawDate: resolvedBatch.drawDate,
            });
            window.setTimeout(() => {
                draftPersistReadyRef.current = true;
                isApplyingLineRef.current = false;
            }, 0);
        },
        [queryClient, refetchEntryTickets, reset, resolvedBatch]
    );

    const resolveStationName = useCallback(
        (stationId?: number | string) => {
            if (!stationId) return '—';
            return (
                providers.find((p) => String(p.id || p._id) === String(stationId))?.name ??
                `Đài #${stationId}`
            );
        },
        [providers]
    );

    const applyLineToForm = useCallback(
        (lineId: string) => {
            if (!resolvedBatch) {
                return;
            }
            const line = batchLines.find((item) => String(item.id) === lineId);
            if (!line) {
                return;
            }
            const draft = readTicketLineFormDraft(resolvedBatch.id, lineId);
            const tickets =
                entryTicketsData && String(entryTicketsData.importBatchLineId) === String(lineId)
                    ? entryTicketsData.tickets
                    : [];
            const remaining = Math.max(0, (line.declareQuantity ?? 0) - (line.totalQuantity ?? 0));
            const mergedSections = ensureSectionsQuantity(
                mergePersistedAndDraftSections(tickets, draft, {
                    appendEditableSlot: remaining > 0,
                })
            );

            isApplyingLineRef.current = true;
            draftPersistReadyRef.current = false;
            reset({
                importBatchId: String(resolvedBatch.id),
                importBatchLineId: lineId,
                stationId: String(line.lotteryStationId),
                ticketSections: mergedSections,
                drawDate: resolvedBatch.drawDate,
            });
            window.setTimeout(() => {
                draftPersistReadyRef.current = true;
                isApplyingLineRef.current = false;
            }, 0);
        },
        [batchLines, entryTicketsData, reset, resolvedBatch]
    );

    useEffect(() => {
        if (!enabled || !activeLineId || !resolvedBatch) {
            return;
        }
        hydratedEntryKeyRef.current = null;
        draftPersistReadyRef.current = false;
        applyLineToForm(activeLineId);
    }, [activeLineId, applyLineToForm, enabled, resolvedBatch?.id]);

    useEffect(() => {
        if (!enabled || !resolvedBatch || !activeLineId || !entryTicketsData) {
            return;
        }
        if (String(entryTicketsData.importBatchLineId) !== String(activeLineId)) {
            return;
        }
        if (isFetchingEntryTickets) {
            return;
        }
        const hydrateKey = `${entryTicketsData.importBatchId}:${entryTicketsData.importBatchLineId}:${entryTicketsData.tickets
            .map((ticket) => `${ticket.id}:${(ticket.serials ?? []).map((s) => s.id).join(',')}`)
            .join('|')}`;
        if (hydratedEntryKeyRef.current === hydrateKey) {
            return;
        }
        hydratedEntryKeyRef.current = hydrateKey;
        applyLineToForm(activeLineId);
    }, [
        activeLineId,
        applyLineToForm,
        enabled,
        entryTicketsData,
        isFetchingEntryTickets,
        resolvedBatch,
    ]);

    useEffect(() => {
        if (!enabled || !batchId || !activeLineId) {
            return;
        }

        const debounceId = window.setTimeout(() => {
            persistDraftToLocal();
        }, IMPORT_LINE_DRAFT_AUTOSAVE_MS);

        return () => {
            window.clearTimeout(debounceId);
            persistDraftToLocal();
        };
    }, [activeLineId, batchId, enabled, persistDraftToLocal, watchedTicketSections]);

    const tryAutoSaveTickets = useCallback(async () => {
        if (
            !enabled ||
            !resolvedBatch ||
            !selectedLine ||
            !activeLineId ||
            isPending ||
            isAutoSavingRef.current ||
            isApplyingLineRef.current
        ) {
            return;
        }

        if (isLineCancelled(selectedLine) || isLinePaused(selectedLine)) {
            return;
        }

        const imported = selectedLine.totalQuantity ?? 0;
        const declared = selectedLine.declareQuantity ?? 0;
        const remaining = Math.max(0, declared - imported);
        if (declared > 0 && imported >= declared) {
            return;
        }

        const data = getValues();
        const duplicatePaths = findDuplicateSerialPaths(data.ticketSections);
        const duplicateNumberIndices = findDuplicateNumberSectionIndices(data.ticketSections);
        if (duplicatePaths.length > 0 || duplicateNumberIndices.length > 0) {
            return;
        }

        const filledSerials = countPendingFilledSerials(data.ticketSections);
        if (filledSerials === 0 || filledSerials > remaining) {
            return;
        }

        const payload = buildImportBatchLineSubmitPayload(data, {
            drawDate: resolvedBatch.drawDate,
            isAutoSave: true,
            requireTicketImages: false,
        });
        if (!payload) {
            return;
        }

        try {
            isAutoSavingRef.current = true;
            const res = await bulkCreateAsync({ data: payload, skipGlobalErrorToast: true });
            if (!res.success) {
                return;
            }

            toast.info(`Đã tự lưu ${filledSerials.toLocaleString('vi-VN')} vé vào hệ thống.`);
            await refreshFormAfterPersist(String(selectedLine.id), selectedLine, filledSerials, remaining);
            onSuccess?.();
        } catch {
            // Keep draft locally when auto-save fails; operator can retry manually.
        } finally {
            isAutoSavingRef.current = false;
        }
    }, [
        activeLineId,
        bulkCreateAsync,
        enabled,
        getValues,
        isPending,
        onSuccess,
        refreshFormAfterPersist,
        resolvedBatch,
        selectedLine,
    ]);

    useEffect(() => {
        if (!enabled || !batchId || !activeLineId || !draftPersistReadyRef.current) {
            return;
        }

        const pendingCount = countPendingFilledSerials(watchedTicketSections ?? []);
        if (pendingCount === 0) {
            return;
        }

        window.clearTimeout(autoSaveTimerRef.current);
        const delay =
            pendingCount >= IMPORT_LINE_DB_AUTOSAVE_SERIAL_THRESHOLD
                ? 0
                : IMPORT_LINE_DB_AUTOSAVE_DEBOUNCE_MS;

        autoSaveTimerRef.current = window.setTimeout(() => {
            void tryAutoSaveTickets();
        }, delay);

        return () => {
            window.clearTimeout(autoSaveTimerRef.current);
        };
    }, [
        activeLineId,
        batchId,
        enabled,
        tryAutoSaveTickets,
        watchedTicketSections,
    ]);

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

    const handleSerialFieldChange = useCallback(() => {
        refreshDuplicateFieldState();
        window.setTimeout(() => {
            persistDraftToLocal();
        }, 0);
    }, [persistDraftToLocal, refreshDuplicateFieldState]);

    const handleRemoveSerial = useCallback(() => {
        queueMicrotask(() => {
            refreshDuplicateFieldState();
        });
    }, [refreshDuplicateFieldState]);

    const handleAppendSection = useCallback(() => {
        const lineId = watch('importBatchLineId');
        const line = batchLines.find((item) => String(item.id) === String(lineId));
        const remaining = line
            ? Math.max(0, (line.declareQuantity ?? 0) - (line.totalQuantity ?? 0))
            : 0;
        const sections = getValues('ticketSections');
        if (!canAppendTicketSection(sections, remaining)) {
            toast.error('Đã hết số lượng vé có thể nhập cho đài này');
            return;
        }

        const newIndex = sections.length;
        appendSection(defaultSection());
        scrollAndFocusNumberField(newIndex);
    }, [appendSection, batchLines, getValues, watch]);

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
                if (sectionError && typeof sectionError === 'object' && 'quantity' in sectionError) {
                    scrollToNumberField(sectionIndex);
                    return;
                }
                if (sectionError && typeof sectionError === 'object' && 'numbers' in sectionError) {
                    scrollToNumberField(sectionIndex);
                    return;
                }
            }
        }

        const firstPath = findFirstSerialErrorPath(formErrors);
        if (firstPath) {
            const serialError = formErrors.ticketSections?.[firstPath.sectionIndex]?.serials?.[
                firstPath.serialIndex
            ];
            if (
                serialError &&
                typeof serialError === 'object' &&
                'ticketImg' in serialError &&
                serialError.ticketImg
            ) {
                scrollToSerialImageField(firstPath.sectionIndex, firstPath.serialIndex);
            } else {
                scrollToSerialField(firstPath.sectionIndex, firstPath.serialIndex);
            }
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

        if (isLinePaused(selectedLine)) {
            toast.warning(IMPORT_BATCH_LINE_PAUSED_ENTRY_MESSAGE);
            return;
        }

        const imported = selectedLine.totalQuantity ?? 0;
        const declared = selectedLine.declareQuantity ?? 0;
        const remaining = Math.max(0, declared - imported);
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

        const missingImagePaths = findMissingSerialImagePaths(data.ticketSections);
        if (missingImagePaths.length > 0) {
            applyMissingSerialImageFieldErrors(missingImagePaths, setError);
            scrollToSerialImageField(
                missingImagePaths[0].sectionIndex,
                missingImagePaths[0].serialIndex
            );
            return;
        }

        const quantityIssues = findSectionQuantityOverflowIssues(data.ticketSections, remaining);
        if (quantityIssues.length > 0) {
            applySectionQuantityFieldErrors(quantityIssues, setError);
            scrollToNumberField(quantityIssues[0].sectionIndex);
            return;
        }

        if (countTotalQuotaSlots(data.ticketSections) > remaining) {
            toast.error('Tổng số lượng vé vượt quá số vé còn lại có thể nhập');
            return;
        }

        const filledSerials = countPendingFilledSerials(data.ticketSections);
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

        const payload = buildImportBatchLineSubmitPayload(data, {
            drawDate: resolvedBatch.drawDate,
            isAutoSave: false,
            requireTicketImages: true,
        });

        if (!payload || filledSerials === 0) {
            toast.error('Vui lòng nhập ít nhất một dãy số kèm số sê-ri.');
            return;
        }

        try {
            const res = await bulkCreateAsync({ data: payload, skipGlobalErrorToast: true });
            if (res.success) {
                toast.success('Nhập vé số thành công!');
                await refreshFormAfterPersist(
                    String(selectedLine.id),
                    selectedLine,
                    filledSerials,
                    remaining
                );
                onSuccess?.();
            } else {
                toast.error(res.message || 'Nhập vé số thất bại');
            }
        } catch (err: unknown) {
            const apiErr = err as {
                response?: { data?: { message?: string } };
                message?: string;
            };
            if (isTicketNumberLengthApiError(err)) {
                const message =
                    apiErr?.response?.data?.message || getTicketNumberLengthMessage(numberLengthRules);
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
                        apiErr?.response?.data?.message ||
                            'Số lượng vé nhập vượt quá số lượng khai báo của dòng phiếu.'
                    );
                }
                return;
            }
            toast.error(apiErr?.response?.data?.message || apiErr?.message || 'Đã xảy ra lỗi khi nhập vé số');
        }
    };

    const dialogLine: ImportBatchLine | null = activeLine;

    return {
        resolvedBatch,
        batchLines,
        dialogLine,
        isBatchLoading,
        isPending,
        resolveStationName,
        control,
        errors,
        sectionFields,
        numberLengthRules,
        handleSubmit,
        onSubmit,
        handleInvalidSubmit,
        handleAppendSection,
        handleRemoveSection,
        handleSerialFieldChange,
        handleRemoveSerial,
        handleNumbersFieldChange,
    };
};
