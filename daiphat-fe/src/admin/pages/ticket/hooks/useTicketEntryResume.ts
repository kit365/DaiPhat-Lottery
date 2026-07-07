import { useCallback, useRef, useState } from 'react';
import type { CreateTicketFormValues } from '../../../schemas/ticket.schema';
import {
    findFirstIncompleteTicketEntry,
    type TicketEntryResumeFocus,
} from '../utils/ticketEntryResume';

type UseTicketEntryResumeOptions = {
    ticketSections: CreateTicketFormValues['ticketSections'];
    enabled?: boolean;
};

const RESUME_DELAY_MS = 220;

export const useTicketEntryResume = ({
    ticketSections,
    enabled = true,
}: UseTicketEntryResumeOptions) => {
    const [resumeFocusTarget, setResumeFocusTarget] = useState<TicketEntryResumeFocus | null>(null);
    const sectionsRef = useRef(ticketSections);
    const resumeTimerRef = useRef<ReturnType<typeof setTimeout>>();

    sectionsRef.current = ticketSections;

    const clearResumeTimer = () => {
        if (resumeTimerRef.current) {
            window.clearTimeout(resumeTimerRef.current);
            resumeTimerRef.current = undefined;
        }
    };

    const notifyLineFormReady = useCallback(
        (lineId?: string, sectionsSnapshot?: CreateTicketFormValues['ticketSections']) => {
            clearResumeTimer();

            if (!enabled || !lineId) {
                return;
            }

            const sections = sectionsSnapshot ?? sectionsRef.current;

            resumeTimerRef.current = window.setTimeout(() => {
                const incompleteTarget = findFirstIncompleteTicketEntry(sections);
                if (!incompleteTarget) {
                    setResumeFocusTarget(null);
                    return;
                }

                setResumeFocusTarget({
                    ...incompleteTarget,
                    token: Date.now(),
                });
            }, RESUME_DELAY_MS);
        },
        [enabled]
    );

    return { resumeFocusTarget, notifyLineFormReady };
};
