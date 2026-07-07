import type { CreateTicketFormValues } from '../../schemas/ticket.schema';

export type TicketEntryDraftSection = {
    numbers: string;
    serials: Array<{ serialNumber: string; ticketImg?: string }>;
};

export type TicketEntryDraftResponse = {
    importBatchLineId: number;
    ticketSections: TicketEntryDraftSection[];
    updatedAt?: string;
};

export type SaveTicketEntryDraftPayload = {
    importBatchLineId: number;
    ticketSections: TicketEntryDraftSection[];
};

const emptySerial = () => ({ serialNumber: '', ticketImg: undefined as string | undefined });

export const defaultTicketEntrySection = (): TicketEntryDraftSection => ({
    numbers: '',
    serials: [emptySerial()],
});

export const normalizeTicketEntryDraftSections = (
    sections: TicketEntryDraftSection[] | CreateTicketFormValues['ticketSections'] = []
): TicketEntryDraftSection[] => {
    const normalized: TicketEntryDraftSection[] = [];
    for (const section of sections) {
        const numbers = section.numbers?.trim() ?? '';
        const serials = (section.serials ?? [])
            .map((serial) => ({
                serialNumber: serial.serialNumber?.trim() ?? '',
                ticketImg:
                    typeof serial.ticketImg === 'string' && serial.ticketImg.trim()
                        ? serial.ticketImg.trim()
                        : undefined,
            }))
            .filter((serial) => serial.serialNumber || serial.ticketImg);
        if (numbers || serials.length > 0) {
            normalized.push({ numbers, serials: serials.length > 0 ? serials : [emptySerial()] });
        }
    }
    return normalized;
};

export const toFormTicketSections = (
    sections: TicketEntryDraftSection[] | undefined
): CreateTicketFormValues['ticketSections'] => {
    if (!sections || sections.length === 0) {
        return [defaultTicketEntrySection()];
    }
    return sections.map((section) => ({
        numbers: section.numbers ?? '',
        serials:
            section.serials && section.serials.length > 0
                ? section.serials.map((serial) => ({
                      serialNumber: serial.serialNumber ?? '',
                      ticketImg: serial.ticketImg,
                  }))
                : [emptySerial()],
    }));
};

export const ticketEntryDraftStorageKey = (batchId: string | number, lineId: string | number) =>
    `ticket-entry-draft:${batchId}:${lineId}`;

export const readLocalTicketEntryDraft = (
    batchId: string | number,
    lineId: string | number
): TicketEntryDraftSection[] | null => {
    try {
        const raw = localStorage.getItem(ticketEntryDraftStorageKey(batchId, lineId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as TicketEntryDraftSection[];
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

export const writeLocalTicketEntryDraft = (
    batchId: string | number,
    lineId: string | number,
    sections: TicketEntryDraftSection[]
) => {
    try {
        localStorage.setItem(
            ticketEntryDraftStorageKey(batchId, lineId),
            JSON.stringify(sections)
        );
    } catch {
        // ignore quota errors
    }
};

export const clearLocalTicketEntryDraft = (batchId: string | number, lineId: string | number) => {
    try {
        localStorage.removeItem(ticketEntryDraftStorageKey(batchId, lineId));
    } catch {
        // ignore
    }
};
