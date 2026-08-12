package com.daiphat.coreapi.application.dto.request.streetagent;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** A ticket physically presented by the vendor but rejected during inspection. */
public record RejectedVendorReturnSerialRequest(
        @NotNull Long serialId,
        @NotBlank @Size(max = 500) String reason
) {
}
