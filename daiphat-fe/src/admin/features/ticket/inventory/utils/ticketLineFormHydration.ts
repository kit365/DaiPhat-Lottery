import type { CreateTicketFormValues } from '../schemas/ticket.schema';
import type { TicketLineFormDraft } from './ticketLineFormDraftStorage';
import { defaultTicketLineFormDraft } from './ticketLineFormDraftStorage';
import { ensureSectionsQuantity } from './ticketSectionQuantity';

export type EntryTicketSerial = {
    id?: number;
    serialNumber?: string | null;
    ticketImg?: string | null;
};

export type EntryTicket = {
    id?: number;
    numbers?: string | null;
    serials?: EntryTicketSerial[] | null;
};

type FormSection = CreateTicketFormValues['ticketSections'][number];
type FormSerial = FormSection['serials'][number];

type MergeSectionsOptions = {
    /** When false, do not append a blank editable section (e.g. line already fully imported). */
    appendEditableSlot?: boolean;
};

const emptySerial = (): FormSerial => ({
    serialNumber: '',
    ticketImg: undefined,
});

const normalizeNumbers = (value?: string | null) => (value ?? '').trim();
const normalizeSerial = (value?: string | null) => (value ?? '').trim().toLowerCase();

export const hasPendingSerialContent = (serial?: FormSerial | null) =>
    !!normalizeSerial(serial?.serialNumber) ||
    (typeof serial?.ticketImg === 'string' && serial.ticketImg.trim().length > 0);

export const isPersistedSerial = (serial?: { id?: string | number | null } | null) =>
    serial?.id != null && String(serial.id).trim() !== '';

export const mapEntryTicketsToSections = (tickets: EntryTicket[] = []): FormSection[] => {
    const sections: FormSection[] = [];

    tickets.forEach((ticket) => {
        const numbers = normalizeNumbers(ticket.numbers);
        if (!numbers) {
            return;
        }
        const serials = (ticket.serials ?? [])
            .filter((serial) => normalizeSerial(serial.serialNumber))
            .map((serial) => ({
                id: serial.id,
                serialNumber: (serial.serialNumber ?? '').trim(),
                ticketImg: serial.ticketImg?.trim() || undefined,
            }));

        if (serials.length === 0) {
            return;
        }

        sections.push({
            ticketId: ticket.id,
            numbers,
            quantity: serials.length,
            serials,
        });
    });

    return sections;
};

/**
 * Merge persisted server tickets with unsaved draft sections.
 * Draft serials whose (numbers, serialNumber) already exist on the server are skipped.
 * Ensures at least one editable empty slot for continued entry.
 */
export const mergePersistedAndDraftSections = (
    persistedTickets: EntryTicket[] = [],
    draft?: TicketLineFormDraft | null,
    options?: MergeSectionsOptions
): FormSection[] => {
    const shouldAppendEditableSlot = options?.appendEditableSlot ?? true;
    const persistedSections = mapEntryTicketsToSections(persistedTickets);
    const draftSections = draft?.ticketSections ?? [];

    const mergedByNumbers = new Map<string, FormSection>();

    persistedSections.forEach((section) => {
        mergedByNumbers.set(normalizeNumbers(section.numbers).toLowerCase(), {
            ...section,
            serials: [...section.serials],
        });
    });

    draftSections.forEach((draftSection) => {
        const numbers = normalizeNumbers(draftSection.numbers);
        const numbersKey = numbers.toLowerCase();
        const draftSerials = (draftSection.serials ?? []).filter(
            (serial) => !isPersistedSerial(serial) && hasPendingSerialContent(serial)
        );

        if (!numbers) {
            return;
        }

        const existing = mergedByNumbers.get(numbersKey);
        if (!existing) {
            if (draftSerials.length === 0) {
                return;
            }
            mergedByNumbers.set(numbersKey, {
                numbers,
                serials: draftSerials.map((serial) => ({
                    serialNumber: serial.serialNumber.trim(),
                    ticketImg:
                        typeof serial.ticketImg === 'string' && serial.ticketImg.trim()
                            ? serial.ticketImg.trim()
                            : undefined,
                })),
            });
            return;
        }

        const existingSerialKeys = new Set(
            existing.serials.map((serial) => normalizeSerial(serial.serialNumber))
        );
        draftSerials.forEach((serial) => {
            const key = normalizeSerial(serial.serialNumber);
            if (!key || existingSerialKeys.has(key)) {
                return;
            }
            existing.serials.push({
                serialNumber: serial.serialNumber.trim(),
                ticketImg:
                    typeof serial.ticketImg === 'string' && serial.ticketImg.trim()
                        ? serial.ticketImg.trim()
                        : undefined,
            });
            existingSerialKeys.add(key);
        });
    });

    const merged = Array.from(mergedByNumbers.values());

    // Preserve empty draft sections (in-progress numbers) that are not on the server yet.
    draftSections.forEach((draftSection) => {
        const numbers = normalizeNumbers(draftSection.numbers);
        if (!numbers) {
            const hasPendingSerial = (draftSection.serials ?? []).some(
                (serial) => !isPersistedSerial(serial) && hasPendingSerialContent(serial)
            );
            if (hasPendingSerial) {
                // serial without numbers is invalid for submit but keep for restore UX
                merged.push({
                    numbers: '',
                    serials: (draftSection.serials ?? [])
                        .filter((serial) => !isPersistedSerial(serial))
                        .map((serial) => ({
                            serialNumber: serial.serialNumber ?? '',
                            ticketImg:
                                typeof serial.ticketImg === 'string'
                                    ? serial.ticketImg
                                    : undefined,
                        })),
                });
            }
            return;
        }
        if (mergedByNumbers.has(numbers.toLowerCase())) {
            return;
        }
        const pendingOnly = (draftSection.serials ?? []).filter(
            (serial) => !isPersistedSerial(serial)
        );
        if (pendingOnly.some((serial) => hasPendingSerialContent(serial)) || numbers) {
            merged.push({
                numbers,
                serials: pendingOnly.length > 0 ? pendingOnly : [emptySerial()],
            });
        }
    });

    if (merged.length === 0) {
        return shouldAppendEditableSlot ? defaultTicketLineFormDraft().ticketSections : [];
    }

    const hasEditableSlot = merged.some((section) =>
        (section.serials ?? []).some((serial) => !isPersistedSerial(serial))
    );
    if (!hasEditableSlot && shouldAppendEditableSlot) {
        merged.push(defaultTicketLineFormDraft().ticketSections[0]);
    }

    if (!shouldAppendEditableSlot) {
        return merged.filter((section) => {
            if (section.ticketId != null) {
                return true;
            }
            const numbers = normalizeNumbers(section.numbers);
            const hasFilledPending = (section.serials ?? []).some(
                (serial) =>
                    !isPersistedSerial(serial) &&
                    hasPendingSerialContent(serial)
            );
            return !!numbers || hasFilledPending;
        });
    }

    return ensureSectionsQuantity(merged);
};

/** Persist only unsaved (non-persisted) content to localStorage.
 * Returns null when there is nothing meaningful to store (do not overwrite existing drafts).
 */
export const extractPendingDraftSections = (
    sections: FormSection[] = []
): FormSection[] | null => {
    const pending: FormSection[] = [];

    sections.forEach((section) => {
        const pendingSerials = (section.serials ?? []).filter((serial) => !isPersistedSerial(serial));
        const hasFilledPending = pendingSerials.some((serial) => hasPendingSerialContent(serial));
        const numbers = normalizeNumbers(section.numbers);

        if (!hasFilledPending && !numbers) {
            return;
        }

        // Skip sections that only mirror persisted data with empty trailing slots.
        if (section.ticketId != null && !hasFilledPending) {
            return;
        }

        // Skip blank template rows (numbers empty and no filled serial).
        if (!numbers && !hasFilledPending) {
            return;
        }

        pending.push({
            numbers: section.numbers ?? '',
            quantity: section.quantity,
            serials:
                pendingSerials.length > 0
                    ? pendingSerials.map((serial) => ({
                          serialNumber: serial.serialNumber ?? '',
                          ticketImg:
                              typeof serial.ticketImg === 'string' ? serial.ticketImg : undefined,
                      }))
                    : [emptySerial()],
        });
    });

    // Drop purely empty template sections (no numbers, no filled serials).
    const meaningful = pending.filter((section) => {
        const numbers = normalizeNumbers(section.numbers);
        const hasFilled = (section.serials ?? []).some((serial) => hasPendingSerialContent(serial));
        return !!numbers || hasFilled;
    });

    return meaningful.length > 0 ? meaningful : null;
};

export const countPendingFilledSerials = (sections: FormSection[] = []) =>
    sections.reduce((total, section) => {
        const filled = (section.serials ?? []).filter(
            (serial) => !isPersistedSerial(serial) && normalizeSerial(serial.serialNumber)
        ).length;
        return total + filled;
    }, 0);

const MAX_PREFILL_SERIAL_SLOTS = 50;

/** Pre-fill empty serial rows to match remaining import quota (e.g. 5 vé → 5 rows). */
export const padSerialSlotsForQuota = (
    sections: FormSection[] = [],
    remainingQuota?: number
): FormSection[] => {
    if (!remainingQuota || remainingQuota <= 0) {
        return sections;
    }

    const targetSlots = Math.min(remainingQuota, MAX_PREFILL_SERIAL_SLOTS);
    let paddedPrimary = false;

    const padded = sections.map((section) => {
        if (section.ticketId != null || paddedPrimary) {
            return section;
        }

        const pendingSerials = (section.serials ?? []).filter((serial) => !isPersistedSerial(serial));
        const hasFilledPending = pendingSerials.some((serial) =>
            normalizeSerial(serial.serialNumber)
        );

        if (hasFilledPending) {
            paddedPrimary = true;
            return section;
        }

        paddedPrimary = true;
        if (pendingSerials.length >= targetSlots) {
            return section;
        }

        const nextSerials = [...pendingSerials];
        while (nextSerials.length < targetSlots) {
            nextSerials.push(emptySerial());
        }
        return { ...section, serials: nextSerials };
    });

    if (!paddedPrimary) {
        padded.push({
            numbers: '',
            serials: Array.from({ length: targetSlots }, () => emptySerial()),
        });
    }

    return padded;
};
