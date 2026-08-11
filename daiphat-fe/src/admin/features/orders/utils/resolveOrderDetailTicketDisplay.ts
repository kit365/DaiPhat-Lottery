import { OrderDetailStatus } from '@/types/order.type';
import { isAlreadyFaultReportedSerial } from '@/admin/features/ticket/import-batch/utils/serialIncidentWorkflow';

import type { IncidentTicketDisplay } from '../types/incidentTicket.type';

export function resolveOrderDetailTicketDisplay(detail: any): IncidentTicketDisplay {
    const rawId = detail?.id;
    const id = rawId != null && Number.isFinite(Number(rawId)) ? Number(rawId) : null;
    const status = detail?.status as string | undefined;
    const ticket = detail?.lotteryTicket || detail?.ticket || {};
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
