import { OrderDetailStatus } from '../../../../types/order.type';
import { isAlreadyFaultReportedSerial } from '../../ticket/import-batch/utils/serialIncidentWorkflow';

export interface IncidentTicketDisplay {
    id: number | null;
    numbers: string;
    serialNumber?: string;
    stationName: string;
    drawDate?: string;
    /** Order-detail lifecycle status (ACTIVE, REFUND_PENDING, ...). */
    status?: string;
    /** Physical serial status (PROXY_HOLDING, SOLD, ...). */
    serialStatus?: string;
    serialStatusDisplayName?: string;
    ticketCondition?: string;
    ticketConditionDisplayName?: string;
    isIncidentEligible: boolean;
    /** Serial already reported DAMAGED / LOST / VOIDED (ticketCondition). */
    isAlreadyFaultReported: boolean;
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
    const allocatedSerial = Array.isArray(detail?.allocatedSerials) ? detail.allocatedSerials[0] : null;

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
        allocatedSerial?.serialNumber ||
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
        allocatedSerial?.ticketImg ||
        ticket?.ticketImg;

    const serialStatus =
        detail?.serialStatus ||
        allocatedSerial?.status ||
        effectiveSerial?.status ||
        undefined;
    const serialStatusDisplayName =
        detail?.serialStatusDisplayName ||
        allocatedSerial?.statusDisplayName ||
        effectiveSerial?.statusDisplayName ||
        undefined;
    const ticketCondition =
        detail?.ticketCondition ||
        allocatedSerial?.ticketCondition ||
        effectiveSerial?.ticketCondition ||
        undefined;
    const ticketConditionDisplayName =
        detail?.ticketConditionDisplayName ||
        allocatedSerial?.ticketConditionDisplayName ||
        effectiveSerial?.ticketConditionDisplayName ||
        undefined;
    const isAlreadyFaultReported = isAlreadyFaultReportedSerial({
        status: serialStatus,
        ticketCondition,
    });
    const detailActive = status === OrderDetailStatus.ACTIVE || status === 'ACTIVE';

    return {
        id,
        numbers,
        serialNumber,
        stationName,
        drawDate,
        status,
        serialStatus,
        serialStatusDisplayName,
        ticketCondition,
        ticketConditionDisplayName,
        isAlreadyFaultReported,
        isIncidentEligible: detailActive && !isAlreadyFaultReported,
        stationId,
        hasReplacement: detail?.hasReplacement ?? detail?.lotteryTicket?.hasReplacement ?? false,
        ticketType,
        price,
        ticketImg,
    };
}
