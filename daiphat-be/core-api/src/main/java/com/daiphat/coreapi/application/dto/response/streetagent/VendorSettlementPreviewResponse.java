package com.daiphat.coreapi.application.dto.response.streetagent;

import java.math.BigDecimal;

public record VendorSettlementPreviewResponse(
        Long allocationBatchId,
        int allocatedQuantity,
        int soldQuantity,
        int returnedQuantity,
        BigDecimal grossCashRemitted,
        BigDecimal commissionPayable,
        BigDecimal agencyNetSalesAmount,
        BigDecimal depositRefundAmount,
        BigDecimal depositForfeitedAmount,
        BigDecimal forcedPurchaseAmount,
        BigDecimal additionalAmountDue,
        boolean late,
        String latePolicySnapshot
) {
}
