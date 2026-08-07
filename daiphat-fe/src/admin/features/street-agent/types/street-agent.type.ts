export type VendorConfidenceTier = "NEW" | "DEVELOPING" | "ESTABLISHED" | "TRUSTED";

export type LuckyPatternType = "EXACT" | "DIGIT_MATCH";

export type LuckyMatchPosition = "PREFIX" | "SUFFIX" | "ANYWHERE";

export interface StreetAgentProfile {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    cccd: string;
    imageUrl?: string;
    contactAddress?: string;
    contactProvince?: string;
    coverageArea?: string;
    commissionRate?: number;
    contractStartDate?: string;
    contractEndDate?: string;
    contractCode?: string;
    contractDocumentUrl?: string;
    dailyTicketCap?: number;
    confidenceScore?: number;
    confidenceTier?: VendorConfidenceTier;
    confidenceCalculatedAt?: string;
    depositBalance?: number;
    depositAdjustmentReason?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    lastModifiedBy?: string;
}

export interface StreetAgentQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}

export interface LuckyPatternConfig {
    id: number;
    patternType: LuckyPatternType;
    exactNumbers?: string | null;
    matchDigits?: string | null;
    matchPosition?: LuckyMatchPosition | null;
    name: string;
    description?: string | null;
    badgeLabel: string;
    badgeColor?: string | null;
    priority?: number | null;
    active?: boolean | null;
}

export interface UpsertLuckyPatternConfigPayload {
    patternType: LuckyPatternType;
    exactNumbers?: string | null;
    matchDigits?: string | null;
    matchPosition?: LuckyMatchPosition | null;
    name: string;
    description?: string | null;
    badgeLabel: string;
    badgeColor?: string | null;
    priority?: number | null;
    active?: boolean | null;
}

export interface VendorAllocationCandidate {
    serialId: number;
    stationId: number;
    stationName: string;
    ticketNumbers: string;
    serialNumber: string;
    drawDate: string;
    faceValue: number;
    lucky: boolean;
    luckyBadges: string[];
    vendorEligible: boolean;
    blockedReason?: string | null;
}

export interface VendorAllocationSerialItem {
    serialId: number;
    serialNumber: string;
    lucky: boolean;
    luckyBadges: string[];
    vendorEligible: boolean;
    blockedReason?: string | null;
    suggested: boolean;
}

export interface VendorAllocationTicketGroup {
    ticketNumbers: string;
    faceValue: number;
    lucky: boolean;
    luckyBadges: string[];
    availableCount: number;
    suggestedCount: number;
    selectableCount: number;
    vendorEligible: boolean;
    blockedReason?: string | null;
    serials: VendorAllocationSerialItem[];
}

export interface VendorAllocationStationGroup {
    stationId: number;
    stationName: string;
    availableCount: number;
    suggestedCount: number;
    selectableCount: number;
    tickets: VendorAllocationTicketGroup[];
}

export interface VendorAllocationSuggestion {
    remainingDailyCap: number;
    suggestedQuantity: number;
    counterReservePerStation: number;
    blockedReason?: string | null;
    stations: VendorAllocationStationGroup[];
}

export type VendorAllocationSerialStatus =
    | "DRAFT_RESERVED"
    | "HANDED_OVER"
    | "RETURNED"
    | "SOLD"
    | "RELEASED";

export interface VendorAllocationAllocatedSerial {
    serialId: number;
    stationId: number;
    stationName: string;
    ticketNumbers: string;
    serialNumber: string;
    drawDate: string;
    faceValue: number;
    lucky: boolean;
    luckyBadges: string[];
    allocationStatus: VendorAllocationSerialStatus | string;
    ticketStatus?: string | null;
    returnedAt?: string | null;
}

export interface VendorAllocationBatchDetailRow {
    stationId: number;
    drawDate: string;
    allocatedQuantity: number;
    returnedQuantity: number;
    soldQuantity: number;
}

export interface VendorAllocationBatch {
    id: number;
    batchCode: string;
    streetAgentProfileId: number;
    businessDate: string;
    status: string;
    reservationExpiresAt?: string | null;
    allocatedQuantity: number;
    remainingDailyCap: number;
    faceValueSnapshot?: number | null;
    vendorUnitPriceSnapshot?: number | null;
    depositRateSnapshot?: number | null;
    latePolicySnapshot?: string | null;
    returnCutoffSnapshot?: string | null;
    depositRequiredAmount?: number | null;
    depositReceivedAmount?: number | null;
    depositBalanceBefore?: number | null;
    depositBalanceAfter?: number | null;
    depositReceivedAt?: string | null;
    settledAt?: string | null;
    returnedQuantity?: number | null;
    soldQuantity?: number | null;
    grossCashRemitted?: number | null;
    commissionPayable?: number | null;
    depositRefundAmount?: number | null;
    depositForfeitedAmount?: number | null;
    forcedPurchaseAmount?: number | null;
    additionalAmountDue?: number | null;
    details?: VendorAllocationBatchDetailRow[];
    serials: VendorAllocationAllocatedSerial[];
}

export interface VendorSettlementPreview {
    allocationBatchId: number;
    allocatedQuantity: number;
    soldQuantity: number;
    returnedQuantity: number;
    grossCashRemitted: number;
    commissionPayable: number;
    agencyNetSalesAmount: number;
    depositRefundAmount: number;
    depositForfeitedAmount: number;
    forcedPurchaseAmount: number;
    additionalAmountDue: number;
    late: boolean;
    latePolicySnapshot?: string | null;
}

export interface VendorAllocationBatchListParams {
    profileId?: number | string;
    status?: string | string[];
    businessDateFrom?: string;
    businessDateTo?: string;
    page?: number;
    size?: number;
}

export interface CreateVendorAllocationDraftPayload {
    streetAgentProfileId: number;
    businessDate: string;
    serialIds: number[];
    luckyOverrideReason?: string;
}

export interface ConfirmVendorAllocationPayload {
    depositReceivedAmount: number;
}

export interface ReturnVendorAllocationSerialsPayload {
    serialIds: number[];
}
