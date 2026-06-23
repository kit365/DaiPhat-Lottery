package com.daiphat.coreapi.application.dto.request.refund;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateOrderRefundRequest(
        @NotBlank @Size(max = 500) String refundReason,
        @NotNull Long bankAccountId
) {
}
