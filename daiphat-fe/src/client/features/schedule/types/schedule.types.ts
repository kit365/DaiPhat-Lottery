export interface LotteryStationSchedule {
    stationId: number;
    stationName: string;
    region: string;
    drawDays: string[];
    drawDaysDisplay: string[];
    drawTime: string;
}

export interface ScheduleQueryParams {
    region?: string;
    stationId?: number;
    stationIds?: number[];
    drawDate?: string;
}
