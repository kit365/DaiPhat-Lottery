/** Shared localStorage TTL and cleanup for Import Batch / Ticket Import drafts. */

export const IMPORT_BATCH_CREATE_DRAFT_KEY = 'import-batch-create-draft';
export const IMPORT_BATCH_EDIT_DRAFT_KEY_PREFIX = 'import-batch-edit-draft:';
export const TICKET_IMPORT_DRAFT_KEY = 'ticket-import-draft';

/** Local drafts older than this are removed on read / sweep. */
export const IMPORT_WORKFLOW_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export const isDraftExpired = (savedAt?: string, now = Date.now()): boolean => {
    if (!savedAt) {
        return true;
    }
    const savedMs = Date.parse(savedAt);
    if (Number.isNaN(savedMs)) {
        return true;
    }
    return now - savedMs > IMPORT_WORKFLOW_DRAFT_TTL_MS;
};

export const safeRemoveLocalStorageItem = (key: string) => {
    try {
        localStorage.removeItem(key);
    } catch {
        // ignore private mode / quota errors
    }
};

export const importBatchEditDraftStorageKey = (batchId: string | number) =>
    `${IMPORT_BATCH_EDIT_DRAFT_KEY_PREFIX}${batchId}`;

/** Remove create-form draft. */
export const clearImportBatchCreateDraftStorage = () => {
    safeRemoveLocalStorageItem(IMPORT_BATCH_CREATE_DRAFT_KEY);
};

/** Remove edit-form draft for one batch. */
export const clearImportBatchEditDraftStorage = (batchId: string | number) => {
    safeRemoveLocalStorageItem(importBatchEditDraftStorageKey(batchId));
};

/** Remove ticket-import draft entirely. */
export const clearTicketImportDraftStorage = () => {
    safeRemoveLocalStorageItem(TICKET_IMPORT_DRAFT_KEY);
};

/**
 * Clear ticket-import draft when it belongs to the given batch
 * (or clear entirely when batchId is omitted).
 */
export const clearTicketImportDraftForBatch = (batchId?: string | number) => {
    if (batchId == null || String(batchId).trim() === '') {
        clearTicketImportDraftStorage();
        return;
    }
    try {
        const raw = localStorage.getItem(TICKET_IMPORT_DRAFT_KEY);
        if (!raw) {
            return;
        }
        const parsed = JSON.parse(raw) as { selectedBatchId?: string };
        if (String(parsed?.selectedBatchId ?? '') === String(batchId)) {
            clearTicketImportDraftStorage();
        }
    } catch {
        clearTicketImportDraftStorage();
    }
};

/**
 * Proactive cleanup after an Import Batch workflow reaches a terminal outcome
 * (confirmed/created, cancelled, or otherwise completed).
 */
export const clearImportBatchWorkflowDrafts = (batchId?: string | number) => {
    clearImportBatchCreateDraftStorage();
    if (batchId != null && String(batchId).trim() !== '') {
        clearImportBatchEditDraftStorage(batchId);
        clearTicketImportDraftForBatch(batchId);
    } else {
        clearTicketImportDraftStorage();
    }
};

const readSavedAt = (raw: string | null): string | undefined => {
    if (!raw) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(raw) as { savedAt?: string };
        return parsed?.savedAt;
    } catch {
        return undefined;
    }
};

/** Sweep expired create / edit / ticket drafts from localStorage. */
export const purgeExpiredImportWorkflowDrafts = (now = Date.now()): number => {
    let removed = 0;

    try {
        const createRaw = localStorage.getItem(IMPORT_BATCH_CREATE_DRAFT_KEY);
        if (createRaw && isDraftExpired(readSavedAt(createRaw), now)) {
            clearImportBatchCreateDraftStorage();
            removed += 1;
        }

        const ticketRaw = localStorage.getItem(TICKET_IMPORT_DRAFT_KEY);
        if (ticketRaw && isDraftExpired(readSavedAt(ticketRaw), now)) {
            clearTicketImportDraftStorage();
            removed += 1;
        }

        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(IMPORT_BATCH_EDIT_DRAFT_KEY_PREFIX)) {
                continue;
            }
            const raw = localStorage.getItem(key);
            if (isDraftExpired(readSavedAt(raw), now)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => {
            safeRemoveLocalStorageItem(key);
            removed += 1;
        });
    } catch {
        // ignore
    }

    return removed;
};
