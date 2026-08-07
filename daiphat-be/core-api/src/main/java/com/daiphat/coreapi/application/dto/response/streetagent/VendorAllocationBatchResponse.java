package com.daiphat.coreapi.application.dto.response.streetagent;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public record VendorAllocationBatchResponse(
        Long id,
        String batchCode,
        Long streetAgentProfileId,
        LocalDate businessDate,
        String status,
        LocalDateTime reservationExpiresAt,
        int allocatedQuantity,
        int remainingDailyCap,
        BigDecimal faceValueSnapshot,
        BigDecimal vendorUnitPriceSnapshot,
        BigDecimal depositRateSnapshot,
        String latePolicySnapshot,
        LocalTime returnCutoffSnapshot,
        BigDecimal depositRequiredAmount,
        BigDecimal depositReceivedAmount,
        BigDecimal depositBalanceBefore,
        BigDecimal depositBalanceAfter,
        LocalDateTime depositReceivedAt,
        LocalDateTime settledAt,
        int returnedQuantity,
        int soldQuantity,
        BigDecimal grossCashRemitted,
        BigDecimal commissionPayable,
        BigDecimal depositRefundAmount,
        BigDecimal depositForfeitedAmount,
        BigDecimal forcedPurchaseAmount,
        BigDecimal additionalAmountDue,
        List<VendorAllocationBatchDetailResponse> details,
        List<VendorAllocationSerialResponse> serials
) {
}
