import type { SettlementAdjustmentReasonCode } from '../types/supplierSettlement.type';

export type MatchingActualsDraftStationPricing = {
    lotteryStationId: number;
    importCost: number;
    commissionRate: number;
};

export type MatchingActualsDraftCostRow = {
    key: string;
    additionalCost: string;
    additionalCostType: SettlementAdjustmentReasonCode;
    additionalCostReason: string;
    additionalCostCustomName: string;
    additionalCostSign?: '+' | '-';
    isAutoPaymentDifference?: boolean;
};

export type MatchingActualsDraft = {
    settlementId: string;
    importQty: string;
    returnQty: string;
    unitPrice: string;
    actualPaidAmount: string;
    note: string;
    additionalCostRows: MatchingActualsDraftCostRow[];
    pendingStationPricing: MatchingActualsDraftStationPricing[];
    actualImportPrice?: number;
    selectedImportId: number | null;
    importEvidenceTab: 'receipt' | 'ticketList';
    /** Cloudinary/storage URLs kept in draft until xác nhận đối chiếu. */
    nccReceiptUrl?: string | null;
    importReceiptUrlById?: Record<string, string>;
    ticketListUrlsById?: Record<string, string[]>;
    /** @deprecated Kept for older drafts that stored blobs in IndexedDB. */
    hasPendingNccReceipt: boolean;
    pendingImportReceiptBatchIds: number[];
    pendingTicketListBatchIds: number[];
    updatedAt: string;
};

const STORAGE_PREFIX = 'settlement-matching-draft:';

export const matchingActualsDraftStorageKey = (settlementId: string | number) =>
    `${STORAGE_PREFIX}${settlementId}`;

export const readMatchingActualsDraft = (
    settlementId: string | number
): MatchingActualsDraft | null => {
    try {
        const raw = localStorage.getItem(matchingActualsDraftStorageKey(settlementId));
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as MatchingActualsDraft;
        if (!parsed || typeof parsed !== 'object' || String(parsed.settlementId) !== String(settlementId)) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
};

export const writeMatchingActualsDraft = (
    settlementId: string | number,
    draft: Omit<MatchingActualsDraft, 'settlementId' | 'updatedAt'>
) => {
    try {
        const payload: MatchingActualsDraft = {
            ...draft,
            settlementId: String(settlementId),
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(matchingActualsDraftStorageKey(settlementId), JSON.stringify(payload));
    } catch {
        // ignore quota / private mode
    }
};

export const clearMatchingActualsDraftJson = (settlementId: string | number) => {
    try {
        localStorage.removeItem(matchingActualsDraftStorageKey(settlementId));
    } catch {
        // ignore
    }
};
