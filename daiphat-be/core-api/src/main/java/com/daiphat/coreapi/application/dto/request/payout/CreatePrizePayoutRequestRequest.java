package com.daiphat.coreapi.application.dto.request.payout;

import jakarta.validation.constraints.NotNull;

public record CreatePrizePayoutRequestRequest(
        Long orderDetailId,
        Long serialId,
        @NotNull Long bankAccountId
) {
}
