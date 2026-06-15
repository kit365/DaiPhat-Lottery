package com.daiphat.coreapi.application.dto.request.order;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record OrderTicketItemRequest(
        @NotNull Long lotteryTicketId,
        @NotNull @Min(1) Integer quantity
) {
}
