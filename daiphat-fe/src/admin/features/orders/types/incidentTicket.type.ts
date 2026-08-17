export interface IncidentTicketDisplay {
    id: number | null;
    numbers: string;
    serialNumber?: string;
    stationName: string;
    drawDate?: string;
    /** Order-detail lifecycle status (ACTIVE, REFUND_PENDING, ...). */
    status?: string;
    statusDisplayName?: string;
    lotteryTicketId?: number | string;
    lotteryTicketSerialId?: number | string;
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
