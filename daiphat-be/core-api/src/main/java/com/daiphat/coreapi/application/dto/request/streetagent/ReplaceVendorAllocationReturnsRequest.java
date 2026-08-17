package com.daiphat.coreapi.application.dto.request.streetagent;

import jakarta.validation.constraints.NotNull;

import java.util.List;

/** Complete draft selection for the physical return inspection step. */
public record ReplaceVendorAllocationReturnsRequest(
        @NotNull List<@NotNull Long> serialIds
) {
}
