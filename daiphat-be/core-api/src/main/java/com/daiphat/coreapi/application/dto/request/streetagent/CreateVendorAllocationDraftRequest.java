package com.daiphat.coreapi.application.dto.request.streetagent;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;
import java.util.List;

public record CreateVendorAllocationDraftRequest(
        @NotNull Long streetAgentProfileId,
        @NotNull LocalDate businessDate,
        @NotEmpty List<Long> serialIds,
        @Positive Integer requestedQuantity,
        @Positive java.math.BigDecimal faceValue,
        Boolean acceptShortfall,
        String luckyOverrideReason
) {
    /** Compatibility for existing internal callers; the selected quantity becomes the request. */
    public CreateVendorAllocationDraftRequest(
            Long streetAgentProfileId, LocalDate businessDate, List<Long> serialIds, String luckyOverrideReason) {
        this(streetAgentProfileId, businessDate, serialIds,
                serialIds == null ? null : serialIds.size(), null, false, luckyOverrideReason);
    }
}
