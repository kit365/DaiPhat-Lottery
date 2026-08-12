package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementAdjustmentReasonCode;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

/**
 * Resolve return discrepancy.
 * Shortfall: {@code serialIds} + {@code resolution} EXPIRED|LOST|DAMAGED|VOIDED.
 * Excess: {@code excessSerialNumbers} validated then attached to EXCESS_SUPPLIER_RETURN batch.
 */
public record ResolveReturnDiscrepancyRequest(
        List<Long> serialIds,
        /** Shortfall resolution: EXPIRED, LOST, DAMAGED, or VOIDED. */
        String resolution,
        @NotNull SupplierSettlementAdjustmentReasonCode reasonCode,
        BigDecimal adjustmentAmount,
        String note,
        boolean markResolved,
        /** Physical serial numbers for excess returned tickets (scan / manual). */
        List<String> excessSerialNumbers
) {
}
