import { useCallback, useEffect, useRef } from 'react';
import {
    clearLocalTicketImportDraft,
    writeLocalTicketImportDraft,
    type TicketImportLineDraft,
} from '../utils/ticketImportDraft';

const AUTOSAVE_DEBOUNCE_MS = 400;

type UseTicketImportDraftOptions = {
    enabled?: boolean;
    selectedBatchId: string;
    activeLineId: string;
    lineFormDrafts: Record<string, TicketImportLineDraft>;
    /** Watched form snapshot so edits to dãy số / sê-ri trigger autosave. */
    formSnapshot: unknown;
    getActiveLineSections: () => TicketImportLineDraft['ticketSections'];
};

export const useTicketImportDraft = ({
    enabled = true,
    selectedBatchId,
    activeLineId,
    lineFormDrafts,
    formSnapshot,
    getActiveLineSections,
}: UseTicketImportDraftOptions) => {
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const lastPayloadRef = useRef('');
    const closedRef = useRef(false);
    const getActiveLineSectionsRef = useRef(getActiveLineSections);
    getActiveLineSectionsRef.current = getActiveLineSections;

    const buildDraftPayload = useCallback(() => {
        const drafts = { ...lineFormDrafts };
        if (activeLineId) {
            drafts[activeLineId] = {
                ticketSections: getActiveLineSectionsRef.current(),
            };
        }
        return {
            selectedBatchId,
            activeLineId,
            lineFormDrafts: drafts,
        };
    }, [activeLineId, lineFormDrafts, selectedBatchId]);

    const persistDraft = useCallback(
        (options?: { immediate?: boolean }) => {
            if (!enabled || closedRef.current) {
                return;
            }
            const payload = buildDraftPayload();
            const payloadKey = JSON.stringify(payload);
            if (!options?.immediate && payloadKey === lastPayloadRef.current) {
                return;
            }
            writeLocalTicketImportDraft(payload);
            lastPayloadRef.current = payloadKey;
        },
        [buildDraftPayload, enabled]
    );

    const clearDraft = useCallback(() => {
        closedRef.current = true;
        clearTimeout(debounceRef.current);
        clearLocalTicketImportDraft();
        lastPayloadRef.current = '';
    }, []);

    const reopenDraft = useCallback(() => {
        closedRef.current = false;
        lastPayloadRef.current = '';
    }, []);

    useEffect(() => {
        if (!enabled || closedRef.current) {
            return;
        }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            persistDraft();
        }, AUTOSAVE_DEBOUNCE_MS);
        return () => clearTimeout(debounceRef.current);
    }, [enabled, selectedBatchId, activeLineId, lineFormDrafts, formSnapshot, persistDraft]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            persistDraft({ immediate: true });
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [persistDraft]);

    return { clearDraft, persistDraft, reopenDraft };
};
