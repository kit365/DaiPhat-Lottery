package com.daiphat.coreapi.application.dto.request.streetagent;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record CreateVendorAllocationDraftRequest(
        @NotNull Long streetAgentProfileId,
        @NotNull LocalDate businessDate,
        @NotEmpty List<Long> serialIds,
        String luckyOverrideReason
) {
}
