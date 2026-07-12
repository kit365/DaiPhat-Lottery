import { useCallback, useEffect, useRef } from 'react';
import type { UseFormGetValues } from 'react-hook-form';
import type { UpdateImportBatchFormValues } from '../schemas/importBatch.schema';
import {
    clearLocalImportBatchEditDraft,
    writeLocalImportBatchEditDraft,
} from '../utils/importBatchEditDraft';

const AUTOSAVE_DEBOUNCE_MS = 500;

type UseImportBatchEditDraftOptions = {
    batchId?: string;
    enabled?: boolean;
    getValues: UseFormGetValues<UpdateImportBatchFormValues>;
    formSnapshot: UpdateImportBatchFormValues;
};

export const useImportBatchEditDraft = ({
    batchId,
    enabled = true,
    getValues,
    formSnapshot,
}: UseImportBatchEditDraftOptions) => {
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const lastPayloadRef = useRef('');
    const closedRef = useRef(false);
    const getValuesRef = useRef(getValues);
    getValuesRef.current = getValues;

    const persistDraft = useCallback(
        (options?: { immediate?: boolean }) => {
            if (!enabled || !batchId || closedRef.current) {
                return;
            }
            const values = getValuesRef.current();
            const payloadKey = JSON.stringify(values);
            if (!options?.immediate && payloadKey === lastPayloadRef.current) {
                return;
            }
            writeLocalImportBatchEditDraft(batchId, values);
            lastPayloadRef.current = payloadKey;
        },
        [batchId, enabled]
    );

    const clearDraft = useCallback(() => {
        closedRef.current = true;
        clearTimeout(debounceRef.current);
        if (batchId) {
            clearLocalImportBatchEditDraft(batchId);
        }
        lastPayloadRef.current = '';
    }, [batchId]);

    const reopenDraft = useCallback(() => {
        closedRef.current = false;
        lastPayloadRef.current = '';
    }, []);

    useEffect(() => {
        if (!enabled || !batchId || closedRef.current) {
            return;
        }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            persistDraft();
        }, AUTOSAVE_DEBOUNCE_MS);
        return () => clearTimeout(debounceRef.current);
    }, [batchId, enabled, formSnapshot, persistDraft]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            persistDraft({ immediate: true });
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [persistDraft]);

    return { clearDraft, persistDraft, reopenDraft };
};
