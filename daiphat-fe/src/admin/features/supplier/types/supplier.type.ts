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
    isActive?: boolean;
}

export type UpdateLotterySupplierPayload = CreateLotterySupplierPayload & {
    isActive: boolean;
};

export interface SupplierListParams {
    page?: number;
    size?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    direction?: string;
}
