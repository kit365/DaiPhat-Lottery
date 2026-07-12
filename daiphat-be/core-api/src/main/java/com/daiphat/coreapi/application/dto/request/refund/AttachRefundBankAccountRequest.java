package com.daiphat.coreapi.application.dto.request.refund;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AttachRefundBankAccountRequest(
        @NotNull @Positive Long bankAccountId
) {
}
