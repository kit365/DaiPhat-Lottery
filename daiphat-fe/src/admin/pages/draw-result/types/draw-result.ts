// Cập nhật theo LotteryResultResponse của BE
export interface LotteryResultResponse {
    id: number;
    stationId: number;
    stationName: string;
    region: string;
    drawDate: string; // LocalDate
    source: string;
    isOfficial: boolean;
    status: string;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    lastModifiedBy: string;
}

export interface PrizeStructureResponse {
    id: number;
    regionId: number;
    regionCode: string;
    prizeLevel: string;
    prizeDisplayName: string;
    prizeCode: string;
    description?: string | null;
    prizeValue: number;
    quantity: number;
    matchDigits: number | null;
    matchFrom: string;
    matchFromDisplayName: string;
    displayOrder: number;
    isActive: boolean;
}

export interface LotteryResultDetailResponse {
    id: number;
    lotteryResultId: number;
    prizeStructureId: number;
    prizeLevel: string;
    prizeDisplayName: string;
    prizeCode: string;
    displayOrder: number;
    matchDigits: number;
    matchFrom: string;
    matchFromDisplayName: string;
    winningNumber: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    lastModifiedBy: string;
}

export interface LotteryResultLiveItemResponse {
    result: LotteryResultResponse;
    details: LotteryResultDetailResponse[];
    status: string | null;
    pollAfterSeconds: number | null;
}

export interface LotteryResultFullBoardResponse {
    region: string;
    drawDate: string;
    results: LotteryResultLiveItemResponse[];
}

export interface ManagementLotteryResultBoardResponse {
    region: string;
    fromDate: string;
    toDate: string;
    results: LotteryResultLiveItemResponse[];
}

export type DrawResultDateMode = 'single' | 'range';

export interface PageResponse<T> {
    data: T[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    isLast: boolean;
    isFirst: boolean;
    hasNext: boolean;
    hasPrevious: boolean;
}

// Giữ lại interface filter cũ (có thể tái sử dụng cho page, size)
export interface DrawResultFilter {
    region?: string;
    dateMode?: DrawResultDateMode;
    drawDate?: string;
    fromDate?: string;
    toDate?: string;
    source?: 'MINH_NGOC' | 'XOSO_VN';
}
