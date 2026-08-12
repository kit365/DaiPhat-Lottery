package com.daiphat.coreapi.application.dto.request.streetagent;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record ConfirmVendorAllocationRequest(
        @NotNull @DecimalMin(value = "0.0", inclusive = true) BigDecimal depositReceivedAmount,
        @NotBlank String quoteFingerprint
) {
    /** Source compatibility for internal callers; HTTP confirmation must include a quote fingerprint. */
    @Deprecated
    public ConfirmVendorAllocationRequest(BigDecimal depositReceivedAmount) {
        this(depositReceivedAmount, null);
    }
}
