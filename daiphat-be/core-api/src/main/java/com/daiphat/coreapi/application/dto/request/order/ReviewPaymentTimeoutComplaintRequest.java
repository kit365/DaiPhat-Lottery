package com.daiphat.coreapi.application.dto.request.order;

import jakarta.validation.constraints.NotNull;

/** Staff decision for a customer proof submitted after payment timeout. */
public record ReviewPaymentTimeoutComplaintRequest(
        @NotNull Boolean approved,
        String reason
) {
}
