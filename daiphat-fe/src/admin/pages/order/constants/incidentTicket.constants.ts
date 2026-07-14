import { OrderDetailStatus } from '../../../../types/order.type';

export type IncidentTicketReasonValue = 'DAMAGED' | 'LOST';

export const INCIDENT_TICKET_REASONS: { value: IncidentTicketReasonValue; label: string }[] = [
    { value: 'DAMAGED', label: 'Vé rách' },
    { value: 'LOST', label: 'Thất lạc' },
];

export interface IncidentTicketDisplay {
    id: number | null;
    numbers: string;
    serialNumber?: string;
    stationName: string;
    drawDate?: string;
    status?: string;
    isIncidentEligible: boolean;
    hasReplacement?: boolean;
    stationId?: number | string;
    ticketType?: string;
    price?: number;
    ticketImg?: string;
}

export function resolveOrderDetailTicketDisplay(detail: any): IncidentTicketDisplay {
    const rawId = detail?.id;
    const id = rawId != null && Number.isFinite(Number(rawId)) ? Number(rawId) : null;
    const status = detail?.status as string | undefined;
    const ticket = detail?.lotteryTicket || detail?.ticket || {};
    // Prefer replacement serial when present (API may also already flatten display fields).
    const replacementSerial =
        detail?.replacedByTicketSerial ||
        detail?.replaceTicketSerial ||
        null;
    const originalSerial = detail?.ticketSerial || detail?.lotteryTicketSerial || null;
    const effectiveSerial = replacementSerial || originalSerial;

    const numbers =
        detail?.numbers ||
        ticket.numbers ||
        effectiveSerial?.numbers ||
        detail?.serialNumber ||
        effectiveSerial?.serialNumber ||
        '—';
    const serialNumber =
        detail?.serialNumber ||
        effectiveSerial?.serialNumber ||
        ticket.serialNumber;
    const stationName =
        detail?.stationName ||
        ticket.stationName ||
        ticket.station?.name ||
        ticket.province?.name ||
        '—';
    const drawDate = detail?.drawDate || ticket.drawDate;
    const stationId =
        detail?.stationId ||
        ticket.stationId ||
        ticket.station?.id ||
        ticket.province?.id ||
        ticket.station?._id ||
        ticket.province?._id;
    const ticketType = detail?.ticketType || ticket?.ticketType || detail?.type || ticket?.type || '—';
    const price = detail?.price || detail?.lineSubtotal || ticket?.price || 10000;
    const ticketImg =
        detail?.ticketImg ||
        effectiveSerial?.ticketImg ||
        ticket?.ticketImg;

    return {
        id,
        numbers,
        serialNumber,
        stationName,
        drawDate,
        status,
        isIncidentEligible: status === OrderDetailStatus.ACTIVE || status === 'ACTIVE',
        stationId,
        hasReplacement: detail?.hasReplacement ?? detail?.lotteryTicket?.hasReplacement ?? false,
        ticketType,
        price,
        ticketImg,
    };
}
