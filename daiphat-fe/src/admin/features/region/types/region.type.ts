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
    defaultDrawTime: string;
}

export interface UpdateLotteryRegionRequest {
    minNumber: number;
    maxNumber: number;
    defaultDrawTime: string;
}

export const formatRegionDefaultDrawTime = (value?: string | null): string => {
    if (!value) {
        return '16:15';
    }
    const trimmed = value.trim();
    if (trimmed.length >= 5) {
        return trimmed.slice(0, 5);
    }
    return trimmed;
};
