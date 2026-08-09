import type { CreateTicketFormValues } from '../schemas/ticket.schema';
import {
    countPendingFilledSerials,
    isPersistedSerial,
} from './ticketLineFormHydration';

export type ImportBatchLineSubmitPayload = {
    importBatchLineId: number;
    stationId: number;
    drawDate?: string;
    isAutoSave: boolean;
    tickets: Array<{
        numbers: string;
        serials: Array<{ serialNumber: string; ticketImg?: string }>;
    }>;
};

export const buildImportBatchLineSubmitPayload = (
    data: CreateTicketFormValues,
    options: {
        drawDate: string;
        isAutoSave: boolean;
        requireTicketImages?: boolean;
    }
): ImportBatchLineSubmitPayload | null => {
    const tickets = data.ticketSections
        .map((section) => ({
            numbers: section.numbers.trim(),
            serials: section.serials
                .filter((serial) => !isPersistedSerial(serial) && serial.serialNumber.trim())
                .map((serial) => ({
                    serialNumber: serial.serialNumber.trim(),
                    ticketImg:
                        typeof serial.ticketImg === 'string' && serial.ticketImg.trim()
                            ? serial.ticketImg.trim()
                            : undefined,
                }))
                .filter((serial) => {
                    if (!options.requireTicketImages) {
                        return true;
                    }
                    return Boolean(serial.ticketImg);
                }),
        }))
        .filter((ticket) => ticket.numbers && ticket.serials.length > 0);

    if (tickets.length === 0 || countPendingFilledSerials(data.ticketSections) === 0) {
        return null;
    }

    return {
        importBatchLineId: Number(data.importBatchLineId),
        stationId: Number(data.stationId),
        drawDate: data.drawDate || options.drawDate,
        isAutoSave: options.isAutoSave,
        tickets,
    };
};
