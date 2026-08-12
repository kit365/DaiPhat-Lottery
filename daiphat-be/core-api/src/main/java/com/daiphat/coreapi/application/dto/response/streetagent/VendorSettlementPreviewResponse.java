package com.daiphat.coreapi.application.dto.response.streetagent;

import java.math.BigDecimal;

public record VendorSettlementPreviewResponse(
        Long allocationBatchId,
        int allocatedQuantity,
        int soldQuantity,
        int returnedQuantity,
        BigDecimal grossCashRemitted,
        BigDecimal commissionPayable,
        BigDecimal commissionRateSnapshot,
        BigDecimal agencyNetSalesAmount,
        BigDecimal depositRefundAmount,
        BigDecimal depositForfeitedAmount,
        BigDecimal depositAppliedAmount,
        BigDecimal depositExcessRefundAmount,
        BigDecimal forcedPurchaseAmount,
        BigDecimal additionalAmountDue,
        /** Net cash to collect at the counter after every applicable offset. */
        BigDecimal netCashDueFromVendor,
        /** Net cash to pay out at the counter after every applicable offset. */
        BigDecimal netCashPayableToVendor,
        boolean late,
        String latePolicySnapshot,
        String settlementFingerprint
) {
}
