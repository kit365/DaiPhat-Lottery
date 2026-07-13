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
}

export function resolveOrderDetailTicketDisplay(detail: any): IncidentTicketDisplay {
    const rawId = detail?.id;
    const id = rawId != null && Number.isFinite(Number(rawId)) ? Number(rawId) : null;
    const status = detail?.status as string | undefined;
    const ticket = detail?.lotteryTicket || detail?.ticket || {};
    const numbers =
        detail?.numbers ||
        ticket.numbers ||
        detail?.serialNumber ||
        detail?.lotteryTicketSerial?.serialNumber ||
        '—';
    const serialNumber =
        detail?.serialNumber ||
        detail?.lotteryTicketSerial?.serialNumber ||
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
    };
}
