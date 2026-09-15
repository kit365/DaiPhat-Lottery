package com.daiphat.coreapi.application.dto.request.payout;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreatePrizePayoutRequestRequest(
        Long orderDetailId,
        Long serialId,
        @NotNull Long bankAccountId,
        @NotBlank @Size(max = 20) String recipientIdNumber,
        @NotBlank @Size(max = 500) String recipientIdImageUrl,
        @NotBlank @Size(max = 500) String recipientIdImageBackUrl
) {
}
