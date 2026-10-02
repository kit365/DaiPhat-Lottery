import { useCallback, useEffect, useState } from 'react';
import {
    OCR_IMPORT_DRAFT_KEY,
    type OcrImportDraft,
} from '../types/ticketOcr.type';

export const OCR_IMPORT_DRAFT_CHANGED_EVENT = 'ocr-import-draft-changed';

export const readOcrImportDraft = (): OcrImportDraft | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw =
            localStorage.getItem(OCR_IMPORT_DRAFT_KEY) ??
            sessionStorage.getItem(OCR_IMPORT_DRAFT_KEY);
        if (!raw) return null;

        const draft = JSON.parse(raw) as OcrImportDraft;
        if (!localStorage.getItem(OCR_IMPORT_DRAFT_KEY)) {
            localStorage.setItem(OCR_IMPORT_DRAFT_KEY, raw);
            sessionStorage.removeItem(OCR_IMPORT_DRAFT_KEY);
        }
        return draft;
    } catch {
        return null;
    }
};

const notifyDraftChanged = () => {
    window.dispatchEvent(new Event(OCR_IMPORT_DRAFT_CHANGED_EVENT));
};

export const writeOcrImportDraft = (draft: OcrImportDraft) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(OCR_IMPORT_DRAFT_KEY, JSON.stringify(draft));
    sessionStorage.removeItem(OCR_IMPORT_DRAFT_KEY);
    notifyDraftChanged();
};

export const clearOcrImportDraft = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(OCR_IMPORT_DRAFT_KEY);
    sessionStorage.removeItem(OCR_IMPORT_DRAFT_KEY);
    notifyDraftChanged();
};

export const hasPendingOcrImportDraft = () =>
    (readOcrImportDraft()?.rows?.length ?? 0) > 0;

/** Shared live view of the same persisted draft used by the OCR wizard. */
export const useHasPendingOcrImportDraft = () => {
    const [hasPendingDraft, setHasPendingDraft] = useState(false);
    const refresh = useCallback(() => setHasPendingDraft(hasPendingOcrImportDraft()), []);

    useEffect(() => {
        refresh();
        window.addEventListener('storage', refresh);
        window.addEventListener('focus', refresh);
        window.addEventListener(OCR_IMPORT_DRAFT_CHANGED_EVENT, refresh);
        return () => {
            window.removeEventListener('storage', refresh);
            window.removeEventListener('focus', refresh);
            window.removeEventListener(OCR_IMPORT_DRAFT_CHANGED_EVENT, refresh);
        };
    }, [refresh]);

    return hasPendingDraft;
};
