import { useCallback, useEffect, useMemo, useState } from 'react';
import { isTicketSelectableForCancel } from '../utils/cancelTicketSelection';
import { isSerialIncidentEligible } from '../utils/serialIncidentWorkflow';

export type CancelSelectedSerial = {
    id: number | string;
    serialNumber: string;
    status: string;
    ticketCondition?: string | null;
    returnBatchLineId?: number | string | null;
    ticketId?: number | string;
    ticketNumbers?: string;
    ticketStatus?: string;
    reservedByOrderId?: string;
    importBatchLineId?: number | string;
};

export type CancelTicketLike = {
    id?: number | string;
    status?: string | null;
    numbers?: string;
    stationId?: number | string;
    drawDate?: string;
    serials?: Array<{
        id: number | string;
        serialNumber?: string;
        status?: string | null;
        ticketCondition?: string | null;
        returnBatchLineId?: number | string | null;
        reservedByOrderId?: string;
        importBatchLineId?: number | string;
    }>;
};

const mapCancelableSerial = (
    ticket: CancelTicketLike,
    serial: NonNullable<CancelTicketLike['serials']>[number]
): CancelSelectedSerial => ({
    id: serial.id,
    serialNumber: serial.serialNumber || '',
    status: serial.status || '',
    ticketCondition: serial.ticketCondition,
    returnBatchLineId: serial.returnBatchLineId,
    ticketId: ticket.id,
    ticketNumbers: ticket.numbers,
    ticketStatus: ticket.status || undefined,
    reservedByOrderId: serial.reservedByOrderId,
    importBatchLineId: serial.importBatchLineId,
});

export const useCancelTicketSelection = (tickets: CancelTicketLike[]) => {
    const [selectedSerials, setSelectedSerials] = useState<CancelSelectedSerial[]>([]);
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

    const cancelableSerials = useMemo(() => {
        const list: CancelSelectedSerial[] = [];
        tickets.forEach((ticket) => {
            if (!isTicketSelectableForCancel(ticket.status)) {
                return;
            }
            (ticket.serials || []).forEach((serial) => {
                if (!isSerialIncidentEligible(serial)) {
                    return;
                }
                list.push(mapCancelableSerial(ticket, serial));
            });
        });
        return list;
    }, [tickets]);

    const totalCancelableSerialsCount = cancelableSerials.length;

    useEffect(() => {
        setSelectedSerials((prev) => {
            const validIds = new Set(cancelableSerials.map((serial) => String(serial.id)));
            const next = prev.filter((serial) => validIds.has(String(serial.id)));
            return next.length === prev.length ? prev : next;
        });
    }, [cancelableSerials]);

    const getTicketCancelableSerials = useCallback((ticket: CancelTicketLike) => {
        if (!isTicketSelectableForCancel(ticket.status)) {
            return [];
        }
        return (ticket.serials || []).filter((serial) => isSerialIncidentEligible(serial));
    }, []);

    const getTicketSelectionState = useCallback(
        (ticket: CancelTicketLike) => {
            const cancelable = getTicketCancelableSerials(ticket);
            const cancelableCount = cancelable.length;
            const selectedCount = cancelable.filter((serial) =>
                selectedSerials.some((item) => String(item.id) === String(serial.id))
            ).length;

            return {
                cancelableCount,
                isChecked: cancelableCount > 0 && selectedCount === cancelableCount,
                isIndeterminate: selectedCount > 0 && selectedCount < cancelableCount,
                isSelectable: isTicketSelectableForCancel(ticket.status) && cancelableCount > 0,
            };
        },
        [getTicketCancelableSerials, selectedSerials]
    );

    const handleSelectAll = useCallback(
        (checked: boolean) => {
            if (checked) {
                setSelectedSerials(cancelableSerials);
            } else {
                setSelectedSerials([]);
            }
        },
        [cancelableSerials]
    );

    const handleSelectTicket = useCallback((ticket: CancelTicketLike, checked: boolean) => {
        if (!isTicketSelectableForCancel(ticket.status)) {
            return;
        }

        const ticketSerialIds = (ticket.serials || [])
            .filter((serial) => isSerialIncidentEligible(serial))
            .map((serial) => String(serial.id));

        if (checked) {
            const cancelableOfTicket = (ticket.serials || [])
                .filter((serial) => isSerialIncidentEligible(serial))
                .map((serial) => mapCancelableSerial(ticket, serial));

            setSelectedSerials((prev) => {
                const filtered = prev.filter((item) => !ticketSerialIds.includes(String(item.id)));
                return [...filtered, ...cancelableOfTicket];
            });
        } else {
            setSelectedSerials((prev) => prev.filter((item) => !ticketSerialIds.includes(String(item.id))));
        }
    }, []);

    const handleSelectSerial = useCallback(
        (ticket: CancelTicketLike, serial: NonNullable<CancelTicketLike['serials']>[number], checked: boolean) => {
            if (!isTicketSelectableForCancel(ticket.status) || !isSerialIncidentEligible(serial)) {
                return;
            }

            if (checked) {
                setSelectedSerials((prev) => {
                    if (prev.some((item) => String(item.id) === String(serial.id))) {
                        return prev;
                    }
                    return [...prev, mapCancelableSerial(ticket, serial)];
                });
            } else {
                setSelectedSerials((prev) => prev.filter((item) => String(item.id) !== String(serial.id)));
            }
        },
        []
    );

    const clearSelection = useCallback(() => setSelectedSerials([]), []);

    const openReportDialog = useCallback(() => setIsReportDialogOpen(true), []);
    const closeReportDialog = useCallback(() => setIsReportDialogOpen(false), []);

    const firstSelected = selectedSerials[0];
    const reportDialogProps = useMemo(() => {
        const sourceTicket = tickets.find((ticket) => String(ticket.id) === String(firstSelected?.ticketId));

        return {
            ticketNumbers: firstSelected?.ticketNumbers || '',
            ticketId: firstSelected?.ticketId,
            importBatchLineId: firstSelected?.importBatchLineId || 0,
            stationId: sourceTicket?.stationId,
            drawDate: sourceTicket?.drawDate,
        };
    }, [firstSelected, tickets]);

    return {
        selectedSerials,
        cancelableSerials,
        totalCancelableSerialsCount,
        isReportDialogOpen,
        getTicketCancelableSerials,
        getTicketSelectionState,
        handleSelectAll,
        handleSelectTicket,
        handleSelectSerial,
        clearSelection,
        openReportDialog,
        closeReportDialog,
        reportDialogProps,
    };
};
