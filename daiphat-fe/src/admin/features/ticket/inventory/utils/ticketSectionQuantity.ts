import type { UseFormSetError } from 'react-hook-form';
import type { CreateTicketFormValues } from '../schemas/ticket.schema';
import { isPersistedSerial } from './ticketLineFormHydration';

export type TicketSectionForm = CreateTicketFormValues['ticketSections'][number];
export type TicketSerialForm = TicketSectionForm['serials'][number];

export const SECTION_QUANTITY_OVERFLOW_MESSAGE =
    'Số lượng vượt quá số vé còn lại có thể nhập.';
export const SECTION_QUANTITY_MIN_MESSAGE = 'Số lượng phải từ 1 trợ lên.';

const emptySerial = (): TicketSerialForm => ({
    serialNumber: '',
    ticketImg: undefined,
});

/** Pending quota slots a section consumes (new sections use `quantity`). */
export const countSectionQuotaSlots = (section?: TicketSectionForm | null): number => {
    if (!section) {
        return 0;
    }
    if (section.ticketId != null) {
        return (section.serials ?? []).filter((serial) => !isPersistedSerial(serial)).length;
    }
    const quantity = section.quantity;
    if (quantity != null && quantity > 0) {
        return quantity;
    }
    return (section.serials ?? []).filter((serial) => !isPersistedSerial(serial)).length;
};

export const countTotalQuotaSlots = (sections: TicketSectionForm[] = []) =>
    sections.reduce((total, section) => total + countSectionQuotaSlots(section), 0);

export const getUsedQuotaSlotsExcludingSection = (
    sections: TicketSectionForm[] = [],
    sectionIndex: number
) =>
    sections.reduce((total, section, index) => {
        if (index === sectionIndex) {
            return total;
        }
        return total + countSectionQuotaSlots(section);
    }, 0);

export const getMaxQuantityForSection = (
    sections: TicketSectionForm[] = [],
    sectionIndex: number,
    remainingQuota: number
): number => {
    const safeRemaining = Math.max(0, remainingQuota);
    const usedByOthers = getUsedQuotaSlotsExcludingSection(sections, sectionIndex);
    return Math.max(1, safeRemaining - usedByOthers);
};

export const canAppendTicketSection = (
    sections: TicketSectionForm[] = [],
    remainingQuota: number
) => countTotalQuotaSlots(sections) < Math.max(0, remainingQuota);

export const buildSerialsForQuantity = (
    currentSerials: TicketSerialForm[] = [],
    quantity: number
): TicketSerialForm[] => {
    const persisted = currentSerials.filter((serial) => isPersistedSerial(serial));
    const targetTotal = Math.max(quantity, persisted.length, 1);
    const next: TicketSerialForm[] = [...persisted];

    while (next.length < targetTotal) {
        next.push(emptySerial());
    }

    while (next.length > targetTotal) {
        const lastIndex = next.length - 1;
        if (isPersistedSerial(next[lastIndex])) {
            break;
        }
        next.pop();
    }

    return next;
};

export const ensureSectionQuantity = (section: TicketSectionForm): TicketSectionForm => {
    if (section.ticketId != null) {
        return section;
    }

    const pendingCount = (section.serials ?? []).filter((serial) => !isPersistedSerial(serial)).length;
    const quantity = section.quantity ?? Math.max(1, pendingCount || section.serials?.length || 1);
    const serials = buildSerialsForQuantity(section.serials ?? [], quantity);

    return {
        ...section,
        quantity,
        serials,
    };
};

export const ensureSectionsQuantity = (sections: TicketSectionForm[] = []) =>
    sections.map((section) => ensureSectionQuantity(section));

export type SectionQuantityIssue = {
    sectionIndex: number;
    requested: number;
    allowed: number;
};

export const findSectionQuantityOverflowIssues = (
    sections: TicketSectionForm[] = [],
    remainingQuota: number
): SectionQuantityIssue[] => {
    const safeRemaining = Math.max(0, remainingQuota);
    const issues: SectionQuantityIssue[] = [];
    let running = 0;

    sections.forEach((section, sectionIndex) => {
        if (section.ticketId != null) {
            running += countSectionQuotaSlots(section);
            return;
        }

        const requested = countSectionQuotaSlots(section);
        const allowedForSection = Math.max(0, safeRemaining - running);
        if (requested > allowedForSection) {
            issues.push({
                sectionIndex,
                requested,
                allowed: allowedForSection,
            });
        }
        running += requested;
    });

    return issues;
};

export const applySectionQuantityFieldErrors = (
    issues: SectionQuantityIssue[],
    setError: UseFormSetError<CreateTicketFormValues>
) => {
    issues.forEach(({ sectionIndex, allowed }) => {
        setError(`ticketSections.${sectionIndex}.quantity`, {
            type: 'quota',
            message:
                allowed > 0
                    ? `${SECTION_QUANTITY_OVERFLOW_MESSAGE} (tối đa ${allowed} vé cho dãy này).`
                    : SECTION_QUANTITY_OVERFLOW_MESSAGE,
        });
    });
};
