export interface LotteryRegionResponse {
    id: number;
    code: string;
    name: string;
    type: string;
    minNumber: number;
    maxNumber: number;
    minLength: number;
    maxLength: number;
    numberLength: number;
    stationCount: number;
}

export interface UpdateLotteryRegionRequest {
    minNumber: number;
    maxNumber: number;
}
