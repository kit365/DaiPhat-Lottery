package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;

@Builder
public record SettlementCompleteResultResponse(
        boolean completed,
        SupplierSettlementResponse settlement,
        BigDecimal recalculatedTotalPaidAmount,
        BigDecimal finalSettlementValue,
        BigDecimal actualPaidAmount,
        BigDecimal initialEstimatedSettlementValue,
        BigDecimal settlementDifferenceAmount,
        BigDecimal remainingDifference,
        String message,
        List<SupplierSettlementAdjustmentResponse> adjustments
) {
}
