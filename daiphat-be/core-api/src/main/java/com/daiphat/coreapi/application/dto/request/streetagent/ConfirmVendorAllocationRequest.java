package com.daiphat.coreapi.application.dto.request.streetagent;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ConfirmVendorAllocationRequest(
        @NotNull @DecimalMin(value = "0.0", inclusive = true) BigDecimal depositReceivedAmount
) {
}
