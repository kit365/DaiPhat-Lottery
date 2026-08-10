export type VendorConfidenceTier = "NEW" | "DEVELOPING" | "ESTABLISHED" | "TRUSTED";

export type LuckyPatternType = "EXACT" | "DIGIT_MATCH";

export type LuckyMatchPosition = "PREFIX" | "SUFFIX" | "ANYWHERE";

export interface StreetAgentProfile {
    id: number;
    /** Internal identity record linked 1:1 for staff operations; not a login account. */
    userId?: string | null;
    /** Legacy contact field; onboarding does not require or expose credentials. */
    email?: string | null;
    firstName: string;
    lastName: string;
    phone: string;
    cccd: string;
    imageUrl?: string;
    contactAddress?: string;
    contactProvince?: string;
    contactWard?: string;
    coverageArea?: string;
    commissionRate?: number;
    contractStartDate?: string;
    contractEndDate?: string;
    contractCode?: string;
    contractDocumentUrl?: string;
    /** Trần ghi trong hợp đồng; chỉ đổi khi có phụ lục/hợp đồng mới. */
    contractMaxDailyCap?: number;
    /** Hạn mức áp dụng sau khi nhân hệ số tier tin cậy trên trần hợp đồng. */
    effectiveDailyCap?: number;
    /** Hạn mức còn lại của ngày kinh doanh đang được xem. */
    remainingDailyCap?: number;
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

/** Staff-entered contract terms; commission and other commercial policy remain system-owned. */
export interface CreateStreetAgentProfilePayload {
    firstName: string;
    lastName: string;
    phone: string;
    cccd: string;
    imageUrl?: string;
    contactAddress?: string;
    contactProvince?: string;
    contactWard?: string;
    coverageArea?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    contractMaxDailyCap?: number;
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
    normalEligibleQuantity: number;
    luckyQuantity: number;
    fixedReserveQuantity: number;
    percentReserveQuantity: number;
    effectiveAgencyReserveQuantity: number;
    vendorCapacity: number;
    suggestedCount: number;
    selectableCount: number;
    tickets: VendorAllocationTicketGroup[];
}

export interface VendorAllocationSuggestion {
    /** Selected denomination. Null means the caller must choose one from availableFaceValues. */
    faceValue?: number | null;
    /** Present only when inventory has multiple denominations for the business date. */
    availableFaceValues?: number[];
    requestedQuantity: number;
    remainingDailyCap: number;
    capLimitedQuantity: number;
    totalVendorCapacity: number;
    allowedQuantity: number;
    suggestedQuantity: number;
    counterReservePerStation: number;
    counterReservePercentPerStation: number;
    shortfallQuantity: number;
    capShortfallQuantity: number;
    inventoryShortfallQuantity: number;
    shortageReasons: string[];
    blockedReason?: string | null;
    stations: VendorAllocationStationGroup[];
}

export type VendorAllocationSerialStatus =
    | "DRAFT_RESERVED"
    | "HANDED_OVER"
    | "RETURN_PENDING_INSPECTION"
    | "RETURNED"
    | "RETURN_REJECTED"
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
    returnRejectionReason?: string | null;
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
    requestedQuantity?: number | null;
    reserveCountSnapshot?: number | null;
    reservePercentSnapshot?: number | null;
    allocatedQuantity: number;
    remainingDailyCap: number;
    faceValueSnapshot?: number | null;
    vendorUnitPriceSnapshot?: number | null;
    commissionRateSnapshot?: number | null;
    depositRateSnapshot?: number | null;
    latePolicySnapshot?: string | null;
    returnCutoffSnapshot?: string | null;
    supplierReturnCutoffSnapshot?: string | null;
    returnBufferMinutesSnapshot?: number | null;
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
    agencyNetSalesAmount?: number | null;
    depositRefundAmount?: number | null;
    depositForfeitedAmount?: number | null;
    depositAppliedAmount?: number | null;
    depositExcessRefundAmount?: number | null;
    forcedPurchaseAmount?: number | null;
    additionalAmountDue?: number | null;
    agentSettlementId?: number | null;
    dailySalesReportId?: number | null;
    returnBatchId?: number | null;
    details?: VendorAllocationBatchDetailRow[];
    serials: VendorAllocationAllocatedSerial[];
}

export interface VendorConfirmationQuote {
    batchId: number;
    allocatedQuantity: number;
    vendorUnitPrice: number;
    depositRate: number;
    depositRequiredAmount: number;
    returnCutoff?: string | null;
    latePolicy?: string | null;
    /** Opaque server value that must be echoed on confirm; stale quote returns HTTP 409. */
    quoteFingerprint: string;
    quotedAt?: string | null;
}

export interface ConfirmVendorReturnInspectionPayload {
    /** Staged serials not listed here are accepted into the inbound return batch. */
    rejectedSerialIds?: number[];
    note?: string;
}

export interface VendorConfidence {
    score: number;
    tier: VendorConfidenceTier | string;
    capPercentage: number;
    sampleSize: number;
    onTimeRate: number;
    sellThroughRate: number;
    experienceRate: number;
    calculatedAt?: string | null;
}

export interface DailySalesReportDetail {
    detailId: number;
    allocationBatchId: number;
    stationId: number;
    allocatedQuantity: number;
    soldQuantity: number;
    remainingQuantity: number;
    cashCollected: number;
}

export interface DailySalesReportSettlementLink {
    settlementId: number;
    allocationBatchId: number;
    batchCode: string;
    settlementDate?: string | null;
    agentReceives?: number | null;
    agentPays?: number | null;
    status?: string | null;
}

export interface DailySalesReport {
    id: number;
    agentId: number;
    reportDate: string;
    status: string;
    totalSoldQuantity: number;
    totalRemainingQuantity: number;
    totalCashCollected: number;
    details?: DailySalesReportDetail[];
    settlements?: DailySalesReportSettlementLink[];
}

export interface DailySalesReportListParams {
    page?: number;
    limit?: number;
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
    depositAppliedAmount?: number;
    depositExcessRefundAmount?: number;
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
    requestedQuantity: number;
    /** The denomination selected in suggestion; every serial in this draft must match it. */
    faceValue?: number;
    acceptShortfall: boolean;
    luckyOverrideReason?: string;
}

export interface ConfirmVendorAllocationPayload {
    depositReceivedAmount: number;
    quoteFingerprint: string;
}

export interface ReturnVendorAllocationSerialsPayload {
    serialIds: number[];
}

export interface SettleVendorAllocationPayload {
    cashReceivedFromVendor: number;
    cashPaidToVendor: number;
}
