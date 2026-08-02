export type SupplierSettlementStatus = 'OPEN' | 'CLOSED';

export interface SupplierSettlement {
    id: number;
    lotterySupplierId: number;
    supplierName?: string | null;
    supplierCode?: string | null;
    periodFrom: string;
    periodTo: string;
    totalImportValue: number;
    totalReturnValue: number;
    totalPaidAmount: number;
    remainingAmount: number;
    status: SupplierSettlementStatus;
    statusLabel?: string | null;
    transactionId?: number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface SupplierSettlementListParams {
    page?: number;
    size?: number;
    lotterySupplierId?: number;
    status?: SupplierSettlementStatus;
    periodFrom?: string;
    periodTo?: string;
    search?: string;
    sortBy?: string;
    direction?: string;
}
