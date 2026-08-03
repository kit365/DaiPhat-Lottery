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

export interface SupplierSettlementKpis {
    totalImportedTickets: number;
    totalImportValue: number;
    totalSoldTickets: number;
    totalRemainingTickets: number;
    totalDamagedTickets: number;
    totalLostTickets: number;
    totalVoidedTickets: number;
    totalPreparedForReturnTickets: number;
    totalReturnValue: number;
    remainingPayableAmount: number;
}

export interface SettlementStationInventory {
    lotteryStationId: number;
    lotteryStationName?: string | null;
    importedQuantity: number;
    soldQuantity: number;
    remainingQuantity: number;
    damagedQuantity: number;
    lostQuantity: number;
    voidedQuantity: number;
    returnQuantity: number;
    returnValue: number;
}

export interface SettlementOverviewImportBatch {
    id: number;
    batchCode?: string | null;
    drawDate?: string | null;
    status?: string | null;
    statusLabel?: string | null;
    totalImportedQuantity?: number | null;
    totalImportedCostValue?: number | null;
    totalDeclareQuantity?: number | null;
    totalDeclaredCostValue?: number | null;
}

export interface SettlementOverviewReturnBatch {
    id: number;
    drawDate?: string | null;
    status?: string | null;
    statusLabel?: string | null;
    totalQuantity?: number | null;
    totalReturnValue?: number | null;
    supplierName?: string | null;
}

export interface SupplierSettlementOverview {
    settlement: SupplierSettlement;
    kpis: SupplierSettlementKpis;
    importBatches: SettlementOverviewImportBatch[];
    returnBatches: SettlementOverviewReturnBatch[];
    inventoryByStation: SettlementStationInventory[];
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
