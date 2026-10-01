import { OrderDetailStatus } from '@/types/order.type';
import { isAlreadyFaultReportedSerial } from '@/admin/features/ticket/import-batch/utils/serialIncidentWorkflow';

import type { IncidentTicketDisplay } from '../types/incidentTicket.type';

export function resolveOrderDetailTicketDisplay(detail: any): IncidentTicketDisplay {
    if (!detail) {
        return {
            id: null,
            numbers: '—',
            stationName: '—',
            isIncidentEligible: false,
            isAlreadyFaultReported: false,
        };
    }

    const rawId = detail?.id ?? detail?.ticketId ?? detail?.lotteryTicketId;
    const id = rawId != null ? (Number.isFinite(Number(rawId)) ? Number(rawId) : rawId) : null;
    const status = (typeof detail?.status === 'string' ? detail.status : (detail?.status?.code || detail?.status?.name)) as string | undefined;
    const statusDisplayName = detail?.statusDisplayName as string | undefined;
    const ticket = detail?.lotteryTicket || detail?.ticket || {};
    const replacementSerial =
        detail?.replacedByTicketSerial ||
        detail?.replaceTicketSerial ||
        null;
    const originalSerial = detail?.ticketSerial || detail?.lotteryTicketSerial || null;
    const effectiveSerial = replacementSerial || originalSerial;
    const allocatedSerial = Array.isArray(detail?.allocatedSerials) ? detail.allocatedSerials[0] : null;
    const lotteryTicketSerialId =
        detail?.lotteryTicketSerialId ||
        allocatedSerial?.id ||
        effectiveSerial?.id ||
        detail?.serialId;
    const lotteryTicketId =
        detail?.lotteryTicketId ||
        detail?.ticketId ||
        ticket?.id ||
        allocatedSerial?.ticketId;

    const numbers =
        detail?.numbers ||
        ticket.numbers ||
        effectiveSerial?.numbers ||
        detail?.serialNumber ||
        effectiveSerial?.serialNumber ||
        detail?.lotteryTicket?.numbers ||
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
    const isTerminalStatus = status === OrderDetailStatus.CANCELLED || status === OrderDetailStatus.REFUNDED || status === 'CANCELLED' || status === 'REFUNDED';
    const detailActive = !isTerminalStatus;

    return {
        id: typeof id === 'number' ? id : (rawId != null ? Number(rawId) || null : null),
        numbers: String(numbers || '—'),
        serialNumber: serialNumber ? String(serialNumber) : undefined,
        stationName: String(stationName || '—'),
        drawDate: drawDate ? String(drawDate) : undefined,
        status,
        statusDisplayName,
        lotteryTicketId,
        lotteryTicketSerialId,
        serialStatus,
        serialStatusDisplayName,
        ticketCondition,
        ticketConditionDisplayName,
        isAlreadyFaultReported,
        isIncidentEligible: detailActive && !isAlreadyFaultReported,
        stationId,
        hasReplacement: Boolean(detail?.hasReplacement ?? detail?.lotteryTicket?.hasReplacement ?? false),
        ticketType,
        price: Number(price) || 10000,
        ticketImg,
    };
}
