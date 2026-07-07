import type { CreateTicketFormValues } from '../../../schemas/ticket.schema';
import { normalizeSerialNumber, normalizeTicketNumbers } from './ticketSerialValidation';

export type TicketEntryResumeTarget = {
    sectionIndex: number;
    field: 'numbers' | 'serial';
    serialIndex?: number;
};

export type TicketEntryResumeFocus = TicketEntryResumeTarget & {
    token: number;
};

const RESUME_HIGHLIGHT_CLASS = 'ticket-entry-resume-highlight';
const HIGHLIGHT_DURATION_MS = 2600;
const COLLAPSE_ANIMATION_MS = 320;

const sectionHasAnyContent = (
    section: CreateTicketFormValues['ticketSections'][number] | undefined
): boolean => {
    if (!section) {
        return false;
    }
    const numbers = normalizeTicketNumbers(section.numbers);
    if (numbers) {
        return true;
    }
    return (section.serials ?? []).some(
        (serial) =>
            !!normalizeSerialNumber(serial.serialNumber) ||
            (typeof serial.ticketImg === 'string' && serial.ticketImg.trim().length > 0)
    );
};

export const findFirstIncompleteTicketEntry = (
    sections: CreateTicketFormValues['ticketSections'] = []
): TicketEntryResumeTarget | null => {
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
        const section = sections[sectionIndex];
        if (!sectionHasAnyContent(section)) {
            continue;
        }

        const numbers = normalizeTicketNumbers(section.numbers);
        if (!numbers) {
            return { sectionIndex, field: 'numbers' };
        }

        const serials = section.serials ?? [];
        for (let serialIndex = 0; serialIndex < serials.length; serialIndex += 1) {
            if (!normalizeSerialNumber(serials[serialIndex]?.serialNumber)) {
                return { sectionIndex, field: 'serial', serialIndex };
            }
        }
    }

    return null;
};

const getResumeFieldElementId = (target: TicketEntryResumeTarget) =>
    target.field === 'numbers'
        ? `ticket-number-field-${target.sectionIndex}`
        : `ticket-serial-field-${target.sectionIndex}-${target.serialIndex ?? 0}`;

const applyTemporaryHighlight = (container: HTMLElement) => {
    const highlightTarget =
        container.querySelector<HTMLElement>('.MuiOutlinedInput-root') ??
        container.querySelector<HTMLElement>('.MuiInputBase-root') ??
        container;

    highlightTarget.classList.add(RESUME_HIGHLIGHT_CLASS);
    window.setTimeout(() => {
        highlightTarget.classList.remove(RESUME_HIGHLIGHT_CLASS);
    }, HIGHLIGHT_DURATION_MS);
};

export const highlightAndFocusTicketEntryField = (target: TicketEntryResumeTarget) => {
    const container = document.getElementById(getResumeFieldElementId(target));
    if (!container) {
        return false;
    }

    container.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
    });

    const input = container.querySelector('input, textarea');
    if (!(input instanceof HTMLElement)) {
        return false;
    }

    const focusDelay = target.field === 'serial' ? COLLAPSE_ANIMATION_MS : 120;
    window.setTimeout(() => {
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
            input.focus({ preventScroll: true });
            input.select?.();
        } else {
            input.focus({ preventScroll: true });
        }
        applyTemporaryHighlight(container);
    }, focusDelay);

    return true;
};

export const getResumeCollapseDelayMs = (target: TicketEntryResumeTarget) =>
    target.field === 'serial' ? COLLAPSE_ANIMATION_MS : 0;
