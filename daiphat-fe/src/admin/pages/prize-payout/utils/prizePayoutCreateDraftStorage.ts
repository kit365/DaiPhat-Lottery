import type { PrizePayoutLookupItem, PrizePayoutPaymentMethod } from '../../../../types/prize-payout.type';

export type PrizePayoutCreateLookupMode = 'ORDER' | 'TRIPLE';

export type PrizePayoutCreateDraft = {
    lookupMode: PrizePayoutCreateLookupMode;
    orderCode: string;
    stationId?: number;
    drawDate: string;
    serialNumber: string;
    lookupItems: PrizePayoutLookupItem[];
    selectedIds: number[];
    bankBin?: string;
    bankAccountNumber: string;
    accountHolderName: string;
    confirmationContractUrl: string;
    recipientFullName: string;
    recipientIdNumber: string;
    recipientIdImageUrl: string;
    recipientIdImageBackUrl: string;
    manualConfirmed: boolean;
    paymentMethod: PrizePayoutPaymentMethod;
    cashAmount: string;
    cashHandedConfirmed?: boolean;
    transferEvidenceUrl?: string;
    savedAt: string;
};

const STORAGE_KEY = 'prize-payout-create-draft';

export const readPrizePayoutCreateDraft = (): PrizePayoutCreateDraft | null => {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PrizePayoutCreateDraft;
        if (!parsed || typeof parsed !== 'object') return null;
        if (!Array.isArray(parsed.lookupItems) || !Array.isArray(parsed.selectedIds)) return null;
        return parsed;
    } catch {
        return null;
    }
};

export const writePrizePayoutCreateDraft = (draft: Omit<PrizePayoutCreateDraft, 'savedAt'>) => {
    try {
        const payload: PrizePayoutCreateDraft = {
            ...draft,
            savedAt: new Date().toISOString(),
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // ignore quota / private mode
    }
};

export const clearPrizePayoutCreateDraft = () => {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
};
