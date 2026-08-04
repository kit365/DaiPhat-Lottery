"use client";

import { useCallback, useEffect, useRef } from 'react';
import type { UseFormGetValues } from 'react-hook-form';
import type { CreateImportBatchFormValues } from '../schemas/importBatch.schema';
import {
    clearLocalImportBatchCreateDraft,
    writeLocalImportBatchCreateDraft,
} from '../utils/importBatchCreateDraft';

const AUTOSAVE_DEBOUNCE_MS = 500;

type UseImportBatchCreateDraftOptions = {
    enabled?: boolean;
    getValues: UseFormGetValues<CreateImportBatchFormValues>;
    formSnapshot: CreateImportBatchFormValues;
};

export const useImportBatchCreateDraft = ({
    enabled = true,
    getValues,
    formSnapshot,
}: UseImportBatchCreateDraftOptions) => {
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const lastPayloadRef = useRef('');
    const getValuesRef = useRef(getValues);
    getValuesRef.current = getValues;

    const persistDraft = useCallback(
        (options?: { immediate?: boolean }) => {
            if (!enabled) {
                return;
            }
            const values = getValuesRef.current();
            const payloadKey = JSON.stringify(values);
            if (!options?.immediate && payloadKey === lastPayloadRef.current) {
                return;
            }
            writeLocalImportBatchCreateDraft(values);
            lastPayloadRef.current = payloadKey;
        },
        [enabled]
    );

    const clearDraft = useCallback(() => {
        clearLocalImportBatchCreateDraft();
        lastPayloadRef.current = '';
    }, []);

    useEffect(() => {
        if (!enabled) {
            return;
        }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            persistDraft();
        }, AUTOSAVE_DEBOUNCE_MS);
        return () => clearTimeout(debounceRef.current);
    }, [enabled, formSnapshot, persistDraft]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            persistDraft({ immediate: true });
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [persistDraft]);

    return { clearDraft, persistDraft };
};
