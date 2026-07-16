export type PrizeStructureSource = 'MINH_NGOC' | 'XOSO_VN';

export interface PrizeStructureSyncRequest {
    source: PrizeStructureSource;
    region: string;
}

export interface PrizeStructureSyncItem {
    prizeStructureId?: number | null;
    prizeLevel: string;
    prizeCode: string;
    prizeDisplayName: string;
    prizeValue: number;
    quantity: number;
    matchDigits?: number | null;
    matchFrom: string;
    matchFromDisplayName: string;
    displayOrder: number;
    action: 'CREATED' | 'UPDATED' | 'DELETED' | 'SKIPPED' | 'ERROR';
    isActive: boolean;
    note?: string | null;
    description?: string | null;
}

export interface PrizeStructureSyncResponse {
    source: string;
    region: string;
    requestUrl?: string | null;
    fetchedAt: string;
    totalFetched: number;
    createdCount: number;
    updatedCount: number;
    deletedCount: number;
    skippedCount: number;
    warnings: string[];
    items: PrizeStructureSyncItem[];
}

export interface PrizeStructureResponse {
    id: number;
    regionId: number;
    regionCode: string;
    prizeLevel: string;
    prizeCode: string;
    prizeDisplayName: string;
    prizeValue: number;
    quantity: number;
    matchDigits?: number | null;
    matchFrom: string;
    matchFromDisplayName: string;
    displayOrder: number;
    isActive: boolean;
    description?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}
