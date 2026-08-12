package com.daiphat.coreapi.application.dto.request.streetagent;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ReturnVendorAllocationSerialsRequest(
        @NotEmpty List<@NotNull Long> serialIds
) {
}
