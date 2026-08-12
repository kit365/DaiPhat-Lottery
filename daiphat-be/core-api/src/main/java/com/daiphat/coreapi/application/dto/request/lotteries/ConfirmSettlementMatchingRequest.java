package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public record ConfirmSettlementMatchingRequest(
        @NotNull @Min(0) Integer actualTicketImportQuantity,
        BigDecimal actualTicketImportValue,
        @NotNull @Min(0) Integer actualReturnTicketQuantity,
        BigDecimal actualReturnTicketValue,
        @DecimalMin("0") BigDecimal reconciledTicketUnitPrice,
        String reconciliationNote,
        @DecimalMin("0") BigDecimal actualPaidAmount,
        @Valid List<SettlementMatchingAdjustmentItem> additionalCosts
) {
}
