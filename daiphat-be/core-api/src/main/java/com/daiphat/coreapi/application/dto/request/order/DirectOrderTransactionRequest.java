package com.daiphat.coreapi.application.dto.request.order;

import com.daiphat.coreapi.domain.model.enums.order.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record DirectOrderTransactionRequest(
        @NotNull TransactionType type,
        @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal amount,
        String note
) {
}
