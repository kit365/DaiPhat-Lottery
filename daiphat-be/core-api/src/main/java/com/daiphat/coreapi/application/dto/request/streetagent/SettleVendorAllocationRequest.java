package com.daiphat.coreapi.application.dto.request.streetagent;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/** Amounts physically counted by staff. Both must exactly match the server preview. */
public record SettleVendorAllocationRequest(
        @NotNull @DecimalMin(value = "0") BigDecimal cashReceivedFromVendor,
        @NotNull @DecimalMin(value = "0") BigDecimal cashPaidToVendor
) {}
