import type { CreateTicketFormValues } from '../../../schemas/ticket.schema';
import {
    TICKET_IMPORT_DRAFT_KEY,
    clearTicketImportDraftStorage,
    isDraftExpired,
} from '../../import-batch/utils/importBatchDraftCleanup';

export { TICKET_IMPORT_DRAFT_KEY } from '../../import-batch/utils/importBatchDraftCleanup';

export type TicketImportLineDraft = {
    ticketSections: CreateTicketFormValues['ticketSections'];
};

export type TicketImportDraft = {
    savedAt: string;
    selectedBatchId: string;
    activeLineId: string;
    lineFormDrafts: Record<string, TicketImportLineDraft>;
};

const emptySerial = () => ({ serialNumber: '', ticketImg: undefined as string | undefined });

const defaultSection = () => ({
    numbers: '',
    serials: [emptySerial()],
});

/** Keep only JSON-serializable fields (drop File blobs). */
export const serializeTicketSections = (
    sections: CreateTicketFormValues['ticketSections'] | undefined
): CreateTicketFormValues['ticketSections'] => {
    if (!Array.isArray(sections) || sections.length === 0) {
        return [defaultSection()];
    }

    return sections.map((section) => ({
        numbers: typeof section?.numbers === 'string' ? section.numbers : '',
        serials:
            Array.isArray(section?.serials) && section.serials.length > 0
                ? section.serials.map((serial) => ({
                      serialNumber:
                          typeof serial?.serialNumber === 'string' ? serial.serialNumber : '',
                      ticketImg:
                          typeof serial?.ticketImg === 'string' && serial.ticketImg.trim()
                              ? serial.ticketImg.trim()
                              : undefined,
                  }))
                : [emptySerial()],
    }));
};

export const normalizeTicketImportDraft = (draft: TicketImportDraft): TicketImportDraft => {
    const lineFormDrafts: Record<string, TicketImportLineDraft> = {};
    Object.entries(draft.lineFormDrafts ?? {}).forEach(([lineId, lineDraft]) => {
        if (!lineId) {
            return;
        }
        lineFormDrafts[lineId] = {
            ticketSections: serializeTicketSections(lineDraft?.ticketSections),
        };
    });

    return {
        savedAt: draft.savedAt || new Date().toISOString(),
        selectedBatchId: draft.selectedBatchId ? String(draft.selectedBatchId) : '',
        activeLineId: draft.activeLineId ? String(draft.activeLineId) : '',
        lineFormDrafts,
    };
};

export const hasMeaningfulTicketImportDraft = (draft: TicketImportDraft | null): boolean => {
    if (!draft) {
        return false;
    }
    if (draft.selectedBatchId) {
        return true;
    }
    return Object.values(draft.lineFormDrafts).some((lineDraft) =>
        (lineDraft.ticketSections ?? []).some(
            (section) =>
                !!section.numbers?.trim() ||
                (section.serials ?? []).some(
                    (serial) => !!serial.serialNumber?.trim() || !!serial.ticketImg
                )
        )
    );
};

export const readLocalTicketImportDraft = (): TicketImportDraft | null => {
    try {
        const raw = localStorage.getItem(TICKET_IMPORT_DRAFT_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as TicketImportDraft;
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }
        if (isDraftExpired(parsed.savedAt)) {
            clearTicketImportDraftStorage();
            return null;
        }
        return normalizeTicketImportDraft(parsed);
    } catch {
        return null;
    }
};

export const writeLocalTicketImportDraft = (draft: Omit<TicketImportDraft, 'savedAt'>) => {
    try {
        const payload = normalizeTicketImportDraft({
            ...draft,
            savedAt: new Date().toISOString(),
        });
        if (!hasMeaningfulTicketImportDraft(payload)) {
            clearTicketImportDraftStorage();
            return;
        }
        localStorage.setItem(TICKET_IMPORT_DRAFT_KEY, JSON.stringify(payload));
    } catch {
        // ignore quota / private mode errors
    }
};

export const clearLocalTicketImportDraft = () => {
    clearTicketImportDraftStorage();
};

export const clearLineFromTicketImportDraft = (lineId: string) => {
    const existing = readLocalTicketImportDraft();
    if (!existing) {
        return;
    }
    const nextDrafts = { ...existing.lineFormDrafts };
    delete nextDrafts[lineId];
    writeLocalTicketImportDraft({
        selectedBatchId: existing.selectedBatchId,
        activeLineId:
            existing.activeLineId === String(lineId) ? existing.activeLineId : existing.activeLineId,
        lineFormDrafts: nextDrafts,
    });
};
