export interface PrizeStructureSyncRequest {
    source: 'MINH_NGOC' | 'XOSO_VN';
    region: string;
}

export interface PrizeStructureSyncItem {
    prizeCode: string;
    prizeDisplayName: string;
    prizeValue: number;
    quantity: number;
    matchDigits: number;
    matchFromDisplayName: string;
    displayOrder: number;
    action: 'CREATED' | 'UPDATED' | 'DELETED' | 'SKIPPED' | 'ERROR';
    note?: string;
    description?: string;
}

export interface PrizeStructureSyncSummary {
    createdCount: number;
    updatedCount: number;
    deletedCount: number;
    skippedCount: number;
    totalFetched: number;
}

export interface PrizeStructureSyncResponse {
    items: PrizeStructureSyncItem[];
    warnings: string[];
    summary: PrizeStructureSyncSummary;
}

export interface PrizeStructureResponse {
    id: number;
    prizeCode: string;
    prizeDisplayName: string;
    prizeValue: number;
    quantity: number;
    matchDigits: number;
    matchFromDisplayName: string;
    displayOrder: number;
    note?: string;
    description?: string;
}
