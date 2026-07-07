import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
    deleteTicketEntryDraft,
    getTicketEntryDrafts,
    saveTicketEntryDraft,
    type TicketEntryDraftSection,
} from '../../../api/ticket.api';
import { QUERY_KEYS } from '../../../../constants/queryKeys';
import type { CreateTicketFormValues } from '../../../schemas/ticket.schema';
import {
    clearLocalTicketEntryDraft,
    normalizeTicketEntryDraftSections,
    readLocalTicketEntryDraft,
    toFormTicketSections,
    writeLocalTicketEntryDraft,
} from '../utils/ticketEntryDraft';

const AUTOSAVE_DEBOUNCE_MS = 1000;
const MAX_SAVE_RETRIES = 2;

type UseTicketEntryAutosaveOptions = {
    importBatchId?: string | number;
    importBatchLineId?: string;
    ticketSections: CreateTicketFormValues['ticketSections'];
    enabled?: boolean;
};

export const useTicketEntryAutosave = ({
    importBatchId,
    importBatchLineId,
    ticketSections,
    enabled = true,
}: UseTicketEntryAutosaveOptions) => {
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const lastPayloadRef = useRef('');
    const sectionsRef = useRef(ticketSections);
    const lineIdRef = useRef(importBatchLineId);
    const batchIdRef = useRef(importBatchId);

    sectionsRef.current = ticketSections;
    lineIdRef.current = importBatchLineId;
    batchIdRef.current = importBatchId;

    const {
        data: serverDrafts = [],
        isLoading: isLoadingDrafts,
        isFetching: isFetchingDrafts,
    } = useQuery({
        queryKey: [QUERY_KEYS.TICKET_ENTRY_DRAFTS, importBatchId],
        queryFn: async () => {
            const response = await getTicketEntryDrafts(importBatchId!);
            return response.data ?? [];
        },
        enabled: enabled && !!importBatchId,
        staleTime: 30_000,
    });

    const draftsByLineId = useMemo(() => {
        const map: Record<string, { ticketSections: TicketEntryDraftSection[]; updatedAt?: string }> =
            {};
        for (const draft of serverDrafts) {
            const lineId = String(draft.importBatchLineId);
            map[lineId] = {
                ticketSections: draft.ticketSections ?? [],
                updatedAt: draft.updatedAt,
            };
        }
        return map;
    }, [serverDrafts]);

    const buildLineFormDraft = useCallback(
        (lineId: string) => {
            const serverDraft = draftsByLineId[lineId];
            if (serverDraft?.ticketSections?.length) {
                return { ticketSections: toFormTicketSections(serverDraft.ticketSections) };
            }
            if (importBatchId) {
                const localDraft = readLocalTicketEntryDraft(importBatchId, lineId);
                if (localDraft?.length) {
                    return { ticketSections: toFormTicketSections(localDraft) };
                }
            }
            return null;
        },
        [draftsByLineId, importBatchId]
    );

    const saveDraftInternal = useCallback(
        async (
            lineId: string,
            sections: CreateTicketFormValues['ticketSections'],
            options?: { immediate?: boolean }
        ) => {
            if (!enabled || !lineId) {
                return;
            }

            const normalized = normalizeTicketEntryDraftSections(sections);
            const payloadKey = JSON.stringify({ lineId, normalized });
            if (!options?.immediate && payloadKey === lastPayloadRef.current) {
                return;
            }

            setIsSaving(true);
            setSaveError(null);

            let attempt = 0;
            while (attempt <= MAX_SAVE_RETRIES) {
                try {
                    const response = await saveTicketEntryDraft(
                        {
                            importBatchLineId: Number(lineId),
                            ticketSections: normalized,
                        },
                        { skipGlobalErrorToast: true }
                    );
                    if (importBatchId) {
                        writeLocalTicketEntryDraft(importBatchId, lineId, normalized);
                    }
                    lastPayloadRef.current = payloadKey;
                    setLastSavedAt(
                        response.data?.updatedAt ? new Date(response.data.updatedAt) : new Date()
                    );
                    if (importBatchId) {
                        queryClient.setQueryData(
                            [QUERY_KEYS.TICKET_ENTRY_DRAFTS, importBatchId],
                            (current: typeof serverDrafts | undefined) => {
                                const next = [...(current ?? [])].filter(
                                    (draft) => String(draft.importBatchLineId) !== lineId
                                );
                                next.push({
                                    importBatchLineId: Number(lineId),
                                    ticketSections: normalized,
                                    updatedAt: response.data?.updatedAt,
                                });
                                return next;
                            }
                        );
                    }
                    setIsSaving(false);
                    return;
                } catch {
                    attempt += 1;
                    if (attempt > MAX_SAVE_RETRIES) {
                        setSaveError('Không thể lưu nháp');
                        toast.error('Không thể lưu nháp. Vui lòng kiểm tra kết nối mạng.');
                        setIsSaving(false);
                    }
                }
            }
        },
        [enabled, importBatchId, queryClient]
    );

    const flushSave = useCallback(async () => {
        const lineId = lineIdRef.current;
        if (!lineId) {
            return;
        }
        await saveDraftInternal(lineId, sectionsRef.current, { immediate: true });
    }, [saveDraftInternal]);

    const clearDraft = useCallback(
        async (lineId: string) => {
            if (!lineId) {
                return;
            }
            try {
                await deleteTicketEntryDraft(lineId, { skipGlobalErrorToast: true });
            } catch {
                // backend may already clear on bulk import
            }
            if (importBatchId) {
                clearLocalTicketEntryDraft(importBatchId, lineId);
                queryClient.setQueryData(
                    [QUERY_KEYS.TICKET_ENTRY_DRAFTS, importBatchId],
                    (current: typeof serverDrafts | undefined) =>
                        (current ?? []).filter(
                            (draft) => String(draft.importBatchLineId) !== lineId
                        )
                );
            }
            lastPayloadRef.current = '';
            setLastSavedAt(null);
            setSaveError(null);
        },
        [importBatchId, queryClient]
    );

    useEffect(() => {
        if (!enabled || !importBatchLineId) {
            return;
        }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            void saveDraftInternal(importBatchLineId, ticketSections);
        }, AUTOSAVE_DEBOUNCE_MS);
        return () => clearTimeout(debounceRef.current);
    }, [enabled, importBatchLineId, ticketSections, saveDraftInternal]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            const lineId = lineIdRef.current;
            if (!enabled || !lineId) {
                return;
            }
            void saveDraftInternal(lineId, sectionsRef.current, { immediate: true });
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [enabled, saveDraftInternal]);

    return {
        draftsByLineId,
        buildLineFormDraft,
        isLoadingDrafts: isLoadingDrafts || isFetchingDrafts,
        isSaving,
        lastSavedAt,
        saveError,
        flushSave,
        clearDraft,
    };
};
