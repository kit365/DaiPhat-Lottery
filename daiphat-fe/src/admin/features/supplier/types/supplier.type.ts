export type LotterySupplierType = 'LOTTERY_COMPANY' | 'DISTRIBUTOR';

export interface LotterySupplier {
    id: number;
    name: string;
    code: string;
    type: LotterySupplierType;
    typeLabel?: string;
    contactName?: string;
    contactPhone: string;
    contactEmail?: string;
    address?: string;
    taxCode?: string;
    paymentTermDays?: number;
    defaultImportCost?: number;
    importAllowFrom?: string;
    returnCutOffTime?: string;
    paymentCutOffTime?: string;
    isActive: boolean;
    missingActivationFields?: string[];
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateLotterySupplierPayload {
    name: string;
    code: string;
    type: LotterySupplierType;
    contactName?: string;
    contactPhone: string;
    contactEmail?: string;
    address?: string;
    taxCode?: string;
    paymentTermDays?: number | null;
    defaultImportCost?: number | null;
    importAllowFrom: string;
    returnCutOffTime: string;
    paymentCutOffTime?: string;
    isActive?: boolean;
}

export type UpdateLotterySupplierPayload = CreateLotterySupplierPayload & {
    isActive: boolean;
};

/**
 * The identifying details only — no intake hours, payment terms, type or active
 * flag. Used by the quick correction offered when an uploaded file's letterhead
 * disagrees with the supplier record.
 */
export interface UpdateLotterySupplierProfilePayload {
    supplierId: number;
    name: string;
    code: string;
    contactName?: string;
    contactPhone: string;
    contactEmail?: string;
    address?: string;
    taxCode?: string;
}

export interface SupplierListParams {
    page?: number;
    size?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    direction?: string;
}
