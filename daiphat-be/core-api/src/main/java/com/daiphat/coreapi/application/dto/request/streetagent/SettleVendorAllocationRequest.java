package com.daiphat.coreapi.application.dto.request.streetagent;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;

/**
 * Confirms the immutable settlement preview. Monetary values are intentionally not accepted
 * from the client: the server derives them from the frozen batch snapshots and return outcome.
 */
public record SettleVendorAllocationRequest(
        @NotBlank String settlementFingerprint,
        @AssertTrue boolean confirmed
) {}
