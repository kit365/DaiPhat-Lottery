package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementAdjustmentReasonCode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Monetary settlement adjustment.
 * Sign convention: positive increases payable to supplier; negative decreases (discount/credit).
 */
public record AddSettlementMonetaryAdjustmentRequest(
        @NotNull BigDecimal amount,
        @NotNull SupplierSettlementAdjustmentReasonCode reasonCode,
        @NotBlank String note
) {
}
