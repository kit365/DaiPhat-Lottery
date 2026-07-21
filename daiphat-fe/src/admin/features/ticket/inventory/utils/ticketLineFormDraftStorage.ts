import type { CreateTicketFormValues } from '../schemas/ticket.schema';
import { countFilledSerials } from './ticketSerialValidation';

export type TicketLineFormDraft = {
    ticketSections: CreateTicketFormValues['ticketSections'];
};

type TicketLineFormDraftStore = {
    batchId: string;
    lines: Record<string, TicketLineFormDraft>;
    savedAt: string;
};

const STORAGE_PREFIX = 'ticket-create-line-drafts:';

export const ticketLineFormDraftStorageKey = (batchId: string | number) =>
    `${STORAGE_PREFIX}${batchId}`;

const emptySerial = () => ({ serialNumber: '', ticketImg: undefined as string | undefined });

export const defaultTicketLineFormDraft = (): TicketLineFormDraft => ({
    ticketSections: [{ numbers: '', serials: [emptySerial()] }],
});

export const readTicketLineFormDrafts = (
    batchId: string | number
): Record<string, TicketLineFormDraft> => {
    try {
        const raw = localStorage.getItem(ticketLineFormDraftStorageKey(batchId));
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw) as TicketLineFormDraftStore;
        if (!parsed || typeof parsed !== 'object' || !parsed.lines) {
            return {};
        }
        return parsed.lines;
    } catch {
        return {};
    }
};

export const readTicketLineFormDraft = (
    batchId: string | number,
    lineId: string | number
): TicketLineFormDraft | null => {
    const drafts = readTicketLineFormDrafts(batchId);
    return drafts[String(lineId)] ?? null;
};

export const writeTicketLineFormDrafts = (
    batchId: string | number,
    lines: Record<string, TicketLineFormDraft>
) => {
    try {
        const payload: TicketLineFormDraftStore = {
            batchId: String(batchId),
            lines,
            savedAt: new Date().toISOString(),
        };
        localStorage.setItem(ticketLineFormDraftStorageKey(batchId), JSON.stringify(payload));
    } catch {
        // ignore quota / private mode errors
    }
};

export const writeTicketLineFormDraft = (
    batchId: string | number,
    lineId: string | number,
    draft: TicketLineFormDraft
) => {
    const lines = readTicketLineFormDrafts(batchId);
    lines[String(lineId)] = draft;
    writeTicketLineFormDrafts(batchId, lines);
};

export const clearTicketLineFormDraft = (batchId: string | number, lineId: string | number) => {
    const lines = readTicketLineFormDrafts(batchId);
    delete lines[String(lineId)];
    if (Object.keys(lines).length === 0) {
        clearTicketLineFormDrafts(batchId);
        return;
    }
    writeTicketLineFormDrafts(batchId, lines);
};

export const clearTicketLineFormDrafts = (batchId: string | number) => {
    try {
        localStorage.removeItem(ticketLineFormDraftStorageKey(batchId));
    } catch {
        // ignore
    }
};

/** Filled serials pending in Ticket Create draft for a line (not yet saved to server). */
export const getPendingFilledSerialCount = (
    batchId: string | number,
    lineId: string | number
): number => {
    const draft = readTicketLineFormDraft(batchId, lineId);
    if (!draft?.ticketSections?.length) {
        return 0;
    }
    return countFilledSerials(draft.ticketSections);
};
