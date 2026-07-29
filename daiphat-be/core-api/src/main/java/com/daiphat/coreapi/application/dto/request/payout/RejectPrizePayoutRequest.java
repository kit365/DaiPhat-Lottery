package com.daiphat.coreapi.application.dto.request.payout;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectPrizePayoutRequest(
        @NotBlank @Size(max = 500) String reason
) {
}
